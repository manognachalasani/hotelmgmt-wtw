import {
  ApiSuccessResponse,
  AvailabilityQuery,
  AvailabilityResult,
  AuthSuccessPayload,
  BookingPayload,
  BookingRecord,
  LoginPayload,
  RegisterPayload,
  Room,
  RoomFilters,
  RoomType,
} from '../types/api';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiSuccessResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const data = (await response.json()) as ApiSuccessResponse<T>;

  if (!response.ok || !data.success) {
    const error = new Error((data && data.message) || `Request failed with status ${response.status}`);
    throw error;
  }

  return data;
}

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

export const api = {
  login(credentials: LoginPayload) {
    return request<AuthSuccessPayload>('/auth/login', {
      method: 'POST',
      body: credentials,
    });
  },

  register(payload: RegisterPayload) {
    return request<AuthSuccessPayload>('/auth/register', {
      method: 'POST',
      body: payload,
    });
  },

  getRooms(filters: RoomFilters = {}) {
    const query = buildQuery({
      type: filters.type,
      minCapacity: filters.minCapacity ? Number(filters.minCapacity) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
    });
    return request<Room[]>(`/rooms${query}`);
  },

  getRoomTypes() {
    return request<RoomType[]>('/rooms/types');
  },

  checkAvailability(query: AvailabilityQuery) {
    const queryString = buildQuery({
      checkInDate: query.checkInDate,
      checkOutDate: query.checkOutDate,
      roomType: query.roomType,
      minCapacity: query.minCapacity,
      maxPrice: query.maxPrice,
    });
    return request<AvailabilityResult[]>(`/bookings/availability${queryString}`);
  },

  getMyBookings(token: string) {
    return request<BookingRecord[]>('/bookings/my-bookings', {
      token,
    });
  },

  createBooking(payload: BookingPayload, token: string) {
    return request<{ booking: BookingRecord; payment: unknown; room: Room | undefined }>('/bookings', {
      method: 'POST',
      body: payload,
      token,
    });
  },
};

