// services/emailService.ts

import nodemailer from 'nodemailer';
import { config } from '../config';
import { BookingConfirmationData, EmailOptions, Payment } from '../types';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.auth
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: config.email.from,
        to: options.to,
        subject: options.subject,
        html: options.html
      });
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      // In development, we'll return true to simulate successful email
      return config.nodeEnv === 'development';
    }
  }

  async sendBookingConfirmation(data: BookingConfirmationData): Promise<boolean> {
    const { booking, guest, room, payment } = data;

    // Safely convert dates (handle both Date objects and strings)
    const checkIn = booking.checkInDate instanceof Date ? booking.checkInDate : new Date(booking.checkInDate);
    const checkOut = booking.checkOutDate instanceof Date ? booking.checkOutDate : new Date(booking.checkOutDate);

    const checkInDate = checkIn.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const checkOutDate = checkOut.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
          }
          .booking-details {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: bold;
            color: #666;
          }
          .value {
            color: #333;
          }
          .total {
            background: #667eea;
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 14px;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Booking Confirmation</h1>
          <p>Thank you for choosing our hotel!</p>
        </div>
        
        <div class="content">
          <p>Dear ${guest.firstName} ${guest.lastName},</p>
          
          <p>Your booking has been confirmed! We're excited to welcome you to our hotel.</p>
          
          <div class="booking-details">
            <h2>Booking Details</h2>
            
            <div class="detail-row">
              <span class="label">Confirmation Number:</span>
              <span class="value">${booking.id.toUpperCase()}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Room Type:</span>
              <span class="value">${room.type}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Room Number:</span>
              <span class="value">${room.roomNumber}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Check-in:</span>
              <span class="value">${checkInDate}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Check-out:</span>
              <span class="value">${checkOutDate}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Number of Nights:</span>
              <span class="value">${nights}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Number of Guests:</span>
              <span class="value">${booking.numberOfGuests}</span>
            </div>
            
            ${booking.specialRequests ? `
            <div class="detail-row">
              <span class="label">Special Requests:</span>
              <span class="value">${booking.specialRequests}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="booking-details">
            <h2>Payment Information</h2>
            
            <div class="detail-row">
              <span class="label">Room Rate (per night):</span>
              <span class="value">$${room.pricePerNight.toFixed(2)}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Subtotal (${nights} nights):</span>
              <span class="value">$${(room.pricePerNight * nights).toFixed(2)}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Payment Status:</span>
              <span class="value">${payment.status}</span>
            </div>
            
            <div class="total">
              Total Amount: $${booking.totalPrice.toFixed(2)}
            </div>
          </div>
          
          <div style="text-align: center;">
            <p><strong>Check-in time:</strong> 3:00 PM<br>
            <strong>Check-out time:</strong> 11:00 AM</p>
          </div>
          
          <p>If you have any questions or need to modify your booking, please contact us at support@hotel.com or call +1-234-567-8900.</p>
          
          <p>We look forward to hosting you!</p>
          
          <p>Best regards,<br>
          The Hotel Team</p>
        </div>
        
        <div class="footer">
          <p>This is an automated confirmation email. Please do not reply.</p>
          <p>© 2025 Hotel Booking System. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: guest.email,
      subject: `Booking Confirmation - ${booking.id.toUpperCase()}`,
      html
    });
  }

  async sendBookingCancellation(
    data: Omit<BookingConfirmationData, 'payment'> & { payment?: Payment }
  ): Promise<boolean> {
    const { booking, guest, room } = data;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #dc3545;
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Booking Cancelled</h1>
        </div>
        
        <div class="content">
          <p>Dear ${guest.firstName} ${guest.lastName},</p>
          
          <p>Your booking (Confirmation #${booking.id.toUpperCase()}) has been cancelled as requested.</p>
          
          <p><strong>Cancelled Booking Details:</strong></p>
          <ul>
            <li>Room: ${room.type} - ${room.roomNumber}</li>
            <li>Check-in Date: ${(booking.checkInDate instanceof Date ? booking.checkInDate : new Date(booking.checkInDate)).toLocaleDateString()}</li>
            <li>Check-out Date: ${(booking.checkOutDate instanceof Date ? booking.checkOutDate : new Date(booking.checkOutDate)).toLocaleDateString()}</li>
          </ul>
          
          <p>If a refund is applicable, it will be processed within 5-7 business days.</p>
          
          <p>We hope to serve you in the future.</p>
          
          <p>Best regards,<br>
          The Hotel Team</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: guest.email,
      subject: `Booking Cancelled - ${booking.id.toUpperCase()}`,
      html
    });
  }
}

export const emailService = new EmailService();
