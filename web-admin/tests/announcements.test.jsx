import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { AuthProvider } from '../src/auth/AuthContext';
import AnnouncementsPage from '../src/pages/AnnouncementsPage';

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

it('lists announcements and sends a new one (audience all)', async () => {
  window.confirm = () => true;
  let posted = null;
  server.use(
    http.get('*/api/admin/announcements', () =>
      HttpResponse.json({ data: posted ? [{ id: 'x', title: posted.title, createdAt: new Date().toISOString(), pushSent: true }] : [] })),
    http.post('*/api/admin/announcements', async ({ request }) => { posted = await request.json(); return HttpResponse.json({ id: 'x', ...posted, pushSent: true }); }),
  );
  wrap(<AnnouncementsPage />);
  await waitFor(() => expect(screen.getByText('No announcements')).toBeInTheDocument());
  await userEvent.type(screen.getByLabelText(/title/i), 'Mandi update');
  await userEvent.type(screen.getByLabelText(/body/i), 'Wheat rate up');
  await userEvent.click(screen.getByRole('button', { name: /send/i }));
  await waitFor(() => expect(posted).toMatchObject({ title: 'Mandi update', audience: 'all' }));
});
