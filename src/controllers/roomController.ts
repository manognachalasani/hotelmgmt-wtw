// controllers/roomController.ts

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { Room, RoomType, BookingStatus } from '../types';

// Helper function to serialize room dates
const serializeRoom = (room: Room) => ({
  ...room,
  createdAt: room.createdAt.toISOString(),
  updatedAt: room.updatedAt.toISOString()
});

export const getAllRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, minPrice, maxPrice, minCapacity } = req.query;

    // Validate numeric query parameters
    if (minPrice && (isNaN(Number(minPrice)) || Number(minPrice) < 0)) {
      res.status(400).json({
        success: false,
        message: 'minPrice must be a non-negative number'
      });
      return;
    }

    if (maxPrice && (isNaN(Number(maxPrice)) || Number(maxPrice) < 0)) {
      res.status(400).json({
        success: false,
        message: 'maxPrice must be a non-negative number'
      });
      return;
    }

    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      res.status(400).json({
        success: false,
        message: 'minPrice cannot be greater than maxPrice'
      });
      return;
    }

    if (minCapacity && (isNaN(Number(minCapacity)) || Number(minCapacity) < 1)) {
      res.status(400).json({
        success: false,
        message: 'minCapacity must be a positive number'
      });
      return;
    }

    let rooms = db.getAllRooms();

    // Apply filters
    if (type) {
      rooms = rooms.filter(room => room.type === type);
    }
    if (minPrice) {
      rooms = rooms.filter(room => room.pricePerNight >= Number(minPrice));
    }
    if (maxPrice) {
      rooms = rooms.filter(room => room.pricePerNight <= Number(maxPrice));
    }
    if (minCapacity) {
      rooms = rooms.filter(room => room.capacity >= Number(minCapacity));
    }

    // Serialize dates in rooms
    const serializedRooms = rooms.map(serializeRoom);

    res.status(200).json({
      success: true,
      data: serializedRooms,
      count: serializedRooms.length
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve rooms'
    });
  }
};

export const getRoomById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || id.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid room ID'
      });
      return;
    }

    const room = db.getRoomById(id);
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: serializeRoom(room)
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve room'
    });
  }
};

export const createRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomNumber, type, description, pricePerNight, capacity, amenities, floor, images } = req.body;

    // Validate room number format
    if (!roomNumber || typeof roomNumber !== 'string' || roomNumber.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Room number is required and must be a non-empty string'
      });
      return;
    }

    // Sanitize description if provided
    const sanitizedDescription = description 
      ? description.trim().substring(0, 1000) // Limit to 1000 characters
      : undefined;

    // Validate amenities array if provided
    let sanitizedAmenities: string[] = [];
    if (amenities) {
      if (!Array.isArray(amenities)) {
        res.status(400).json({
          success: false,
          message: 'Amenities must be an array'
        });
        return;
      }
      sanitizedAmenities = amenities
        .filter((a: any) => typeof a === 'string')
        .map((a: string) => a.trim())
        .filter((a: string) => a.length > 0 && a.length <= 100)
        .slice(0, 20); // Limit to 20 amenities
    }

    // Check if room number already exists
    const existingRoom = db.getAllRooms().find(r => r.roomNumber === roomNumber.trim());
    if (existingRoom) {
      res.status(409).json({
        success: false,
        message: 'Room number already exists'
      });
      return;
    }

    const newRoom: Room = {
      id: uuidv4(),
      roomNumber: roomNumber.trim(),
      type: type as RoomType,
      description: sanitizedDescription || `Beautiful ${type.toLowerCase()} room`,
      pricePerNight,
      capacity,
      amenities: sanitizedAmenities,
      floor,
      isAvailable: true,
      images: Array.isArray(images) ? images.slice(0, 10) : [], // Limit to 10 images
      createdAt: new Date(),
      updatedAt: new Date()
    };

    db.createRoom(newRoom);

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: serializeRoom(newRoom)
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create room'
    });
  }
};

export const updateRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || id.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid room ID'
      });
      return;
    }

    const updates = req.body;

    // Don't allow updating room ID or creation date
    delete updates.id;
    delete updates.createdAt;

    // Sanitize description if provided
    if (updates.description && typeof updates.description === 'string') {
      updates.description = updates.description.trim().substring(0, 1000);
    }

    // Sanitize amenities if provided
    if (updates.amenities) {
      if (!Array.isArray(updates.amenities)) {
        res.status(400).json({
          success: false,
          message: 'Amenities must be an array'
        });
        return;
      }
      updates.amenities = updates.amenities
        .filter((a: any) => typeof a === 'string')
        .map((a: string) => a.trim())
        .filter((a: string) => a.length > 0 && a.length <= 100)
        .slice(0, 20);
    }

    // Sanitize room number if provided
    if (updates.roomNumber && typeof updates.roomNumber === 'string') {
      updates.roomNumber = updates.roomNumber.trim();
      if (updates.roomNumber.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Room number cannot be empty'
        });
        return;
      }
      // Check if new room number conflicts with existing room
      const existingRoom = db.getAllRooms().find(r => r.roomNumber === updates.roomNumber && r.id !== id);
      if (existingRoom) {
        res.status(409).json({
          success: false,
          message: 'Room number already exists'
        });
        return;
      }
    }

    const updatedRoom = db.updateRoom(id, updates);

    if (!updatedRoom) {
      res.status(404).json({
        success: false,
        message: 'Room not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Room updated successfully',
      data: serializeRoom(updatedRoom)
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update room'
    });
  }
};

export const deleteRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || id.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Invalid room ID'
      });
      return;
    }

    // Check if room exists
    const room = db.getRoomById(id);
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found'
      });
      return;
    }

    // Check if room has active bookings
    const roomBookings = db.getBookingsByRoomId(id);
    const hasActiveBookings = roomBookings.some(booking => 
      booking.status !== BookingStatus.CANCELLED && booking.status !== BookingStatus.CHECKED_OUT
    );

    if (hasActiveBookings) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete room with active bookings'
      });
      return;
    }

    const deleted = db.deleteRoom(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Room not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete room'
    });
  }
};

export const getRoomTypes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const roomTypes = Object.values(RoomType);
    
    res.status(200).json({
      success: true,
      data: roomTypes
    });
  } catch (error) {
    console.error('Get room types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve room types'
    });
  }
};
