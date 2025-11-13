// controllers/bookingController.ts

import { Request, Response } from 'express';
import { db } from '../database';
import { bookingService } from '../services/bookingService';
import { emailService } from '../services/emailService';
import { BookingRequest, AvailabilityQuery, Guest } from '../types';

export const checkAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const query: AvailabilityQuery = {
      checkInDate: req.query.checkInDate as string,
      checkOutDate: req.query.checkOutDate as string,
      roomType: req.query.roomType as any,
      minCapacity: req.query.minCapacity ? Number(req.query.minCapacity) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined
    };

    const availableRooms = await bookingService.getAvailableRooms(query);

    res.status(200).json({
      success: true,
      data: availableRooms,
      count: availableRooms.length
    });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check room availability'
    });
  }
};

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const bookingRequest: BookingRequest = req.body;
    const { roomId, checkInDate, checkOutDate, numberOfGuests, specialRequests } = bookingRequest;

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    // Create booking with concurrency control
    const result = await bookingService.createBooking(
      req.user.userId,
      roomId,
      checkIn,
      checkOut,
      numberOfGuests,
      specialRequests
    );

    if (!result) {
      res.status(409).json({
        success: false,
        message: 'Room is not available for the selected dates'
      });
      return;
    }

    const { booking, payment } = result;

    // Process payment
    const paymentSuccess = await bookingService.processPayment(payment.id);

    if (!paymentSuccess) {
      res.status(402).json({
        success: false,
        message: 'Payment processing failed. Please try again.',
        data: { booking, payment }
      });
      return;
    }

    // Get updated booking and payment after payment processing
    const updatedBooking = db.getBookingById(booking.id);
    const updatedPayment = db.getPaymentById(payment.id);
    const room = db.getRoomById(roomId);
    const guest = db.getUserById(req.user.userId) as Guest;

    if (updatedBooking && updatedPayment && room && guest) {
      // Send confirmation email
      await emailService.sendBookingConfirmation({
        booking: updatedBooking,
        guest,
        room,
        payment: updatedPayment
      });
    }

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully. Confirmation email sent.',
      data: {
        booking: updatedBooking,
        payment: updatedPayment,
        room
      }
    });
  } catch (error: any) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create booking'
    });
  }
};

export const getMyBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const bookings = db.getBookingsByGuestId(req.user.userId);

    // Enrich bookings with room and payment information
    const enrichedBookings = bookings.map(booking => {
      const room = db.getRoomById(booking.roomId);
      const payment = db.getPaymentByBookingId(booking.id);
      return {
        ...booking,
        room,
        payment
      };
    });

    res.status(200).json({
      success: true,
      data: enrichedBookings,
      count: enrichedBookings.length
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve bookings'
    });
  }
};

export const getBookingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const booking = db.getBookingById(id);
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }

    // Check authorization
    if (req.user?.role === 'GUEST' && booking.guestId !== req.user.userId) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    const room = db.getRoomById(booking.roomId);
    const payment = db.getPaymentByBookingId(booking.id);
    const guest = db.getUserById(booking.guestId);

    res.status(200).json({
      success: true,
      data: {
        ...booking,
        room,
        payment,
        guest: guest ? {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          phone: guest.phone
        } : null
      }
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve booking'
    });
  }
};

export const getAllBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, roomId, fromDate, toDate } = req.query;

    let bookings = db.getAllBookings();

    // Apply filters
    if (status) {
      bookings = bookings.filter(b => b.status === status);
    }
    if (roomId) {
      bookings = bookings.filter(b => b.roomId === roomId);
    }
    if (fromDate) {
      const from = new Date(fromDate as string);
      bookings = bookings.filter(b => new Date(b.checkInDate) >= from);
    }
    if (toDate) {
      const to = new Date(toDate as string);
      bookings = bookings.filter(b => new Date(b.checkOutDate) <= to);
    }

    // Enrich bookings
    const enrichedBookings = bookings.map(booking => {
      const room = db.getRoomById(booking.roomId);
      const payment = db.getPaymentByBookingId(booking.id);
      const guest = db.getUserById(booking.guestId);
      return {
        ...booking,
        room,
        payment,
        guest: guest ? {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          phone: guest.phone
        } : null
      };
    });

    res.status(200).json({
      success: true,
      data: enrichedBookings,
      count: enrichedBookings.length
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve bookings'
    });
  }
};

export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const booking = db.getBookingById(id);
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }

    // Check authorization for guests
    if (req.user?.role === 'GUEST' && booking.guestId !== req.user.userId) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    await bookingService.cancelBooking(id);

    // Send cancellation email
    const room = db.getRoomById(booking.roomId);
    const guest = db.getUserById(booking.guestId) as Guest;
    const payment = db.getPaymentByBookingId(booking.id);

    if (room && guest && payment) {
      await emailService.sendBookingCancellation({
        booking,
        guest,
        room,
        payment
      });
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully. Cancellation email sent.'
    });
  } catch (error: any) {
    console.error('Cancel booking error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel booking'
    });
  }
};

export const checkInGuest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await bookingService.checkIn(id);

    res.status(200).json({
      success: true,
      message: 'Guest checked in successfully'
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to check in guest'
    });
  }
};

export const checkOutGuest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await bookingService.checkOut(id);

    res.status(200).json({
      success: true,
      message: 'Guest checked out successfully'
    });
  } catch (error: any) {
    console.error('Check-out error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to check out guest'
    });
  }
};
