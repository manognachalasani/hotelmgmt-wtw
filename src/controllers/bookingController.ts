// controllers/bookingController.ts

import { Request, Response } from 'express';
import { db } from '../database';
import { bookingService } from '../services/bookingService';
import { emailService } from '../services/emailService';
import { BookingRequest, AvailabilityQuery, Guest, UserRole, BookingStatus } from '../types';

// Helper function to safely serialize dates
const serializeDate = (date: Date | string | undefined): string | undefined => {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  if (date instanceof Date) return date.toISOString();
  return undefined;
};

export const checkAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const checkInDate = req.query.checkInDate as string;
    const checkOutDate = req.query.checkOutDate as string;

    // Validate date range
    if (checkInDate && checkOutDate) {
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use ISO 8601 format (YYYY-MM-DD)'
        });
        return;
      }

      if (checkIn < today) {
        res.status(400).json({
          success: false,
          message: 'Check-in date cannot be in the past'
        });
        return;
      }

      if (checkOut <= checkIn) {
        res.status(400).json({
          success: false,
          message: 'Check-out date must be after check-in date'
        });
        return;
      }

      const daysDiff = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 30) {
        res.status(400).json({
          success: false,
          message: 'Maximum booking duration is 30 days'
        });
        return;
      }
    }

    const query: AvailabilityQuery = {
      checkInDate,
      checkOutDate,
      roomType: req.query.roomType as AvailabilityQuery['roomType'],
      minCapacity: req.query.minCapacity ? Number(req.query.minCapacity) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined
    };

    // Validate numeric parameters
    if (query.minCapacity !== undefined && (isNaN(query.minCapacity) || query.minCapacity < 1)) {
      res.status(400).json({
        success: false,
        message: 'Minimum capacity must be a positive number'
      });
      return;
    }

    if (query.maxPrice !== undefined && (isNaN(query.maxPrice) || query.maxPrice < 0)) {
      res.status(400).json({
        success: false,
        message: 'Maximum price must be a non-negative number'
      });
      return;
    }

    const availableRooms = await bookingService.getAvailableRooms(query);

    // Serialize dates in availability results
    const serializedRooms = availableRooms.map(room => ({
      ...room,
      availableFrom: serializeDate(room.availableFrom as Date | string | undefined)
    }));

    res.status(200).json({
      success: true,
      data: serializedRooms,
      count: serializedRooms.length
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

    // Validate room exists
    const room = db.getRoomById(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found'
      });
      return;
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    // Validate dates are valid
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use ISO 8601 format (YYYY-MM-DD)'
      });
      return;
    }

    // Validate check-in date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkIn < today) {
      res.status(400).json({
        success: false,
        message: 'Check-in date cannot be in the past'
      });
      return;
    }

    // Sanitize special requests if provided
    const sanitizedSpecialRequests = specialRequests 
      ? specialRequests.trim().substring(0, 500) // Limit to 500 characters
      : undefined;

    // Create booking with concurrency control
    const result = await bookingService.createBooking(
      req.user.userId,
      roomId,
      checkIn,
      checkOut,
      numberOfGuests,
      sanitizedSpecialRequests
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
      // Payment failed - booking is already cancelled by the service
      // Clean up: delete the booking and payment records
      const cancelledBooking = db.getBookingById(booking.id);
      if (cancelledBooking && cancelledBooking.status === BookingStatus.CANCELLED) {
        // Booking was cancelled, return error with clear message
        res.status(402).json({
          success: false,
          message: 'Payment processing failed. Your booking was not confirmed. Please try again.',
          data: { 
            booking: cancelledBooking, 
            payment: db.getPaymentById(payment.id) 
          }
        });
        return;
      }
      
      // If booking wasn't cancelled, return generic error
      res.status(402).json({
        success: false,
        message: 'Payment processing failed. Please try again.',
        data: { booking, payment }
      });
      return;
    }

    // Get updated booking and payment after payment processing
    // Note: room was already validated and retrieved earlier
    const updatedBooking = db.getBookingById(booking.id);
    const updatedPayment = db.getPaymentById(payment.id);
    const guest = db.getUserById(req.user.userId) as Guest;

    if (!updatedBooking || !updatedPayment || !room || !guest) {
      res.status(500).json({
        success: false,
        message: 'Booking created but failed to retrieve booking details'
      });
      return;
    }

    // Send confirmation email
    try {
      await emailService.sendBookingConfirmation({
        booking: updatedBooking,
        guest,
        room,
        payment: updatedPayment
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Continue even if email fails
    }

    // Serialize dates to ISO strings for JSON response
    const bookingResponse = {
      ...updatedBooking,
      checkInDate: serializeDate(updatedBooking.checkInDate as Date | string),
      checkOutDate: serializeDate(updatedBooking.checkOutDate as Date | string),
      createdAt: serializeDate(updatedBooking.createdAt as Date | string),
      updatedAt: serializeDate(updatedBooking.updatedAt as Date | string)
    };

    const paymentResponse = {
      ...updatedPayment,
      paidAt: serializeDate(updatedPayment.paidAt as Date | string | undefined),
      createdAt: serializeDate(updatedPayment.createdAt as Date | string),
      updatedAt: serializeDate(updatedPayment.updatedAt as Date | string)
    };

    const roomResponse = {
      ...room,
      createdAt: serializeDate(room.createdAt as Date | string | undefined),
      updatedAt: serializeDate(room.updatedAt as Date | string | undefined)
    };

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully. Confirmation email sent.',
      data: {
        booking: bookingResponse,
        payment: paymentResponse,
        room: roomResponse
      }
    });
  } catch (error: any) {
    console.error('Create booking error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
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
      
      // Serialize dates to ISO strings
      const bookingResponse = {
        ...booking,
        checkInDate: serializeDate(booking.checkInDate as Date | string),
        checkOutDate: serializeDate(booking.checkOutDate as Date | string),
        createdAt: serializeDate(booking.createdAt as Date | string),
        updatedAt: serializeDate(booking.updatedAt as Date | string),
        room: room ? {
          ...room,
          createdAt: serializeDate(room.createdAt as Date | string),
          updatedAt: serializeDate(room.updatedAt as Date | string)
        } : undefined,
        payment: payment ? {
          ...payment,
          paidAt: serializeDate(payment.paidAt as Date | string | undefined),
          createdAt: serializeDate(payment.createdAt as Date | string),
          updatedAt: serializeDate(payment.updatedAt as Date | string)
        } : undefined
      };
      
      return bookingResponse;
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

    // Validate ID format (basic UUID validation)
    if (!id || id.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
      return;
    }

    const booking = db.getBookingById(id);
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }

    // Check authorization
    if (req.user?.role === UserRole.GUEST && booking.guestId !== req.user.userId) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    const room = db.getRoomById(booking.roomId);
    const payment = db.getPaymentByBookingId(booking.id);
    const guest = db.getUserById(booking.guestId);

    // Serialize dates to ISO strings
    const bookingResponse = {
      ...booking,
      checkInDate: serializeDate(booking.checkInDate as Date | string),
      checkOutDate: serializeDate(booking.checkOutDate as Date | string),
      createdAt: serializeDate(booking.createdAt as Date | string),
      updatedAt: serializeDate(booking.updatedAt as Date | string),
      room: room ? {
        ...room,
        createdAt: serializeDate(room.createdAt as Date | string),
        updatedAt: serializeDate(room.updatedAt as Date | string)
      } : undefined,
      payment: payment ? {
        ...payment,
        paidAt: serializeDate(payment.paidAt as Date | string | undefined),
        createdAt: serializeDate(payment.createdAt as Date | string),
        updatedAt: serializeDate(payment.updatedAt as Date | string)
      } : undefined,
      guest: guest ? {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phone: guest.phone
      } : null
    };

    res.status(200).json({
      success: true,
      data: bookingResponse
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

    // Validate date parameters if provided
    if (fromDate && isNaN(Date.parse(fromDate as string))) {
      res.status(400).json({
        success: false,
        message: 'Invalid fromDate format. Please use ISO 8601 format (YYYY-MM-DD)'
      });
      return;
    }

    if (toDate && isNaN(Date.parse(toDate as string))) {
      res.status(400).json({
        success: false,
        message: 'Invalid toDate format. Please use ISO 8601 format (YYYY-MM-DD)'
      });
      return;
    }

    if (fromDate && toDate) {
      const from = new Date(fromDate as string);
      const to = new Date(toDate as string);
      if (to < from) {
        res.status(400).json({
          success: false,
          message: 'toDate must be after or equal to fromDate'
        });
        return;
      }
    }

    // Validate roomId if provided
    if (roomId && typeof roomId === 'string') {
      const room = db.getRoomById(roomId);
      if (!room) {
        res.status(404).json({
          success: false,
          message: 'Room not found'
        });
        return;
      }
    }

    let bookings = db.getAllBookings();

    // Apply filters
    if (status) {
      // Validate status is a valid BookingStatus enum value
      const validStatuses = Object.values(BookingStatus);
      if (validStatuses.includes(status as BookingStatus)) {
        bookings = bookings.filter(b => b.status === status);
      } else {
        res.status(400).json({
          success: false,
          message: `Invalid booking status. Valid values are: ${validStatuses.join(', ')}`
        });
        return;
      }
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
      
      // Serialize dates to ISO strings
      return {
        ...booking,
        checkInDate: serializeDate(booking.checkInDate as Date | string),
        checkOutDate: serializeDate(booking.checkOutDate as Date | string),
        createdAt: serializeDate(booking.createdAt as Date | string),
        updatedAt: serializeDate(booking.updatedAt as Date | string),
        room: room ? {
          ...room,
          createdAt: serializeDate(room.createdAt as Date | string),
          updatedAt: serializeDate(room.updatedAt as Date | string)
        } : undefined,
        payment: payment ? {
          ...payment,
          paidAt: serializeDate(payment.paidAt as Date | string | undefined),
          createdAt: serializeDate(payment.createdAt as Date | string),
          updatedAt: serializeDate(payment.updatedAt as Date | string)
        } : undefined,
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

    // Validate ID format
    if (!id || id.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
      return;
    }

    const booking = db.getBookingById(id);
    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }

    // Check authorization for guests
    if (req.user?.role === UserRole.GUEST && booking.guestId !== req.user.userId) {
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

    if (room && guest) {
      await emailService.sendBookingCancellation({
        booking,
        guest,
        room,
        ...(payment ? { payment } : {})
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

    // Validate ID format
    if (!id || id.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
      return;
    }

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

    // Validate ID format
    if (!id || id.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
      return;
    }

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
