import { createApi } from '../src/api/client';

const opts = { baseUrl: 'http://x/api', getAccess: () => 'a1', getRefresh: () => 'r1', onTokens: () => {}, onLogout: () => {} };

it('refreshes once on 401 then retries', async () => {
  let n = 0;
  global.fetch = jest.fn(async (url) => {
    if (String(url).endsWith('/me')) {
      n += 1;
      return n === 1
        ? { status: 401, ok: false, json: async () => ({ error: { code: 'UNAUTHORIZED', message: 'x' } }) }
        : { status: 200, ok: true, json: async () => ({ farmer: { id: 'f1' } }) };
    }
    if (String(url).endsWith('/auth/refresh')) return { status: 200, ok: true, json: async () => ({ accessToken: 'a2', refreshToken: 'r2' }) };
    throw new Error(`unexpected ${url}`);
  });
  const api = createApi(opts);
  const data = await api.get('/me');
  expect(data.farmer.id).toBe('f1');
});

it('throws ApiError with code/message on a non-401 error', async () => {
  global.fetch = jest.fn(async () => ({ status: 403, ok: false, json: async () => ({ error: { code: 'READ_ONLY', message: 'no' } }) }));
  const api = createApi(opts);
  await expect(api.post('/transactions', {})).rejects.toMatchObject({ status: 403, code: 'READ_ONLY' });
});

it('logs out when refresh fails', async () => {
  global.fetch = jest.fn(async () => ({ status: 401, ok: false, json: async () => ({}) }));
  let out = false;
  const api = createApi({ ...opts, onLogout: () => { out = true; } });
  await expect(api.get('/me')).rejects.toBeInstanceOf(Error);
  expect(out).toBe(true);
});
