import { createContext, useEffect, useMemo, useRef, useState } from 'react';
import { createApi } from '../api/client';
import { saveTokens, loadTokens, clearTokens } from '../storage/secureTokens';

const CONSENT_VERSION = '2026-01-v1';
export const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [farmer, setFarmer] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [status, setStatus] = useState('unauthenticated'); // unauthenticated | pending_approval | active
  const [ready, setReady] = useState(false);
  const accessRef = useRef(null);
  const refreshRef = useRef(null);
  const credsRef = useRef(null); // last-used {phone,password} so the waiting screen can retry login

  const api = useMemo(
    () =>
      createApi({
        getAccess: () => accessRef.current,
        getRefresh: () => refreshRef.current,
        onTokens: (t) => { accessRef.current = t.accessToken; refreshRef.current = t.refreshToken; saveTokens(t); },
        onLogout: () => { accessRef.current = null; refreshRef.current = null; clearTokens(); setFarmer(null); setSubscription(null); setStatus('unauthenticated'); },
      }),
    []
  );

  async function register(form) {
    credsRef.current = { phone: form.phone, password: form.password };
    const { farmer: f, subscription: s } = await api.post('/auth/farmer/register', { consentVersion: CONSENT_VERSION, ...form });
    setFarmer(f);
    setSubscription(s);
    setStatus('pending_approval');
    return { farmer: f, subscription: s };
  }

  async function login(phone, password) {
    credsRef.current = { phone, password };
    let t;
    try {
      t = await api.post('/auth/farmer/login', { phone, password });
    } catch (e) {
      if (e.code === 'PENDING_APPROVAL') setStatus('pending_approval');
      throw e;
    }
    accessRef.current = t.accessToken;
    refreshRef.current = t.refreshToken;
    await saveTokens(t);
    setFarmer(t.farmer);
    const me = await api.get('/me');
    setSubscription(me.subscription);
    setStatus('active');
    return me;
  }

  // Used by the "Waiting for approval" screen's "Check again" button.
  async function retry() {
    if (!credsRef.current) return;
    return login(credsRef.current.phone, credsRef.current.password);
  }

  async function refreshMe() {
    const me = await api.get('/me');
    setFarmer(me.farmer);
    setSubscription(me.subscription);
    return me;
  }

  async function logout() {
    try { await api.post('/auth/logout', { refreshToken: refreshRef.current }); } catch { /* ignore */ }
    accessRef.current = null;
    refreshRef.current = null;
    await clearTokens();
    setFarmer(null);
    setSubscription(null);
    setStatus('unauthenticated');
  }

  useEffect(() => {
    (async () => {
      const t = await loadTokens();
      if (t) {
        accessRef.current = t.accessToken;
        refreshRef.current = t.refreshToken;
        try {
          const me = await api.get('/me');
          setFarmer(me.farmer);
          setSubscription(me.subscription);
          setStatus(me.subscription && me.subscription.status !== 'pending_approval' ? 'active' : 'pending_approval');
        } catch {
          await clearTokens();
        }
      }
      setReady(true);
    })();
  }, [api]);

  const value = {
    farmer, subscription, api, status, ready,
    isReadOnly: ['grace', 'expired'].includes(subscription?.status),
    register, login, retry, refreshMe, logout,
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
