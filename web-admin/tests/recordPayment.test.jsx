import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { AuthProvider } from '../src/auth/AuthContext';
import FarmerDetailPage from '../src/pages/FarmerDetailPage';

function wrap(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/farmers/f_1']}>
          <Routes>
            <Route path="/farmers/:id" element={ui} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

it('records a payment (correct body) and shows Active after refetch', async () => {
  let sub = { status: 'trial' };
  let postedBody = null;
  server.use(
    http.get('*/api/admin/farmers/f_1', () =>
      HttpResponse.json({
        farmer: { id: 'f_1', name: 'Ramesh', phone: '98', village: 'W', state: 'MH', status: 'active' },
        subscription: sub,
        counts: { plots: 1, cropCycles: 1, transactions: 3 },
        reportSummary: { totalIncome: 50000, totalExpense: 24000, cashProfit: 26000 },
      })),
    http.post('*/api/admin/payments', async ({ request }) => {
      postedBody = await request.json();
      sub = { status: 'active' };
      return HttpResponse.json({ payment: { amount: 99 }, subscription: sub });
    }),
  );

  wrap(<FarmerDetailPage />);
  await waitFor(() => expect(screen.getByText('Ramesh')).toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: /record payment/i }));
  await userEvent.click(screen.getByRole('button', { name: /save payment/i }));

  await waitFor(() => expect(postedBody).toMatchObject({ farmerId: 'f_1', amount: 99, method: 'cash', period: 'monthly' }));
  await waitFor(() => expect(screen.getByText('active')).toBeInTheDocument());
});
