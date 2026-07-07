export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Single API client (pinned). Attaches the Bearer access token; on 401 refreshes once
// (single-flight) then retries; on refresh failure triggers logout. Throws ApiError.
export function createApi({ baseUrl = import.meta.env.VITE_API_URL, getAccess, getRefresh, onTokens, onLogout }) {
  let refreshing = null;

  async function refresh() {
    if (!refreshing) {
      refreshing = fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: getRefresh() }),
      })
        .then(async (r) => {
          if (!r.ok) {
            onLogout();
            throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');
          }
          const t = await r.json();
          onTokens(t);
          return t.accessToken;
        })
        .finally(() => {
          refreshing = null;
        });
    }
    return refreshing;
  }

  async function request(method, path, body) {
    const call = (token) =>
      fetch(`${baseUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

    let res = await call(getAccess());
    if (res.status === 401) {
      const t = await refresh();
      res = await call(t);
    }
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      const e = payload.error || {};
      throw new ApiError(res.status, e.code || 'ERROR', e.message || 'Request failed');
    }
    return res.status === 204 ? null : res.json();
  }

  return {
    get: (p) => request('GET', p),
    post: (p, b) => request('POST', p, b),
    patch: (p, b) => request('PATCH', p, b),
    del: (p) => request('DELETE', p),
  };
}
