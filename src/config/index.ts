// config/index.ts

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  jwt: {
    secret: (process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production') as string,
    expiresIn: '7d'
  },
  
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    },
    from: process.env.EMAIL_FROM || 'Hotel Booking System <noreply@hotelbooking.com>'
  },
  
  payment: {
    currency: 'USD',
    processingFee: 0.03 // 3% processing fee
  },
  
  booking: {
    maxAdvanceBookingDays: 365,
    minBookingDays: 1,
    maxBookingDays: 30,
    cancellationPeriodHours: 24
  }
};

// .env.example file content:
/*
PORT=4000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Email Configuration (for Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=Hotel Booking System <noreply@hotelbooking.com>

# Database Configuration (if using a real database)
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=hotel_booking
# DB_USER=postgres
# DB_PASSWORD=password
*/
