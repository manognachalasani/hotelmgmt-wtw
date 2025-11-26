// test-api.js - API Testing Script
// Run with: node test-api.js

const baseURL = 'http://localhost:3000/api';
let guestToken = '';
let staffToken = '';
let adminToken = '';
let bookingId = '';

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, token = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${baseURL}${endpoint}`, options);
    const result = await response.json();
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${method} ${endpoint}`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    return { status: response.status, data: result };
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

// Test suite
async function runTests() {
  console.log('🏨 HOTEL BOOKING SYSTEM - API TESTS');
  console.log('='.repeat(60));

  // ============================================
  // 1. AUTHENTICATION TESTS
  // ============================================
  console.log('\n📝 1. AUTHENTICATION TESTS');
  
  // Login as Admin
  const adminLogin = await apiCall('POST', '/auth/login', {
    email: 'admin@hotel.com',
    password: 'admin123'
  });
  if (adminLogin?.data?.data?.token) {
    adminToken = adminLogin.data.data.token;
    console.log('✅ Admin login successful');
  }

  // Login as Staff
  const staffLogin = await apiCall('POST', '/auth/login', {
    email: 'staff@hotel.com',
    password: 'staff123'
  });
  if (staffLogin?.data?.data?.token) {
    staffToken = staffLogin.data.data.token;
    console.log('✅ Staff login successful');
  }

  // Register new guest
  const guestRegister = await apiCall('POST', '/auth/register', {
    email: `guest-${Date.now()}@example.com`,
    password: 'guest123456',
    firstName: 'Test',
    lastName: 'Guest',
    phone: '+1234567890'
  });
  if (guestRegister?.data?.data?.token) {
    guestToken = guestRegister.data.data.token;
    console.log('✅ Guest registration successful');
  }

  // Get Profile
  await apiCall('GET', '/auth/profile', null, guestToken);

  // ============================================
  // 2. ROOM MANAGEMENT TESTS
  // ============================================
  console.log('\n🏨 2. ROOM MANAGEMENT TESTS');

  // Get all rooms
  await apiCall('GET', '/rooms');

  // Get room types
  await apiCall('GET', '/rooms/types');

  // Get room by ID
  await apiCall('GET', '/rooms/room-1');

  // Filter rooms
  await apiCall('GET', '/rooms?type=SUITE&minPrice=200&maxPrice=400');

  // Create room (Admin only)
  const newRoom = await apiCall('POST', '/rooms', {
    roomNumber: '999',
    type: 'SUITE',
    description: 'Test suite room',
    pricePerNight: 350,
    capacity: 4,
    amenities: ['WiFi', 'TV', 'Mini Bar'],
    floor: 9
  }, adminToken);

  // Try to create room as guest (should fail)
  await apiCall('POST', '/rooms', {
    roomNumber: '888',
    type: 'SINGLE',
    pricePerNight: 100,
    capacity: 1,
    floor: 8
  }, guestToken);

  // ============================================
  // 3. AVAILABILITY CHECKING
  // ============================================
  console.log('\n📅 3. AVAILABILITY CHECKING');

  // Check availability for date range
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 8);

  await apiCall('GET', `/bookings/availability?checkInDate=${tomorrow.toISOString().split('T')[0]}&checkOutDate=${nextWeek.toISOString().split('T')[0]}`);

  // Check availability with filters
  await apiCall('GET', `/bookings/availability?checkInDate=${tomorrow.toISOString().split('T')[0]}&checkOutDate=${nextWeek.toISOString().split('T')[0]}&roomType=SUITE&minCapacity=2&maxPrice=400`);

  // ============================================
  // 4. BOOKING TESTS
  // ============================================
  console.log('\n📝 4. BOOKING TESTS');

  // Create a booking
  const booking = await apiCall('POST', '/bookings', {
    roomId: 'room-6',
    checkInDate: tomorrow.toISOString().split('T')[0],
    checkOutDate: nextWeek.toISOString().split('T')[0],
    numberOfGuests: 2,
    specialRequests: 'Late check-in, non-smoking room'
  }, guestToken);

  if (booking?.data?.data?.booking?.id) {
    bookingId = booking.data.data.booking.id;
    console.log(`✅ Booking created: ${bookingId}`);
  }

  // Try to double book the same room (should fail)
  await apiCall('POST', '/bookings', {
    roomId: 'room-6',
    checkInDate: tomorrow.toISOString().split('T')[0],
    checkOutDate: nextWeek.toISOString().split('T')[0],
    numberOfGuests: 2
  }, guestToken);

  // Get my bookings
  await apiCall('GET', '/bookings/my-bookings', null, guestToken);

  // Get booking by ID
  if (bookingId) {
    await apiCall('GET', `/bookings/${bookingId}`, null, guestToken);
  }

  // Get all bookings (Staff only)
  await apiCall('GET', '/bookings', null, staffToken);

  // Get all bookings with filters
  await apiCall('GET', '/bookings?status=CONFIRMED', null, staffToken);

  // ============================================
  // 5. BOOKING MANAGEMENT
  // ============================================
  console.log('\n🔧 5. BOOKING MANAGEMENT');

  // Check-in (Staff only)
  if (bookingId) {
    // Try as guest (should fail)
    await apiCall('POST', `/bookings/${bookingId}/check-in`, null, guestToken);

    // Check-in as staff
    await apiCall('POST', `/bookings/${bookingId}/check-in`, null, staffToken);

    // Check-out
    await apiCall('POST', `/bookings/${bookingId}/check-out`, null, staffToken);
  }

  // ============================================
  // 6. CANCELLATION TESTS
  // ============================================
  console.log('\n❌ 6. CANCELLATION TESTS');

  // Create another booking to cancel
  const cancelBooking = await apiCall('POST', '/bookings', {
    roomId: 'room-7',
    checkInDate: tomorrow.toISOString().split('T')[0],
    checkOutDate: nextWeek.toISOString().split('T')[0],
    numberOfGuests: 4
  }, guestToken);

  if (cancelBooking?.data?.data?.booking?.id) {
    const cancelId = cancelBooking.data.data.booking.id;
    
    // Cancel booking
    await apiCall('POST', `/bookings/${cancelId}/cancel`, null, guestToken);

    // Try to cancel again (should fail)
    await apiCall('POST', `/bookings/${cancelId}/cancel`, null, guestToken);
  }

  // ============================================
  // 7. VALIDATION TESTS
  // ============================================
  console.log('\n✔️ 7. VALIDATION TESTS');

  // Invalid email format
  await apiCall('POST', '/auth/register', {
    email: 'invalid-email',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890'
  });

  // Short password
  await apiCall('POST', '/auth/register', {
    email: 'test@example.com',
    password: 'short',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890'
  });

  // Invalid date range
  await apiCall('POST', '/bookings', {
    roomId: 'room-1',
    checkInDate: nextWeek.toISOString().split('T')[0],
    checkOutDate: tomorrow.toISOString().split('T')[0],
    numberOfGuests: 2
  }, guestToken);

  // Exceeding room capacity
  await apiCall('POST', '/bookings', {
    roomId: 'room-1', // Single room with capacity 1
    checkInDate: tomorrow.toISOString().split('T')[0],
    checkOutDate: nextWeek.toISOString().split('T')[0],
    numberOfGuests: 5
  }, guestToken);

  // ============================================
  // 8. AUTHORIZATION TESTS
  // ============================================
  console.log('\n🔒 8. AUTHORIZATION TESTS');

  // Guest trying to access admin endpoint
  await apiCall('POST', '/rooms', {
    roomNumber: '777',
    type: 'SINGLE',
    pricePerNight: 100,
    capacity: 1,
    floor: 7
  }, guestToken);

  // No token provided
  await apiCall('GET', '/bookings/my-bookings');

  // Invalid token
  await apiCall('GET', '/bookings/my-bookings', null, 'invalid-token');

  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL TESTS COMPLETED');
  console.log('='.repeat(60));
}

// Run tests if executed directly
if (typeof window === 'undefined') {
  runTests().catch(console.error);
}

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { apiCall, runTests };
}

/*
===============================================
POSTMAN COLLECTION STRUCTURE
===============================================

Create a Postman collection with these folders:

1. Authentication
   - POST Register
   - POST Login
   - GET Get Profile
   - PUT Update Profile

2. Rooms
   - GET All Rooms
   - GET Room by ID
   - GET Room Types
   - GET Rooms with Filters
   - POST Create Room (Admin)
   - PUT Update Room (Admin/Staff)
   - DELETE Delete Room (Admin)

3. Bookings
   - GET Check Availability
   - POST Create Booking
   - GET My Bookings
   - GET All Bookings (Staff/Admin)
   - GET Booking by ID
   - POST Cancel Booking
   - POST Check-in (Staff/Admin)
   - POST Check-out (Staff/Admin)

Variables to set:
- {{baseUrl}}: http://localhost:3000/api
- {{guestToken}}: (set after login)
- {{staffToken}}: (set after login)
- {{adminToken}}: (set after login)
- {{bookingId}}: (set after creating booking)

*/
