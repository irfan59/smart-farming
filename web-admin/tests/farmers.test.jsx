import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { AuthProvider } from '../src/auth/AuthContext';
import FarmersPage from '../src/pages/FarmersPage';

function wrap(ui, route = '/farmers') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

it('searches with ?q= and opens a farmer on row click', async () => {
  server.use(
    http.get('*/api/admin/farmers', ({ request }) => {
      const q = new URL(request.url).searchParams.get('q');
      const rows = q === 'ram'
        ? [{ id: 'f_9', name: 'Ramesh', phone: '98', village: 'W', state: 'MH', subscriptionStatus: 'active' }]
        : [{ id: 'f_1', name: 'Suresh', phone: '99', village: 'X', state: 'MH', subscriptionStatus: 'trial' }];
      return HttpResponse.json({ data: rows, total: rows.length, page: 1 });
    }),
  );
  wrap(
    <Routes>
      <Route path="/farmers" element={<FarmersPage />} />
      <Route path="/farmers/:id" element={<div>DETAIL f_9</div>} />
    </Routes>
  );
  await waitFor(() => expect(screen.getByText('Suresh')).toBeInTheDocument());
  await userEvent.type(screen.getByLabelText(/search farmers/i), 'ram');
  await waitFor(() => expect(screen.getByText('Ramesh')).toBeInTheDocument());
  await userEvent.click(screen.getByText('Ramesh'));
  await waitFor(() => expect(screen.getByText('DETAIL f_9')).toBeInTheDocument());
});
