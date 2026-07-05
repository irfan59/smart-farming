# Smart Farming — Web Admin Implementation Plan (Part 2 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React web admin the product owner uses to approve farmers before login, activate manual subscriptions, view any farmer's data & reports, manage master data, send announcements, and see revenue.

**Architecture:** A React + Vite single-page app that talks only to the Plan 1 API over HTTPS with an admin JWT. An API client transparently refreshes the access token on 401. Routing is protected by an auth context; superadmin-only pages are gated by role.

**Tech Stack:** React 18, Vite, React Router 6, TanStack Query (server state), Zod (form validation), plain CSS modules (no heavy UI kit — keep the bundle small), Vitest + React Testing Library + MSW (mock API) for tests. Deploy to Vercel (free).

> **Depends on:** Plan 1 backend endpoints under `/api/admin/*` and `/api/auth/admin/login`. Build the backend through at least Milestone 3 first so approvals/payments exist to integrate against.

---

## Conventions

- **Test-first** with Vitest + RTL; the API is mocked with **MSW** so tests never hit a real backend.
- **Server state** (farmers, payments, config) lives in TanStack Query; **auth state** (tokens, current admin) lives in a small React context.
- **Tokens:** access token in memory (context), refresh token in `localStorage` (admin desktop context; rotation on the backend limits risk). On app load, try `/api/auth/refresh` to restore a session.
- **Money:** display `₹` + `toLocaleString('en-IN')`.
- **Commits:** Conventional Commits.

---

## File structure

```
admin/
  package.json
  vite.config.js
  .env.example              # VITE_API_URL=http://localhost:4000/api
  index.html
  src/
    main.jsx
    App.jsx                 # router + providers
    lib/
      apiClient.js          # fetch wrapper: auth header + 401 refresh + rotation
      queryClient.js
    auth/
      AuthContext.jsx       # { admin, accessToken, login, logout, bootstrapped }
      ProtectedRoute.jsx
      RequireSuperadmin.jsx
    components/
      Layout.jsx            # sidebar nav + header + <Outlet/>
      DataTable.jsx         # reusable sortable/paginated table
      Modal.jsx
      StatusPill.jsx        # trial/active/grace/expired/pending/deactivated
      MoneyInput.jsx
    pages/
      LoginPage.jsx
      DashboardPage.jsx
      ApprovalsPage.jsx     # pending_approval queue + approve
      FarmersPage.jsx       # list + search + paginate
      FarmerDetailPage.jsx  # profile, subscription, reports, actions
      PaymentsPage.jsx
      MasterDataPage.jsx    # crops, expense/income categories
      AnnouncementsPage.jsx
      ConfigPage.jsx        # superadmin only
    features/
      farmers/ (hooks: useFarmers, useFarmer, useApprove, useRecordPayment, useDeactivate)
      masterData/ (hooks)
      announcements/ (hooks)
      dashboard/ (hooks)
  tests/
    setup.js                # RTL + MSW server
    mocks/handlers.js       # MSW request handlers
    apiClient.test.jsx
    auth.test.jsx
    approvals.test.jsx
    recordPayment.test.jsx
```

---

## Milestone 0 — Scaffold, routing, test harness

### Task 0.1: Vite React app + deps

**Files:** Create `admin/` via Vite; add deps; `.env.example`.

- [ ] **Step 1:** `npm create vite@latest admin -- --template react`, then in `admin/`:
```bash
npm i react-router-dom @tanstack/react-query zod
npm i -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom msw
```
- [ ] **Step 2:** `vite.config.js` add test config:
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: './tests/setup.js' },
});
```
- [ ] **Step 3:** `.env.example` → `VITE_API_URL=http://localhost:4000/api`. Add `package.json` script `"test": "vitest run"`, `"test:watch": "vitest"`.
- [ ] **Step 4: Commit** `chore: scaffold web admin (vite + react)`.

### Task 0.2: MSW test harness

**Files:** Create `tests/setup.js`, `tests/mocks/handlers.js`, `tests/mocks/server.js`.

- [ ] Implement `tests/mocks/server.js` (`setupServer`), `handlers.js` (mock `POST /api/auth/admin/login`, `GET /api/admin/dashboard`, `GET /api/admin/farmers`, `POST /api/admin/farmers/:id/approve`, `POST /api/admin/payments`). `tests/setup.js` starts/stops the server and imports `@testing-library/jest-dom`.
- [ ] **Commit** `test: MSW mock server + RTL setup`.

---

## Milestone 1 — API client + auth

### Task 1.1: API client with 401 auto-refresh

**Files:** Create `src/lib/apiClient.js`. Test: `tests/apiClient.test.jsx`.

- [ ] **Step 1: Failing test** (MSW: first call returns 401, client refreshes, retries, succeeds):
```jsx
// tests/apiClient.test.jsx
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import { createApiClient } from '../src/lib/apiClient';
it('refreshes on 401 then retries once', async () => {
  let calls = 0;
  server.use(
    http.get('http://localhost:4000/api/admin/dashboard', () => {
      calls += 1;
      if (calls === 1) return new HttpResponse(null, { status: 401 });
      return HttpResponse.json({ totalFarmers: 5 });
    }),
    http.post('http://localhost:4000/api/auth/refresh', () => HttpResponse.json({ access: 'new', refresh: 'r2' })),
  );
  const api = createApiClient({ getAccess: () => 'old', getRefresh: () => 'r1', onTokens: () => {}, onLogout: () => {} });
  const data = await api.get('/admin/dashboard');
  expect(data.totalFarmers).toBe(5);
});
```
- [ ] **Step 2: FAIL. Step 3: Implement `src/lib/apiClient.js`** (single-flight refresh so concurrent 401s don't stampede):
```js
export function createApiClient({ baseUrl = import.meta.env.VITE_API_URL, getAccess, getRefresh, onTokens, onLogout }) {
  let refreshing = null;
  async function refresh() {
    if (!refreshing) {
      refreshing = fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: getRefresh() }),
      }).then(async (r) => {
        if (!r.ok) { onLogout(); throw new Error('session expired'); }
        const t = await r.json(); onTokens(t); return t.access;
      }).finally(() => { refreshing = null; });
    }
    return refreshing;
  }
  async function request(method, path, body) {
    const doFetch = (token) => fetch(`${baseUrl}${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let res = await doFetch(getAccess());
    if (res.status === 401) { const t = await refresh(); res = await doFetch(t); }
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw Object.assign(new Error(e.message || 'Request failed'), { status: res.status, code: e.error }); }
    return res.status === 204 ? null : res.json();
  }
  return {
    get: (p) => request('GET', p), post: (p, b) => request('POST', p, b),
    patch: (p, b) => request('PATCH', p, b), del: (p) => request('DELETE', p),
  };
}
```
- [ ] **Step 4: Run — PASS. Commit** `feat: api client with 401 refresh + rotation`.

### Task 1.2: Auth context + bootstrap + login page + protected routes

**Files:** `src/auth/AuthContext.jsx`, `src/auth/ProtectedRoute.jsx`, `src/auth/RequireSuperadmin.jsx`, `src/pages/LoginPage.jsx`. Test: `tests/auth.test.jsx`.

- [ ] **Step 1: Tests** — logging in stores tokens + admin and redirects to `/`; visiting a protected route unauthenticated redirects to `/login`; `RequireSuperadmin` blocks a plain admin.
- [ ] **Step 2: Implement `AuthContext`** (holds `accessToken` in state, `refresh` in `localStorage`; `login(email,password)` calls the API; on mount, if a refresh token exists, calls `/auth/refresh` to restore session then `GET /me`-equivalent `GET /admin/me` or decode token for role). Provide `useApi()` returning a memoized client wired to the context's token getters/setters.
- [ ] **Step 3: Implement `LoginPage`** (email + password form, zod-validated, shows API error message). `ProtectedRoute` renders `<Outlet/>` when authenticated else `<Navigate to="/login"/>`; `RequireSuperadmin` checks `admin.role === 'superadmin'`.
- [ ] **Step 4: Run — PASS. Commit** `feat: admin auth context, login, protected routing`.

### Task 1.3: App shell + routing + layout

**Files:** `src/App.jsx`, `src/components/Layout.jsx`, `src/lib/queryClient.js`, `src/main.jsx`.

- [ ] Wire `QueryClientProvider` + `AuthProvider` + `BrowserRouter`. Routes: `/login` (public); everything else under `ProtectedRoute` → `Layout` with sidebar links: Dashboard, Approvals, Farmers, Payments, Master data, Announcements, Config (superadmin only). **Commit** `feat: admin app shell, routing, layout`.

---

## Milestone 2 — Dashboard

### Task 2.1: Dashboard KPIs

**Files:** `src/pages/DashboardPage.jsx`, `src/features/dashboard/useDashboard.js`. Test: `tests/dashboard.test.jsx`.

- [ ] `useDashboard()` = `useQuery(['dashboard'], () => api.get('/admin/dashboard'))`. Page shows cards: total farmers, active, trial, **pending approvals (links to /approvals)**, revenue this month, revenue all-time. Test with MSW-mocked payload asserts the numbers render and the pending card links. **Commit** `feat: admin dashboard`.

---

## Milestone 3 — Approvals, farmers, payments (the core operational flow)

### Task 3.1: Pending approvals queue + approve

**Files:** `src/pages/ApprovalsPage.jsx`, `src/features/farmers/useApprovals.js`, `useApprove.js`. Test: `tests/approvals.test.jsx`.

- [ ] **Step 1: Failing test** — page lists pending farmers; clicking **Approve** calls `POST /api/admin/farmers/:id/approve` and the row disappears (query invalidated):
```jsx
// tests/approvals.test.jsx (essence)
it('approves a pending farmer and removes them from the queue', async () => {
  // MSW: GET /admin/farmers?status=pending_approval -> [{id:'f1', name:'Ramesh'}]
  //      POST /admin/farmers/f1/approve -> { status:'trial' }
  // render ApprovalsPage; click "Approve"; assert POST fired and 'Ramesh' gone after invalidation
});
```
- [ ] **Step 2: FAIL. Step 3: Implement.** `useApprovals` = `useQuery(['farmers','pending'], () => api.get('/admin/farmers?status=pending_approval'))`. `useApprove` = `useMutation((id) => api.post(`/admin/farmers/${id}/approve`), { onSuccess: () => queryClient.invalidateQueries(['farmers']) })`. Page renders a `DataTable` (name, phone, village, registered date) with an Approve button per row + a confirm.
- [ ] **Step 4: Run — PASS. Commit** `feat: approvals queue with approve action`.

### Task 3.2: Farmers list (search + paginate)

**Files:** `src/pages/FarmersPage.jsx`, `src/features/farmers/useFarmers.js`, `src/components/DataTable.jsx`, `src/components/StatusPill.jsx`. Test: `tests/farmers.test.jsx`.

- [ ] Implement a reusable `DataTable` (columns, rows, page controls). `useFarmers({search,page,status})` → `api.get('/admin/farmers?...')`. Page: search box (debounced), status filter, table with `StatusPill` (colors: pending=amber, trial=blue, active=green, grace=orange, expired=grey, suspended/deactivated=red), row click → `/farmers/:id`. **Commit** `feat: farmers list with search, filter, pagination`.

### Task 3.3: Farmer detail — profile, subscription, reports, actions

**Files:** `src/pages/FarmerDetailPage.jsx`, hooks `useFarmer`, `useRecordPayment`, `useDeactivate`, `useSuspend`, `useResetPassword`. Test: `tests/recordPayment.test.jsx`.

- [ ] **Step 1: Failing test** — recording a payment posts `{farmerId, amount, method, plan}` and shows the updated status:
```jsx
it('records a payment and shows active status', async () => {
  // MSW POST /admin/payments -> { status:'active', currentPeriodEnd:'...' }
  // open modal, enter ₹99, method cash, plan monthly, submit; assert POST body + pill shows Active
});
```
- [ ] **Step 2: FAIL. Step 3: Implement page** with sections: **Profile** (name/phone/village/state/district, consent info), **Subscription** (StatusPill, trial/period dates, Approve button if pending, **Record payment** button → `Modal` with `MoneyInput` + method + plan, defaults to `₹99 monthly` / `₹799 yearly` from config), **Actions** (Suspend/Reactivate, **Deactivate** with a "data is retained" confirmation, Reset password → shows the temp password once), **Reports** (embed monthly/yearly/per-crop/best-per-acre by calling `/admin/farmers/:id/reports/*`; reuse a small read-only report view).
- [ ] **Step 4: Run — PASS. Commit** `feat: farmer detail with approve, record-payment, deactivate, reports`.

### Task 3.4: Payments page

**Files:** `src/pages/PaymentsPage.jsx`, `usePayments`. Test: light render test.

- [ ] List/filter payments (`GET /admin/payments`) with date range + farmer filter; show totals. **Commit** `feat: payments list`.

---

## Milestone 4 — Master data + config

### Task 4.1: Master data editors

**Files:** `src/pages/MasterDataPage.jsx`, hooks in `features/masterData`. Test: `tests/masterData.test.jsx`.

- [ ] Tabs for **Crops**, **Expense categories**, **Income categories**. Each: table + add/edit form (crops: name, defaultSeason, icon; expense: name, `isPaidOut`, `isImputed`, `cacpTag`, icon; income: name, `type`, icon) + **Activate/Deactivate** toggle (`PATCH ... {isActive}`) — **never delete**. Uses `/admin/crops`, `/admin/expense-categories`, `/admin/income-categories`. **Commit** `feat: master-data editors (activate/deactivate, no delete)`.

### Task 4.2: Config page (superadmin)

**Files:** `src/pages/ConfigPage.jsx`, `useConfig`. Wrapped in `RequireSuperadmin`.

- [ ] Form to edit `appConfig`: `trialDays`, `monthlyPriceINR` (₹99), `yearlyPriceINR` (₹799), `graceDays`, `dailyWageINR`, `ownLandRentalPerAcreINR`, `ownedCapitalInterestRatePct`, and a table editor for `landUnitConversions` (esp. per-state bigha). `GET/PATCH /admin/config`. **Commit** `feat: superadmin config editor`.

---

## Milestone 5 — Announcements

### Task 5.1: Announcements composer + list

**Files:** `src/pages/AnnouncementsPage.jsx`, `features/announcements` hooks. Test: `tests/announcements.test.jsx`.

- [ ] Compose (title + body + audience) → `POST /admin/announcements` (backend sends FCM). List past announcements with `pushSent` status. Confirm-before-send. **Commit** `feat: announcements composer + history`.

---

## Milestone 6 — Build & deploy

### Task 6.1: Production build + Vercel deploy

**Files:** `admin/vercel.json` (or dashboard config), `docs/plans/DEPLOY.md` (append admin section).

- [ ] Configure SPA rewrite (all routes → `index.html`), set `VITE_API_URL` to the Render API URL in Vercel env, add the Vercel domain to the backend `CORS_ORIGINS`. Verify login → approve → record-payment against the live API. **Commit** `docs: web admin deploy guide`.

---

## Self-review checklist

- [ ] **Spec coverage (doc 02 §B, doc 07 admin endpoints):** approve-before-login queue ✓; record manual payment + activate ✓; view any farmer's records/reports ✓; master-data manage (activate/deactivate) ✓; announcements + push ✓; revenue dashboard ✓; config incl. price/land-units (superadmin) ✓; deactivate (no delete) with retained-data confirmation ✓.
- [ ] **Auth:** 401 auto-refresh + rotation; superadmin gating on config. ✓
- [ ] **Naming consistency:** `createApiClient`, `useApi`, `useApprove`, `useRecordPayment` used identically across tasks. ✓
- [ ] **No destructive UI:** nowhere does the admin hard-delete a farmer or record — only approve, activate, suspend, deactivate, activate/deactivate master data. ✓

---

## Next: Plan 3 — Farmer App (bare React Native)

The farmer-facing app consumes the farmer endpoints (register/login, plots, crop cycles, transactions, reports, uploads, announcements, me). It is the last plan; build it after the API is live and the admin can approve accounts (so real login works end-to-end).
