# Smart Farming — Web Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React web admin the product owner uses to approve farmers before login, activate manual subscriptions, view any farmer's data, manage master data, send announcements, and see revenue — talking only to the v1 API.

**Architecture:** A React + Vite SPA. One `api` client attaches the admin Bearer token and transparently refreshes on `401`. One `AuthContext` restores the session on reload (refresh token → `/auth/refresh` → `GET /admin/me`). Routing is gated by `ProtectedRoute` (with a `requireSuperadmin` flag). Server state via TanStack Query, all fetching through `api`.

**Tech Stack:** React 18, Vite, React Router 6, TanStack Query 5, Zod (form checks), plain CSS modules; Vitest + React Testing Library + MSW 2 for tests. Deploy to Vercel (free).

> **SOURCE OF TRUTH:** [`API-CONTRACT.md`](API-CONTRACT.md). Every request/response shape below is copied from it. If this plan and the contract ever disagree, **the contract wins.** The backend (repo root) already implements the contract; build the client to match it exactly.

---

## Pinned conventions (from API-CONTRACT.md — all modules follow these)

- **Project root:** everything under `D:/smart-farming/web-admin/` (its own `package.json`, `vite.config.js`, `src/`, `tests/`). No web-admin file lives at the repo root.
- **One API client** `src/api/client.js` exporting `api` with `api.get(path)`, `api.post(path, body)`, `api.patch(path, body)`, `api.del(path)`. Bodies are plain objects (client stringifies + sets JSON content-type). It attaches the Bearer access token and, on `401`, calls `POST /auth/refresh` **once** then retries; if refresh fails it triggers logout. Every feature imports `{ api }` — no other client shape.
- **One AuthContext** `src/auth/AuthContext.jsx` exposing `{ admin, isAuthed, isSuperadmin, login(email,password), logout() }`. On load, if a refresh token exists it calls `/auth/refresh` then `GET /admin/me` to restore `admin`.
- **One `ProtectedRoute`** `src/routes/ProtectedRoute.jsx`, route-element style using `<Outlet/>`, prop `requireSuperadmin` (boolean).
- **App shell** `src/components/AdminLayout.jsx` with nav (Dashboard, Farmers, Payments, Master data, Announcements, and Config only when `isSuperadmin`); all pages render inside it.
- **Errors:** the API always returns `{ error: { code, message } }`. The `api` client throws an `ApiError` carrying `status`, `code`, `message`; UI surfaces `message`, special-casing `code` where noted.
- **Money in INR (Rs)**, English only. **TDD is genuinely red-first** (the first test fails because the behaviour doesn't exist). **No `require()` in ESM tests — use `import`.**
- **Token storage:** access token in memory (context); refresh token in `localStorage` under `sf_admin_refresh`.

---

## Contract quick-reference (endpoints this app calls)

```
POST /auth/admin/login   {email,password}         -> {accessToken, refreshToken, admin{id,name,email,role}}
GET  /admin/me                                    -> {admin}
POST /auth/refresh       {refreshToken}           -> {accessToken, refreshToken}
POST /auth/logout        {refreshToken}           -> {ok:true}
GET  /admin/dashboard    -> {pendingApprovals, farmersByStatus, subscriptionsByStatus, activeSubscriptions, revenueThisMonth, revenueTotal}
GET  /admin/farmers?q=&status=&page=  -> {data:[{id,name,phone,village,state,district,status,subscriptionStatus,createdAt}], total, page}
GET  /admin/farmers/:id  -> {farmer, subscription, counts:{plots,cropCycles,transactions}, reportSummary:{totalIncome,totalExpense,cashProfit}}
POST /admin/farmers/:id/approve          -> {farmer, subscription}
PATCH /admin/farmers/:id  {status}       -> {farmer}
POST /admin/farmers/:id/reset-password   -> {tempPassword}
POST /admin/farmers/:id/deactivate       -> {status:'deactivated'}
POST /admin/payments  {farmerId,amount,method,period,note}  -> {payment, subscription}
GET  /admin/payments?farmerId=&from=&to=  -> {data:[Payment], total}
GET/POST/PATCH /admin/crops | /admin/expense-categories | /admin/income-categories   (lists -> {data:[...]})
GET/PATCH /admin/config   (superadmin)   -> {trialDays,monthlyPriceINR,yearlyPriceINR,graceDays,dailyWageINR,ownLandRentalPerAcreINR,landUnitConversions}
POST /admin/announcements {title,body,audience}  -> announcement{...,pushSent}
GET  /admin/announcements  -> {data:[{id,title,body,audience,createdAt,pushSent}]}
Error (any): {error:{code,message}}   e.g. code 'FORBIDDEN','VALIDATION','NOT_FOUND'
```

---

## File structure

```
web-admin/
  package.json  vite.config.js  index.html  .env.example   # VITE_API_URL=http://localhost:4000/api
  src/
    main.jsx  App.jsx
    api/client.js                # api.get/post/patch/del + 401 refresh + ApiError
    auth/AuthContext.jsx  auth/useAuth.js
    routes/ProtectedRoute.jsx
    lib/queryClient.js  lib/money.js
    components/AdminLayout.jsx  DataTable.jsx  Modal.jsx  StatusPill.jsx  Field.jsx
    features/
      dashboard/useDashboard.js
      farmers/useFarmers.js  useFarmer.js  useApprove.js  useRecordPayment.js
              useFarmerActions.js
      masterData/useMasterData.js
      config/useConfig.js
      announcements/useAnnouncements.js
      payments/usePayments.js
    pages/
      LoginPage.jsx  DashboardPage.jsx  ApprovalsPage.jsx  FarmersPage.jsx
      FarmerDetailPage.jsx  PaymentsPage.jsx  MasterDataPage.jsx
      AnnouncementsPage.jsx  ConfigPage.jsx
  tests/
    setup.js  mocks/handlers.js  mocks/server.js
    client.test.jsx  auth.test.jsx  approvals.test.jsx  recordPayment.test.jsx
    farmers.test.jsx  config.test.jsx
```

## Modules & build order

1. **WS** — Scaffold + MSW test harness
2. **AUTH** — API client, AuthContext, ProtectedRoute, LoginPage, AdminLayout, routing
3. **DASH** — Dashboard
4. **FARM** — Approvals, farmers list, farmer detail + actions
5. **PAY** — Payments
6. **MD** — Master data + config
7. **ANN** — Announcements
8. **DEP** — Build + deploy

---

## Module WS — Scaffold & MSW test harness

### Task WS-1: Create the Vite app

**Files:** `web-admin/package.json`, `web-admin/vite.config.js`, `web-admin/.env.example`

- [ ] **Step 1:** From `D:/smart-farming/`: `npm create vite@latest web-admin -- --template react`. Then in `web-admin/`:
```bash
npm i react-router-dom @tanstack/react-query zod
npm i -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom msw
```
- [ ] **Step 2:** `vite.config.js`:
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: './tests/setup.js' },
});
```
- [ ] **Step 3:** `.env.example` → `VITE_API_URL=http://localhost:4000/api`. Add scripts to `package.json`: `"dev":"vite"`, `"build":"vite build"`, `"preview":"vite preview"`, `"test":"vitest run"`, `"test:watch":"vitest"`.
- [ ] **Step 4: Commit** `chore(web-admin): scaffold vite react app`.

### Task WS-2: MSW server + contract handlers

**Files:** `tests/setup.js`, `tests/mocks/server.js`, `tests/mocks/handlers.js`

- [ ] **Step 1:** `tests/mocks/server.js`:
```js
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);
```
- [ ] **Step 2:** `tests/mocks/handlers.js` — default happy-path handlers matching the contract (tests override per-case with `server.use(...)`):
```js
import { http, HttpResponse } from 'msw';
const B = '*/api';
export const handlers = [
  http.post(`${B}/auth/admin/login`, async ({ request }) => {
    const { email } = await request.json();
    return HttpResponse.json({ accessToken: 'a1', refreshToken: 'r1', admin: { id: 'adm_1', name: 'Owner', email, role: 'superadmin' } });
  }),
  http.get(`${B}/admin/me`, () => HttpResponse.json({ admin: { id: 'adm_1', name: 'Owner', email: 'owner@farm.in', role: 'superadmin' } })),
  http.post(`${B}/auth/refresh`, () => HttpResponse.json({ accessToken: 'a2', refreshToken: 'r2' })),
  http.get(`${B}/admin/dashboard`, () => HttpResponse.json({ pendingApprovals: 2, farmersByStatus: { active: 10, suspended: 1, deactivated: 0 }, subscriptionsByStatus: { pending_approval: 2, trial: 3, active: 8, grace: 1, expired: 0 }, activeSubscriptions: 11, revenueThisMonth: 990, revenueTotal: 12870 })),
];
```
- [ ] **Step 3:** `tests/setup.js`:
```js
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { server.resetHandlers(); localStorage.clear(); });
afterAll(() => server.close());
import.meta.env.VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
```
- [ ] **Step 4: Commit** `test(web-admin): MSW server + contract handlers`.

---

## Module AUTH — client, context, routing, layout

### Task AUTH-1: The `api` client with single-flight 401 refresh

**Files:** `src/api/client.js`. **Test:** `tests/client.test.jsx`.

- [ ] **Step 1: Write the failing test** (401 → refresh once → retry succeeds; refresh failure → logout callback):
```jsx
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { createApi } from '../src/api/client';

it('refreshes once on 401 then retries', async () => {
  let calls = 0;
  server.use(
    http.get('*/api/admin/dashboard', () => {
      calls += 1;
      return calls === 1 ? new HttpResponse(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'x' } }), { status: 401 })
                         : HttpResponse.json({ pendingApprovals: 5 });
    }),
    http.post('*/api/auth/refresh', () => HttpResponse.json({ accessToken: 'a2', refreshToken: 'r2' })),
  );
  let loggedOut = false;
  const api = createApi({ getAccess: () => 'a1', getRefresh: () => 'r1', onTokens: () => {}, onLogout: () => { loggedOut = true; } });
  const data = await api.get('/admin/dashboard');
  expect(data.pendingApprovals).toBe(5);
  expect(loggedOut).toBe(false);
});

it('throws ApiError with code/message on non-401 error', async () => {
  server.use(http.get('*/api/admin/config', () => new HttpResponse(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'no' } }), { status: 403 })));
  const api = createApi({ getAccess: () => 'a1', getRefresh: () => 'r1', onTokens: () => {}, onLogout: () => {} });
  await expect(api.get('/admin/config')).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
});
```
- [ ] **Step 2: Run — FAIL** (`npm test client`).
- [ ] **Step 3: Implement `src/api/client.js`:**
```js
export class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

export function createApi({ baseUrl = import.meta.env.VITE_API_URL, getAccess, getRefresh, onTokens, onLogout }) {
  let refreshing = null;
  async function refresh() {
    if (!refreshing) {
      refreshing = fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: getRefresh() }),
      }).then(async (r) => {
        if (!r.ok) { onLogout(); throw new ApiError(401, 'UNAUTHORIZED', 'Session expired'); }
        const t = await r.json(); onTokens(t); return t.accessToken;
      }).finally(() => { refreshing = null; });
    }
    return refreshing;
  }
  async function request(method, path, body) {
    const call = (token) => fetch(`${baseUrl}${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let res = await call(getAccess());
    if (res.status === 401) { const t = await refresh(); res = await call(t); }
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      const e = payload.error || {};
      throw new ApiError(res.status, e.code || 'ERROR', e.message || 'Request failed');
    }
    return res.status === 204 ? null : res.json();
  }
  return {
    get: (p) => request('GET', p), post: (p, b) => request('POST', p, b),
    patch: (p, b) => request('PATCH', p, b), del: (p) => request('DELETE', p),
  };
}
```
- [ ] **Step 4: Run — PASS. Commit** `feat(web-admin): api client with single-flight 401 refresh`.

### Task AUTH-2: AuthContext (bootstrap, login, logout) + `useAuth`

**Files:** `src/auth/AuthContext.jsx`, `src/auth/useAuth.js`. **Test:** `tests/auth.test.jsx`.

- [ ] **Step 1: Failing tests** — `login('owner@farm.in','x')` stores tokens + `admin`, sets `isAuthed`; on mount with a stored refresh token it restores `admin` via `/admin/me`; `isSuperadmin` reflects `admin.role`.
- [ ] **Step 2: Implement `AuthContext.jsx`:** holds `accessToken` in state + `admin`; refresh token in `localStorage['sf_admin_refresh']`. Build a memoized `api` (via `createApi`) wired to `getAccess`/`getRefresh`/`onTokens`/`onLogout`. Expose `api` on context too so features share the one client.
```jsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createApi } from '../api/client';
const REFRESH_KEY = 'sf_admin_refresh';
const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [ready, setReady] = useState(false);
  const accessRef = useRef(null);
  const api = useMemo(() => createApi({
    getAccess: () => accessRef.current,
    getRefresh: () => localStorage.getItem(REFRESH_KEY),
    onTokens: (t) => { accessRef.current = t.accessToken; localStorage.setItem(REFRESH_KEY, t.refreshToken); },
    onLogout: () => { accessRef.current = null; localStorage.removeItem(REFRESH_KEY); setAdmin(null); },
  }), []);

  async function login(email, password) {
    const t = await api.post('/auth/admin/login', { email, password });
    accessRef.current = t.accessToken; localStorage.setItem(REFRESH_KEY, t.refreshToken); setAdmin(t.admin);
  }
  async function logout() {
    try { await api.post('/auth/logout', { refreshToken: localStorage.getItem(REFRESH_KEY) }); } catch { /* ignore */ }
    accessRef.current = null; localStorage.removeItem(REFRESH_KEY); setAdmin(null);
  }
  useEffect(() => {
    (async () => {
      if (localStorage.getItem(REFRESH_KEY)) {
        try { const { admin } = await api.get('/admin/me'); setAdmin(admin); } catch { /* stale token */ }
      }
      setReady(true);
    })();
  }, [api]);

  const value = { admin, api, isAuthed: !!admin, isSuperadmin: admin?.role === 'superadmin', login, logout, ready };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
```
Note: `GET /admin/me` sends the access token; but after reload the access token is null → the client's 401-refresh kicks in, using the stored refresh token, so `/admin/me` succeeds. This is the intended restore path.
- [ ] **Step 3: Run — PASS. Commit** `feat(web-admin): auth context with refresh-based session restore`.

### Task AUTH-3: ProtectedRoute + LoginPage + AdminLayout + App routing

**Files:** `src/routes/ProtectedRoute.jsx`, `src/pages/LoginPage.jsx`, `src/components/AdminLayout.jsx`, `src/App.jsx`, `src/lib/queryClient.js`, `src/main.jsx`. **Test:** extend `auth.test.jsx` (unauthed → redirect to `/login`; superadmin-only route blocks a plain admin).

- [ ] **Step 1:** `ProtectedRoute.jsx`:
```jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
export default function ProtectedRoute({ requireSuperadmin = false }) {
  const { isAuthed, isSuperadmin, ready } = useAuth();
  if (!ready) return null; // or a spinner
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (requireSuperadmin && !isSuperadmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
```
- [ ] **Step 2:** `LoginPage.jsx` — email + password form, zod-checked, calls `login`, shows `ApiError.message` (e.g. INVALID_CREDENTIALS), redirects to `/` on success.
- [ ] **Step 3:** `AdminLayout.jsx` — sidebar links: Dashboard `/`, Farmers `/farmers`, Payments `/payments`, Master data `/master-data`, Announcements `/announcements`, and **Config `/config` only when `isSuperadmin`**; a header with the admin name + logout; `<Outlet/>` for the page.
- [ ] **Step 4:** `App.jsx` wires `QueryClientProvider` + `AuthProvider` + `BrowserRouter`. Routes: `/login` public; everything else under `<ProtectedRoute/>` → `<AdminLayout/>` with child routes; `/config` under `<ProtectedRoute requireSuperadmin/>`.
- [ ] **Step 5: Run — PASS. Commit** `feat(web-admin): protected routing, login, layout`.

---

## Module DASH — Dashboard

### Task DASH-1: Dashboard KPIs (pinned shape)

**Files:** `src/features/dashboard/useDashboard.js`, `src/pages/DashboardPage.jsx`. **Test:** `tests/dashboard` via default handler.

- [ ] **Step 1:** `useDashboard` = `useQuery(['dashboard'], () => api.get('/admin/dashboard'))` (get `api` from `useAuth`).
- [ ] **Step 2:** `DashboardPage` renders cards: **Pending approvals** (`pendingApprovals`, links to `/approvals`), Active subscriptions (`activeSubscriptions`), Revenue this month (`revenueThisMonth`, via `lib/money.js` → `₹` + `toLocaleString('en-IN')`), Revenue total, and a small breakdown of `subscriptionsByStatus`.
- [ ] **Step 3: Test** asserts the numbers render and the pending card is a link. **Commit** `feat(web-admin): dashboard`.

---

## Module FARM — Approvals, farmers, detail, actions

### Task FARM-1: Approvals queue + approve

**Files:** `src/pages/ApprovalsPage.jsx`, `src/features/farmers/useApprove.js`, plus `useFarmers`. **Test:** `tests/approvals.test.jsx`.

- [ ] **Step 1: Failing test:**
```jsx
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
// render <ApprovalsPage/> inside providers; MSW:
//   GET /admin/farmers?status=pending_approval&page=1 -> {data:[{id:'f_1',name:'Ramesh',phone:'98...',village:'Wardha',subscriptionStatus:'pending_approval'}], total:1, page:1}
//   POST /admin/farmers/f_1/approve -> {farmer:{...}, subscription:{status:'trial'}}
// click "Approve" -> POST fired -> query invalidated -> row gone / success shown
```
- [ ] **Step 2: Implement.** `useFarmers({ q, status, page })` = `useQuery(['farmers', {q,status,page}], () => api.get(\`/admin/farmers?q=${encodeURIComponent(q||'')}&status=${status||''}&page=${page||1}\`))` → returns `{data,total,page}`. `useApprove` = `useMutation((id) => api.post(\`/admin/farmers/${id}/approve\`), { onSuccess: () => qc.invalidateQueries({ queryKey: ['farmers'] }) })`. `ApprovalsPage` calls `useFarmers({ status: 'pending_approval' })`, renders a `DataTable` (name, phone, village, registered), Approve button per row with a confirm.
- [ ] **Step 3: Run — PASS. Commit** `feat(web-admin): approvals queue`.

### Task FARM-2: Farmers list (search `q`, status filter, pagination)

**Files:** `src/pages/FarmersPage.jsx`, `src/components/DataTable.jsx`, `src/components/StatusPill.jsx`. **Test:** `tests/farmers.test.jsx`.

- [ ] Implement `DataTable` (columns, rows, page prev/next using `total`/`page`, page size 20). `StatusPill` colors: pending_approval=amber, trial=blue, active=green, grace=orange, expired=grey, suspended/deactivated=red. `FarmersPage`: debounced search box (drives `?q=`), status `<select>`, table with `subscriptionStatus` pill, row click → `/farmers/:id`. **Commit** `feat(web-admin): farmers list with search, filter, pagination`.

### Task FARM-3: Farmer detail + actions (approve, record payment, suspend, deactivate, reset password)

**Files:** `src/pages/FarmerDetailPage.jsx`, `src/features/farmers/useFarmer.js`, `useRecordPayment.js`, `useFarmerActions.js`, `src/components/Modal.jsx`. **Test:** `tests/recordPayment.test.jsx`.

- [ ] **Step 1: Failing test** — open the Record-Payment modal, enter ₹99 + method `cash` + period `monthly`, submit → `POST /admin/payments {farmerId, amount:99, method:'cash', period:'monthly'}` fired; on success the subscription pill shows **Active**:
```jsx
// MSW: GET /admin/farmers/f_1 -> {farmer:{id:'f_1',name:'Ramesh',status:'active'}, subscription:{status:'trial'}, counts:{plots:1,cropCycles:1,transactions:3}, reportSummary:{totalIncome:50000,totalExpense:24000,cashProfit:26000}}
//      POST /admin/payments -> {payment:{amount:99}, subscription:{status:'active', currentPeriodEnd:'...'}}
```
- [ ] **Step 2: Implement.** `useFarmer(id)` = `useQuery(['farmer', id], () => api.get(\`/admin/farmers/${id}\`))`. Page sections:
  - **Profile** (name, phone, village, state, district; consent info).
  - **Subscription** (`StatusPill`, trial/period dates; **Approve** button if `subscription.status === 'pending_approval'`; **Record payment** button → `Modal` with amount (`Field`), method select (cash/upi/other), period select (monthly/yearly, defaulting price hint ₹99/₹799 from `/admin/config` if available)).
  - **Counts** (plots / crop cycles / transactions) and **reportSummary** (income, expense, cash profit in ₹).
  - **Actions:** Suspend/Reactivate (`PATCH /admin/farmers/:id {status}`), **Deactivate** (`POST /admin/farmers/:id/deactivate`, confirm: "data is retained"), **Reset password** (`POST /admin/farmers/:id/reset-password` → show the returned `tempPassword` once).
  `useRecordPayment` = mutation posting `/admin/payments`, `onSuccess` invalidates `['farmer', id]`. `useFarmerActions` bundles approve/suspend/deactivate/reset mutations, each invalidating `['farmer', id]` (+ `['farmers']`).
- [ ] **Step 3: Run — PASS. Commit** `feat(web-admin): farmer detail with actions + record payment`.

---

## Module PAY — Payments

### Task PAY-1: Payments list

**Files:** `src/pages/PaymentsPage.jsx`, `src/features/payments/usePayments.js`.

- [ ] `usePayments({ farmerId, from, to })` → `api.get(\`/admin/payments?farmerId=${farmerId||''}&from=${from||''}&to=${to||''}\`)` returns `{data, total}`. Page: date-range + optional farmer filter, table (date, farmer, amount ₹, method, period covered), sum of shown amounts. **Commit** `feat(web-admin): payments list`.

---

## Module MD — Master data + config

### Task MD-1: Master-data editors (crops, expense & income categories)

**Files:** `src/pages/MasterDataPage.jsx`, `src/features/masterData/useMasterData.js`. **Test:** light render + create/deactivate.

- [ ] Tabs for **Crops** (`name`, `defaultSeason`, `icon`), **Expense categories** (`name`, `isPaidOut`, `isImputed`, `cacpTag` A1/A2/FL/C2, `icon`), **Income categories** (`name`, `type`, `icon`). Each tab: list (from `{data}`), add form (POST), and **Activate/Deactivate** toggle (`PATCH … {isActive}`). No delete. `useMasterData(resource)` centralizes `list/create/update` against `/admin/${resource}`. **Commit** `feat(web-admin): master-data editors`.

### Task MD-2: Config page (superadmin only)

**Files:** `src/pages/ConfigPage.jsx`, `src/features/config/useConfig.js`. **Test:** `tests/config.test.jsx` — a plain admin gets redirected from `/config` (ProtectedRoute `requireSuperadmin`); a superadmin can PATCH `monthlyPriceINR`.

- [ ] Form to edit `trialDays`, `monthlyPriceINR` (₹99), `yearlyPriceINR` (₹799), `graceDays`, `dailyWageINR`, `ownLandRentalPerAcreINR`, `ownedCapitalInterestRatePct`, and a table editor for `landUnitConversions` (esp. per-state bigha). `GET/PATCH /admin/config`. Mounted under `<ProtectedRoute requireSuperadmin/>`. **Commit** `feat(web-admin): superadmin config editor`.

---

## Module ANN — Announcements

### Task ANN-1: Composer + list

**Files:** `src/pages/AnnouncementsPage.jsx`, `src/features/announcements/useAnnouncements.js`.

- [ ] Compose (title + body + audience) → `POST /admin/announcements`; on success show `pushSent`. List past announcements from `GET /admin/announcements` → `{data}`. Confirm before send. **Commit** `feat(web-admin): announcements composer + history`.

---

## Module DEP — Build & deploy

### Task DEP-1: Vercel deploy

**Files:** `web-admin/vercel.json` (SPA rewrite), append a web-admin section to `docs/plans/DEPLOY.md`.

- [ ] SPA rewrite (all routes → `/index.html`). Set `VITE_API_URL` to the Render API URL in Vercel env. Add the Vercel domain to the backend `CORS_ORIGINS`. Verify end-to-end: login → approve a pending farmer → record a payment → see it Active. **Commit** `docs: web-admin deploy guide`.

---

## Self-review checklist (run before handoff)

- [ ] **Contract coverage:** admin login (+`admin` object) ✓; `GET /admin/me` restore ✓; refresh rotation ✓; dashboard pinned shape ✓; farmers `?q=&status=&page=` → `{data,total,page}` flat rows w/ `subscriptionStatus` ✓; farmer detail counts + reportSummary ✓; approve ✓; record payment (`period`) → `{payment,subscription}` ✓; suspend/deactivate/reset-password ✓; payments list ✓; master-data CRUD (activate/deactivate, no delete) ✓; config superadmin-gated ✓; announcements POST/GET `{data}` ✓.
- [ ] **Single building blocks:** exactly one `api` (imported everywhere), one `AuthContext`, one `ProtectedRoute`, one `AdminLayout`. No feature invents its own fetch shape.
- [ ] **Error handling:** every mutation surfaces `ApiError.message`; `FORBIDDEN`/`VALIDATION`/`NOT_FOUND` handled.
- [ ] **No destructive UI:** approve, activate, suspend, deactivate, reset — never a hard delete of a farmer or a master-data row.
- [ ] **Money:** all amounts rendered via `lib/money.js` as `₹` + `en-IN`. English only. No `require()` in tests.

## Execution handoff

Two options after this plan is approved: **(1) subagent-driven** (fresh subagent per task, review between — recommended) or **(2) inline execution** (batched with checkpoints). The client can integrate against the live backend at the repo root (`npm start`) throughout.
