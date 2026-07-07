import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { AuthProvider } from '../src/auth/AuthContext';
import { useAuth } from '../src/auth/useAuth';
import ProtectedRoute from '../src/routes/ProtectedRoute';
import LoginPage from '../src/pages/LoginPage';

function wrap(ui, { route = '/' } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function Probe() {
  const { isAuthed, admin } = useAuth();
  return <div>authed:{String(isAuthed)} name:{admin?.name || ''}</div>;
}

it('login stores the admin and sets isAuthed', async () => {
  wrap(<><LoginPage /><Probe /></>);
  await userEvent.type(screen.getByLabelText(/email/i), 'owner@farm.in');
  await userEvent.type(screen.getByLabelText(/password/i), 'secret');
  await userEvent.click(screen.getByRole('button', { name: /log in/i }));
  await waitFor(() => expect(screen.getByText(/authed:true/)).toBeInTheDocument());
  expect(screen.getByText(/name:Owner/)).toBeInTheDocument();
});

it('ProtectedRoute redirects to /login when unauthenticated', async () => {
  wrap(
    <Routes>
      <Route path="/login" element={<div>LOGIN PAGE</div>} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<div>SECRET</div>} />
      </Route>
    </Routes>
  );
  await waitFor(() => expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument());
});

it('requireSuperadmin redirects a plain admin away from a superadmin route', async () => {
  localStorage.setItem('sf_admin_refresh', 'r1');
  server.use(http.get('*/api/admin/me', () => HttpResponse.json({ admin: { id: 'a', name: 'A', email: 'a@x', role: 'admin' } })));
  wrap(
    <Routes>
      <Route path="/" element={<div>HOME</div>} />
      <Route element={<ProtectedRoute requireSuperadmin />}>
        <Route path="/config" element={<div>CONFIG</div>} />
      </Route>
    </Routes>,
    { route: '/config' }
  );
  await waitFor(() => expect(screen.getByText('HOME')).toBeInTheDocument());
});
