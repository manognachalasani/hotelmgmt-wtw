import {
  ApiSuccessResponse,
  AvailabilityQuery,
  AvailabilityResult,
  AuthSuccessPayload,
  AuthenticatedUser,
  BookingPayload,
  BookingRecord,
  GuestRecord,
  LoginPayload,
  RegisterPayload,
  Room,
  RoomFilters,
  RoomType,
} from '../types/api';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000/api';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('hotelmgmt.auth');
}

/**
 * Clear authentication data
 */
function clearAuth(): void {
  localStorage.removeItem('hotelmgmt.auth');
  localStorage.removeItem('hotelmgmt.user');
}

/**
 * Make API request with proper error handling
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiSuccessResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Use provided token or get from localStorage
  const token = options.token !== undefined ? options.token : getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });

    // Parse JSON response with error handling
    let data: any;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch (parseError) {
      // If response is not JSON, create a basic error response
      data = {
        success: false,
        message: !response.ok 
          ? `Request failed with status ${response.status}` 
          : 'Invalid JSON response from server'
      };
    }

    // Handle 401 Unauthorized - clear auth and throw error
    if (response.status === 401) {
      clearAuth();
      const error = new Error(data.message || 'Authentication required. Please log in again.');
      (error as any).statusCode = 401;
      throw error;
    }

    // Handle non-OK responses
    if (!response.ok) {
      const errorMessage = (data && data.message) || `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      (error as any).statusCode = response.status;
      (error as any).errors = data?.errors || [];
      throw error;
    }

    // Handle responses that indicate failure
    if (data && !data.success) {
      const errorMessage = data.message || 'Request failed';
      const error = new Error(errorMessage);
      (error as any).statusCode = response.status;
      (error as any).errors = data.errors || [];
      throw error;
    }

    return data as ApiSuccessResponse<T>;
  } catch (error: any) {
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please make sure the backend is running on port 4000.');
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Build query string from parameters
 */
function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const search = Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc.append(key, String(value));
    }
    return acc;
  }, new URLSearchParams());

  const queryString = search.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * API service with all endpoints
 */
export const api = {
  /**
   * Login user
   */
  async login(credentials: LoginPayload): Promise<ApiSuccessResponse<AuthSuccessPayload>> {
    const response = await request<AuthSuccessPayload>('/auth/login', {
      method: 'POST',
      body: credentials,
    });
    
    // Store token and user data
    if (response.data.token) {
      localStorage.setItem('hotelmgmt.auth', response.data.token);
      localStorage.setItem('hotelmgmt.user', JSON.stringify(response.data.user));
    }
    
    return response;
  },

  /**
   * Register new user
   */
  async register(payload: RegisterPayload): Promise<ApiSuccessResponse<AuthSuccessPayload>> {
    const response = await request<AuthSuccessPayload>('/auth/register', {
      method: 'POST',
      body: payload,
    });
    
    // Store token and user data
    if (response.data.token) {
      localStorage.setItem('hotelmgmt.auth', response.data.token);
      localStorage.setItem('hotelmgmt.user', JSON.stringify(response.data.user));
    }
    
    return response;
  },

  /**
   * Get all rooms with optional filters
   */
  async getRooms(filters: RoomFilters = {}): Promise<ApiSuccessResponse<Room[]>> {
    const query = buildQuery({
      type: filters.type,
      minCapacity: filters.minCapacity ? Number(filters.minCapacity) : undefined,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
    });
    return request<Room[]>(`/rooms${query}`);
  },

  /**
   * Get all room types
   */
  async getRoomTypes(): Promise<ApiSuccessResponse<RoomType[]>> {
    return request<RoomType[]>('/rooms/types');
  },

  /**
   * Get room by ID
   */
  async getRoomById(id: string): Promise<ApiSuccessResponse<Room>> {
    return request<Room>(`/rooms/${id}`);
  },

  /**
   * Check room availability
   */
  async checkAvailability(query: AvailabilityQuery): Promise<ApiSuccessResponse<AvailabilityResult[]>> {
    const queryString = buildQuery({
      checkInDate: query.checkInDate,
      checkOutDate: query.checkOutDate,
      roomType: query.roomType,
      minCapacity: query.minCapacity,
      maxPrice: query.maxPrice,
    });
    return request<AvailabilityResult[]>(`/bookings/availability${queryString}`);
  },

  /**
   * Get user's bookings (requires authentication)
   */
  async getMyBookings(token?: string | null): Promise<ApiSuccessResponse<BookingRecord[]>> {
    return request<BookingRecord[]>('/bookings/my-bookings', {
      token: token !== undefined ? token : getAuthToken(),
    });
  },

  /**
   * Get booking by ID (requires authentication)
   */
  async getBookingById(id: string, token?: string | null): Promise<ApiSuccessResponse<BookingRecord>> {
    return request<BookingRecord>(`/bookings/${id}`, {
      token: token !== undefined ? token : getAuthToken(),
    });
  },

  /**
   * Create a new booking (requires authentication)
   */
  async createBooking(
    payload: BookingPayload,
    token?: string | null
  ): Promise<ApiSuccessResponse<{ booking: BookingRecord; payment: unknown; room: Room | undefined }>> {
    return request<{ booking: BookingRecord; payment: unknown; room: Room | undefined }>('/bookings', {
      method: 'POST',
      body: payload,
      token: token !== undefined ? token : getAuthToken(),
    });
  },

  /**
   * Cancel a booking (requires authentication)
   */
  async cancelBooking(id: string, token?: string | null): Promise<ApiSuccessResponse<{ message: string }>> {
    return request<{ message: string }>(`/bookings/${id}/cancel`, {
      method: 'POST',
      token: token !== undefined ? token : getAuthToken(),
    });
  },

  /**
   * Get user profile (requires authentication)
   */
  async getProfile(token?: string | null): Promise<ApiSuccessResponse<AuthenticatedUser>> {
    return request<AuthenticatedUser>('/auth/profile', {
      token: token !== undefined ? token : getAuthToken(),
    });
  },

  /**
   * Update user profile (requires authentication)
   */
  async updateProfile(
    payload: Partial<AuthenticatedUser>,
    token?: string | null
  ): Promise<ApiSuccessResponse<AuthenticatedUser>> {
    return request<AuthenticatedUser>('/auth/profile', {
      method: 'PUT',
      body: payload,
      token: token !== undefined ? token : getAuthToken(),
    });
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!getAuthToken();
  },

  /**
   * Get current auth token
   */
  getToken(): string | null {
    return getAuthToken();
  },

  /**
   * Logout - clear authentication data
   */
  logout(): void {
    clearAuth();
  },

  /**
   * Get all users/guests (Admin only)
   */
  async getAllUsers(token?: string | null): Promise<ApiSuccessResponse<GuestRecord[]>> {
    return request<GuestRecord[]>('/auth/users', {
      token: token !== undefined ? token : getAuthToken(),
    });
  },
};
