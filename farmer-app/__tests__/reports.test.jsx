import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AuthProvider } from '../src/auth/AuthContext';
import ReportsScreen from '../src/screens/ReportsScreen';

function wrap(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><AuthProvider>{ui}</AuthProvider></QueryClientProvider>);
}

it('shows monthly numbers and the best-per-acre ranking', async () => {
  global.fetch = jest.fn(async (url) => {
    if (String(url).includes('/reports/monthly')) return { ok: true, status: 200, json: async () => ({ income: 50000, expense: 24000, cashProfit: 26000 }) };
    if (String(url).includes('/reports/crop-ranking')) return { ok: true, status: 200, json: async () => ({ data: [{ cycleId: 'c1', cropName: 'Wheat', season: 'rabi', year: '2025-26', perAcreTrue: 3000 }] }) };
    throw new Error('unexpected ' + url);
  });
  wrap(<ReportsScreen />);
  await waitFor(() => expect(screen.getByText('Cash profit: ₹26,000')).toBeTruthy());
  fireEvent.press(screen.getByText('Best per acre'));
  await waitFor(() => expect(screen.getByText(/Wheat/)).toBeTruthy());
});
