import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Room, BookingPayload } from '../types/api';
import NavigationBar from './NavigationBar';

const RoomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingForm, setBookingForm] = useState<BookingPayload>({
    roomId: id || '',
    checkInDate: '',
    checkOutDate: '',
    numberOfGuests: 2,
    specialRequests: '',
  });
  const [activeTab, setActiveTab] = useState('Description');
  const [bookingLoading] = useState(false);

  useEffect(() => {
    const loadRoom = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const roomRes = await api.getRoomById(id);
        const loadedRoom = roomRes.data;
        setRoom(loadedRoom);
        // Update numberOfGuests to not exceed room capacity
        setBookingForm(prev => ({
          ...prev,
          roomId: id,
          numberOfGuests: Math.min(prev.numberOfGuests, loadedRoom.capacity),
        }));
      } catch (error: any) {
        console.error('Failed to load room:', error);
        if (error.message?.includes('404') || error.message?.includes('not found')) {
          alert('Room not found');
        } else {
          alert(error.message || 'Failed to load room details');
        }
      } finally {
        setLoading(false);
      }
    };
    loadRoom();
  }, [id]);

  const handleBookingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!api.isAuthenticated()) {
      navigate('/auth', { state: { returnTo: `/room/${id}`, bookingData: { room, bookingForm } } });
      return;
    }

    // Validate dates
    if (!bookingForm.checkInDate || !bookingForm.checkOutDate) {
      alert('Please select both check-in and check-out dates');
      return;
    }

    const checkIn = new Date(bookingForm.checkInDate);
    const checkOut = new Date(bookingForm.checkOutDate);
    if (checkOut <= checkIn) {
      alert('Check-out date must be after check-in date');
      return;
    }

    // Validate number of guests
    if (room && bookingForm.numberOfGuests > room.capacity) {
      alert(`This room can only accommodate ${room.capacity} guest${room.capacity === 1 ? '' : 's'}. Please adjust the number of guests.`);
      return;
    }

    // Ensure numberOfGuests is at least 1
    if (bookingForm.numberOfGuests < 1) {
      alert('Please select at least 1 guest');
      return;
    }

    // Calculate totals
    const { nights, subtotal, processingFee, total } = calculateTotal();

    // Navigate to payment page with booking data
    navigate('/payment', {
      state: {
        room,
        bookingForm,
        subtotal,
        processingFee,
        total,
        nights,
      },
    });
  };

  const calculateTotal = () => {
    if (!room || !bookingForm.checkInDate || !bookingForm.checkOutDate) return { nights: 0, subtotal: 0, processingFee: 0, total: 0 };
    
    const checkIn = new Date(bookingForm.checkInDate);
    const checkOut = new Date(bookingForm.checkOutDate);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const subtotal = room.pricePerNight * nights;
    const processingFee = Number((subtotal * 0.03).toFixed(2)); // 3% processing fee (matches backend)
    const total = subtotal + processingFee;
    
    return { nights, subtotal, processingFee, total };
  };

  const getRoomImage = (room: Room): string => {
    const typeMap: Record<string, string> = {
      'DELUXE': 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3PMBR_1TtXUBW4_mdotm_tBx2xt9y_14VZoVZz3tpNuM35oVNsP_fBcUNo_Zm6krQJb-ZP9MOFBysGbFUeW29e5GpbaCECyswPJg4cTt1Q4U7WYmEpejRzcxtdL-a3Aqwxxg7eoviHzqFkkgFurEGCwCUB2bd5C0bWEPF5ctG4eJk5BD3ZKlnp_S0IJZU7PeR_5TjND9aRNI1Wb1zPS9IwmfwcD3fxpaiyMF5tqXxmgY2kCOZFG8LSTlgKvT95oteV895jcWc1G0',
      'DOUBLE': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRhhFpLDP8-yjTej55_oe0IvdMmMs2mFiJyleYoSJi1J56yPn-64bHYBqw-pJgCqiJ84u0N4njASAdJYNZ-biB3TqdOHOKlwMdNccb5D4-_9qnZx2Z0gAaEoBDuo7apB8EUDGnCJsuprX-WzEqw8TNstA8rivN4rc-QAN3L6cC4OcCUhEfaOz6PB7W6hqfqyphAgYCf3xXfjGUeyi54ejJiZiScCjoOQl_ts4YlTsr-qxQHTZK4e5OMopiGaTY-IZy1gzObYtNHmo',
      'SUITE': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxeHX7vxlscyUKKmGLRIKw0kDmtatTyxM02tP-5b3vSrWP3Y7zl3hM2XaKX5MmlVGlS6fhgU8J9WPN-JxeLJ_XMF_HOCveemiMQyubSZyQLaBFlJ1QB1aINahekhUjGAAYqtLCnoBtboCJ3ZXt6aCr-gg4uo0U2DaoOY_hH-B2tL0zxeQBwX8sFbmd_ML88iixntu2MfkVI7FgVdNg1gdOviy34OTRtLSq99-zq4W5mZnMN-Y4rbZyu28N0iRvFzIfDoEfjm_nYsE',
      'SINGLE': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCC0E29muOOCx8lbUlmZCHEQ9hQGYSEWydT-ztN_QPcMhmG3dfIvVzSi_PnRSUEKT4vlarrLSX--m3XaVgCvWd4-kB7X9Qj_7fVFutI41qhXcZ8yKMdwKAICFRnBSQvr2tyl1UDAp3eh0eKal2Bwf_ibLv3k-3MRGW-Tkdi-1eET1dEdmVWeKg7RtMbUSPl5HciuQ9rM_WPgFmjBMdzUKaEUNr4W4m66jgeW0554f-ijF0QZw5l8QXnm439AW2g5_GwrBU3D6DYIzA',
    };
    return typeMap[room.type] || typeMap['DELUXE'];
  };

  const { nights, subtotal, processingFee, total } = calculateTotal();

  if (loading) {
    return (
      <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden">
        <NavigationBar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-lg text-slate-600 dark:text-slate-400">Loading room details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden">
        <NavigationBar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">Room not found</p>
            <Link 
              to="/"
              className="text-primary hover:underline no-underline"
            >
              Return to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden">
      <NavigationBar />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumbs */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <Link 
                to="/" 
                className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary text-sm font-medium transition-colors no-underline"
              >
                Home
              </Link>
              <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">/</span>
              <Link 
                to="/rooms" 
                className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary text-sm font-medium transition-colors no-underline"
              >
                Rooms
              </Link>
              <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">/</span>
              <span className="text-neutral-dark dark:text-neutral-light text-sm font-medium">{room.roomNumber} - {room.type}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8 xl:gap-12">
            {/* Left Column: Image Gallery */}
            <div className="lg:col-span-3">
              <div className="flex flex-col gap-4">
                {/* Main Image */}
                <div 
                  className="bg-cover bg-center flex flex-col justify-end overflow-hidden rounded-xl aspect-[4/3]" 
                  data-alt={`${room.roomNumber} - ${room.type}`}
                  style={{ backgroundImage: `url('${getRoomImage(room)}')` }}
                ></div>
                {/* Thumbnails */}
                <div className="grid grid-cols-5 gap-4">
                  <div 
                    className="bg-cover bg-center rounded-lg aspect-square cursor-pointer border-2 border-primary" 
                    data-alt={`${room.roomNumber} main view thumbnail`}
                    style={{ backgroundImage: `url('${getRoomImage(room)}')` }}
                  ></div>
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i} 
                      className="bg-cover bg-center rounded-lg aspect-square cursor-pointer opacity-70 hover:opacity-100 transition-opacity" 
                      data-alt={`${room.roomNumber} view ${i} thumbnail`}
                      style={{ backgroundImage: `url('${getRoomImage(room)}')` }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Details & Booking */}
            <div className="lg:col-span-2">
              <div className="sticky top-24">
                {/* Page Heading */}
                <div className="mb-4">
                  <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-neutral-dark dark:text-neutral-light">{room.roomNumber} - {room.type}</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-2">{room.description}</p>
                </div>

                {/* Rating Summary */}
                <div className="flex items-center gap-3 mb-6 text-sm">
                  <div className="flex items-center gap-1 text-accent">
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className="material-symbols-outlined !text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    ))}
                    <span className="material-symbols-outlined !text-xl">star_half</span>
                  </div>
                  <span className="font-bold text-neutral-dark dark:text-neutral-light">4.8</span>
                  <span className="text-slate-500 dark:text-slate-400">(125 reviews)</span>
                </div>

                {/* Icon Features */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8 text-center">
                  <div className="flex flex-col items-center gap-2 p-2 rounded-lg bg-neutral-light dark:bg-neutral-dark/30">
                    <span className="material-symbols-outlined text-primary !text-2xl">group</span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{room.capacity} {room.capacity === 1 ? 'Guest' : 'Guests'}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-2 rounded-lg bg-neutral-light dark:bg-neutral-dark/30">
                    <span className="material-symbols-outlined text-primary !text-2xl">bed</span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">1 King Bed</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-2 rounded-lg bg-neutral-light dark:bg-neutral-dark/30">
                    <span className="material-symbols-outlined text-primary !text-2xl">balcony</span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Private Balcony</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-2 rounded-lg bg-neutral-light dark:bg-neutral-dark/30">
                    <span className="material-symbols-outlined text-primary !text-2xl">square_foot</span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">55 m²</span>
                  </div>
                </div>

                {/* Booking Form Card */}
                <div className="bg-white dark:bg-background-dark p-4 sm:p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <h3 className="text-lg font-bold text-neutral-dark dark:text-neutral-light mb-1">Create Your Booking</h3>
                  <p className="text-2xl font-black text-primary mb-6">${room.pricePerNight} <span className="text-sm font-medium text-slate-500 dark:text-slate-400">/ night</span></p>
                  <form onSubmit={handleBookingSubmit} className="grid grid-cols-2 gap-3 sm:gap-4 w-full min-w-0">
                    <div className="col-span-2 sm:col-span-1 min-w-0">
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="check-in">Check-in</label>
                      <input 
                        className="w-full min-w-0 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:border-primary focus:ring-primary text-sm px-3 py-2" 
                        id="check-in" 
                        type="date"
                        value={bookingForm.checkInDate}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, checkInDate: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 min-w-0">
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="check-out">Check-out</label>
                      <input 
                        className="w-full min-w-0 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:border-primary focus:ring-primary text-sm px-3 py-2" 
                        id="check-out" 
                        type="date"
                        value={bookingForm.checkOutDate}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, checkOutDate: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-span-1 min-w-0">
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="adults">Adults</label>
                      <select 
                        className="w-full min-w-0 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:border-primary focus:ring-primary text-sm px-3 py-2" 
                        id="adults"
                        value={bookingForm.numberOfGuests}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, numberOfGuests: Number(e.target.value) }))}
                        required
                      >
                        {Array.from({ length: room.capacity }, (_, i) => i + 1).map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1 min-w-0">
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="children">Children</label>
                      <select 
                        className="w-full min-w-0 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:border-primary focus:ring-primary text-sm px-3 py-2" 
                        id="children"
                      >
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                      </select>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="requests">Special Requests</label>
                      <textarea 
                        className="w-full min-w-0 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:border-primary focus:ring-primary text-sm px-3 py-2 resize-y" 
                        id="requests" 
                        placeholder="e.g. late check-in, feather-free pillows..." 
                        rows={3}
                        value={bookingForm.specialRequests}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, specialRequests: e.target.value }))}
                      ></textarea>
                    </div>
                    {nights > 0 && (
                      <div className="col-span-2 mt-4">
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="text-slate-500 dark:text-slate-400">${room.pricePerNight} x {nights} nights</span>
                          <span className="text-neutral-dark dark:text-neutral-light font-medium">${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Processing Fee (3%)</span>
                          <span className="text-neutral-dark dark:text-neutral-light font-medium">${processingFee.toFixed(2)}</span>
                        </div>
                        <hr className="my-3 border-slate-200 dark:border-slate-700"/>
                        <div className="flex justify-between items-center text-lg font-bold">
                          <span className="text-neutral-dark dark:text-neutral-light">Total</span>
                          <span className="text-primary">${total.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                    <div className="col-span-2 mt-4 text-center">
                      {api.isAuthenticated() ? (
                        <button 
                          type="submit"
                          disabled={bookingLoading}
                          className="w-full flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-base font-bold leading-normal tracking-wide shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="truncate">{bookingLoading ? 'Processing...' : 'Proceed to Payment'}</span>
                        </button>
                      ) : (
                        <>
                          <button 
                            type="button"
                            onClick={() => navigate('/auth', { state: { returnTo: `/room/${id}`, bookingData: { room, bookingForm } } })}
                            className="w-full flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-slate-200 dark:bg-slate-700 text-neutral-dark dark:text-neutral-light text-base font-bold leading-normal tracking-wide shadow-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                          >
                            <span className="truncate">Login to Book</span>
                          </button>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Create an account to save your details for future bookings.</p>
                        </>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="mt-12">
            <div className="border-b border-slate-200 dark:border-slate-700">
              <nav aria-label="Tabs" className="-mb-px flex space-x-8">
                <button 
                  onClick={() => setActiveTab('Description')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'Description' ? 'text-primary border-primary' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  type="button"
                >
                  Description
                </button>
                <button 
                  onClick={() => setActiveTab('Amenities')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'Amenities' ? 'text-primary border-primary' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  type="button"
                >
                  Amenities
                </button>
                <button 
                  onClick={() => setActiveTab('Policies')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'Policies' ? 'text-primary border-primary' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  type="button"
                >
                  Hotel Policies
                </button>
              </nav>
            </div>
            <div className="py-6">
              {activeTab === 'Description' && (
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <p>{room.description}</p>
                  <p>Indulge in the ultimate coastal getaway in our {room.type} room. This spacious room offers a serene and luxurious retreat with modern amenities and comfortable furnishings.</p>
                </div>
              )}
              {activeTab === 'Amenities' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {room.amenities.map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span className="material-symbols-outlined text-primary">check_circle</span>
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'Policies' && (
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <p>Check-in: 3:00 PM | Check-out: 11:00 AM</p>
                  <p>Cancellation policies apply. Please review terms and conditions before booking.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RoomDetailPage;
