import React, { FormEvent, useEffect, useState } from 'react';
import './App.css';
import { api } from './services/api';
import {
  AvailabilityResult,
  AuthSuccessPayload,
  AuthenticatedUser,
  BookingPayload,
  BookingRecord,
  Room,
  RoomFilters,
  RoomType,
} from './types/api';

const AUTH_STORAGE_KEY = 'hotelmgmt.auth';

type AvailabilityFormState = {
  checkInDate: string;
  checkOutDate: string;
  roomType: RoomType | '';
  minCapacity: string;
  maxPrice: string;
};

const defaultBookingForm: BookingPayload = {
  roomId: '',
  checkInDate: '',
  checkOutDate: '',
  numberOfGuests: 1,
  specialRequests: '',
};

const defaultAvailabilityForm: AvailabilityFormState = {
  checkInDate: '',
  checkOutDate: '',
  roomType: '',
  minCapacity: '',
  maxPrice: '',
};

function App() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [roomFilters, setRoomFilters] = useState<RoomFilters>({ type: '', minCapacity: '', maxPrice: '' });

  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityFormState>(defaultAvailabilityForm);
  const [availabilityResults, setAvailabilityResults] = useState<AvailabilityResult[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ firstName: '', lastName: '', phone: '', email: '', password: '' });
  const [authState, setAuthState] = useState<{
    user: AuthenticatedUser | null;
    token: string | null;
    loading: boolean;
    error: string | null;
  }>({
    user: null,
    token: null,
    loading: false,
    error: null,
  });

  const [bookingForm, setBookingForm] = useState<BookingPayload>(defaultBookingForm);
  const [bookingFeedback, setBookingFeedback] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });

  const [myBookings, setMyBookings] = useState<BookingRecord[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  useEffect(() => {
    fetchRooms();
    fetchRoomTypes();
    loadAuthFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authState.token) {
      fetchMyBookings(authState.token);
    } else {
      setMyBookings([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.token]);

  const fetchRooms = async (filters?: RoomFilters) => {
    const activeFilters = filters ?? roomFilters;
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      const { data } = await api.getRooms(activeFilters);
      setRooms(data);
    } catch (error: any) {
      setRoomsError(error.message || 'Failed to load rooms');
    } finally {
      setRoomsLoading(false);
    }
  };

  const fetchRoomTypes = async () => {
    try {
      const { data } = await api.getRoomTypes();
      setRoomTypes(data);
    } catch (error) {
      console.warn('Unable to load room types', error);
    }
  };

  const loadAuthFromStorage = () => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as AuthSuccessPayload;
      setAuthState(prev => ({
        ...prev,
        user: parsed.user,
        token: parsed.token,
      }));
    } catch (error) {
      console.warn('Failed to restore auth session', error);
    }
  };

  const persistAuth = (payload: AuthSuccessPayload) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
    setAuthState({
      user: payload.user,
      token: payload.token,
      loading: false,
      error: null,
    });
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response =
        authMode === 'login' ? await api.login(loginForm) : await api.register(registerForm);

      persistAuth(response.data);
      setLoginForm({ email: '', password: '' });
      setRegisterForm({ firstName: '', lastName: '', phone: '', email: '', password: '' });
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Unable to authenticate',
      }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthState({
      user: null,
      token: null,
      loading: false,
      error: null,
    });
    setMyBookings([]);
  };

  const fetchMyBookings = async (token: string) => {
    setBookingsLoading(true);
    setBookingsError(null);
    try {
      const { data } = await api.getMyBookings(token);
      setMyBookings(data);
    } catch (error: any) {
      setBookingsError(error.message || 'Failed to load your bookings');
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleRoomFilterChange = (event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = event.target;
    setRoomFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleRoomsFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetchRooms(roomFilters);
  };

  const handleAvailabilityChange = (event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = event.target;
    setAvailabilityForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAvailabilitySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!availabilityForm.checkInDate || !availabilityForm.checkOutDate) {
      setAvailabilityError('Please provide both check-in and check-out dates.');
      return;
    }

    setAvailabilityLoading(true);
    setAvailabilityError(null);
    try {
      const { data } = await api.checkAvailability({
        checkInDate: availabilityForm.checkInDate,
        checkOutDate: availabilityForm.checkOutDate,
        roomType: availabilityForm.roomType || undefined,
        minCapacity: availabilityForm.minCapacity ? Number(availabilityForm.minCapacity) : undefined,
        maxPrice: availabilityForm.maxPrice ? Number(availabilityForm.maxPrice) : undefined,
      });
      setAvailabilityResults(data);
    } catch (error: any) {
      setAvailabilityError(error.message || 'Unable to check availability');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleBookingChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setBookingForm(prev => ({
      ...prev,
      [name]: name === 'numberOfGuests' ? Number(value) : value,
    }));
  };

  const prefillBooking = (room: Room) => {
    setBookingForm(prev => ({
      ...prev,
      roomId: room.id,
      numberOfGuests: Math.min(prev.numberOfGuests || 1, room.capacity),
    }));
  };

  const handleBookingSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authState.token) {
      setBookingFeedback({ status: 'error', message: 'You need to log in before creating a booking.' });
      return;
    }
    if (!bookingForm.roomId) {
      setBookingFeedback({ status: 'error', message: 'Please choose a room to book.' });
      return;
    }
    setBookingFeedback({ status: 'idle', message: '' });
    try {
      const response = await api.createBooking(bookingForm, authState.token);
      setBookingFeedback({
        status: 'success',
        message: response.message || 'Booking confirmed successfully.',
      });
      setBookingForm(defaultBookingForm);
      fetchMyBookings(authState.token);
    } catch (error: any) {
      setBookingFeedback({
        status: 'error',
        message: error.message || 'Unable to create booking.',
      });
    }
  };

  const activeRoomForBooking = rooms.find(room => room.id === bookingForm.roomId);

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">WTW Hotel Management</p>
          <h1>All-in-one stay planner</h1>
          <p className="subtitle">
            Browse available rooms, find the perfect dates, and keep track of every reservation from a single dashboard.
          </p>
        </div>
        <div className="hero-status">
          <div>
            <span className="label">Available rooms</span>
            <strong>{rooms.length}</strong>
          </div>
          <div>
            <span className="label">Your bookings</span>
            <strong>{myBookings.length}</strong>
          </div>
          <div>
            <span className="label">Status</span>
            <strong>{authState.user ? 'Signed in' : 'Guest'}</strong>
          </div>
        </div>
      </header>

      <main className="content-grid">
        <section className="panel">
          <header className="panel-header">
            <div>
              <h2>{authState.user ? `Welcome back, ${authState.user.firstName}` : 'Authenticate'}</h2>
              <p>Use the default credentials or create a new guest to access bookings.</p>
            </div>
            <div className="auth-mode">
              <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
                Login
              </button>
              <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>
                Register
              </button>
            </div>
          </header>
          {authState.user ? (
            <div className="auth-summary">
              <div>
                <p>
                  Logged in as <strong>{authState.user.email}</strong>
                </p>
                <p>Role: {authState.user.role}</p>
              </div>
              <button className="secondary" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <form className="form-grid" onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <>
                  <label>
                    First name
                    <input
                      name="firstName"
                      value={registerForm.firstName}
                      onChange={event => setRegisterForm(prev => ({ ...prev, firstName: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      name="lastName"
                      value={registerForm.lastName}
                      onChange={event => setRegisterForm(prev => ({ ...prev, lastName: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      name="phone"
                      value={registerForm.phone}
                      onChange={event => setRegisterForm(prev => ({ ...prev, phone: event.target.value }))}
                      required
                    />
                  </label>
                </>
              )}
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  value={authMode === 'login' ? loginForm.email : registerForm.email}
                  onChange={event =>
                    authMode === 'login'
                      ? setLoginForm(prev => ({ ...prev, email: event.target.value }))
                      : setRegisterForm(prev => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  value={authMode === 'login' ? loginForm.password : registerForm.password}
                  onChange={event =>
                    authMode === 'login'
                      ? setLoginForm(prev => ({ ...prev, password: event.target.value }))
                      : setRegisterForm(prev => ({ ...prev, password: event.target.value }))
                  }
                  required
                />
              </label>
              {authState.error && <p className="error-text">{authState.error}</p>}
              <button type="submit" disabled={authState.loading}>
                {authState.loading ? 'Please wait…' : authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          )}
        </section>

        <section className="panel">
          <header className="panel-header">
            <div>
              <h2>Rooms catalogue</h2>
            </div>
            <form className="filters" onSubmit={handleRoomsFilterSubmit}>
              <select name="type" value={roomFilters.type} onChange={handleRoomFilterChange}>
                <option value="">All types</option>
                {roomTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input
                name="minCapacity"
                type="number"
                min={1}
                placeholder="Min guests"
                value={roomFilters.minCapacity || ''}
                onChange={handleRoomFilterChange}
              />
              <input
                name="maxPrice"
                type="number"
                min={0}
                placeholder="Max price"
                value={roomFilters.maxPrice || ''}
                onChange={handleRoomFilterChange}
              />
              <button type="submit" disabled={roomsLoading}>
                {roomsLoading ? 'Loading…' : 'Apply'}
              </button>
            </form>
          </header>
          {roomsError && <p className="error-text">{roomsError}</p>}
          <div className="rooms-grid">
            {roomsLoading
              ? [...new Array(3)].map((_, index) => (
                  <div key={index} className="room-card skeleton">
                    Loading room…
                  </div>
                ))
              : rooms.map(room => (
                  <article key={room.id} className="room-card">
                    <header>
                      <div>
                        <h3>
                          Room {room.roomNumber} • {room.type}
                        </h3>
                        <p>{room.description}</p>
                      </div>
                      <strong>${room.pricePerNight}/night</strong>
                    </header>
                    <ul className="room-meta">
                      <li>Capacity: {room.capacity}</li>
                      <li>Floor: {room.floor}</li>
                      <li>{room.amenities.slice(0, 4).join(' • ')}…</li>
                    </ul>
                    <footer>
                      <span className={`chip ${room.isAvailable ? 'success' : 'warning'}`}>
                        {room.isAvailable ? 'Available' : 'Currently booked'}
                      </span>
                      <button type="button" onClick={() => prefillBooking(room)}>
                        Book this room
                      </button>
                    </footer>
                  </article>
                ))}
          </div>
        </section>

        <section className="panel">
          <header className="panel-header">
            <div>
              <h2>Check availability</h2>
            </div>
          </header>
          <form className="form-grid" onSubmit={handleAvailabilitySubmit}>
            <label>
              Check-in
              <input type="date" name="checkInDate" value={availabilityForm.checkInDate} onChange={handleAvailabilityChange} required />
            </label>
            <label>
              Check-out
              <input type="date" name="checkOutDate" value={availabilityForm.checkOutDate} onChange={handleAvailabilityChange} required />
            </label>
            <label>
              Room type
              <select name="roomType" value={availabilityForm.roomType} onChange={handleAvailabilityChange}>
                <option value="">Any</option>
                {roomTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Min guests
              <input
                type="number"
                min={1}
                name="minCapacity"
                value={availabilityForm.minCapacity}
                onChange={handleAvailabilityChange}
              />
            </label>
            <label>
              Max price
              <input type="number" min={0} name="maxPrice" value={availabilityForm.maxPrice} onChange={handleAvailabilityChange} />
            </label>
            <button type="submit" disabled={availabilityLoading}>
              {availabilityLoading ? 'Checking…' : 'Search'}
            </button>
          </form>
          {availabilityError && <p className="error-text">{availabilityError}</p>}
          <div className="availability-results">
            {availabilityResults.length === 0 && !availabilityLoading ? (
              <p className="muted">No availability results yet. Run a search above.</p>
            ) : (
              availabilityResults.map(result => (
                <div key={result.roomId} className="availability-card">
                  <div>
                    <h3>
                      Room {result.roomNumber} • {result.type}
                    </h3>
                    <p>${result.pricePerNight} per night</p>
                  </div>
                  <span className={`chip ${result.isAvailable ? 'success' : 'warning'}`}>
                    {result.isAvailable ? 'Available' : `Available from ${result.availableFrom?.slice(0, 10)}`}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <header className="panel-header">
            <div>
              <h2>Create a booking</h2>
            </div>
          </header>
          <form className="form-grid" onSubmit={handleBookingSubmit}>
            <label>
              Room
              <select name="roomId" value={bookingForm.roomId} onChange={handleBookingChange} required>
                <option value="">Select room</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>
                    {room.roomNumber} • {room.type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Check-in
              <input type="date" name="checkInDate" value={bookingForm.checkInDate} onChange={handleBookingChange} required />
            </label>
            <label>
              Check-out
              <input type="date" name="checkOutDate" value={bookingForm.checkOutDate} onChange={handleBookingChange} required />
            </label>
            <label>
              Guests
              <input
                type="number"
                name="numberOfGuests"
                min={1}
                max={activeRoomForBooking?.capacity || 6}
                value={bookingForm.numberOfGuests}
                onChange={handleBookingChange}
                required
              />
            </label>
            <label className="full-width">
              Special requests
              <textarea name="specialRequests" rows={3} value={bookingForm.specialRequests} onChange={handleBookingChange} />
            </label>
            {bookingFeedback.status !== 'idle' && (
              <p className={bookingFeedback.status === 'success' ? 'success-text' : 'error-text'}>{bookingFeedback.message}</p>
            )}
            <button type="submit" disabled={!authState.user}>
              {authState.user ? 'Submit booking' : 'Login to book'}
            </button>
          </form>
        </section>

        <section className="panel">
          <header className="panel-header">
            <div>
              <h2>My bookings</h2>
            </div>
            <button onClick={() => authState.token && fetchMyBookings(authState.token)} disabled={!authState.token || bookingsLoading}>
              {bookingsLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </header>
          {!authState.user ? (
            <p className="muted">Login to see your reservations.</p>
          ) : bookingsError ? (
            <p className="error-text">{bookingsError}</p>
          ) : myBookings.length === 0 ? (
            <p className="muted">No bookings yet. Create one above.</p>
          ) : (
            <div className="bookings-list">
              {myBookings.map(booking => (
                <article key={booking.id} className="booking-card">
                  <header>
                    <div>
                      <h3>{booking.room?.roomNumber || booking.roomId}</h3>
                      <p>
                        {booking.checkInDate.slice(0, 10)} → {booking.checkOutDate.slice(0, 10)}
                      </p>
                    </div>
                    <span className={`chip status-${booking.status.toLowerCase()}`}>{booking.status}</span>
                  </header>
                  <ul>
                    <li>Guests: {booking.numberOfGuests}</li>
                    <li>Total: ${booking.totalPrice}</li>
                    {booking.payment && <li>Payment: {booking.payment.status}</li>}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
