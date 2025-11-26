import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { BookingRecord } from '../types/api';

const BookingConfirmationPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setError('Booking ID is required');
        setLoading(false);
        return;
      }

      try {
        const response = await api.getBookingById(bookingId);
        setBooking(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateString: string, defaultTime: string) => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (hours === 0 && minutes === 0) {
      return defaultTime;
    }
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Generate booking reference from ID (format: first 8 alphanumeric chars, uppercase)
  const getBookingReference = (id: string) => {
    // Remove hyphens and take first 8 characters, make uppercase
    const cleaned = id.replace(/-/g, '').toUpperCase();
    return cleaned.substring(0, 8) || id.substring(0, 8).toUpperCase();
  };

  // Calculate number of nights
  const calculateNights = (checkIn: string, checkOut: string) => {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Calculate price breakdown
  const getPriceBreakdown = () => {
    if (!booking || !booking.room) return null;
    
    const nights = calculateNights(booking.checkInDate, booking.checkOutDate);
    const nightlyRate = booking.room.pricePerNight;
    const subtotal = nights * nightlyRate;
    
    // Use payment data if available, otherwise calculate from booking
    let processingFee = 0;
    let total = booking.totalPrice;
    
    if (booking.payment) {
      // Use payment.amount as the actual total (includes processing fee)
      total = booking.payment.amount;
      // Calculate processing fee from payment data
      if (booking.payment.processingFee !== undefined) {
        processingFee = booking.payment.processingFee;
      } else {
        // Fallback: calculate processing fee (3% of subtotal)
        processingFee = Number((subtotal * 0.03).toFixed(2));
      }
    } else {
      // Fallback: calculate processing fee (3% of subtotal) if payment data not available
      processingFee = Number((subtotal * 0.03).toFixed(2));
      total = subtotal + processingFee;
    }
    
    return {
      nights,
      nightlyRate,
      subtotal,
      processingFee,
      total
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAddToCalendar = () => {
    if (!booking) return;
    
    const checkInDate = new Date(booking.checkInDate);
    const checkOutDate = new Date(booking.checkOutDate);
    
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Serene Stays//Booking Confirmation//EN',
      'BEGIN:VEVENT',
      `DTSTART:${formatICSDate(checkInDate)}`,
      `DTEND:${formatICSDate(checkOutDate)}`,
      `SUMMARY:Hotel Booking - ${booking.room?.description || 'Room Booking'}`,
      `DESCRIPTION:Booking Reference: ${getBookingReference(booking.id)}\\nRoom: ${booking.room?.roomNumber || 'N/A'}`,
      `LOCATION:Hotel`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `booking-${getBookingReference(booking.id)}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Booking not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200">
      <header className="fixed top-0 z-30 w-full bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4 text-[#0d141b] dark:text-slate-50">
              <div className="size-6 text-primary">
                <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path clipRule="evenodd" d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z" fill="currentColor" fillRule="evenodd"></path>
                </svg>
              </div>
              <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">Serene Stays</h2>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer" onClick={() => navigate('/')}>Home</a>
              <a className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer" onClick={() => navigate('/')}>My Bookings</a>
              <a className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer" onClick={() => navigate('/rooms')}>Destinations</a>
              <a className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer">Support</a>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  localStorage.removeItem('token');
                  navigate('/auth');
                }}
                className="hidden sm:flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors"
              >
                <span className="truncate">Log Out</span>
              </button>
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-slate-300 dark:bg-slate-700"></div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-16">
        <div className="container mx-auto px-4 py-8 md:py-16">
          <div className="max-w-4xl mx-auto flex flex-col gap-8">
            {/* Confirmation Header */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-4 sm:p-6 md:p-8 text-center border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="flex justify-center mb-4">
                <div className="flex items-center justify-center size-16 rounded-full bg-green-100 dark:bg-green-900/50">
                  <svg className="w-10 h-10 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-bold leading-tight tracking-tight">Booking Confirmed!</h1>
              <p className="text-slate-600 dark:text-slate-400 text-base font-normal leading-normal mt-2">
                Your stay is booked. A confirmation email with all your booking details has been sent to your registered email address.
              </p>
              <div className="mt-6 bg-slate-100 dark:bg-slate-800 rounded-lg p-3 inline-block">
                <h2 className="text-slate-600 dark:text-slate-300 text-base font-bold leading-tight tracking-[-0.015em]">
                  Booking Reference: <span className="text-slate-900 dark:text-slate-50 font-mono">{getBookingReference(booking.id)}</span>
                </h2>
              </div>
            </div>

            {/* Booking Details Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-800">
              <div 
                className="w-full h-48 bg-center bg-no-repeat bg-cover bg-slate-300 dark:bg-slate-700"
                style={{
                  backgroundImage: booking.room?.images && booking.room.images.length > 0 ? `url(${booking.room.images[0]})` : undefined
                }}
              ></div>
              <div className="p-4 sm:p-6 md:p-8 overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 min-w-0">
                  <div>
                    <p className="text-primary text-sm font-bold leading-normal">Your Reservation</p>
                    <p className="text-slate-900 dark:text-white text-2xl font-bold leading-tight tracking-tight mt-1">Room {booking.room?.roomNumber || 'N/A'}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal mt-1">{booking.room?.description || 'Hotel Room'}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-4 md:mt-0">
                    <button
                      onClick={handlePrint}
                      className="flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-lg h-10 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      <span className="truncate">Print</span>
                    </button>
                    <button
                      onClick={handleAddToCalendar}
                      className="flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-lg h-10 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">Add to Calendar</span>
                    </button>
                  </div>
                </div>

                <hr className="my-6 border-slate-200 dark:border-slate-800" />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 min-w-0">
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Check-in</p>
                    <p className="text-slate-900 dark:text-white font-bold break-words">{formatDate(booking.checkInDate)}</p>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">From {formatTime(booking.checkInDate, '3:00 PM')}</p>
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Check-out</p>
                    <p className="text-slate-900 dark:text-white font-bold break-words">{formatDate(booking.checkOutDate)}</p>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">By {formatTime(booking.checkOutDate, '11:00 AM')}</p>
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Guests</p>
                    <p className="text-slate-900 dark:text-white font-bold">{booking.numberOfGuests} {booking.numberOfGuests === 1 ? 'Guest' : 'Guests'}</p>
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Room</p>
                    <p className="text-slate-900 dark:text-white font-bold break-words">{booking.room?.type || 'N/A'}</p>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">Room {booking.room?.roomNumber || 'N/A'}</p>
                  </div>
                </div>

                {/* Price Breakdown */}
                {(() => {
                  const priceBreakdown = getPriceBreakdown();
                  if (!priceBreakdown) return null;
                  
                  return (
                    <div className="mt-8 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3">Price Breakdown</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">
                            {priceBreakdown.nights} {priceBreakdown.nights === 1 ? 'night' : 'nights'} x ${priceBreakdown.nightlyRate.toFixed(2)}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200 font-medium">${priceBreakdown.subtotal.toFixed(2)}</span>
                        </div>
                        {priceBreakdown.processingFee > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Processing Fee (3%)</span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">${priceBreakdown.processingFee.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      <hr className="my-3 border-slate-200 dark:border-slate-700" />
                      <div className="flex justify-between font-bold text-base">
                        <span className="text-slate-900 dark:text-white">Total Paid</span>
                        <span className="text-slate-900 dark:text-white">${priceBreakdown.total.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4">
              <button
                onClick={() => navigate('/')}
                className="w-full sm:w-auto flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors"
              >
                <span className="truncate">Go to My Bookings</span>
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full sm:w-auto flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-base font-bold leading-normal tracking-[0.015em] hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="truncate">Back to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-6 text-sm text-slate-500 dark:text-slate-400">
            <p>© 2024 Serene Stays. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a className="hover:text-primary transition-colors cursor-pointer">Terms of Service</a>
              <a className="hover:text-primary transition-colors cursor-pointer">Privacy Policy</a>
              <a className="hover:text-primary transition-colors cursor-pointer">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BookingConfirmationPage;

