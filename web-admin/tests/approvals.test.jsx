import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { AuthProvider } from '../src/auth/AuthContext';
import ApprovalsPage from '../src/pages/ApprovalsPage';

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

it('lists pending farmers and approves one (row disappears after invalidation)', async () => {
  let approved = false;
  server.use(
    http.get('*/api/admin/farmers', () => {
      const data = approved ? [] : [{ id: 'f_1', name: 'Ramesh', phone: '9800000001', village: 'Wardha', subscriptionStatus: 'pending_approval' }];
      return HttpResponse.json({ data, total: data.length, page: 1 });
    }),
    http.post('*/api/admin/farmers/f_1/approve', () => {
      approved = true;
      return HttpResponse.json({ farmer: { id: 'f_1' }, subscription: { status: 'trial' } });
    }),
  );
  wrap(<ApprovalsPage />);
  await waitFor(() => expect(screen.getByText('Ramesh')).toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: /approve/i }));
  await waitFor(() => expect(screen.getByText('No pending farmers')).toBeInTheDocument());
});
