// controllers/roomController.ts

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { Room, RoomType } from '../types';

export const getAllRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, minPrice, maxPrice, minCapacity } = req.query;

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

    res.status(200).json({
      success: true,
      data: rooms,
      count: rooms.length
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
      data: room
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

    // Check if room number already exists
    const existingRoom = db.getAllRooms().find(r => r.roomNumber === roomNumber);
    if (existingRoom) {
      res.status(409).json({
        success: false,
        message: 'Room number already exists'
      });
      return;
    }

    const newRoom: Room = {
      id: uuidv4(),
      roomNumber,
      type: type as RoomType,
      description: description || `Beautiful ${type.toLowerCase()} room`,
      pricePerNight,
      capacity,
      amenities: amenities || [],
      floor,
      isAvailable: true,
      images: images || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    db.createRoom(newRoom);

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: newRoom
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
    const updates = req.body;

    // Don't allow updating room ID or creation date
    delete updates.id;
    delete updates.createdAt;

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
      data: updatedRoom
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

    // Check if room has active bookings
    const roomBookings = db.getBookingsByRoomId(id);
    const hasActiveBookings = roomBookings.some(booking => 
      booking.status !== 'CANCELLED' && booking.status !== 'CHECKED_OUT'
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

export const getRoomTypes = async (req: Request, res: Response): Promise<void> => {
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
