import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Room, BookingPayload } from '../types/api';
import NavigationBar from './NavigationBar';

interface PaymentFormData {
  cardholderName: string;
  cardNumber: string;
  expiryDate: string;
  cvc: string;
  saveCard: boolean;
  sameAddress: boolean;
}

interface BookingData {
  room: Room;
  bookingForm: BookingPayload;
  subtotal: number;
  processingFee?: number;
  taxes?: number; // Legacy support
  total: number;
  nights: number;
}

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvc: '',
    saveCard: false,
    sameAddress: true,
  });
  const [processing, setProcessing] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  
  // Check if using test payment (card number 0000 0000 0000 0000 or contains "test" in name)
  const isTestPayment = paymentForm.cardNumber.replace(/\s/g, '') === '0000000000000000' ||
                        paymentForm.cardNumber.replace(/\s/g, '') === '0000' ||
                        paymentForm.cardholderName.toLowerCase().includes('test');

  useEffect(() => {
    // Get booking data from location state
    const state = location.state as BookingData | any;
    if (!state || !state.room || !state.bookingForm) {
      // If no booking data, redirect to home
      alert('Please select a room and dates first');
      navigate('/');
      return;
    }

    // Check if user is authenticated
    if (!api.isAuthenticated()) {
      alert('Please log in to complete your booking');
      navigate('/auth', { state: { returnTo: '/payment', bookingData: state } });
      return;
    }

    // Recalculate totals if they're missing (e.g., coming from AuthPage)
    if (!state.subtotal || !state.total || !state.nights) {
      const checkIn = new Date(state.bookingForm.checkInDate);
      const checkOut = new Date(state.bookingForm.checkOutDate);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const subtotal = state.room.pricePerNight * nights;
      const processingFee = Number((subtotal * 0.03).toFixed(2)); // 3% processing fee (matches backend)
      const total = subtotal + processingFee;

      setBookingData({
        ...state,
        subtotal,
        processingFee,
        total,
        nights,
      });
    } else {
      setBookingData(state);
    }
  }, [location, navigate]);

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Add spaces every 4 digits
    return digits.match(/.{1,4}/g)?.join(' ') || digits;
  };

  const formatExpiryDate = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Add slash after 2 digits
    if (digits.length >= 2) {
      return `${digits.slice(0, 2)} / ${digits.slice(2, 4)}`;
    }
    return digits;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setPaymentForm(prev => ({ ...prev, cardNumber: formatted }));
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    setPaymentForm(prev => ({ ...prev, expiryDate: formatted }));
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
    setPaymentForm(prev => ({ ...prev, cvc: digits }));
  };

  const fillTestPaymentData = () => {
    // Fill with test payment details that will always succeed
    setPaymentForm({
      cardholderName: 'Test User',
      cardNumber: '0000 0000 0000 0000',
      expiryDate: '12 / 25',
      cvc: '123',
      saveCard: false,
      sameAddress: true,
    });
    // Small delay to ensure state is updated
    setTimeout(() => {
      console.log('Test payment data filled. Card number:', '0000 0000 0000 0000');
    }, 100);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!bookingData) {
      alert('Booking data is missing. Please start over.');
      navigate('/');
      return;
    }

    // For test payments, skip all validation and proceed directly
    if (isTestPayment) {
      console.log('Test payment detected - bypassing validation');
      // Proceed directly with booking - no validation needed for test payments
      proceedWithBooking();
      return;
    } else {
      // Validate payment form for real payments
      if (!paymentForm.cardholderName.trim()) {
        alert('Please enter cardholder name');
        return;
      }

      if (paymentForm.cardNumber.replace(/\s/g, '').length < 16) {
        alert('Please enter a valid card number');
        return;
      }

      if (paymentForm.expiryDate.length < 7) {
        alert('Please enter a valid expiry date (MM / YY)');
        return;
      }

      if (paymentForm.cvc.length < 3) {
        alert('Please enter a valid CVC');
        return;
      }
    }

    // Proceed with booking creation
    proceedWithBooking();
  };

  const proceedWithBooking = async () => {
    if (!bookingData) {
      alert('Booking data is missing. Please start over.');
      navigate('/');
      return;
    }

    setProcessing(true);
    try {
      console.log('Creating booking with data:', bookingData.bookingForm);
      // Create the booking (payment is simulated)
      const result = await api.createBooking(bookingData.bookingForm);
      
      console.log('Booking created successfully:', result.data.booking?.id);
      
      // For demo purposes, always navigate to confirmation page
      // The backend now ensures payments always succeed (100% success rate)
      if (result.data.booking && result.data.booking.id) {
        // Navigate to booking confirmation page (email preview)
        navigate(`/booking/${result.data.booking.id}/confirmation`, { replace: true });
      } else {
        alert('Booking created but could not retrieve booking ID. Please try again.');
      }
    } catch (error: any) {
      console.error('Booking creation error:', error);
      // Handle different error status codes
      if (error.statusCode === 402) {
        // Payment failed - booking was created but payment failed
        alert('Payment processing failed. Your booking was not confirmed. Please try again with a different payment method.');
      } else if (error.statusCode === 409) {
        // Room no longer available
        alert('The room is no longer available for the selected dates. Please select different dates.');
        navigate(`/room/${bookingData.room.id}`);
      } else {
        alert(error.message || 'An error occurred. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const getRoomImage = (room: Room): string => {
    const typeMap: Record<string, string> = {
      'DELUXE': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTpWcTMdvayARs1AnYSd8MVIMDT6TFLSbrTA90qk5uL86Fwq4tsf0x5hpYema54Oy0RCJnvHDc6EluEXx-PmFTOU7p8dQN1Xot6lWIr1hpFA3LkhfvvY3VisU4AHpMfxkA1Qcdn0pfkDO1QmwZMMETk6WjMQAl2HOni-krTrAHRm3MKI8B_oP_mgHKezLVcab35uwMhWhp90JhiP2km-SuvNoFaUcFJ-23Q50YQUaaB4p1AY9LU-CRm8D400vvhxM8-r1t_SeV9tA',
      'DOUBLE': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRhhFpLDP8-yjTej55_oe0IvdMmMs2mFiJyleYoSJi1J56yPn-64bHYBqw-pJgCqiJ84u0N4njASAdJYNZ-biB3TqdOHOKlwMdNccb5D4-_9qnZx2Z0gAaEoBDuo7apB8EUDGnCJsuprX-WzEqw8TNstA8rivN4rc-QAN3L6cC4OcCUhEfaOz6PB7W6hqfqyphAgYCf3xXfjGUeyi54ejJiZiScCjoOQl_ts4YlTsr-qxQHTZK4e5OMopiGaTY-IZy1gzObYtNHmo',
      'SUITE': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxeHX7vxlscyUKKmGLRIKw0kDmtatTyxM02tP-5b3vSrWP3Y7zl3hM2XaKX5MmlVGlS6fhgU8J9WPN-JxeLJ_XMF_HOCveemiMQyubSZyQLaBFlJ1QB1aINahekhUjGAAYqtLCnoBtboCJ3ZXt6aCr-gg4uo0U2DaoOY_hH-B2tL0zxeQBwX8sFbmd_ML88iixntu2MfkVI7FgVdNg1gdOviy34OTRtLSq99-zq4W5mZnMN-Y4rbZyu28N0iRvFzIfDoEfjm_nYsE',
      'SINGLE': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCC0E29muOOCx8lbUlmZCHEQ9hQGYSEWydT-ztN_QPcMhmG3dfIvVzSi_PnRSUEKT4vlarrLSX--m3XaVgCvWd4-kB7X9Qj_7fVFutI41qhXcZ8yKMdwKAICFRnBSQvr2tyl1UDAp3eh0eKal2Bwf_ibLv3k-3MRGW-Tkdi-1eET1dEdmVWeKg7RtMbUSPl5HciuQ9rM_WPgFmjBMdzUKaEUNr4W4m66jgeW0554f-ijF0QZw5l8QXnm439AW2g5_GwrBU3D6DYIzA',
    };
    return typeMap[room.type] || typeMap['DELUXE'];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!bookingData) {
    return (
      <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden">
        <NavigationBar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-lg text-slate-600 dark:text-slate-400">Loading payment page...</p>
          </div>
        </div>
      </div>
    );
  }

  const { room, bookingForm, subtotal, processingFee, taxes, total, nights } = bookingData;
  const fees = processingFee ?? taxes ?? 0; // Use processingFee if available, fallback to taxes for legacy support

  return (
    <div className="relative flex min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark">
      <NavigationBar />

      <div className="px-4 sm:px-10 lg:px-20 flex flex-1 justify-center py-5 md:py-10">
        <div className="layout-content-container flex flex-col w-full max-w-6xl flex-1">
          {/* Breadcrumbs */}
          <div className="flex flex-wrap gap-2 px-4 mb-6">
            <Link 
              to="/" 
              className="text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark text-sm font-medium leading-normal no-underline"
            >
              Search
            </Link>
            <span className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium leading-normal">/</span>
            <Link 
              to={`/room/${room.id}`} 
              className="text-text-secondary-light dark:text-text-secondary-dark hover:text-text-light dark:hover:text-text-dark text-sm font-medium leading-normal no-underline"
            >
              Room Selection
            </Link>
            <span className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-medium leading-normal">/</span>
            <span className="text-text-light dark:text-text-dark text-sm font-medium leading-normal">Payment</span>
          </div>

          {/* PageHeading */}
          <div className="flex flex-wrap justify-between gap-3 p-4">
            <div className="flex min-w-72 flex-col gap-2">
              <p className="text-text-light dark:text-text-dark text-4xl font-black leading-tight tracking-[-0.033em]">Secure Payment</p>
              <p className="text-text-secondary-light dark:text-text-secondary-dark text-base font-normal leading-normal">Complete your booking by providing your payment details.</p>
            </div>
          </div>

          {/* ActionPanel (Simulation Banner) */}
          <div className="p-4">
            <div className="flex flex-1 flex-col items-start justify-between gap-4 rounded-lg border border-info-border-light dark:border-info-border-dark bg-info-bg-light dark:bg-info-bg-dark p-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-info-text-light dark:text-info-text-dark">warning</span>
                <div className="flex flex-col gap-1">
                  <p className="text-info-text-light dark:text-info-text-dark text-base font-bold leading-tight">Payment Simulation</p>
                  <p className="text-info-text-light dark:text-info-text-dark text-base font-normal leading-normal">This is a test payment. No real card will be charged.</p>
                </div>
              </div>
            </div>
          </div>

          <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 p-4">
            {/* Left Column: Payment Form */}
            <div className="lg:col-span-2 min-w-0">
              <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
                {/* SectionHeader */}
                <div className="px-4 sm:px-6 pb-3 pt-6 border-b border-border-light dark:border-border-dark flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <h2 className="text-text-light dark:text-text-dark text-lg sm:text-[22px] font-bold leading-tight tracking-[-0.015em]">Payment Information</h2>
                  <button
                    type="button"
                    onClick={fillTestPaymentData}
                    className="text-sm font-medium text-primary hover:text-primary/80 underline bg-transparent border-none cursor-pointer whitespace-nowrap"
                  >
                    Fill Test Data
                  </button>
                </div>
                {/* End SectionHeader */}

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6" noValidate={isTestPayment}>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2" htmlFor="cardholder-name">Cardholder Name</label>
                    <input 
                      className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark focus:ring-primary focus:border-primary px-3 py-2 text-text-light dark:text-text-dark" 
                      id="cardholder-name" 
                      placeholder="John M. Doe" 
                      type="text"
                      value={paymentForm.cardholderName}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, cardholderName: e.target.value }))}
                      required={!isTestPayment}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2" htmlFor="card-number">Card Number</label>
                    <div className="relative">
                      <input 
                        className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark focus:ring-primary focus:border-primary pr-20 sm:pr-24 px-3 py-2 text-text-light dark:text-text-dark" 
                        id="card-number" 
                        placeholder="0000 0000 0000 0000" 
                        type="text"
                        value={paymentForm.cardNumber}
                        onChange={handleCardNumberChange}
                        maxLength={19}
                        required={!isTestPayment}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-1 pointer-events-none">
                        <img alt="Visa card logo" className="h-4 sm:h-5 w-auto" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDoBbJQJrAZb8fFY1wxwb1_dXRy2hoHomLQdOSbAAznlgIxDmGaqUA8fEZGa74Kas12hjNsad5h4f7axGEtplbv0zwdWsWeKyD9MgL4-JU7CDzI4OaiiXYvxiO2Vwz1U6wDl0PQUYhiumcICJ_6dnvr4e6vgNjY_YXiKlmP1eSpqvPgGbyaTGo3VWWPHj4DD27VvzvVk2OGcx54Ppmr7n3g8O_bHTqegTLK5eguJBGMSlibZezUM5OU2JMQcZTcoZHHQFtjzopgaZc"/>
                        <img alt="Mastercard logo" className="h-4 sm:h-5 w-auto hidden sm:block" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEeGYUWJD6l00ieztI6i838M78GSE_bj9SvWC04VP7xdHgQjQLYARxVHZ1FhsTXZFhMwfF1f8V49El5r703L1RClFhfvL8tIFl7tFymKnv7RRRChhxJP66XsbP7t4Op3OsLp8JQ3fdHbcJjFchE8jVhP_PI97QRvwZYw84mgMM80zTaqaiRggtrCSxWLRKGeB_mo-nn211Q_viviABUuZoa7CdL0wIywKiYlfkjdeUGV-srWsPzLNE7awKh-6Yxjn7DxdOWoPWb0c"/>
                        <img alt="American Express logo" className="h-4 sm:h-5 w-auto hidden sm:block" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBzJL5JHGBBQ1JuITmvbZhFGWe9spFIqLj8yJE0s0XOG4YRQ3k6Emfs57-TN668154n1wRfPMl6jCdF-T6SLJlI9RWZWACcJ-mZvObX8tGYjxRjEdq9ZgWMZq4cTBWc5OTOQ8JsrtoAjNRPKz1U55-griTCfTwVuf1C1oukISXT2N_xCL-ignNYvb82O93rPwcK9KGx2wKl2z3eVrWSmjDQ2kew-6z-aESmH-uRvhmZkx-OVbUJrJBZPwC2uYxoqXZhteKiw--kPag"/>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2" htmlFor="expiry-date">Expiry Date</label>
                      <input 
                        className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark focus:ring-primary focus:border-primary px-3 py-2 text-text-light dark:text-text-dark" 
                        id="expiry-date" 
                        placeholder="MM / YY" 
                        type="text"
                        value={paymentForm.expiryDate}
                        onChange={handleExpiryDateChange}
                        maxLength={7}
                        required={!isTestPayment}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2" htmlFor="cvc">CVC</label>
                      <div className="relative">
                        <input 
                          className="w-full rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark focus:ring-primary focus:border-primary px-3 py-2 text-text-light dark:text-text-dark" 
                          id="cvc" 
                          placeholder="123" 
                          type="text"
                          value={paymentForm.cvc}
                          onChange={handleCvcChange}
                          maxLength={3}
                          required={!isTestPayment}
                        />
                        <span className="material-symbols-outlined absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary-light dark:text-text-secondary-dark pointer-events-none">help</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input 
                        className="h-4 w-4 rounded border-border-light dark:border-border-dark text-primary focus:ring-primary" 
                        id="save-card" 
                        name="save-card" 
                        type="checkbox"
                        checked={paymentForm.saveCard}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, saveCard: e.target.checked }))}
                      />
                      <label className="ml-3 block text-sm text-text-secondary-light dark:text-text-secondary-dark" htmlFor="save-card">Save card for future use</label>
                    </div>
                    <div className="flex items-center">
                      <input 
                        checked={paymentForm.sameAddress}
                        className="h-4 w-4 rounded border-border-light dark:border-border-dark text-primary focus:ring-primary" 
                        id="same-address" 
                        name="same-address" 
                        type="checkbox"
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, sameAddress: e.target.checked }))}
                      />
                      <label className="ml-3 block text-sm text-text-secondary-light dark:text-text-secondary-dark" htmlFor="same-address">Billing address is the same as contact address</label>
                    </div>
                  </div>
                </form>
              </div>
            </div>
            {/* End Left Column */}

            {/* Right Column: Booking Summary */}
            <div className="lg:col-span-1 min-w-0">
              <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark p-4 sm:p-6 space-y-6 overflow-hidden">
                <h3 className="text-xl font-bold text-text-light dark:text-text-dark">Your Stay Summary</h3>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div 
                      className="w-20 h-20 sm:w-24 sm:h-24 bg-cover bg-center rounded-lg flex-shrink-0" 
                      data-alt={`Exterior view of ${room.roomNumber}`} 
                      style={{ backgroundImage: `url('${getRoomImage(room)}')` }}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-text-light dark:text-text-dark text-sm sm:text-base truncate">{room.roomNumber} - {room.type}</h4>
                      <p className="text-xs sm:text-sm text-text-secondary-light dark:text-text-secondary-dark line-clamp-2">{room.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-text-secondary-light dark:text-text-secondary-dark border-t border-border-light dark:border-border-dark pt-4">
                    <p className="flex justify-between"><span>Check-in:</span> <span className="font-medium text-text-light dark:text-text-dark">{formatDate(bookingForm.checkInDate)}</span></p>
                    <p className="flex justify-between"><span>Check-out:</span> <span className="font-medium text-text-light dark:text-text-dark">{formatDate(bookingForm.checkOutDate)}</span></p>
                    <p className="flex justify-between"><span>Guests:</span> <span className="font-medium text-text-light dark:text-text-dark">{bookingForm.numberOfGuests} {bookingForm.numberOfGuests === 1 ? 'Adult' : 'Adults'}</span></p>
                  </div>
                </div>
                <div className="space-y-2 border-t border-border-light dark:border-border-dark pt-4">
                  <div className="flex justify-between text-text-secondary-light dark:text-text-secondary-dark">
                    <span>Room Cost ({nights} {nights === 1 ? 'night' : 'nights'})</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary-light dark:text-text-secondary-dark">
                    <span>Processing Fee (3%)</span>
                    <span>${fees.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-text-light dark:text-text-dark pt-2 border-t border-border-light dark:border-border-dark mt-2">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <button 
                    onClick={handleSubmit}
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-primary text-white text-base font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined">lock</span>
                    <span>{processing ? 'Processing...' : 'Confirm & Pay (Test)'}</span>
                  </button>
                  <Link 
                    to={`/room/${room.id}`}
                    className="block text-center text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark hover:text-primary no-underline"
                  >
                    Cancel Booking
                  </Link>
                </div>
                <p className="text-xs text-center text-text-secondary-light dark:text-text-secondary-dark">By clicking the button above, you agree to the <a className="underline hover:text-primary" href="#">Terms of Service</a> and <a className="underline hover:text-primary" href="#">Privacy Policy</a>.</p>
              </div>
            </div>
            {/* End Right Column */}
          </main>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;

