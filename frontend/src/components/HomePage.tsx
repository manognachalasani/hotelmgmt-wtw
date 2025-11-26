import React, { useState, useEffect, FormEvent, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Room, AvailabilityResult, RoomType, BookingRecord } from '../types/api';
import NavigationBar from './NavigationBar';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AvailabilityResult[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [userBookings, setUserBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | ''>('');
  const [filterRoomType, setFilterRoomType] = useState<string>('');
  const [filterCapacity, setFilterCapacity] = useState<string>('');
  const [filterPrice, setFilterPrice] = useState<string>('');

  // Load rooms and room types on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [roomsRes, typesRes] = await Promise.all([
          api.getRooms(),
          api.getRoomTypes(),
        ]);
        setAllRooms(roomsRes.data);
        setRooms(roomsRes.data);
        setRoomTypes(typesRes.data);
      } catch (error: any) {
        console.error('Failed to load rooms:', error);
        alert(error.message || 'Failed to load rooms. Please make sure the backend server is running.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Load user bookings - memoized callback
  const loadUserBookings = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      setUserBookings([]);
      return;
    }
    
    setBookingsLoading(true);
    try {
      const bookingsRes = await api.getMyBookings();
      setUserBookings(bookingsRes.data);
    } catch (error: any) {
      console.error('Failed to load bookings:', error);
      // If token is invalid, clear it
      if (error.statusCode === 401 || error.message?.includes('401') || error.message?.includes('unauthorized')) {
        api.logout();
        setUserBookings([]);
      }
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  // Load bookings on mount and set up refresh interval
  useEffect(() => {
    loadUserBookings();
    
    // Refresh bookings periodically when authenticated
    const interval = setInterval(() => {
      if (api.isAuthenticated()) {
        loadUserBookings();
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [loadUserBookings]);

  // Listen for storage changes (e.g., login from another tab)
  useEffect(() => {
    const handleStorageChange = () => {
      if (api.isAuthenticated()) {
        loadUserBookings();
      } else {
        setUserBookings([]);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadUserBookings]);

  const handleCheckAvailability = async (e: FormEvent) => {
    e.preventDefault();
    if (!checkInDate || !checkOutDate) {
      alert('Please select both check-in and check-out dates');
      return;
    }

    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    if (checkOut <= checkIn) {
      alert('Check-out date must be after check-in date');
      return;
    }

    try {
      setLoading(true);
      const result = await api.checkAvailability({
        checkInDate,
        checkOutDate,
        roomType: selectedRoomType ? (selectedRoomType as RoomType) : undefined,
      });
      setAvailableRooms(result.data);
      
      // Filter rooms based on availability
      if (result.data.length > 0) {
        const availableRoomIds = result.data
          .filter(ar => ar.isAvailable)
          .map(ar => ar.roomId);
        setRooms(allRooms.filter(r => availableRoomIds.includes(r.id)));
      } else {
        setRooms([]);
        alert('No rooms available for the selected dates');
      }
    } catch (error: any) {
      console.error('Failed to check availability:', error);
      alert(error.message || 'Failed to check availability. Please make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      
      if (filterRoomType) {
        filters.type = filterRoomType;
      }
      if (filterCapacity) {
        const [min, max] = filterCapacity.split('-');
        if (max) {
          filters.minCapacity = parseInt(min);
        } else if (filterCapacity.includes('+')) {
          filters.minCapacity = parseInt(filterCapacity.replace('+', ''));
        }
      }
      if (filterPrice) {
        // Parse the price value - if it's "500+", use minPrice; otherwise use maxPrice
        if (filterPrice === '500+') {
          filters.minPrice = 500;
        } else {
          filters.maxPrice = Number(filterPrice);
        }
      }

      const roomsRes = await api.getRooms(filters);
      setRooms(roomsRes.data);
      setAllRooms(roomsRes.data);
      setAvailableRooms([]); // Clear availability results when applying filters
    } catch (error: any) {
      console.error('Failed to apply filters:', error);
      alert(error.message || 'Failed to apply filters. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await api.cancelBooking(bookingId);
      // Refresh bookings list
      await loadUserBookings();
      alert('Booking cancelled successfully');
    } catch (error: any) {
      alert(error.message || 'Failed to cancel booking');
    }
  };

  const getRoomImage = (room: Room): string => {
    const typeMap: Record<string, string> = {
      'DELUXE': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUrNdgbs8hW3i1Zpz_GVIy8ISWyKvoIFp_QOCNXDbY5Q-aVSw7EtovBJkPaIud7uVlCzLzWAX8q_PWblodGvRlXa9CAQgJXOSKVh40a02TCPtPLvx22GISd77MDDZIVEwhoPVEFzEMq4QvjETfgiEk6OqiRIFNRvL7tCIFkyABVcHq-sgWOF2p08tlX5A7eTpHnZZA--gXei55OsnpDuOUud1gX_UtqkPbNthJwixTweGth0MmA9X2ALFXlkY51ZK0ublVNXpO_ao',
      'DOUBLE': 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0b9ZNZfht0IlxrbDl9wjSxVLp7T1x18_gBYuf_XveKDhsjFBGqsLovJvzNXJ7of9DXYAeUPqKaNdy61_r6ogNNojFBlSkxofDeymICcPpIfhjoOnvZ26DIJeH1_YRpWSbc69oCjiqYX7dh1aANIeCukJWJbU2Yuln1dJZNTNjyTBGVCfWCUSayDri2utpxsxI_3VOw0KAG_Y-G4dX9Pi1NnrTuYDmcAc4BpiBaoyEabHCR4QiPIHgSZVcow1f9TLJNU-IdPjbNdM',
      'SUITE': 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAiXLt-ZGbxYa4sz30nUzvqPPcXVcxoS4LWmLpFPAZXvDJSfMIeO4kTLe-pvm0A0-x2349HDykBZpqbGZIG1YiwuNfm2AodGoNZIryRmb4NclJvGpOVsVG6jjzkNyrOVpEeuIwU4Q-yyeQGYfoUgdkHbDTYRufh14XAw2P8bIE-yBkzlExkauDT6D2ken5kg2fv8_RXxK48y4yPH1Z1Sw3-7bXaoIeZSQbOaIA49cx0oZVSQGEWjJ4pLeL-YDgmQPBzQ82m_pvRf8',
      'SINGLE': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgtqqEsAamRmdN4tLsL5gUr1cq2atAF9v0qJ6kPlJ4R2ZKXe4XIGdG-gD2Wgd7fwkUE0mVifGWKsDHdl5x3s19hJDjBqFABNUCtMqp-ii-ieyYTlt30Lsrpa3Lmq388ySpraint6sAhgHeIjgqoeDlBTxGAvJ0lSb9Hoigrl_7k3Avmfs8BLw_DDzbdBG6ZVhRETURCZvfXFwplHDde29EAJk0h98vUJ7kIjhPs-KNmzIwesSexgtq1Pzml48M5UpbAbU5SsY3qxU',
    };
    return typeMap[room.type] || typeMap['SINGLE'];
  };

  const displayedRooms = rooms;

  return (
    <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden">
      <NavigationBar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        <div className="grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column: Availability & Bookings */}
          <aside className="col-span-12 lg:col-span-4 space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Check Availability Module */}
            <section className="bg-white dark:bg-background-dark/50 rounded-xl shadow-sm p-4 sm:p-5 lg:p-6 overflow-hidden">
              <h3 className="text-xl sm:text-2xl font-black leading-tight tracking-[-0.033em] mb-4 sm:mb-6 text-[#0d141b] dark:text-slate-100">Find Your Perfect Stay</h3>
              <form onSubmit={handleCheckAvailability} className="space-y-4 w-full">
                {/* Calendar Picker */}
                <div className="w-full">
                  <p className="text-base font-medium leading-normal pb-2 text-[#0d141b] dark:text-slate-300">Check-in / Check-out</p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full min-w-0">
                    <div className="flex-1 min-w-0">
                      <input 
                        className="form-input w-full min-w-0 resize-none rounded-lg text-[#0d141b] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-[#cfdbe7] dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-12 sm:h-14 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-normal leading-normal" 
                        type="date" 
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <input 
                        className="form-input w-full min-w-0 resize-none rounded-lg text-[#0d141b] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-[#cfdbe7] dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-12 sm:h-14 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-normal leading-normal" 
                        type="date" 
                        value={checkOutDate}
                        onChange={(e) => setCheckOutDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Room Type Dropdown */}
                <label className="flex flex-col w-full">
                  <p className="text-base font-medium leading-normal pb-2 text-[#0d141b] dark:text-slate-300">Room Type</p>
                    <select 
                      className="form-select flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141b] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-[#cfdbe7] dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-12 sm:h-14 placeholder:text-[#4c739a] p-3 sm:p-[15px] text-sm sm:text-base font-normal leading-normal"
                      value={selectedRoomType}
                      onChange={(e) => setSelectedRoomType(e.target.value as RoomType | '')}
                    >
                    <option value="">Any room type</option>
                    {roomTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>

                {/* Check Availability Button */}
                <button 
                  type="submit"
                  className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-11 sm:h-12 px-4 sm:px-5 bg-primary text-slate-50 text-sm sm:text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors">
                  <span className="truncate">Check Availability</span>
                </button>
              </form>
            </section>

            {/* My Bookings Module */}
            <section className="bg-white dark:bg-background-dark/50 rounded-xl shadow-sm p-4 sm:p-5 lg:p-6">
              <h3 className="text-xl sm:text-2xl font-black leading-tight tracking-[-0.033em] mb-3 text-[#0d141b] dark:text-slate-100">My Bookings</h3>
              {!api.isAuthenticated() ? (
                <>
                  <p className="text-slate-600 dark:text-slate-400 mb-5 text-center">Please log in to see your active and past reservations.</p>
                  <Link 
                    to="/auth"
                    className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-[#e7edf3] dark:bg-slate-700 text-[#0d141b] dark:text-slate-200 text-base font-bold leading-normal tracking-[0.015em] hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors no-underline"
                  >
                    <span className="truncate">Login to see your bookings</span>
                  </Link>
                </>
              ) : bookingsLoading ? (
                <p className="text-slate-600 dark:text-slate-400 text-center">Loading bookings...</p>
              ) : userBookings.length === 0 ? (
                <>
                  <p className="text-slate-600 dark:text-slate-400 mb-5 text-center">You don't have any bookings yet.</p>
                  <Link 
                    to="/"
                    className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors no-underline"
                  >
                    <span className="truncate">Browse Rooms</span>
                  </Link>
                </>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {userBookings.map((booking) => (
                    <div key={booking.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-sm text-[#0d141b] dark:text-slate-100">
                            {booking.room?.roomNumber || 'Room'} - {booking.room?.type || 'N/A'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(booking.checkInDate).toLocaleDateString()} - {new Date(booking.checkOutDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          booking.status === 'CANCELLED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[#0d141b] dark:text-slate-200">${booking.totalPrice.toFixed(2)}</p>
                      {booking.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer bg-transparent border-none"
                          type="button"
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>

          {/* Right Column: Rooms Catalogue */}
          <main id="rooms" className="col-span-12 lg:col-span-8">
            <section className="bg-white dark:bg-background-dark/50 rounded-xl shadow-sm p-4 sm:p-5 lg:p-6">
              <h2 className="text-2xl sm:text-3xl font-black leading-tight tracking-[-0.033em] mb-4 sm:mb-6 text-[#0d141b] dark:text-slate-100">Explore Our Rooms</h2>
              
              {/* Filter Bar */}
              <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-background-light dark:bg-background-dark rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-end">
                  <label className="flex flex-col">
                    <p className="text-sm font-medium leading-normal pb-2 text-[#0d141b] dark:text-slate-300">Room Type</p>
                    <select 
                      className="form-select flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141b] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-[#cfdbe7] dark:border-slate-700 bg-white dark:bg-slate-800 h-11 px-3 text-sm font-normal"
                      value={filterRoomType}
                      onChange={(e) => setFilterRoomType(e.target.value)}
                    >
                      <option value="">All</option>
                      {roomTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col">
                    <p className="text-sm font-medium leading-normal pb-2 text-[#0d141b] dark:text-slate-300">Capacity</p>
                    <select 
                      className="form-select flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141b] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-[#cfdbe7] dark:border-slate-700 bg-white dark:bg-slate-800 h-11 px-3 text-sm font-normal"
                      value={filterCapacity}
                      onChange={(e) => setFilterCapacity(e.target.value)}
                    >
                      <option value="">Any</option>
                      <option value="1-2">1-2 Guests</option>
                      <option value="3-4">3-4 Guests</option>
                      <option value="5+">5+ Guests</option>
                    </select>
                  </label>
                  <label className="flex flex-col col-span-1 md:col-span-2 lg:col-span-1">
                    <p className="text-sm font-medium leading-normal pb-2 text-[#0d141b] dark:text-slate-300">Price Range</p>
                    <select 
                      className="form-select flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141b] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-[#cfdbe7] dark:border-slate-700 bg-white dark:bg-slate-800 h-11 px-3 text-sm font-normal"
                      value={filterPrice}
                      onChange={(e) => setFilterPrice(e.target.value)}
                    >
                      <option value="">Any Price</option>
                      <option value="50">Up to $50</option>
                      <option value="100">Up to $100</option>
                      <option value="150">Up to $150</option>
                      <option value="200">Up to $200</option>
                      <option value="250">Up to $250</option>
                      <option value="300">Up to $300</option>
                      <option value="400">Up to $400</option>
                      <option value="500">Up to $500</option>
                      <option value="500+">$500+</option>
                    </select>
                  </label>
                  <button 
                    onClick={handleApplyFilters}
                    className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-11 px-4 bg-primary text-slate-50 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors"
                    type="button"
                  >
                    <span className="truncate">Apply Filters</span>
                  </button>
                </div>
              </div>

              {/* Room List */}
              {loading ? (
                <div className="text-center py-8 sm:py-12">Loading rooms...</div>
              ) : displayedRooms.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-slate-600 dark:text-slate-400">No rooms found. Try adjusting your filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                  {displayedRooms.map((room) => {
                    const availability = availableRooms.find(ar => ar.roomId === room.id);
                    const isAvailable = !availability || availability.isAvailable;
                    
                    return (
                      <div key={room.id} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col bg-background-light dark:bg-background-dark group transition-all hover:shadow-lg hover:-translate-y-1">
                        <img className="w-full h-40 sm:h-48 lg:h-52 object-cover" alt={room.description} src={getRoomImage(room)} />
                        <div className="p-3 sm:p-4 flex-1 flex flex-col">
                          <h4 className="text-base sm:text-lg font-bold text-[#0d141b] dark:text-slate-100">{room.roomNumber} - {room.type}</h4>
                          <div className="flex items-center gap-2 sm:gap-4 text-slate-600 dark:text-slate-400 text-xs sm:text-sm my-2 sm:my-3 flex-wrap">
                            <span className="flex items-center gap-1.5">
                              <i className="material-symbols-outlined text-base">group</i> {room.capacity} {room.capacity === 1 ? 'Guest' : 'Guests'}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <i className="material-symbols-outlined text-base">wifi</i> WiFi
                            </span>
                            <span className="flex items-center gap-1.5">
                              <i className="material-symbols-outlined text-base">ac_unit</i> A/C
                            </span>
                          </div>
                          <div className="flex-1"></div>
                          <div className="flex items-end justify-between mt-2 sm:mt-3">
                            <div>
                              <p className="text-lg sm:text-xl font-black text-[#0d141b] dark:text-slate-100">${room.pricePerNight}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">/ night</p>
                            </div>
                            <Link 
                              to={`/room/${room.id}`}
                              className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary/20 dark:bg-primary/30 text-primary dark:text-slate-100 text-sm font-bold leading-normal tracking-[0.015em] group-hover:bg-primary group-hover:text-white transition-colors no-underline"
                            >
                              <span className="truncate">Book This Room</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </main>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
