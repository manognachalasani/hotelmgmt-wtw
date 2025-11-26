export type UserRole = 'GUEST' | 'STAFF' | 'ADMIN';

export type RoomType = 'SINGLE' | 'DOUBLE' | 'SUITE' | 'DELUXE' | 'PRESIDENTIAL';

export interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
  count?: number;
}

export interface ApiErrorResponse {
  success: false;
  message?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

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
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  transactionId?: string;
  paidAt?: string;
}

export interface BookingRecord {
  id: string;
  guestId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalPrice: number;
  status: string;
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
  room?: Room;
  payment?: Payment;
}

export interface AvailabilityResult {
  roomId: string;
  roomNumber: string;
  type: RoomType;
  isAvailable: boolean;
  availableFrom?: string;
  pricePerNight: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSuccessPayload {
  user: AuthenticatedUser;
  token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  firstName: string;
  lastName: string;
  phone: string;
}

export interface BookingPayload {
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  specialRequests?: string;
}

export interface AvailabilityQuery {
  checkInDate: string;
  checkOutDate: string;
  roomType?: RoomType;
  minCapacity?: number;
  maxPrice?: number;
}

export interface RoomFilters {
  type?: RoomType | '';
  minCapacity?: string;
  maxPrice?: string;
}


