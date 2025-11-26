# Hotel Booking System

A complete hotel booking system with room availability checking, reservation management, guest information handling, payment processing simulation, and booking confirmation emails. Features role-based access control with roles for guests, staff, and administrators.

## Features

✅ **Room Management**
- View all available rooms
- Filter rooms by type, capacity, and price
- Check room availability for specific dates
- View detailed room information

✅ **Booking System**
- Create bookings with date selection
- Real-time availability checking
- Prevent double-booking with concurrency control
- Booking confirmation emails
- Cancel bookings

✅ **Authentication & Authorization**
- User registration and login
- JWT-based authentication
- Role-based access control (Guest, Staff, Admin)
- Protected routes

✅ **Payment Processing**
- Simulated payment processing
- Payment status tracking
- Automatic booking confirmation on successful payment

✅ **User Dashboard**
- View personal bookings
- Booking history
- Booking status tracking

## Tech Stack

- **Backend**: Express.js, TypeScript, JWT, Nodemailer
- **Frontend**: React, TypeScript, Tailwind CSS, React Router
- **Database**: In-memory database (thread-safe with locking mechanism)

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation & Setup

### 1. Install Backend Dependencies

```bash
cd hotelmgmt-wtw
npm install
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 3. Build Backend (Optional - already built)

```bash
npm run build
```

### 4. Environment Variables (Optional)

The system works with default values, but you can create a `.env` file in the root directory for customization:

```env
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
```

**Note**: Email functionality will work in simulation mode without real credentials. For actual email sending, configure Gmail app password.

## Running the Application

### Option 1: Development Mode (Recommended)

**Terminal 1 - Start Backend:**
```bash
cd hotelmgmt-wtw
npm run dev
```

The backend will start on `http://localhost:4000`

**Terminal 2 - Start Frontend:**
```bash
cd hotelmgmt-wtw/frontend
npm start
```

The frontend will start on `http://localhost:3000` and automatically open in your browser.

### Option 2: Production Mode

**Terminal 1 - Start Backend:**
```bash
cd hotelmgmt-wtw
npm run build
npm start
```

**Terminal 2 - Start Frontend:**
```bash
cd hotelmgmt-wtw/frontend
npm run build
npm install -g serve
serve -s build
```

## Default Credentials

The system comes with pre-configured test accounts:

**Admin Account:**
- Email: `admin@hotel.com`
- Password: `admin123`

**Staff Account:**
- Email: `staff@hotel.com`
- Password: `staff123`

**Guest Account:**
- Register a new account through the registration form

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (authenticated)
- `PUT /api/auth/profile` - Update user profile (authenticated)

### Rooms
- `GET /api/rooms` - Get all rooms (with optional filters)
- `GET /api/rooms/:id` - Get room by ID
- `GET /api/rooms/types` - Get all room types
- `POST /api/rooms` - Create room (Admin only)
- `PUT /api/rooms/:id` - Update room (Admin/Staff only)
- `DELETE /api/rooms/:id` - Delete room (Admin only)

### Bookings
- `GET /api/bookings/availability` - Check room availability
- `POST /api/bookings` - Create booking (authenticated)
- `GET /api/bookings/my-bookings` - Get user's bookings (authenticated)
- `GET /api/bookings/:id` - Get booking by ID (authenticated)
- `POST /api/bookings/:id/cancel` - Cancel booking (authenticated)
- `GET /api/bookings` - Get all bookings (Staff/Admin only)
- `POST /api/bookings/:id/check-in` - Check-in guest (Staff/Admin only)
- `POST /api/bookings/:id/check-out` - Check-out guest (Staff/Admin only)

## Testing

Run backend tests:
```bash
npm test
```

## Project Structure

```
hotelmgmt-wtw/
├── src/                    # Backend source code
│   ├── app.ts             # Express app setup
│   ├── config/            # Configuration
│   ├── controllers/       # Route controllers
│   ├── database/          # In-memory database
│   ├── middleware/        # Auth & validation middleware
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   └── types/             # TypeScript types
├── frontend/              # Frontend React app
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/      # API service
│   │   └── types/         # TypeScript types
│   └── public/            # Static files
└── dist/                  # Compiled backend code
```

## Features Implementation Status

✅ All core features from the problem statement are implemented:
- Room availability checking
- Reservation management
- Guest information handling
- Payment processing simulation
- Booking confirmation emails
- Role-based access control
- Concurrent booking prevention
- Real-time room inventory management
- TypeScript interfaces for all entities
- Express middleware for validation and authorization

## Troubleshooting

**Backend won't start:**
- Check if port 4000 is available
- Ensure all dependencies are installed: `npm install`
- Check for TypeScript errors: `npm run build`

**Frontend won't start:**
- Check if port 3000 is available
- Ensure all dependencies are installed: `cd frontend && npm install`
- Clear cache: `rm -rf node_modules package-lock.json && npm install`

**API calls failing:**
- Ensure backend is running on port 4000
- Check browser console for CORS errors
- Verify API_BASE_URL in frontend (defaults to `http://localhost:4000/api`)

**Email not sending:**
- Email service works in simulation mode by default
- For real emails, configure Gmail app password in `.env` file

## License

MIT

