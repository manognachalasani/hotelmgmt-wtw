// services/bookingService.ts

import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { 
  Booking, 
  Payment, 
  BookingStatus, 
  PaymentStatus, 
  RoomAvailability,
  AvailabilityQuery,
  RoomType 
} from '../types';

class BookingService {
  /**
   * Check if a room is available for the given date range
   * This method uses locking to prevent race conditions
   */
  async checkRoomAvailability(
    roomId: string,
    checkInDate: Date,
    checkOutDate: Date
  ): Promise<boolean> {
    const room = db.getRoomById(roomId);
    if (!room) {
      return false;
    }

    // Get all bookings for this room
    const roomBookings = db.getBookingsByRoomId(roomId);

    // Check for overlapping bookings
    const hasOverlap = roomBookings.some(booking => {
      // Skip cancelled bookings
      if (booking.status === BookingStatus.CANCELLED) {
        return false;
      }

      const bookingCheckIn = new Date(booking.checkInDate);
      const bookingCheckOut = new Date(booking.checkOutDate);

      // Check if dates overlap
      return (
        (checkInDate >= bookingCheckIn && checkInDate < bookingCheckOut) ||
        (checkOutDate > bookingCheckIn && checkOutDate <= bookingCheckOut) ||
        (checkInDate <= bookingCheckIn && checkOutDate >= bookingCheckOut)
      );
    });

    return !hasOverlap;
  }

  /**
   * Get all available rooms for a date range
   */
  async getAvailableRooms(query: AvailabilityQuery): Promise<RoomAvailability[]> {
    const { checkInDate, checkOutDate, roomType, minCapacity, maxPrice } = query;
    
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    
    const allRooms = db.getAllRooms();
    const availableRooms: RoomAvailability[] = [];

    for (const room of allRooms) {
      // Apply filters
      if (roomType && room.type !== roomType) continue;
      if (minCapacity && room.capacity < minCapacity) continue;
      if (maxPrice && room.pricePerNight > maxPrice) continue;

      const isAvailable = await this.checkRoomAvailability(room.id, checkIn, checkOut);

      availableRooms.push({
        roomId: room.id,
        roomNumber: room.roomNumber,
        type: room.type,
        isAvailable,
        availableFrom: isAvailable ? undefined : this.getNextAvailableDate(room.id, checkIn),
        pricePerNight: room.pricePerNight
      });
    }

    return availableRooms;
  }

  /**
   * Get the next available date for a room
   */
  private getNextAvailableDate(roomId: string, fromDate: Date): Date | undefined {
    const roomBookings = db.getBookingsByRoomId(roomId)
      .filter(b => b.status !== BookingStatus.CANCELLED)
      .sort((a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime());

    for (const booking of roomBookings) {
      if (new Date(booking.checkOutDate) > fromDate) {
        return new Date(booking.checkOutDate);
      }
    }

    return undefined;
  }

  /**
   * Create a booking with concurrency control
   */
  async createBooking(
    guestId: string,
    roomId: string,
    checkInDate: Date,
    checkOutDate: Date,
    numberOfGuests: number,
    specialRequests?: string
  ): Promise<{ booking: Booking; payment: Payment } | null> {
    // Acquire lock for the room to prevent double-booking
    const lockKey = `room-booking-${roomId}`;
    const lockAcquired = await db.acquireLock(lockKey, 10000);

    if (!lockAcquired) {
      throw new Error('Unable to process booking at this time. Please try again.');
    }

    try {
      // Double-check availability with lock held
      const isAvailable = await this.checkRoomAvailability(roomId, checkInDate, checkOutDate);

      if (!isAvailable) {
        return null;
      }

      const room = db.getRoomById(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      // Validate capacity
      if (numberOfGuests > room.capacity) {
        throw new Error(`Room capacity exceeded. Maximum capacity: ${room.capacity}`);
      }

      // Calculate total price
      const nights = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const totalPrice = room.pricePerNight * nights;

      // Create booking
      const booking: Booking = {
        id: uuidv4(),
        guestId,
        roomId,
        checkInDate,
        checkOutDate,
        numberOfGuests,
        totalPrice,
        status: BookingStatus.PENDING,
        specialRequests,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create payment record
      const payment: Payment = {
        id: uuidv4(),
        bookingId: booking.id,
        amount: totalPrice,
        currency: 'USD',
        status: PaymentStatus.PENDING,
        paymentMethod: 'CREDIT_CARD',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      db.createBooking(booking);
      db.createPayment(payment);

      return { booking, payment };
    } finally {
      // Always release the lock
      db.releaseLock(lockKey);
    }
  }

  /**
   * Process payment simulation
   */
  async processPayment(paymentId: string): Promise<boolean> {
    const payment = db.getPaymentById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Update payment status to processing
    db.updatePayment(paymentId, { status: PaymentStatus.PROCESSING });

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate payment success (90% success rate)
    const success = Math.random() > 0.1;

    if (success) {
      // Update payment
      db.updatePayment(paymentId, {
        status: PaymentStatus.COMPLETED,
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        paidAt: new Date()
      });

      // Update booking status
      const booking = db.getBookingById(payment.bookingId);
      if (booking) {
        db.updateBooking(booking.id, { status: BookingStatus.CONFIRMED });
      }

      return true;
    } else {
      // Update payment status to failed
      db.updatePayment(paymentId, { status: PaymentStatus.FAILED });

      // Cancel the booking
      const booking = db.getBookingById(payment.bookingId);
      if (booking) {
        db.updateBooking(booking.id, { status: BookingStatus.CANCELLED });
      }

      return false;
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string): Promise<boolean> {
    const booking = db.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new Error('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.CHECKED_IN || booking.status === BookingStatus.CHECKED_OUT) {
      throw new Error('Cannot cancel a booking that has already been checked in or checked out');
    }

    // Update booking status
    db.updateBooking(bookingId, { status: BookingStatus.CANCELLED });

    // Process refund if payment was completed
    const payment = db.getPaymentByBookingId(bookingId);
    if (payment && payment.status === PaymentStatus.COMPLETED) {
      db.updatePayment(payment.id, { status: PaymentStatus.REFUNDED });
    }

    return true;
  }

  /**
   * Check in a guest
   */
  async checkIn(bookingId: string): Promise<boolean> {
    const booking = db.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new Error('Only confirmed bookings can be checked in');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(booking.checkInDate);
    checkInDate.setHours(0, 0, 0, 0);

    if (today < checkInDate) {
      throw new Error('Check-in date has not arrived yet');
    }

    db.updateBooking(bookingId, { status: BookingStatus.CHECKED_IN });
    return true;
  }

  /**
   * Check out a guest
   */
  async checkOut(bookingId: string): Promise<boolean> {
    const booking = db.getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new Error('Only checked-in bookings can be checked out');
    }

    db.updateBooking(bookingId, { status: BookingStatus.CHECKED_OUT });
    return true;
  }
}

export const bookingService = new BookingService();
