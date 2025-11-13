// middleware/auth.ts

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthToken, UserRole } from '../types';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthToken;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        success: false, 
        message: 'Authentication required. Please provide a valid token.' 
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as AuthToken;
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token. Please login again.' 
      });
      return;
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Authentication error occurred.' 
    });
    return;
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        success: false, 
        message: `Access denied. Required roles: ${roles.join(', ')}` 
      });
      return;
    }

    next();
  };
};

// Middleware to check if user is accessing their own resources or is staff/admin
export const authorizeOwnerOrStaff = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ 
      success: false, 
      message: 'Authentication required.' 
    });
    return;
  }

  const userId = req.params.userId || req.params.id;
  const isOwner = req.user.userId === userId;
  const isStaffOrAdmin = [UserRole.STAFF, UserRole.ADMIN].includes(req.user.role);

  if (!isOwner && !isStaffOrAdmin) {
    res.status(403).json({ 
      success: false, 
      message: 'Access denied. You can only access your own resources.' 
    });
    return;
  }

  next();
};
