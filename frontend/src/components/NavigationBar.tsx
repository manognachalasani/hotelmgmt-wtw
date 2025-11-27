import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthenticatedUser } from '../types/api';

const NavigationBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('hotelmgmt.auth');
      const userStr = localStorage.getItem('hotelmgmt.user');
      setIsAuthenticated(!!token);
      if (userStr) {
        try {
          setUser(JSON.parse(userStr));
        } catch (e) {
          console.error('Failed to parse user data');
        }
      } else {
        setUser(null);
      }
    };
    checkAuth();
    window.addEventListener('storage', checkAuth);
    // Check auth state periodically to catch changes from other tabs/components
    const interval = setInterval(checkAuth, 2000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkAuth);
    };
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('hotelmgmt.auth');
    localStorage.removeItem('hotelmgmt.user');
    setIsAuthenticated(false);
    setUser(null);
    navigate('/');
    // Small delay to ensure state is cleared before reload
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-solid border-[#e7edf3] dark:border-slate-800 shadow-sm">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20 gap-4">
          {/* Logo Section */}
          <Link 
            to="/"
            className="flex items-center gap-3 sm:gap-4 text-primary cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 no-underline"
          >
            <div className="size-8 sm:size-9 flex-shrink-0">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <g clipPath="url(#clip0_6_543)">
                  <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" fill="currentColor"></path>
                  <path clipRule="evenodd" d="M7.24189 26.4066C7.31369 26.4411 7.64204 26.5637 8.52504 26.3738C9.59462 26.1438 11.0343 25.5311 12.7183 24.4963C14.7583 23.2426 17.0256 21.4503 19.238 19.238C21.4503 17.0256 23.2426 14.7583 24.4963 12.7183C25.5311 11.0343 26.1438 9.59463 26.3738 8.52504C26.5637 7.64204 26.4411 7.31369 26.4066 7.24189C26.345 7.21246 26.143 7.14535 25.6664 7.1918C24.9745 7.25925 23.9954 7.5498 22.7699 8.14278C20.3369 9.32007 17.3369 11.4915 14.4142 14.4142C11.4915 17.3369 9.32007 20.3369 8.14278 22.7699C7.5498 23.9954 7.25925 24.9745 7.1918 25.6664C7.14534 26.143 7.21246 26.345 7.24189 26.4066ZM29.9001 10.7285C29.4519 12.0322 28.7617 13.4172 27.9042 14.8126C26.465 17.1544 24.4686 19.6641 22.0664 22.0664C19.6641 24.4686 17.1544 26.465 14.8126 27.9042C13.4172 28.7617 12.0322 29.4519 10.7285 29.9001L21.5754 40.747C21.6001 40.7606 21.8995 40.931 22.8729 40.7217C23.9424 40.4916 25.3821 39.879 27.0661 38.8441C29.1062 37.5904 31.3734 35.7982 33.5858 33.5858C35.7982 31.3734 37.5904 29.1062 38.8441 27.0661C39.879 25.3821 40.4916 23.9425 40.7216 22.8729C40.931 21.8995 40.7606 21.6001 40.747 21.5754L29.9001 10.7285ZM29.2403 4.41187L43.5881 18.7597C44.9757 20.1473 44.9743 22.1235 44.6322 23.7139C44.2714 25.3919 43.4158 27.2666 42.252 29.1604C40.8128 31.5022 38.8165 34.012 36.4142 36.4142C34.012 38.8165 31.5022 40.8128 29.1604 42.252C27.2666 43.4158 25.3919 44.2714 23.7139 44.6322C22.1235 44.9743 20.1473 44.9757 18.7597 43.5881L4.41187 29.2403C3.29027 28.1187 3.08209 26.5973 3.21067 25.2783C3.34099 23.9415 3.8369 22.4852 4.54214 21.0277C5.96129 18.0948 8.43335 14.7382 11.5858 11.5858C14.7382 8.43335 18.0948 5.9613 21.0277 4.54214C22.4852 3.8369 23.9415 3.34099 25.2783 3.21067C26.5973 3.08209 28.1187 3.29028 29.2403 4.41187Z" fill="currentColor" fillRule="evenodd"></path>
                </g>
                <defs>
                  <clipPath id="clip0_6_543">
                    <rect fill="white" height="48" width="48"></rect>
                  </clipPath>
                </defs>
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-bold leading-tight tracking-[-0.015em]">hotel samia</h2>
          </Link>

          {/* Desktop Navigation - Three Main Pages */}
          <div className="hidden lg:flex flex-1 justify-center items-center min-w-0">
            <nav className="flex items-center gap-8 xl:gap-12 px-4">
              <Link
                to="/"
                onClick={() => {
                  setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }, 100);
                }}
                className={`text-sm font-medium leading-normal transition-colors bg-transparent border-none cursor-pointer px-3 py-2 rounded-lg no-underline ${
                  isActive('/') 
                    ? 'text-primary dark:text-primary font-semibold bg-primary/10 dark:bg-primary/20' 
                    : 'text-[#0d141b] dark:text-slate-200 hover:text-primary dark:hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Home
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/auth"
                  className={`text-sm font-medium leading-normal transition-colors bg-transparent border-none cursor-pointer px-3 py-2 rounded-lg no-underline ${
                    isActive('/auth')
                      ? 'text-primary dark:text-primary font-semibold bg-primary/10 dark:bg-primary/20'
                      : 'text-[#0d141b] dark:text-slate-200 hover:text-primary dark:hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Login
                </Link>
              )}
            </nav>
          </div>

          {/* Right Section - Auth Buttons / User Menu */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/auth"
                  className="hidden sm:flex min-w-[80px] sm:min-w-[90px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 sm:h-10 px-3 sm:px-4 bg-[#e7edf3] dark:bg-slate-700 text-[#0d141b] dark:text-slate-200 text-xs sm:text-sm font-bold leading-normal tracking-[0.015em] hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors no-underline"
                >
                  <span className="truncate">Login</span>
                </Link>
                <Link
                  to="/auth"
                  className="flex min-w-[80px] sm:min-w-[90px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 sm:h-10 px-3 sm:px-4 bg-primary text-slate-50 text-xs sm:text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors shadow-sm no-underline"
                >
                  <span className="truncate">Register</span>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* User Info (Desktop) */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="material-symbols-outlined text-base text-primary">account_circle</span>
                  <span className="text-xs sm:text-sm font-medium text-[#0d141b] dark:text-slate-200 truncate max-w-[120px]">
                    {user?.firstName || 'User'}
                  </span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex min-w-[80px] sm:min-w-[90px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 sm:h-10 px-3 sm:px-4 bg-[#e7edf3] dark:bg-slate-700 text-[#0d141b] dark:text-slate-200 text-xs sm:text-sm font-bold leading-normal tracking-[0.015em] hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  <span className="truncate">Logout</span>
                </button>
              </div>
            )}
            
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-[#0d141b] dark:text-slate-200 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              <span className="material-symbols-outlined text-2xl">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#e7edf3] dark:border-slate-800 py-4 space-y-2">
            <nav className="flex flex-col space-y-2">
              <Link
                to="/"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }, 100);
                }}
                className={`text-left px-4 py-2 text-sm font-medium rounded-lg transition-colors no-underline ${
                  isActive('/')
                    ? 'text-primary bg-primary/10 dark:bg-primary/20'
                    : 'text-[#0d141b] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Home
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/auth"
                  onClick={() => {
                    setMobileMenuOpen(false);
                  }}
                  className={`text-left px-4 py-2 text-sm font-medium rounded-lg transition-colors no-underline ${
                    isActive('/auth')
                      ? 'text-primary bg-primary/10 dark:bg-primary/20'
                      : 'text-[#0d141b] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Login
                </Link>
              )}
            </nav>
            {isAuthenticated && (
              <div className="px-4 py-2 border-t border-[#e7edf3] dark:border-slate-800 mt-2 pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-base text-primary">account_circle</span>
                  <span className="text-sm font-medium text-[#0d141b] dark:text-slate-200">
                    {user?.firstName} {user?.lastName}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {user?.email}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default NavigationBar;

