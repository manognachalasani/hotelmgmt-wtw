// middleware/validation.ts

import { Request, Response, NextFunction } from 'express';
import { RoomType } from '../types';

export const validateRegistration = (req: Request, res: Response, next: NextFunction): void => {
  const { email, password, firstName, lastName, phone } = req.body;

  const errors: string[] = [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Valid email is required');
  }

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!firstName || firstName.trim().length === 0) {
    errors.push('First name is required');
  }

  if (!lastName || lastName.trim().length === 0) {
    errors.push('Last name is required');
  }

  if (!phone || !/^\+?[\d\s-()]+$/.test(phone)) {
    errors.push('Valid phone number is required');
  }

  if (errors.length > 0) {
    res.status(400).json({ 
      success: false, 
      message: 'Validation failed', 
      errors 
    });
    return;
  }

  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
  const { email, password } = req.body;

  const errors: string[] = [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Valid email is required');
  }

  if (!password) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    res.status(400).json({ 
      success: false, 
      message: 'Validation failed', 
      errors 
    });
    return;
  }

  next();
};

export const validateRoomCreation = (req: Request, res: Response, next: NextFunction): void => {
  const { roomNumber, type, pricePerNight, capacity, floor } = req.body;

  const errors: string[] = [];

  if (!roomNumber || typeof roomNumber !== 'string') {
    errors.push('Room number is required');
  }

  if (!type || !Object.values(RoomType).includes(type)) {
    errors.push(`Invalid room type. Must be one of: ${Object.values(RoomType).join(', ')}`);
  }

  if (!pricePerNight || typeof pricePerNight !== 'number' || pricePerNight <= 0) {
    errors.push('Valid price per night is required');
  }

  if (!capacity || typeof capacity !== 'number' || capacity <= 0) {
    errors.push('Valid capacity is required');
  }

  if (floor === undefined || typeof floor !== 'number' || floor < 0) {
    errors.push('Valid floor number is required');
  }

  if (errors.length > 0) {
    res.status(400).json({ 
      success: false, 
      message: 'Validation failed', 
      errors 
    });
    return;
  }

  next();
};

export const validateBookingRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { roomId, checkInDate, checkOutDate, numberOfGuests } = req.body;

  const errors: string[] = [];

  if (!roomId || typeof roomId !== 'string') {
    errors.push('Room ID is required');
  }

  if (!checkInDate || isNaN(Date.parse(checkInDate))) {
    errors.push('Valid check-in date is required');
  }

  if (!checkOutDate || isNaN(Date.parse(checkOutDate))) {
    errors.push('Valid check-out date is required');
  }

  if (checkInDate && checkOutDate) {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      errors.push('Check-in date cannot be in the past');
    }

    if (checkOut <= checkIn) {
      errors.push('Check-out date must be after check-in date');
    }

    const daysDiff = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 30) {
      errors.push('Maximum booking duration is 30 days');
    }
  }

  if (!numberOfGuests || typeof numberOfGuests !== 'number' || numberOfGuests <= 0) {
    errors.push('Valid number of guests is required');
  }

  if (errors.length > 0) {
    res.status(400).json({ 
      success: false, 
      message: 'Validation failed', 
      errors 
    });
    return;
  }

  next();
};

export const validateAvailabilityQuery = (req: Request, res: Response, next: NextFunction): void => {
  const { checkInDate, checkOutDate } = req.query;

  const errors: string[] = [];

  if (!checkInDate || isNaN(Date.parse(checkInDate as string))) {
    errors.push('Valid check-in date is required');
  }

  if (!checkOutDate || isNaN(Date.parse(checkOutDate as string))) {
    errors.push('Valid check-out date is required');
  }

  if (checkInDate && checkOutDate) {
    const checkIn = new Date(checkInDate as string);
    const checkOut = new Date(checkOutDate as string);

    if (checkOut <= checkIn) {
      errors.push('Check-out date must be after check-in date');
    }
  }

  if (errors.length > 0) {
    res.status(400).json({ 
      success: false, 
      message: 'Validation failed', 
      errors 
    });
    return;
  }

  next();
};
