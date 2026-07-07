import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AuthProvider } from '../src/auth/AuthContext';
import DashboardPage from '../src/pages/DashboardPage';

function wrap(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

it('shows KPIs from the pinned dashboard shape', async () => {
  wrap(<DashboardPage />);
  await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument()); // pendingApprovals
  expect(screen.getByText('₹990')).toBeInTheDocument(); // revenueThisMonth
  expect(screen.getByText('11')).toBeInTheDocument(); // activeSubscriptions
  const link = screen.getByRole('link', { name: /pending approvals/i });
  expect(link).toHaveAttribute('href', '/approvals');
});
