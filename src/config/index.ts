// config/index.ts

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: '7d'
  },
  
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    },
    from: process.env.EMAIL_FROM || 'Hotel Booking System <your-email@gmail.com>'
  },
  
  payment: {
    currency: 'USD',
    processingFee: 0.03
  },
  
  booking: {
    maxAdvanceBookingDays: 365,
    minBookingDays: 1,
    maxBookingDays: 30,
    cancellationPeriodHours: 24
  }
};