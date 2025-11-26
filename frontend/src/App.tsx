import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './components/HomePage';
import RoomsPage from './components/RoomsPage';
import RoomDetailPage from './components/RoomDetailPage';
import AuthPage from './components/AuthPage';
import PaymentPage from './components/PaymentPage';
import BookingConfirmationPage from './components/BookingConfirmationPage';
import AdminView from './components/AdminView';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/room/:id" element={<RoomDetailPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/booking/:bookingId/confirmation" element={<BookingConfirmationPage />} />
        <Route path="/admin" element={<AdminView />} />
        {/* Catch-all route - redirect unknown paths to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
