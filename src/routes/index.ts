// src/routes/index.ts

import express from 'express';
import * as authController from '../controllers/authController';
import * as roomController from '../controllers/roomController';
import * as bookingController from '../controllers/bookingController';
import { authenticate, authorize } from '../middleware/auth';
import { emailService } from '../services/emailService';
import {
  validateRegistration,
  validateLogin,
  validateRoomCreation,
  validateBookingRequest,
  validateAvailabilityQuery
} from '../middleware/validation';
import { UserRole } from '../types';

const router = express.Router();

// AUTHENTICATION ROUTES

router.post('/auth/register', validateRegistration, authController.register);
router.post('/auth/login', validateLogin, authController.login);
router.get('/auth/profile', authenticate, authController.getProfile);
router.put('/auth/profile', authenticate, authController.updateProfile);

  // ROOM ROUTES

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

// BOOKING ROUTES
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
router.get('/bookings/my-bookings', authenticate, bookingController.getMyBookings);

// Get all bookings (staff and admin only)
router.get(
  '/bookings',
  authenticate,
  authorize(UserRole.STAFF, UserRole.ADMIN),
  bookingController.getAllBookings
);

// Get specific booking
router.get('/bookings/:id', authenticate, bookingController.getBookingById);

// Cancel booking
router.post('/bookings/:id/cancel', authenticate, bookingController.cancelBooking);

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

// Development / Test routes

// Test email endpoint — sends a simple email to the configured EMAIL_USER.
// Keep for testing; optionally protect with authenticate/authorize for production.
router.get('/test-email', async (_req, res) => {
  try {
    const to = process.env.EMAIL_USER;
    if (!to) {
      return res.status(400).json({ success: false, message: 'EMAIL_USER not configured' });
    }

    const success = await emailService.sendEmail({
      to,
      subject: 'Test Email - Hotel Booking System',
      html: `
        <h2>Test Email</h2>
        <p>If you receive this message in your inbox, Gmail SMTP is configured correctly.</p>
      `
    });

    return res.json({
      success,
      message: success
        ? 'Email sent successfully (check Inbox & Sent in Gmail)'
        : 'Email failed to send (check server logs)'
    });
  } catch (err: any) {
    console.error('TEST EMAIL ERROR:', err);
    return res.status(500).json({ success: false, message: err.message || 'Error sending test email' });
  }
});

export default router;