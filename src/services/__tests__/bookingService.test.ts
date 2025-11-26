// services/__tests__/bookingService.test.ts

import { bookingService } from '../bookingService';
import { db } from '../../database';
import { BookingStatus, PaymentStatus, RoomType } from '../../types';
import { ValidationError } from '../../utils/errors';

// Mock the database
jest.mock('../../database', () => {
  const mockDb = {
    getRoomById: jest.fn(),
    getAllRooms: jest.fn(),
    getBookingsByRoomId: jest.fn(),
    createBooking: jest.fn(),
    createPayment: jest.fn(),
    getBookingById: jest.fn(),
    getPaymentById: jest.fn(),
    getPaymentByBookingId: jest.fn(),
    updateBooking: jest.fn(),
    updatePayment: jest.fn(),
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
  };
  return { db: mockDb };
});

describe('BookingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    (db.acquireLock as jest.Mock).mockResolvedValue(true);
    (db.releaseLock as jest.Mock).mockImplementation(() => {});
  });

  describe('checkRoomAvailability', () => {
    it('should return true when room is available', async () => {
      const roomId = 'room-1';
      const checkIn = new Date('2024-01-15');
      const checkOut = new Date('2024-01-20');

      (db.getRoomById as jest.Mock).mockReturnValue({
        id: roomId,
        roomNumber: '101',
        type: RoomType.SINGLE,
        capacity: 1,
      });
      (db.getBookingsByRoomId as jest.Mock).mockReturnValue([]);

      const result = await bookingService.checkRoomAvailability(roomId, checkIn, checkOut);
      expect(result).toBe(true);
    });

    it('should return false when room has overlapping booking', async () => {
      const roomId = 'room-1';
      const checkIn = new Date('2024-01-15');
      const checkOut = new Date('2024-01-20');

      (db.getRoomById as jest.Mock).mockReturnValue({
        id: roomId,
        roomNumber: '101',
        type: RoomType.SINGLE,
        capacity: 1,
      });
      (db.getBookingsByRoomId as jest.Mock).mockReturnValue([
        {
          id: 'booking-1',
          roomId,
          checkInDate: new Date('2024-01-18'),
          checkOutDate: new Date('2024-01-22'),
          status: BookingStatus.CONFIRMED,
        },
      ]);

      const result = await bookingService.checkRoomAvailability(roomId, checkIn, checkOut);
      expect(result).toBe(false);
    });

    it('should return true when room has cancelled booking', async () => {
      const roomId = 'room-1';
      const checkIn = new Date('2024-01-15');
      const checkOut = new Date('2024-01-20');

      (db.getRoomById as jest.Mock).mockReturnValue({
        id: roomId,
        roomNumber: '101',
        type: RoomType.SINGLE,
        capacity: 1,
      });
      (db.getBookingsByRoomId as jest.Mock).mockReturnValue([
        {
          id: 'booking-1',
          roomId,
          checkInDate: new Date('2024-01-18'),
          checkOutDate: new Date('2024-01-22'),
          status: BookingStatus.CANCELLED,
        },
      ]);

      const result = await bookingService.checkRoomAvailability(roomId, checkIn, checkOut);
      expect(result).toBe(true);
    });

    it('should return false when room does not exist', async () => {
      const roomId = 'non-existent';
      const checkIn = new Date('2024-01-15');
      const checkOut = new Date('2024-01-20');

      (db.getRoomById as jest.Mock).mockReturnValue(undefined);

      const result = await bookingService.checkRoomAvailability(roomId, checkIn, checkOut);
      expect(result).toBe(false);
    });
  });

  describe('createBooking', () => {
    const mockGuestId = 'guest-1';
    const mockRoomId = 'room-1';
    const mockCheckIn = new Date('2024-01-15');
    const mockCheckOut = new Date('2024-01-20');
    const mockRoom = {
      id: mockRoomId,
      roomNumber: '101',
      type: RoomType.SINGLE,
      capacity: 1,
      pricePerNight: 100,
    };

    it('should create booking successfully when room is available', async () => {
      (db.getRoomById as jest.Mock).mockReturnValue(mockRoom);
      (db.getBookingsByRoomId as jest.Mock).mockReturnValue([]);
      (db.createBooking as jest.Mock).mockImplementation((booking) => booking);
      (db.createPayment as jest.Mock).mockImplementation((payment) => payment);

      const result = await bookingService.createBooking(
        mockGuestId,
        mockRoomId,
        mockCheckIn,
        mockCheckOut,
        1
      );

      expect(result).not.toBeNull();
      expect(result?.booking).toBeDefined();
      expect(result?.payment).toBeDefined();
      expect(result?.booking.guestId).toBe(mockGuestId);
      expect(result?.booking.roomId).toBe(mockRoomId);
      expect(result?.booking.numberOfGuests).toBe(1);
      expect(result?.booking.status).toBe(BookingStatus.PENDING);
      expect(db.createBooking).toHaveBeenCalled();
      expect(db.createPayment).toHaveBeenCalled();
      expect(db.releaseLock).toHaveBeenCalled();
    });

    it('should throw ValidationError when capacity is exceeded', async () => {
      (db.getRoomById as jest.Mock).mockReturnValue(mockRoom);
      (db.getBookingsByRoomId as jest.Mock).mockReturnValue([]);

      await expect(
        bookingService.createBooking(
          mockGuestId,
          mockRoomId,
          mockCheckIn,
          mockCheckOut,
          5 // Exceeds capacity of 1
        )
      ).rejects.toThrow(ValidationError);

      expect(db.releaseLock).toHaveBeenCalled();
    });

    it('should return null when room does not exist (availability check fails first)', async () => {
      (db.getRoomById as jest.Mock).mockReturnValue(undefined);
      (db.getBookingsByRoomId as jest.Mock).mockReturnValue([]);

      const result = await bookingService.createBooking(
        mockGuestId,
        'non-existent',
        mockCheckIn,
        mockCheckOut,
        1
      );

      expect(result).toBeNull();
      expect(db.releaseLock).toHaveBeenCalled();
    });

    it('should return null when room is not available', async () => {
      (db.getRoomById as jest.Mock).mockReturnValue(mockRoom);
      (db.getBookingsByRoomId as jest.Mock).mockReturnValue([
        {
          id: 'booking-1',
          roomId: mockRoomId,
          checkInDate: new Date('2024-01-18'),
          checkOutDate: new Date('2024-01-22'),
          status: BookingStatus.CONFIRMED,
        },
      ]);

      const result = await bookingService.createBooking(
        mockGuestId,
        mockRoomId,
        mockCheckIn,
        mockCheckOut,
        1
      );

      expect(result).toBeNull();
      expect(db.releaseLock).toHaveBeenCalled();
    });

    it('should calculate total price correctly', async () => {
      (db.getRoomById as jest.Mock).mockReturnValue({
        ...mockRoom,
        pricePerNight: 150,
      });
      (db.getBookingsByRoomId as jest.Mock).mockReturnValue([]);
      (db.createBooking as jest.Mock).mockImplementation((booking) => booking);
      (db.createPayment as jest.Mock).mockImplementation((payment) => payment);

      const checkIn = new Date('2024-01-15');
      const checkOut = new Date('2024-01-20'); // 5 nights

      const result = await bookingService.createBooking(
        mockGuestId,
        mockRoomId,
        checkIn,
        checkOut,
        1
      );

      expect(result?.booking.totalPrice).toBe(750); // 150 * 5
      expect(result?.payment.amount).toBeGreaterThan(750); // includes processing fee
    });
  });

  describe('processPayment', () => {
    const mockPaymentId = 'payment-1';
    const mockBookingId = 'booking-1';

    it('should process payment successfully', async () => {
      const mockPayment = {
        id: mockPaymentId,
        bookingId: mockBookingId,
        amount: 500,
        status: PaymentStatus.PENDING,
      };
      const mockBooking = {
        id: mockBookingId,
        status: BookingStatus.PENDING,
      };

      (db.getPaymentById as jest.Mock).mockReturnValue(mockPayment);
      (db.getBookingById as jest.Mock).mockReturnValue(mockBooking);
      (db.updatePayment as jest.Mock).mockImplementation((_id, updates) => ({
        ...mockPayment,
        ...updates,
      }));
      (db.updateBooking as jest.Mock).mockImplementation((_id, updates) => ({
        ...mockBooking,
        ...updates,
      }));

      // Mock Math.random to return success (value > 0.1)
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const result = await bookingService.processPayment(mockPaymentId);

      expect(result).toBe(true);
      expect(db.updatePayment).toHaveBeenCalledWith(
        mockPaymentId,
        expect.objectContaining({ status: PaymentStatus.PROCESSING })
      );
      expect(db.updatePayment).toHaveBeenCalledWith(
        mockPaymentId,
        expect.objectContaining({ status: PaymentStatus.COMPLETED })
      );
      expect(db.updateBooking).toHaveBeenCalledWith(
        mockBookingId,
        expect.objectContaining({ status: BookingStatus.CONFIRMED })
      );

      jest.spyOn(Math, 'random').mockRestore();
    });

    it('should throw NotFoundError when payment does not exist', async () => {
      (db.getPaymentById as jest.Mock).mockReturnValue(undefined);

      await expect(bookingService.processPayment('non-existent')).rejects.toThrow(
        'Payment not found'
      );
    });
  });

  describe('cancelBooking', () => {
    const mockBookingId = 'booking-1';

    it('should cancel booking successfully', async () => {
      const mockBooking = {
        id: mockBookingId,
        status: BookingStatus.CONFIRMED,
      };
      const mockPayment = {
        id: 'payment-1',
        bookingId: mockBookingId,
        status: PaymentStatus.COMPLETED,
      };

      (db.getBookingById as jest.Mock).mockReturnValue(mockBooking);
      (db.getPaymentByBookingId as jest.Mock).mockReturnValue(mockPayment);
      (db.updateBooking as jest.Mock).mockImplementation((_id, updates) => ({
        ...mockBooking,
        ...updates,
      }));
      (db.updatePayment as jest.Mock).mockImplementation((_id, updates) => ({
        ...mockPayment,
        ...updates,
      }));

      const result = await bookingService.cancelBooking(mockBookingId);

      expect(result).toBe(true);
      expect(db.updateBooking).toHaveBeenCalledWith(
        mockBookingId,
        expect.objectContaining({ status: BookingStatus.CANCELLED })
      );
      expect(db.updatePayment).toHaveBeenCalledWith(
        'payment-1',
        expect.objectContaining({ status: PaymentStatus.REFUNDED })
      );
    });

    it('should throw NotFoundError when booking does not exist', async () => {
      (db.getBookingById as jest.Mock).mockReturnValue(undefined);

      await expect(bookingService.cancelBooking('non-existent')).rejects.toThrow(
        'Booking not found'
      );
    });

    it('should throw error when booking is already cancelled', async () => {
      const mockBooking = {
        id: mockBookingId,
        status: BookingStatus.CANCELLED,
      };

      (db.getBookingById as jest.Mock).mockReturnValue(mockBooking);

      await expect(bookingService.cancelBooking(mockBookingId)).rejects.toThrow(
        'Booking is already cancelled'
      );
    });
  });

  describe('checkIn', () => {
    const mockBookingId = 'booking-1';

    it('should check in guest successfully', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkInDate = new Date(today);
      checkInDate.setDate(checkInDate.getDate() - 1); // Yesterday

      const mockBooking = {
        id: mockBookingId,
        status: BookingStatus.CONFIRMED,
        checkInDate,
      };

      (db.getBookingById as jest.Mock).mockReturnValue(mockBooking);
      (db.updateBooking as jest.Mock).mockImplementation((_id, updates) => ({
        ...mockBooking,
        ...updates,
      }));

      const result = await bookingService.checkIn(mockBookingId);

      expect(result).toBe(true);
      expect(db.updateBooking).toHaveBeenCalledWith(
        mockBookingId,
        expect.objectContaining({ status: BookingStatus.CHECKED_IN })
      );
    });

    it('should throw error when booking is not confirmed', async () => {
      const mockBooking = {
        id: mockBookingId,
        status: BookingStatus.PENDING,
      };

      (db.getBookingById as jest.Mock).mockReturnValue(mockBooking);

      await expect(bookingService.checkIn(mockBookingId)).rejects.toThrow(
        'Only confirmed bookings can be checked in'
      );
    });
  });

  describe('checkOut', () => {
    const mockBookingId = 'booking-1';

    it('should check out guest successfully', async () => {
      const mockBooking = {
        id: mockBookingId,
        status: BookingStatus.CHECKED_IN,
      };

      (db.getBookingById as jest.Mock).mockReturnValue(mockBooking);
      (db.updateBooking as jest.Mock).mockImplementation((_id, updates) => ({
        ...mockBooking,
        ...updates,
      }));

      const result = await bookingService.checkOut(mockBookingId);

      expect(result).toBe(true);
      expect(db.updateBooking).toHaveBeenCalledWith(
        mockBookingId,
        expect.objectContaining({ status: BookingStatus.CHECKED_OUT })
      );
    });

    it('should throw error when booking is not checked in', async () => {
      const mockBooking = {
        id: mockBookingId,
        status: BookingStatus.CONFIRMED,
      };

      (db.getBookingById as jest.Mock).mockReturnValue(mockBooking);

      await expect(bookingService.checkOut(mockBookingId)).rejects.toThrow(
        'Only checked-in bookings can be checked out'
      );
    });
  });
});

