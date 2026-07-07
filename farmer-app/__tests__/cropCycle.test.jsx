import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AuthProvider } from '../src/auth/AuthContext';
import CropCycleDetailScreen from '../src/screens/CropCycleDetailScreen';

function wrap(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><AuthProvider>{ui}</AuthProvider></QueryClientProvider>);
}

it('shows cash profit and reveals true profit on toggle (doc 06 numbers)', async () => {
  global.fetch = jest.fn(async (url) => {
    if (String(url).includes('/reports/crop-cycle/cyc1')) {
      return { ok: true, status: 200, json: async () => ({ cycle: { cropName: 'Wheat', season: 'rabi', year: '2025-26' }, cashProfit: 26000, trueProfit: 6000, perAcreCash: 13000, perAcreTrue: 3000, income: 50000, expense: 44000 }) };
    }
    throw new Error('unexpected ' + url);
  });
  wrap(<CropCycleDetailScreen route={{ params: { id: 'cyc1' } }} />);
  await waitFor(() => expect(screen.getByText('₹26,000')).toBeTruthy());
  expect(screen.queryByText('₹6,000')).toBeNull();
  fireEvent.press(screen.getByText('See my real profit'));
  await waitFor(() => expect(screen.getByText('₹6,000')).toBeTruthy());
});
