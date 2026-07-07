import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { createApi } from '../src/api/client';

const opts = { baseUrl: 'http://localhost:4000/api', getAccess: () => 'a1', getRefresh: () => 'r1', onTokens: () => {}, onLogout: () => {} };

it('refreshes once on 401 then retries', async () => {
  let calls = 0;
  server.use(
    http.get('*/api/admin/dashboard', () => {
      calls += 1;
      return calls === 1
        ? new HttpResponse(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'x' } }), { status: 401 })
        : HttpResponse.json({ pendingApprovals: 5 });
    }),
    http.post('*/api/auth/refresh', () => HttpResponse.json({ accessToken: 'a2', refreshToken: 'r2' })),
  );
  let loggedOut = false;
  const api = createApi({ ...opts, onLogout: () => { loggedOut = true; } });
  const data = await api.get('/admin/dashboard');
  expect(data.pendingApprovals).toBe(5);
  expect(loggedOut).toBe(false);
});

it('throws ApiError with code/message on a non-401 error', async () => {
  server.use(http.get('*/api/admin/config', () => new HttpResponse(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'no' } }), { status: 403 })));
  const api = createApi(opts);
  await expect(api.get('/admin/config')).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
});

it('logs out when refresh fails', async () => {
  server.use(
    http.get('*/api/admin/dashboard', () => new HttpResponse(null, { status: 401 })),
    http.post('*/api/auth/refresh', () => new HttpResponse(null, { status: 401 })),
  );
  let loggedOut = false;
  const api = createApi({ ...opts, onLogout: () => { loggedOut = true; } });
  await expect(api.get('/admin/dashboard')).rejects.toBeInstanceOf(Error);
  expect(loggedOut).toBe(true);
});
