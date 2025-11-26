import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renders StayPlanner dashboard actions', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByText(/StayPlanner/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Dashboard/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Rooms/i })).toBeInTheDocument();
});
