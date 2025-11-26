import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Room, RoomType } from '../types/api';
import NavigationBar from './NavigationBar';

const RoomsPage: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRoomType, setFilterRoomType] = useState<string>('');
  const [filterCapacity, setFilterCapacity] = useState<string>('');
  const [filterPrice, setFilterPrice] = useState<number>(500);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [roomsRes, typesRes] = await Promise.all([
          api.getRooms(),
          api.getRoomTypes(),
        ]);
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
      if (filterPrice < 500) {
        filters.maxPrice = filterPrice;
      }

      const roomsRes = await api.getRooms(filters);
      setRooms(roomsRes.data);
    } catch (error: any) {
      console.error('Failed to apply filters:', error);
      alert(error.message || 'Failed to apply filters. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRoomImage = (room: Room): string => {
    const typeMap: Record<string, string> = {
      'DELUXE': 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3PMBR_1TtXUBW4_mdotm_tBx2xt9y_14VZoVZz3tpNuM35oVNsP_fBcUNo_Zm6krQJb-ZP9MOFBysGbFUeW29e5GpbaCECyswPJg4cTt1Q4U7WYmEpejRzcxtdL-a3Aqwxxg7eoviHzqFkkgFurEGCwCUB2bd5C0bWEPF5ctG4eJk5BD3ZKlnp_S0IJZU7PeR_5TjND9aRNI1Wb1zPS9IwmfwcD3fxpaiyMF5tqXxmgY2kCOZFG8LSTlgKvT95oteV895jcWc1G0',
      'DOUBLE': 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0b9ZNZfht0IlxrbDl9wjSxVLp7T1x18_gBYuf_XveKDhsjFBGqsLovJvzNXJ7of9DXYAeUPqKaNdy61_r6ogNNojFBlSkxofDeymICcPpIfhjoOnvZ26DIJeH1_YRpWSbc69oCjiqYX7dh1aANIeCukJWJbU2Yuln1dJZNTNjyTBGVCfWCUSayDri2utpxsxI_3VOw0KAG_Y-G4dX9Pi1NnrTuYDmcAc4BpiBaoyEabHCR4QiPIHgSZVcow1f9TLJNU-IdPjbNdM',
      'SUITE': 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAiXLt-ZGbxYa4sz30nUzvqPPcXVcxoS4LWmLpFPAZXvDJSfMIeO4kTLe-pvm0A0-x2349HDykBZpqbGZIG1YiwuNfm2AodGoNZIryRmb4NclJvGpOVsVG6jjzkNyrOVpEeuIwU4Q-yyeQGYfoUgdkHbDTYRufh14XAw2P8bIE-yBkzlExkauDT6D2ken5kg2fv8_RXxK48y4yPH1Z1Sw3-7bXaoIeZSQbOaIA49cx0oZVSQGEWjJ4pLeL-YDgmQPBzQ82m_pvRf8',
      'SINGLE': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgtqqEsAamRmdN4tLsL5gUr1cq2atAF9v0qJ6kPlJ4R2ZKXe4XIGdG-gD2Wgd7fwkUE0mVifGWKsDHdl5x3s19hJDjBqFABNUCtMqp-ii-ieyYTlt30Lsrpa3Lmq388ySpraint6sAhgHeIjgqoeDlBTxGAvJ0lSb9Hoigrl_7k3Avmfs8BLw_DDzbdBG6ZVhRETURCZvfXFwplHDde29EAJk0h98vUJ7kIjhPs-KNmzIwesSexgtq1Pzml48M5UpbAbU5SsY3qxU',
    };
    return typeMap[room.type] || typeMap['SINGLE'];
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden">
      <NavigationBar />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-10">
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
              <span className="text-neutral-dark dark:text-neutral-light text-sm font-medium">Rooms</span>
            </div>
          </div>

          {/* Page Heading */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-neutral-dark dark:text-neutral-light mb-2">
              Our Rooms
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Discover our collection of beautifully designed rooms and suites
            </p>
          </div>

          {/* Filter Bar */}
          <div className="mb-8 p-4 bg-white dark:bg-background-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <label className="flex flex-col">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Room Type</span>
                <select 
                  className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:border-primary focus:ring-primary text-sm h-10 px-3"
                  value={filterRoomType}
                  onChange={(e) => setFilterRoomType(e.target.value)}
                >
                  <option value="">All Types</option>
                  {roomTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Capacity</span>
                <select 
                  className="w-full rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:border-primary focus:ring-primary text-sm h-10 px-3"
                  value={filterCapacity}
                  onChange={(e) => setFilterCapacity(e.target.value)}
                >
                  <option value="">Any</option>
                  <option value="1-2">1-2 Guests</option>
                  <option value="3-4">3-4 Guests</option>
                  <option value="5+">5+ Guests</option>
                </select>
              </label>
              <label className="flex flex-col">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Max Price: ${filterPrice}</span>
                <input 
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary" 
                  type="range" 
                  min="50" 
                  max="500" 
                  value={filterPrice}
                  onChange={(e) => setFilterPrice(Number(e.target.value))}
                />
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>$50</span>
                  <span>$500+</span>
                </div>
              </label>
              <button 
                onClick={handleApplyFilters}
                className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-wide shadow-sm hover:bg-primary/90 transition-colors"
                type="button"
              >
                <span className="truncate">Apply Filters</span>
              </button>
            </div>
          </div>

          {/* Room List */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-400">Loading rooms...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-400">No rooms found. Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {rooms.map((room) => (
                <div key={room.id} className="bg-white dark:bg-background-dark rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 group transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="bg-cover bg-center h-48 sm:h-56" style={{ backgroundImage: `url('${getRoomImage(room)}')` }}></div>
                  <div className="p-5 lg:p-6">
                    <h3 className="text-xl font-bold text-neutral-dark dark:text-neutral-light mb-2">
                      {room.roomNumber} - {room.type}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                      {room.description}
                    </p>
                    <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400 text-xs mb-4 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">group</span> 
                        {room.capacity} {room.capacity === 1 ? 'Guest' : 'Guests'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">wifi</span> WiFi
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">ac_unit</span> A/C
                      </span>
                    </div>
                    <div className="flex items-end justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <p className="text-2xl font-black text-primary">${room.pricePerNight}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">/ night</p>
                      </div>
                      <Link 
                        to={`/room/${room.id}`}
                        className="flex min-w-[100px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-wide shadow-sm hover:bg-primary/90 transition-colors no-underline"
                      >
                        <span className="truncate">View Details</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default RoomsPage;

