import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AuthProvider } from '../src/auth/AuthContext';
import { useAuth } from '../src/auth/useAuth';

function Probe() {
  const { status, register, login, farmer } = useAuth();
  return (
    <>
      <Text>status:{status}</Text>
      <Text>farmer:{farmer?.name || ''}</Text>
      <Text onPress={() => register({ name: 'R', phone: '9990001111', password: 'secret12', village: 'X', state: 'MH', district: 'W' })}>doRegister</Text>
      <Text onPress={() => login('9990001111', 'secret12').catch(() => {})}>doLogin</Text>
    </>
  );
}

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>
  );
}

it('register sets status pending_approval', async () => {
  global.fetch = jest.fn(async (url) => {
    if (String(url).endsWith('/auth/farmer/register')) return { ok: true, status: 201, json: async () => ({ farmer: { id: 'f1', name: 'R' }, subscription: { status: 'pending_approval' } }) };
    throw new Error('unexpected ' + url);
  });
  wrap();
  await waitFor(() => expect(screen.getByText('status:unauthenticated')).toBeTruthy());
  fireEvent.press(screen.getByText('doRegister'));
  await waitFor(() => expect(screen.getByText('status:pending_approval')).toBeTruthy());
});

it('login rejected as PENDING_APPROVAL stays pending; after approval becomes active', async () => {
  let approved = false;
  global.fetch = jest.fn(async (url) => {
    if (String(url).endsWith('/auth/farmer/login')) {
      return approved
        ? { ok: true, status: 200, json: async () => ({ accessToken: 'a', refreshToken: 'r', farmer: { id: 'f1', name: 'Ramesh' } }) }
        : { ok: false, status: 403, json: async () => ({ error: { code: 'PENDING_APPROVAL', message: 'wait' } }) };
    }
    if (String(url).endsWith('/me')) return { ok: true, status: 200, json: async () => ({ farmer: { id: 'f1', name: 'Ramesh' }, subscription: { status: 'trial' } }) };
    throw new Error('unexpected ' + url);
  });
  wrap();
  await waitFor(() => expect(screen.getByText('status:unauthenticated')).toBeTruthy());
  fireEvent.press(screen.getByText('doLogin'));
  await waitFor(() => expect(screen.getByText('status:pending_approval')).toBeTruthy());
  approved = true;
  fireEvent.press(screen.getByText('doLogin'));
  await waitFor(() => expect(screen.getByText('status:active')).toBeTruthy());
  expect(screen.getByText('farmer:Ramesh')).toBeTruthy();
});
