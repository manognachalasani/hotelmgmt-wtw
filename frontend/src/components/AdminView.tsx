import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { GuestRecord, BookingRecord } from '../types/api';

const AdminView: React.FC = () => {
  const navigate = useNavigate();
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<GuestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const itemsPerPage = 10;

  // Check if user is admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        if (!api.isAuthenticated()) {
          navigate('/auth');
          return;
        }

        const userStr = localStorage.getItem('hotelmgmt.user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.role !== 'ADMIN') {
            navigate('/');
            return;
          }
        } else {
          // Try to get profile
          const profile = await api.getProfile();
          if (profile.data.role !== 'ADMIN') {
            navigate('/');
            return;
          }
        }
      } catch (err) {
        console.error('Error checking admin access:', err);
        navigate('/auth');
      }
    };

    checkAdminAccess();
  }, [navigate]);

  // Fetch guests
  useEffect(() => {
    const fetchGuests = async () => {
      try {
        setLoading(true);
        const response = await api.getAllUsers();
        setGuests(response.data);
        setFilteredGuests(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load guests');
        console.error('Error fetching guests:', err);
      } finally {
        setLoading(false);
      }
    };

    if (api.isAuthenticated()) {
      fetchGuests();
    }
  }, []);

  // Filter guests based on search and status
  useEffect(() => {
    let filtered = [...guests];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(guest => 
        guest.firstName.toLowerCase().includes(query) ||
        guest.lastName.toLowerCase().includes(query) ||
        guest.email.toLowerCase().includes(query) ||
        guest.phone.includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(guest => 
        guest.currentStatus?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    setFilteredGuests(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchQuery, statusFilter, guests]);

  // Pagination
  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGuests = filteredGuests.slice(startIndex, endIndex);

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('checked-in')) {
      return (
        <span className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
          <span className="size-2 rounded-full bg-green-500"></span>
          Checked-in
        </span>
      );
    } else if (statusLower.includes('checked-out')) {
      return (
        <span className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-300">
          <span className="size-2 rounded-full bg-gray-500"></span>
          Checked-out
        </span>
      );
    } else if (statusLower.includes('upcoming')) {
      return (
        <span className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300">
          <span className="size-2 rounded-full bg-orange-500"></span>
          Upcoming
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-300">
          <span className="size-2 rounded-full bg-gray-500"></span>
          {status}
        </span>
      );
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleLogout = () => {
    api.logout();
    navigate('/auth');
  };

  const handleViewGuest = async (guest: GuestRecord) => {
    try {
      // Fetch all bookings
      const bookingsResponse = await api.getAllBookings();
      const allBookings = bookingsResponse.data;
      
      // Filter bookings for this guest
      const guestBookings = allBookings.filter(booking => booking.guestId === guest.id);
      
      if (guestBookings.length === 0) {
        alert(`${guest.firstName} ${guest.lastName} has no bookings yet.`);
        return;
      }
      
      // Get the most recent booking (by createdAt date)
      const mostRecentBooking = guestBookings.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Most recent first
      })[0];
      
      // Navigate to booking confirmation page
      navigate(`/booking/${mostRecentBooking.id}/confirmation`);
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      alert(`Failed to load bookings: ${err.message || 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <div className="text-text-light dark:text-text-dark">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark font-display">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-surface-light dark:bg-surface-dark border-r border-border-light dark:border-border-dark flex flex-col p-4">
        <div className="flex-grow">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-primary aspect-square rounded-full size-10 flex items-center justify-center text-white font-bold">
              <span>A</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-text-light dark:text-text-dark text-base font-bold leading-normal">hotel samia</h1>
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm font-normal leading-normal">Admin Panel</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            <a className="flex items-center gap-3 px-3 py-2 rounded bg-primary/10 text-primary" href="#">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
              <p className="text-sm font-bold leading-normal">Guest Management</p>
            </a>
            <button 
              onClick={() => navigate('/rooms')}
              className="flex items-center gap-3 px-3 py-2 text-text-muted-light dark:text-text-muted-dark hover:bg-primary/10 rounded text-left"
            >
              <span className="material-symbols-outlined">bed</span>
              <p className="text-sm font-medium leading-normal">Rooms</p>
            </button>
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-3 px-3 py-2 text-text-muted-light dark:text-text-muted-dark hover:bg-primary/10 rounded text-left"
            >
              <span className="material-symbols-outlined">home</span>
              <p className="text-sm font-medium leading-normal">Home</p>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 text-text-muted-light dark:text-text-muted-dark hover:bg-primary/10 rounded text-left"
            >
              <span className="material-symbols-outlined">logout</span>
              <p className="text-sm font-medium leading-normal">Logout</p>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="w-full max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div className="flex flex-col gap-1">
              <p className="text-text-light dark:text-text-dark text-3xl font-bold leading-tight tracking-tight">Guest Management</p>
              <p className="text-text-muted-light dark:text-text-muted-dark text-base font-normal leading-normal">View, search, and manage guest information.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded h-10 px-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/10"
                onClick={() => alert('Export feature coming soon!')}
              >
                <span className="material-symbols-outlined text-base">download</span>
                <span className="truncate">Export</span>
              </button>
              <button 
                className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90"
                onClick={() => alert('Add guest feature coming soon!')}
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span className="truncate">Add New Guest</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-lg border border-border-light dark:border-border-dark mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="flex flex-col w-full">
                  <div className="flex w-full flex-1 items-stretch rounded-lg h-12 bg-background-light dark:bg-background-dark">
                    <div className="text-text-muted-light dark:text-text-muted-dark flex items-center justify-center pl-4">
                      <span className="material-symbols-outlined">search</span>
                    </div>
                    <input 
                      className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden text-text-light dark:text-text-dark focus:outline-0 focus:ring-0 border-none bg-transparent h-full placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark px-2 text-base font-normal leading-normal" 
                      placeholder="Search by name, email, or phone..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </label>
              </div>
              <select
                className="flex h-12 w-full items-center justify-between gap-x-2 rounded-lg bg-background-light dark:bg-background-dark px-4 border border-transparent hover:border-border-light dark:hover:border-border-dark text-text-light dark:text-text-dark text-sm font-medium leading-normal focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="checked-in">Checked-in</option>
                <option value="checked-out">Checked-out</option>
                <option value="upcoming">Upcoming</option>
              </select>
              <div className="hidden lg:block"></div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-background-light dark:bg-background-dark">
                  <tr>
                    <th className="p-4 w-[250px] text-sm font-semibold text-text-light dark:text-text-dark tracking-wider uppercase">Guest Name</th>
                    <th className="p-4 w-[200px] text-sm font-semibold text-text-light dark:text-text-dark tracking-wider uppercase">Email</th>
                    <th className="p-4 w-[150px] text-sm font-semibold text-text-light dark:text-text-dark tracking-wider uppercase">Phone</th>
                    <th className="p-4 w-[150px] text-sm font-semibold text-text-light dark:text-text-dark tracking-wider uppercase">Last Stay</th>
                    <th className="p-4 w-[150px] text-sm font-semibold text-text-light dark:text-text-dark tracking-wider uppercase text-center">Bookings</th>
                    <th className="p-4 w-[150px] text-sm font-semibold text-text-light dark:text-text-dark tracking-wider uppercase">Status</th>
                    <th className="p-4 w-[120px] text-sm font-semibold text-text-light dark:text-text-dark tracking-wider uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedGuests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-text-muted-light dark:text-text-muted-dark">
                        No guests found
                      </td>
                    </tr>
                  ) : (
                    paginatedGuests.map((guest) => (
                      <tr key={guest.id} className="border-t border-border-light dark:border-border-dark">
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary aspect-square rounded-full w-10 shrink-0 flex items-center justify-center text-white font-medium text-sm">
                              {getInitials(guest.firstName, guest.lastName)}
                            </div>
                            <span className="font-medium text-text-light dark:text-text-dark">
                              {guest.firstName} {guest.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-text-muted-light dark:text-text-muted-dark text-sm align-middle">{guest.email}</td>
                        <td className="p-4 text-text-muted-light dark:text-text-muted-dark text-sm align-middle">{guest.phone}</td>
                        <td className="p-4 text-text-muted-light dark:text-text-muted-dark text-sm align-middle">
                          {guest.lastStay ? new Date(guest.lastStay).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-4 text-text-muted-light dark:text-text-muted-dark text-sm align-middle text-center">
                          {guest.bookingsCount || 0}
                        </td>
                        <td className="p-4 align-middle">
                          {getStatusBadge(guest.currentStatus)}
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              className="p-2 text-text-muted-light dark:text-text-muted-dark hover:text-primary rounded-full hover:bg-primary/10"
                              onClick={() => handleViewGuest(guest)}
                              title="View Booking"
                            >
                              <span className="material-symbols-outlined text-base">visibility</span>
                            </button>
                            <button 
                              className="p-2 text-text-muted-light dark:text-text-muted-dark hover:text-primary rounded-full hover:bg-primary/10"
                              onClick={() => alert(`Edit ${guest.firstName} ${guest.lastName}`)}
                              title="Edit"
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-border-light dark:border-border-dark">
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredGuests.length)} of {filteredGuests.length} guests
                </p>
                <div className="flex items-center gap-2">
                  <button 
                    className="flex items-center justify-center size-8 rounded border border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark hover:bg-primary/10 hover:border-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        className={`flex items-center justify-center size-8 rounded border ${
                          currentPage === pageNum
                            ? 'border-transparent text-text-light dark:text-text-dark bg-primary/10 font-bold'
                            : 'border-transparent text-text-muted-light dark:text-text-muted-dark hover:bg-primary/10'
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <span className="text-text-muted-light dark:text-text-muted-dark">...</span>
                  )}
                  
                  <button 
                    className="flex items-center justify-center size-8 rounded border border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark hover:bg-primary/10 hover:border-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminView;

