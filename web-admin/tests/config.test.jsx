import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { AuthProvider } from '../src/auth/AuthContext';
import ConfigPage from '../src/pages/ConfigPage';

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

it('loads config and saves an updated monthly price', async () => {
  let saved = null;
  server.use(
    http.get('*/api/admin/config', () =>
      HttpResponse.json({ trialDays: 14, monthlyPriceINR: 99, yearlyPriceINR: 799, graceDays: 30, dailyWageINR: 350, ownLandRentalPerAcreINR: 4000, ownedCapitalInterestRatePct: 10, landUnitConversions: {} })),
    http.patch('*/api/admin/config', async ({ request }) => { saved = await request.json(); return HttpResponse.json(saved); }),
  );
  wrap(<ConfigPage />);
  const input = await screen.findByLabelText(/monthly price/i);
  expect(input).toHaveValue(99);
  await userEvent.clear(input);
  await userEvent.type(input, '149');
  await userEvent.click(screen.getByRole('button', { name: /save/i }));
  await waitFor(() => expect(saved.monthlyPriceINR).toBe(149));
});
