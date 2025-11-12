import express from 'express';
import * as authController from '../controllers/authController';
import * as roomController from '../controllers/roomController';
import * as bookingController from '../controllers/bookingController';
import { authenticate, authorize, authorizeOwnerOrStaff } from '../middleware/auth';
import { 
  validateRegistration, 
  validateLogin, 
  validateRoomCreation, 
  validateBookingRequest,
  validateAvailabilityQuery 
} from '../middleware/validation';
import { UserRole } from '../types';

const router = express.Router();

// ============================================
// AUTHENTICATION ROUTES
// ============================================
router.post('/auth/register', validateRegistration, authController.register);
router.post('/auth/login', validateLogin, authController.login);
router.get('/auth/profile', authenticate, authController.getProfile);
router.put('/auth/profile', authenticate, authController.updateProfile);

// ============================================
// ROOM ROUTES
// ============================================
// Public routes
router.get('/rooms', roomController.getAllRooms);
router.get('/rooms/types', roomController.getRoomTypes);
router.get('/rooms/:id', roomController.getRoomById);

// Admin only routes
router.post(
  '/rooms',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRoomCreation,
  roomController.createRoom
);

router.put(
  '/rooms/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.STAFF),
  roomController.updateRoom
);

router.delete(
  '/rooms/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  roomController.deleteRoom
);

// ============================================
// BOOKING ROUTES
// ============================================
// Check availability (public)
router.get(
  '/bookings/availability',
  validateAvailabilityQuery,
  bookingController.checkAvailability
);

// Create booking (authenticated users)
router.post(
  '/bookings',
  authenticate,
  validateBookingRequest,
  bookingController.createBooking
);

// Get user's own bookings
router.get(
  '/bookings/my-bookings',
  authenticate,
  bookingController.getMyBookings
);

// Get all bookings (staff and admin only)
router.get(
  '/bookings',
  authenticate,
  authorize(UserRole.STAFF, UserRole.ADMIN),
  bookingController.getAllBookings
);

// Get specific booking
router.get(
  '/bookings/:id',
  authenticate,
  bookingController.getBookingById
);

// Cancel booking
router.post(
  '/bookings/:id/cancel',
  authenticate,
  bookingController.cancelBooking
);

// Check-in (staff and admin only)
router.post(
  '/bookings/:id/check-in',
  authenticate,
  authorize(UserRole.STAFF, UserRole.ADMIN),
  bookingController.checkInGuest
);

// Check-out (staff and admin only)
router.post(
  '/bookings/:id/check-out',
  authenticate,
  authorize(UserRole.STAFF, UserRole.ADMIN),
  bookingController.checkOutGuest
);

export default router;