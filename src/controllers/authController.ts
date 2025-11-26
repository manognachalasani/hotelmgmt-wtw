// controllers/authController.ts

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { db } from '../database';
import { config } from '../config';
import { User, UserRole, AuthToken } from '../types';

// Helper function to serialize user dates
const serializeUser = (user: User) => {
  const { password: _, ...userWithoutPassword } = user;
  return {
    ...userWithoutPassword,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Sanitize inputs
    const sanitizedEmail = email ? email.trim().toLowerCase() : '';
    const sanitizedFirstName = firstName ? firstName.trim() : '';
    const sanitizedLastName = lastName ? lastName.trim() : '';
    const sanitizedPhone = phone ? phone.trim() : '';

    // Check if user already exists
    const existingUser = db.getUserByEmail(sanitizedEmail);
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser: User = {
      id: uuidv4(),
      email: sanitizedEmail,
      password: hashedPassword,
      role: UserRole.GUEST,
      firstName: sanitizedFirstName,
      lastName: sanitizedLastName,
      phone: sanitizedPhone,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    db.createUser(newUser);

    // Generate token
    const tokenPayload: AuthToken = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role
    };

    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: '7d'
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: serializeUser(newUser),
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Sanitize email
    const sanitizedEmail = email ? email.trim().toLowerCase() : '';

    // Find user by email
    const user = db.getUserByEmail(sanitizedEmail);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }

    // Generate token
    const tokenPayload: AuthToken = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: '7d'
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: serializeUser(user),
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const user = db.getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: serializeUser(user)
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile'
    });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const { firstName, lastName, phone } = req.body;

    const updates: Partial<User> = {};
    if (firstName) {
      const sanitized = firstName.trim();
      if (sanitized.length > 0) {
        updates.firstName = sanitized;
      }
    }
    if (lastName) {
      const sanitized = lastName.trim();
      if (sanitized.length > 0) {
        updates.lastName = sanitized;
      }
    }
    if (phone) {
      const sanitized = phone.trim();
      if (sanitized.length > 0) {
        updates.phone = sanitized;
      }
    }

    const updatedUser = db.updateUser(req.user.userId, updates);

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: serializeUser(updatedUser)
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Only admins can get all users
    if (req.user.role !== UserRole.ADMIN) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
      return;
    }

    const users = db.getAllUsers();
    const allBookings = db.getAllBookings();
    
    // Filter to get only guests (GUEST role) and enrich with booking data
    const guests = users
      .filter(user => user.role === UserRole.GUEST)
      .map(user => {
        const userBookings = allBookings.filter(booking => booking.guestId === user.id);
        const confirmedBookings = userBookings.filter(b => 
          b.status === 'CONFIRMED' || b.status === 'CHECKED_IN' || b.status === 'CHECKED_OUT'
        );
        
        // Find last stay date
        let lastStay: string | null = null;
        if (confirmedBookings.length > 0) {
          const lastBooking = confirmedBookings.sort((a, b) => 
            new Date(b.checkOutDate).getTime() - new Date(a.checkOutDate).getTime()
          )[0];
          lastStay = lastBooking.checkOutDate instanceof Date 
            ? lastBooking.checkOutDate.toISOString().split('T')[0]
            : new Date(lastBooking.checkOutDate).toISOString().split('T')[0];
        }

        // Determine current status based on bookings
        let status = 'Checked-out';
        const activeBookings = userBookings.filter(b => 
          b.status === 'CHECKED_IN' || (b.status === 'CONFIRMED' && new Date(b.checkInDate) <= new Date())
        );
        const upcomingBookings = userBookings.filter(b => 
          b.status === 'CONFIRMED' && new Date(b.checkInDate) > new Date()
        );
        
        if (activeBookings.length > 0) {
          status = 'Checked-in';
        } else if (upcomingBookings.length > 0) {
          status = 'Upcoming';
        }

        return {
          ...serializeUser(user),
          bookingsCount: userBookings.length,
          lastStay,
          currentStatus: status
        };
      });

    res.status(200).json({
      success: true,
      data: guests,
      count: guests.length
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users'
    });
  }
};
