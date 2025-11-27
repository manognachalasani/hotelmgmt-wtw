import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { LoginPayload, RegisterPayload } from '../types/api';
import NavigationBar from './NavigationBar';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<LoginPayload & Partial<Omit<RegisterPayload, keyof LoginPayload>>>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('AuthPage component mounted');
  }, []);

  useEffect(() => {
    // Check if already authenticated - use try-catch to prevent errors from blocking render
    // Add a small delay to ensure the page renders first
    const timer = setTimeout(() => {
      try {
        if (api.isAuthenticated()) {
          navigate('/');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        // Continue to show login page even if there's an error
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setErrors([]);
    setLoading(true);

    try {
      if (authMode === 'login') {
        await api.login({
          email: formData.email,
          password: formData.password,
        });
      } else {
        if (!formData.firstName || !formData.lastName || !formData.phone) {
          setError('Please fill in all fields');
          setLoading(false);
          return;
        }
        await api.register({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName!,
          lastName: formData.lastName!,
          phone: formData.phone!,
        });
      }

      // Token is already stored by the API service
      // Check if user is admin and redirect accordingly
      const userStr = localStorage.getItem('hotelmgmt.user');
      let user = null;
      if (userStr) {
        try {
          user = JSON.parse(userStr);
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }

      // Determine redirect path
      let returnTo = (location.state as any)?.returnTo;
      if (!returnTo) {
        // If admin, redirect to admin panel; otherwise home
        returnTo = user?.role === 'ADMIN' ? '/admin' : '/';
      }
      
      const bookingData = (location.state as any)?.bookingData;
      
      setTimeout(() => {
        if (returnTo && bookingData && returnTo !== '/admin') {
          // If there's booking data and not going to admin, pass it along
          navigate(returnTo, { state: bookingData, replace: true });
        } else {
          navigate(returnTo, { replace: true });
        }
        // Small delay before refresh to ensure navigation completes
        setTimeout(() => {
          window.location.reload(); // Force refresh to update all components
        }, 50);
      }, 100);
    } catch (err: any) {
      if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
        setErrors(err.errors);
        setError(err.errors.join(', '));
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
        setErrors([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark">
      <NavigationBar />
      <div className="flex-1 flex items-start justify-center px-4 sm:px-6 md:px-6 lg:px-8 xl:px-10 pt-2 md:pt-4 pb-4 sm:pb-6 md:pb-6 lg:pb-8 xl:pb-10" style={{ fontFamily: '"Plus Jakarta Sans", "Noto Sans", sans-serif' }}>
        <div className="w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1200px] rounded-xl shadow-2xl bg-white dark:bg-slate-900 flex flex-col md:flex-row overflow-hidden">
          {/* Image Panel */}
          <div className="hidden md:block w-full md:w-1/2 lg:w-[45%] relative">
            <div 
              className="w-full h-full bg-center bg-no-repeat bg-cover rounded-t-xl md:rounded-l-xl md:rounded-t-none" 
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDodfjJR0-T0Ky8BRIhQngaecT8YI_KN9Zv52jbn-QkviP2-7Be2nimMAasQIBimcelR1TuAuww9oIv79zJNV52aAzoWBNfqmB6bpCNAkIoNajubEWuMN0CKoUG9D4fF_gZxTjrDpZ0FHjzZ0PmDGGLwfdK4CL-A7UXKRf1cbrUHR0LYGp_yiEVRONwFDmXXdvbJv97ZAMPM_bjtKxm44rG3wfriPjWjj2aM3ouQydnoxNONU7KC5diswriba5XhcRdfQ60sdQbETk")' }}
            ></div>
          </div>

          {/* Form Panel */}
          <div className="w-full md:w-1/2 lg:w-[55%] flex flex-col px-6 sm:px-8 md:px-8 lg:px-10 xl:px-12 py-4 sm:py-6 md:py-6 lg:py-8 xl:py-10 items-center md:items-start">
            <div className="w-full max-w-md lg:max-w-lg xl:max-w-md 2xl:max-w-lg">
              <div className="flex flex-col gap-2 mb-4 lg:mb-5">
                <p className="text-slate-900 dark:text-white text-3xl sm:text-4xl md:text-4xl lg:text-5xl font-black leading-tight tracking-[-0.033em] text-center md:text-left">
                  {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-base lg:text-lg font-normal leading-normal text-center md:text-left">
                  Plan your perfect stay with us.
                </p>
              </div>

              <div className="flex flex-col gap-6 w-full">
            {/* Toggle between Login and Register */}
            <div className="flex h-12 lg:h-14 items-center justify-center rounded-xl bg-background-light dark:bg-background-dark p-1.5 gap-1">
              <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 transition-all ${authMode === 'login' ? 'bg-primary shadow-md text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                <span className="truncate text-sm font-medium">Login</span>
                <input 
                  className="invisible w-0" 
                  name="auth-toggle" 
                  type="radio" 
                  value="Login"
                  checked={authMode === 'login'}
                  onChange={() => {
                    setAuthMode('login');
                    setError('');
                    setErrors([]);
                    setFormData({ email: '', password: '', firstName: '', lastName: '', phone: '' });
                  }}
                />
              </label>
              <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 transition-all ${authMode === 'register' ? 'bg-primary shadow-md text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                <span className="truncate text-sm font-medium">Register</span>
                <input 
                  className="invisible w-0" 
                  name="auth-toggle" 
                  type="radio" 
                  value="Register"
                  checked={authMode === 'register'}
                  onChange={() => {
                    setAuthMode('register');
                    setError('');
                    setErrors([]);
                    setFormData({ email: '', password: '', firstName: '', lastName: '', phone: '' });
                  }}
                />
              </label>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-full">
              {authMode === 'register' && (
                <>
                  <label className="flex flex-col w-full">
                    <p className="text-slate-800 dark:text-slate-200 text-sm font-medium leading-normal pb-2">First Name</p>
                    <input 
                      className="form-input w-full rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-primary h-12 lg:h-14 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-4 lg:px-5 py-3 lg:py-4 text-base lg:text-lg font-normal leading-normal" 
                      placeholder="Enter your first name" 
                      type="text" 
                      name="firstName"
                      value={formData.firstName || ''}
                      onChange={handleInputChange}
                      required={authMode === 'register'}
                    />
                  </label>
                  <label className="flex flex-col w-full">
                    <p className="text-slate-800 dark:text-slate-200 text-sm font-medium leading-normal pb-2">Last Name</p>
                    <input 
                      className="form-input w-full rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-primary h-12 lg:h-14 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-4 lg:px-5 py-3 lg:py-4 text-base lg:text-lg font-normal leading-normal" 
                      placeholder="Enter your last name" 
                      type="text" 
                      name="lastName"
                      value={formData.lastName || ''}
                      onChange={handleInputChange}
                      required={authMode === 'register'}
                    />
                  </label>
                  <label className="flex flex-col w-full">
                    <p className="text-slate-800 dark:text-slate-200 text-sm font-medium leading-normal pb-2">Phone</p>
                    <input 
                      className="form-input w-full rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-primary h-12 lg:h-14 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-4 lg:px-5 py-3 lg:py-4 text-base lg:text-lg font-normal leading-normal" 
                      placeholder="Enter your phone number" 
                      type="tel" 
                      name="phone"
                      value={formData.phone || ''}
                      onChange={handleInputChange}
                      required={authMode === 'register'}
                    />
                  </label>
                </>
              )}

              <label className="flex flex-col w-full">
                <p className="text-slate-800 dark:text-slate-200 text-sm font-medium leading-normal pb-2">Email</p>
                <input 
                  className="form-input w-full rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-primary h-12 lg:h-14 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-4 lg:px-5 py-3 lg:py-4 text-base lg:text-lg font-normal leading-normal" 
                  placeholder="Enter your email address" 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </label>

              <label className="flex flex-col w-full">
                <p className="text-slate-800 dark:text-slate-200 text-sm font-medium leading-normal pb-2">Password</p>
                <div className="flex w-full items-center rounded-lg border border-slate-300 dark:border-slate-700 focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary bg-white dark:bg-slate-800 h-12 lg:h-14">
                  <input 
                    className="form-input flex-1 rounded-l-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-0 border-0 bg-transparent h-full placeholder:text-slate-400 dark:placeholder:text-slate-500 px-4 lg:px-5 py-3 lg:py-4 pr-2 text-base lg:text-lg font-normal leading-normal" 
                    placeholder="Enter your password" 
                    type={showPassword ? 'text' : 'password'} 
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                  <button 
                    aria-label="Toggle password visibility" 
                    className="text-slate-500 dark:text-slate-400 flex items-center justify-center px-4 lg:px-5 py-3 lg:py-4 rounded-r-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors h-full" 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-xl lg:text-2xl" data-icon="Eye">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </label>

              {authMode === 'login' && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <button 
                    type="button"
                    className="font-medium text-primary hover:underline bg-transparent border-none cursor-pointer p-0"
                    onClick={() => alert('Forgot password feature coming soon!')}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {error && (
                <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  {errors.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                      {errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  ) : (
                    error
                  )}
                </div>
              )}

              <button 
                className="flex items-center justify-center w-full h-12 lg:h-14 px-6 mt-4 rounded-lg bg-primary text-white text-base lg:text-lg font-bold leading-normal shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 dark:focus:ring-offset-background-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                type="submit"
                disabled={loading}
              >
                {loading ? 'Processing...' : authMode === 'login' ? 'Sign In' : 'Sign Up'}
              </button>

              {authMode === 'login' && (
                <div className="text-center text-xs text-slate-400 dark:text-slate-500 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <p>For demo purposes, use <strong className="text-slate-600 dark:text-slate-300">admin@hotel.com</strong> with password <strong className="text-slate-600 dark:text-slate-300">admin123</strong></p>
                </div>
              )}
            </form>
              </div>

              <footer className="mt-6 lg:mt-8 pt-4 lg:pt-6 text-center text-xs lg:text-sm text-slate-400 dark:text-slate-500">
                <p>© 2024 hotel samia. All Rights Reserved.</p>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
