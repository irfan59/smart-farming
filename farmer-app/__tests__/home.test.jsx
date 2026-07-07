import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AuthProvider } from '../src/auth/AuthContext';
import HomeScreen from '../src/screens/HomeScreen';

function wrap(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><AuthProvider>{ui}</AuthProvider></QueryClientProvider>);
}

it('shows this-month income / expense / profit', async () => {
  global.fetch = jest.fn(async (url) => {
    if (String(url).includes('/reports/monthly')) return { ok: true, status: 200, json: async () => ({ period: {}, income: 50000, expense: 24000, cashProfit: 26000 }) };
    throw new Error('unexpected ' + url);
  });
  wrap(<HomeScreen navigation={{ navigate: jest.fn() }} />);
  await waitFor(() => expect(screen.getByText('₹26,000')).toBeTruthy());
  expect(screen.getByText('₹50,000')).toBeTruthy();
  expect(screen.getByText('₹24,000')).toBeTruthy();
});
