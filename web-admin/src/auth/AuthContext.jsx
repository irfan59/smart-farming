import { createContext, useEffect, useMemo, useRef, useState } from 'react';
import { createApi } from '../api/client';

const REFRESH_KEY = 'sf_admin_refresh';
export const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [ready, setReady] = useState(false);
  const accessRef = useRef(null);

  const api = useMemo(
    () =>
      createApi({
        getAccess: () => accessRef.current,
        getRefresh: () => localStorage.getItem(REFRESH_KEY),
        onTokens: (t) => {
          accessRef.current = t.accessToken;
          localStorage.setItem(REFRESH_KEY, t.refreshToken);
        },
        onLogout: () => {
          accessRef.current = null;
          localStorage.removeItem(REFRESH_KEY);
          setAdmin(null);
        },
      }),
    []
  );

  async function login(email, password) {
    const t = await api.post('/auth/admin/login', { email, password });
    accessRef.current = t.accessToken;
    localStorage.setItem(REFRESH_KEY, t.refreshToken);
    setAdmin(t.admin);
  }

  async function logout() {
    try {
      await api.post('/auth/logout', { refreshToken: localStorage.getItem(REFRESH_KEY) });
    } catch {
      /* ignore network errors on logout */
    }
    accessRef.current = null;
    localStorage.removeItem(REFRESH_KEY);
    setAdmin(null);
  }

  useEffect(() => {
    (async () => {
      if (localStorage.getItem(REFRESH_KEY)) {
        try {
          const { admin: me } = await api.get('/admin/me'); // 401 -> client refreshes with stored token
          setAdmin(me);
        } catch {
          /* stale/invalid refresh token */
        }
      }
      setReady(true);
    })();
  }, [api]);

  const value = {
    admin,
    api,
    isAuthed: !!admin,
    isSuperadmin: admin?.role === 'superadmin',
    ready,
    login,
    logout,
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
