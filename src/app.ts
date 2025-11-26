// app.ts

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import routes from './routes';

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Security headers - Configure for development
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Request timeout
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.setTimeout(30000); // 30 seconds
  next();
});

// ============================================
// SERVE FRONTEND
// ============================================
app.use(express.static('public'));

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Hotel Booking API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', routes);

// API Documentation (moved from root)
app.get('/api-info', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Hotel Booking System API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        updateProfile: 'PUT /api/auth/profile'
      },
      rooms: {
        getAll: 'GET /api/rooms',
        getById: 'GET /api/rooms/:id',
        getRoomTypes: 'GET /api/rooms/types',
        create: 'POST /api/rooms (Admin only)',
        update: 'PUT /api/rooms/:id (Admin/Staff only)',
        delete: 'DELETE /api/rooms/:id (Admin only)'
      },
      bookings: {
        checkAvailability: 'GET /api/bookings/availability',
        create: 'POST /api/bookings',
        getMyBookings: 'GET /api/bookings/my-bookings',
        getAllBookings: 'GET /api/bookings (Staff/Admin only)',
        getById: 'GET /api/bookings/:id',
        cancel: 'POST /api/bookings/:id/cancel',
        checkIn: 'POST /api/bookings/:id/check-in (Staff/Admin only)',
        checkOut: 'POST /api/bookings/:id/check-out (Staff/Admin only)'
      }
    },
    defaultCredentials: {
      admin: {
        email: 'admin@hotel.com',
        password: 'admin123'
      },
      staff: {
        email: 'staff@hotel.com',
        password: 'staff123'
      }
    }
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = config.port;

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🏨 Hotel Booking System API');
  console.log('='.repeat(60));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`📝 API URL: http://localhost:${PORT}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log('='.repeat(60));
  console.log('Default Credentials:');
  console.log('  Admin: admin@hotel.com / admin123');
  console.log('  Staff: staff@hotel.com / staff123');
  console.log('='.repeat(60));
});

export default app;
