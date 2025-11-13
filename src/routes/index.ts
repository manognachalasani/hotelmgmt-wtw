// database/index.ts

import { User, Room, Booking, Payment, RoomType, UserRole } from '../types';
import bcrypt from 'bcryptjs';

// Thread-safe in-memory database with locking mechanism
class Database {
  private users: Map<string, User> = new Map();
  private rooms: Map<string, Room> = new Map();
  private bookings: Map<string, Booking> = new Map();
  private payments: Map<string, Payment> = new Map();
  private locks: Map<string, boolean> = new Map();

  constructor() {
    this.initializeData();
  }

  // Lock mechanism for preventing race conditions
  async acquireLock(resourceId: string, timeout: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    
    while (this.locks.get(resourceId)) {
      if (Date.now() - startTime > timeout) {
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.locks.set(resourceId, true);
    return true;
  }

  releaseLock(resourceId: string): void {
    this.locks.delete(resourceId);
  }

  private async initializeData() {
    // Create default admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    this.users.set('admin-1', {
      id: 'admin-1',
      email: 'admin@hotel.com',
      password: adminPassword,
      role: UserRole.ADMIN,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567890',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create staff user
    const staffPassword = await bcrypt.hash('staff123', 10);
    this.users.set('staff-1', {
      id: 'staff-1',
      email: 'staff@hotel.com',
      password: staffPassword,
      role: UserRole.STAFF,
      firstName: 'Staff',
      lastName: 'Member',
      phone: '+1234567891',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create sample rooms
    const roomsData = [
      { number: '101', type: RoomType.SINGLE, price: 100, capacity: 1, floor: 1 },
      { number: '102', type: RoomType.SINGLE, price: 100, capacity: 1, floor: 1 },
      { number: '201', type: RoomType.DOUBLE, price: 150, capacity: 2, floor: 2 },
      { number: '202', type: RoomType.DOUBLE, price: 150, capacity: 2, floor: 2 },
      { number: '203', type: RoomType.DOUBLE, price: 150, capacity: 2, floor: 2 },
      { number: '301', type: RoomType.SUITE, price: 300, capacity: 4, floor: 3 },
      { number: '302', type: RoomType.SUITE, price: 300, capacity: 4, floor: 3 },
      { number: '401', type: RoomType.DELUXE, price: 450, capacity: 3, floor: 4 },
      { number: '501', type: RoomType.PRESIDENTIAL, price: 1000, capacity: 6, floor: 5 }
    ];

    roomsData.forEach((room, index) => {
      const roomId = `room-${index + 1}`;
      this.rooms.set(roomId, {
        id: roomId,
        roomNumber: room.number,
        type: room.type,
        description: `Beautiful ${room.type.toLowerCase()} room with modern amenities`,
        pricePerNight: room.price,
        capacity: room.capacity,
        amenities: this.getAmenitiesForRoomType(room.type),
        floor: room.floor,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }

  private getAmenitiesForRoomType(type: RoomType): string[] {
    const baseAmenities = ['WiFi', 'TV', 'Air Conditioning', 'Mini Bar'];
    
    switch (type) {
      case RoomType.SINGLE:
        return [...baseAmenities];
      case RoomType.DOUBLE:
        return [...baseAmenities, 'Coffee Maker', 'Safe'];
      case RoomType.SUITE:
        return [...baseAmenities, 'Coffee Maker', 'Safe', 'Living Area', 'Kitchenette'];
      case RoomType.DELUXE:
        return [...baseAmenities, 'Coffee Maker', 'Safe', 'Living Area', 'Kitchenette', 'Balcony', 'Premium Bedding'];
      case RoomType.PRESIDENTIAL:
        return [...baseAmenities, 'Coffee Maker', 'Safe', 'Living Area', 'Full Kitchen', 'Balcony', 'Premium Bedding', 'Jacuzzi', 'Butler Service'];
      default:
        return baseAmenities;
    }
  }

  // User operations
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  createUser(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  deleteUser(id: string): boolean {
    return this.users.delete(id);
  }

  // Room operations
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  getRoomById(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  createRoom(room: Room): Room {
    this.rooms.set(room.id, room);
    return room;
  }

  updateRoom(id: string, updates: Partial<Room>): Room | undefined {
    const room = this.rooms.get(id);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, ...updates, updatedAt: new Date() };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }

  deleteRoom(id: string): boolean {
    return this.rooms.delete(id);
  }

  // Booking operations
  getAllBookings(): Booking[] {
    return Array.from(this.bookings.values());
  }

  getBookingById(id: string): Booking | undefined {
    return this.bookings.get(id);
  }

  getBookingsByGuestId(guestId: string): Booking[] {
    return Array.from(this.bookings.values()).filter(booking => booking.guestId === guestId);
  }

  getBookingsByRoomId(roomId: string): Booking[] {
    return Array.from(this.bookings.values()).filter(booking => booking.roomId === roomId);
  }

  createBooking(booking: Booking): Booking {
    this.bookings.set(booking.id, booking);
    return booking;
  }

  updateBooking(id: string, updates: Partial<Booking>): Booking | undefined {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    const updatedBooking = { ...booking, ...updates, updatedAt: new Date() };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  deleteBooking(id: string): boolean {
    return this.bookings.delete(id);
  }

  // Payment operations
  getAllPayments(): Payment[] {
    return Array.from(this.payments.values());
  }

  getPaymentById(id: string): Payment | undefined {
    return this.payments.get(id);
  }

  getPaymentByBookingId(bookingId: string): Payment | undefined {
    return Array.from(this.payments.values()).find(payment => payment.bookingId === bookingId);
  }

  createPayment(payment: Payment): Payment {
    this.payments.set(payment.id, payment);
    return payment;
  }

  updatePayment(id: string, updates: Partial<Payment>): Payment | undefined {
    const payment = this.payments.get(id);
    if (!payment) return undefined;
    
    const updatedPayment = { ...payment, ...updates, updatedAt: new Date() };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }
}

export const db = new Database();
