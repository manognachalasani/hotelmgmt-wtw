// controllers/__tests__/bookingController.test.ts

import { Request, Response } from 'express';
import * as bookingController from '../bookingController';
import { bookingService } from '../../services/bookingService';
import { emailService } from '../../services/emailService';
import { db } from '../../database';
import { BookingStatus, PaymentStatus, RoomType, UserRole } from '../../types';
import { ValidationError } from '../../utils/errors';

// Mock dependencies
jest.mock('../../services/bookingService');
jest.mock('../../services/emailService');
jest.mock('../../database');

describe('BookingController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };
    mockRequest = {
      user: {
        userId: 'user-1',
        email: 'test@example.com',
        role: UserRole.GUEST,
      },
      body: {},
      query: {},
      params: {},
    };
    jest.clearAllMocks();
  });

  describe('checkAvailability', () => {
    it('should return available rooms', async () => {
      const mockAvailableRooms = [
        {
          roomId: 'room-1',
          roomNumber: '101',
          type: RoomType.SINGLE,
          isAvailable: true,
          pricePerNight: 100,
        },
      ];

      mockRequest.query = {
        checkInDate: '2024-01-15',
        checkOutDate: '2024-01-20',
      };

      (bookingService.getAvailableRooms as jest.Mock).mockResolvedValue(mockAvailableRooms);

      await bookingController.checkAvailability(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockAvailableRooms,
        count: 1,
      });
    });

    it('should handle errors', async () => {
      mockRequest.query = {
        checkInDate: '2024-01-15',
        checkOutDate: '2024-01-20',
      };

      (bookingService.getAvailableRooms as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await bookingController.checkAvailability(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to check room availability',
      });
    });
  });

  describe('createBooking', () => {
    it('should create booking successfully', async () => {
      const mockBooking = {
        id: 'booking-1',
        guestId: 'user-1',
        roomId: 'room-1',
        checkInDate: new Date('2024-01-15'),
        checkOutDate: new Date('2024-01-20'),
        numberOfGuests: 1,
        totalPrice: 500,
        status: BookingStatus.CONFIRMED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPayment = {
        id: 'payment-1',
        bookingId: 'booking-1',
        amount: 550,
        status: PaymentStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRoom = {
        id: 'room-1',
        roomNumber: '101',
        type: RoomType.SINGLE,
        capacity: 1,
        pricePerNight: 100,
      };

      mockRequest.body = {
        roomId: 'room-1',
        checkInDate: '2024-01-15',
        checkOutDate: '2024-01-20',
        numberOfGuests: 1,
      };

      (bookingService.createBooking as jest.Mock).mockResolvedValue({
        booking: mockBooking,
        payment: mockPayment,
      });
      (bookingService.processPayment as jest.Mock).mockResolvedValue(true);
      (db.getBookingById as jest.Mock).mockReturnValue(mockBooking);
      (db.getPaymentById as jest.Mock).mockReturnValue(mockPayment);
      (db.getRoomById as jest.Mock).mockReturnValue(mockRoom);
      (db.getUserById as jest.Mock).mockReturnValue({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });
      (emailService.sendBookingConfirmation as jest.Mock).mockResolvedValue(undefined);

      await bookingController.createBooking(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockStatus).toHaveBeenCalledWith(201);
      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Booking confirmed successfully. Confirmation email sent.');
      expect(responseData.data).toHaveProperty('booking');
      expect(responseData.data).toHaveProperty('payment');
      expect(responseData.data).toHaveProperty('room');
    });

    it('should return 400 when room capacity is exceeded', async () => {
      mockRequest.body = {
        roomId: 'room-1',
        checkInDate: '2024-01-15',
        checkOutDate: '2024-01-20',
        numberOfGuests: 5, // Exceeds capacity
      };

      (bookingService.createBooking as jest.Mock).mockRejectedValue(
        new ValidationError('Room capacity exceeded. Maximum capacity: 1')
      );

      await bookingController.createBooking(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Room capacity exceeded. Maximum capacity: 1',
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.body = {
        roomId: 'room-1',
        checkInDate: '2024-01-15',
        checkOutDate: '2024-01-20',
        numberOfGuests: 1,
      };

      await bookingController.createBooking(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
      });
    });

    it('should return 409 when room is not available', async () => {
      mockRequest.body = {
        roomId: 'room-1',
        checkInDate: '2024-01-15',
        checkOutDate: '2024-01-20',
        numberOfGuests: 1,
      };

      (bookingService.createBooking as jest.Mock).mockResolvedValue(null);

      await bookingController.createBooking(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Room is not available for the selected dates',
      });
    });

    it('should return 402 when payment fails', async () => {
      const mockBooking = {
        id: 'booking-1',
        guestId: 'user-1',
        roomId: 'room-1',
        status: BookingStatus.PENDING,
      };

      const mockPayment = {
        id: 'payment-1',
        bookingId: 'booking-1',
        status: PaymentStatus.FAILED,
      };

      mockRequest.body = {
        roomId: 'room-1',
        checkInDate: '2024-01-15',
        checkOutDate: '2024-01-20',
        numberOfGuests: 1,
      };

      (bookingService.createBooking as jest.Mock).mockResolvedValue({
        booking: mockBooking,
        payment: mockPayment,
      });
      (bookingService.processPayment as jest.Mock).mockResolvedValue(false);

      await bookingController.createBooking(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(402);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Payment processing failed. Please try again.',
        data: { booking: mockBooking, payment: mockPayment },
      });
    });
  });

  describe('getMyBookings', () => {
    it('should return user bookings', async () => {
      const mockBookings = [
        {
          id: 'booking-1',
          guestId: 'user-1',
          roomId: 'room-1',
          status: BookingStatus.CONFIRMED,
        },
      ];

      (db.getBookingsByGuestId as jest.Mock).mockReturnValue(mockBookings);
      (db.getRoomById as jest.Mock).mockReturnValue({ id: 'room-1', roomNumber: '101' });
      (db.getPaymentByBookingId as jest.Mock).mockReturnValue({ id: 'payment-1' });

      await bookingController.getMyBookings(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'booking-1',
            room: expect.any(Object),
            payment: expect.any(Object),
          }),
        ]),
        count: 1,
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await bookingController.getMyBookings(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
      });
    });
  });

  describe('getBookingById', () => {
    it('should return booking when user is authorized', async () => {
      const mockBooking = {
        id: 'booking-1',
        guestId: 'user-1',
        roomId: 'room-1',
        status: BookingStatus.CONFIRMED,
      };

      mockRequest.params = { id: 'booking-1' };

      (db.getBookingById as jest.Mock).mockReturnValue(mockBooking);
      (db.getRoomById as jest.Mock).mockReturnValue({ id: 'room-1' });
      (db.getPaymentByBookingId as jest.Mock).mockReturnValue({ id: 'payment-1' });
      (db.getUserById as jest.Mock).mockReturnValue({
        id: 'user-1',
        email: 'test@example.com',
      });

      await bookingController.getBookingById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'booking-1',
          room: expect.any(Object),
          payment: expect.any(Object),
          guest: expect.any(Object),
        }),
      });
    });

    it('should return 404 when booking not found', async () => {
      mockRequest.params = { id: 'non-existent' };

      (db.getBookingById as jest.Mock).mockReturnValue(undefined);

      await bookingController.getBookingById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Booking not found',
      });
    });

    it('should return 403 when guest tries to access another guest booking', async () => {
      const mockBooking = {
        id: 'booking-1',
        guestId: 'other-user',
        roomId: 'room-1',
      };

      mockRequest.params = { id: 'booking-1' };
      mockRequest.user = {
        userId: 'user-1',
        email: 'test@example.com',
        role: UserRole.GUEST,
      };

      (db.getBookingById as jest.Mock).mockReturnValue(mockBooking);

      await bookingController.getBookingById(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied',
      });
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking successfully', async () => {
      const mockBooking = {
        id: 'booking-1',
        guestId: 'user-1',
        roomId: 'room-1',
        status: BookingStatus.CONFIRMED,
      };

      mockRequest.params = { id: 'booking-1' };

      (db.getBookingById as jest.Mock).mockReturnValue(mockBooking);
      (bookingService.cancelBooking as jest.Mock).mockResolvedValue(true);
      (db.getRoomById as jest.Mock).mockReturnValue({ id: 'room-1' });
      (db.getUserById as jest.Mock).mockReturnValue({
        id: 'user-1',
        email: 'test@example.com',
      });
      (db.getPaymentByBookingId as jest.Mock).mockReturnValue(null);
      (emailService.sendBookingCancellation as jest.Mock).mockResolvedValue(undefined);

      await bookingController.cancelBooking(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Booking cancelled successfully. Cancellation email sent.',
      });
    });

    it('should return 400 when booking cannot be cancelled', async () => {
      const mockBooking = {
        id: 'booking-1',
        guestId: 'user-1',
        roomId: 'room-1',
        status: BookingStatus.CHECKED_IN,
      };

      mockRequest.params = { id: 'booking-1' };

      (db.getBookingById as jest.Mock).mockReturnValue(mockBooking);
      (bookingService.cancelBooking as jest.Mock).mockRejectedValue(
        new Error('Cannot cancel a booking that has already been checked in or checked out')
      );

      await bookingController.cancelBooking(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot cancel a booking that has already been checked in or checked out',
      });
    });
  });
});

