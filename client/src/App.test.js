import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Brandfluence landing page', () => {
  render(<App />);
  expect(screen.getByText(/welcome to brandfluence/i)).toBeInTheDocument();
});
