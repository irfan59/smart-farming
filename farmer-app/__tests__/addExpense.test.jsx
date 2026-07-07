import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AuthProvider } from '../src/auth/AuthContext';
import AddExpenseScreen from '../src/screens/AddExpenseScreen';

function wrap(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><AuthProvider>{ui}</AuthProvider></QueryClientProvider>);
}

it('logs an expense in a few taps (category -> amount -> save)', async () => {
  let posted = null;
  global.fetch = jest.fn(async (url, opts) => {
    if (String(url).includes('/catalog/expense-categories')) return { ok: true, status: 200, json: async () => ({ data: [{ id: 'c1', name: 'Seeds', cacpTag: 'A2', isImputed: false }] }) };
    if (String(url).endsWith('/transactions') && opts?.method === 'POST') { posted = JSON.parse(opts.body); return { ok: true, status: 201, json: async () => ({ id: 't1' }) }; }
    throw new Error('unexpected ' + url);
  });
  const navigation = { goBack: jest.fn() };
  wrap(<AddExpenseScreen navigation={navigation} route={{ params: {} }} />);

  await waitFor(() => expect(screen.getByText('Seeds')).toBeTruthy());
  fireEvent.press(screen.getByText('Seeds'));
  fireEvent.press(screen.getByLabelText('key-1'));
  fireEvent.press(screen.getByLabelText('key-5'));
  fireEvent.press(screen.getByLabelText('key-0'));
  fireEvent.press(screen.getByLabelText('key-0'));
  fireEvent.press(screen.getByText('Save'));

  await waitFor(() => expect(posted).toMatchObject({ type: 'expense', categoryId: 'c1', amount: 1500 }));
  expect(navigation.goBack).toHaveBeenCalled();
});
