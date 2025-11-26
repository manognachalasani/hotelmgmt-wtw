export enum UserRole {
  GUEST = 'GUEST',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN'
}

export enum RoomType {
  SINGLE = 'SINGLE',
  DOUBLE = 'DOUBLE',
  SUITE = 'SUITE',
  DELUXE = 'DELUXE',
  PRESIDENTIAL = 'PRESIDENTIAL'
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Guest extends Omit<User, 'role'> {
  role: UserRole.GUEST;
  dateOfBirth?: Date;
  address?: string;
  nationality?: string;
  idNumber?: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  type: RoomType;
  description: string;
  pricePerNight: number;
  capacity: number;
  amenities: string[];
  floor: number;
  isAvailable: boolean;
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Booking {
  id: string;
  guestId: string;
  roomId: string;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfGuests: number;
  totalPrice: number;
  status: BookingStatus;
  specialRequests?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string;
  transactionId?: string;
  paidAt?: Date;
  processingFee?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthToken {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface RoomAvailability {
  roomId: string;
  roomNumber: string;
  type: RoomType;
  isAvailable: boolean;
  availableFrom?: Date;
  pricePerNight: number;
}

export interface BookingRequest {
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  specialRequests?: string;
}

export interface BookingResponse {
  booking: Booking;
  payment: Payment;
  room: Room;
  message: string;
}

export interface AvailabilityQuery {
  checkInDate?: string;
  checkOutDate?: string;
  roomType?: RoomType;
  minCapacity?: number;
  maxPrice?: number;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface BookingConfirmationData {
  booking: Booking;
  guest: Guest;
  room: Room;
  payment: Payment;
}