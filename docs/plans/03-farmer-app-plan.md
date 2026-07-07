# Smart Farming — Farmer App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the **bare React Native (no Expo)** app an Indian smallholder uses to register, wait for approval, then log crop expenses/income in 2–3 taps (with a receipt photo) and see per-crop, per-acre cash & true profit — shareable as PDF/WhatsApp.

**Architecture:** A React Native CLI app (Android + iOS) consuming the v1 API. One `api` client attaches the access token and refreshes on `401`; access token lives in memory, refresh token in secure storage. A `RootNavigator` gates on auth state: register → **"Waiting for approval"** → (admin approves) → tabs. Grace subscriptions are **read-only** (writes disabled in the UI and rejected by the API). Server state via TanStack Query.

**Tech Stack:** React Native CLI 0.76+ (no Expo), React Navigation (native-stack + bottom-tabs), TanStack Query 5, `react-native-keychain` (secure tokens), `react-native-image-picker` (camera), `@react-native-firebase/app` + `messaging` (FCM), `react-native-view-shot` + `react-native-share` (PDF/WhatsApp), `i18next` + `react-i18next` (English v1). Tests: Jest + `@testing-library/react-native`.

> **SOURCE OF TRUTH:** [`API-CONTRACT.md`](API-CONTRACT.md). Every request/response shape below is copied from it. If this plan and the contract disagree, **the contract wins.** The backend (repo root) already implements it; the web admin already consumes it.

---

## Pinned conventions (from API-CONTRACT.md — all modules follow these)

- **Project root:** `D:/smart-farming/farmer-app/` (bare RN CLI, no Expo). Native `android/` + `ios/` projects are committed.
- **One `api` client** with `api.get/post/patch/del`, same shape as the web admin: attaches `Authorization: Bearer <accessToken>`, on `401` calls `POST /auth/refresh` **once** then retries, else logs out. Throws `ApiError{status,code,message}`.
- **Tokens:** access token in memory; refresh token in **secure storage** (`react-native-keychain`).
- **Auth gate:** after register show **"Waiting for approval"**; login rejects `PENDING_APPROVAL` (403) → that screen; `suspended`/`deactivated` (403) → message. Restore session on launch via refresh → `GET /me`.
- **Grace = read-only:** when `subscription.status === 'grace'` (or `expired`), disable "Add" and edits; the API also returns `403 READ_ONLY`, surfaced as "Renew to add new entries".
- **All UI strings via i18n** (`t('key')`), English v1 — no hardcoded literals. **Icon-first, big number-pad, minimal typing.** Money in **INR (₹)**.
- **Errors:** `{ error: { code, message } }`; the client throws `ApiError`; screens surface `message`, special-casing `PENDING_APPROVAL` / `READ_ONLY`.
- **Lists** come as `{ data: [...] }`; single resources come as the object directly.

## Contract quick-reference (endpoints this app calls)

```
POST /auth/farmer/register  {name,phone,password,village,state,district,consentVersion} -> {farmer, subscription(status:'pending_approval')}
POST /auth/farmer/login     {phone,password} -> {accessToken, refreshToken, farmer}   (403 PENDING_APPROVAL / ACCOUNT_BLOCKED)
POST /auth/refresh          {refreshToken}   -> {accessToken, refreshToken}
POST /auth/logout           {refreshToken}
POST /auth/farmer/change-password {currentPassword,newPassword}
GET  /me                    -> {farmer, subscription}
PATCH /me                   {name?,village?,state?,district?,preferredLanguage?}
POST /me/deactivate         -> {status:'deactivated'}
POST /me/fcm-token          {token}
GET  /catalog/crops | /catalog/expense-categories | /catalog/income-categories | /catalog/land-units  -> {data:[...]}
GET/POST /plots             list -> {data:[...]}; POST {name,area:{value,unit},ownership} -> plot(area.normalizedAcres computed)
PATCH/DELETE /plots/:id     (DELETE = deactivate)
GET/POST /crop-cycles       list -> {data:[...]}; POST {plotId,cropId,season?,year,areaUsed:{value,unit}} -> cycle
GET/PATCH/DELETE /crop-cycles/:id
GET/POST /transactions      list -> {data:[...]} (filter ?cropCycleId=&type=); POST {type,categoryId,cropCycleId?,amount,date,quantity?,unit?,rate?,note?,photoPublicId?,isImputed?}
GET  /transactions/suggested-imputed?cropCycleId=  -> {familyLabour:{ratePerDay,prompt,basis}, ownLandRentalValue:{amount,basis}}
PATCH/DELETE /transactions/:id  (DELETE = void)
POST /uploads/receipt-signature -> {cloudName,apiKey,timestamp,folder,public_id,signature|stub}
GET  /reports/monthly?year=&month=  -> {period,income,expense,cashProfit}
GET  /reports/yearly?year=YYYY-YY   -> {year,income,expense,cashProfit,trueProfit}
GET  /reports/crop-cycle/:id        -> {cycle,cashProfit,trueProfit,perAcreCash,perAcreTrue,income,expense}
GET  /reports/per-acre | /reports/season-comparison?crop= | /reports/crop-ranking -> {data:[{cropName,season,year,cashProfit,trueProfit,perAcreCash,perAcreTrue}]}
GET  /announcements         -> {data:[{id,title,body,createdAt,pushSent}]}
Error (any): {error:{code,message}}   codes: PENDING_APPROVAL, READ_ONLY, VALIDATION, NOT_FOUND, INVALID_CREDENTIALS, ACCOUNT_BLOCKED
```

## File structure

```
farmer-app/
  package.json  app.json  babel.config.js  metro.config.js  jest.config.js  index.js
  android/  ios/                     # native projects (RN CLI)
  src/
    App.jsx
    api/client.js                    # api.get/post/patch/del + 401 refresh + ApiError
    storage/secureTokens.js          # keychain get/set/clear
    i18n/index.js  i18n/en.json
    auth/AuthContext.jsx  auth/useAuth.js
    navigation/RootNavigator.jsx  navigation/MainTabs.jsx
    lib/money.js
    components/NumberPad.jsx  CategoryGrid.jsx  Screen.jsx  StatusBanner.jsx  PrimaryButton.jsx
    features/
      catalog/useCatalog.js
      transactions/useCreateTransaction.js  useSuggestedImputed.js  useUploadReceipt.js  useTransactions.js
      reports/useMonthly.js  useCropCycleReport.js  useReports.js
      farm/usePlots.js  useCropCycles.js
      announcements/useAnnouncements.js
    screens/
      OnboardingScreen.jsx  RegisterScreen.jsx  LoginScreen.jsx  WaitingApprovalScreen.jsx
      HomeScreen.jsx  AddExpenseScreen.jsx  AddIncomeScreen.jsx
      PlotsScreen.jsx  CropCycleSetupScreen.jsx  CropCycleDetailScreen.jsx
      ReportsScreen.jsx  ShareReportScreen.jsx
      NotificationsScreen.jsx  AccountScreen.jsx
  __tests__/
    setup.js  mocks/native.js
    client.test.js  auth.flow.test.jsx  addExpense.test.jsx  reports.test.jsx  home.test.jsx
```

## Modules & build order

1. **FS** — Scaffold (RN CLI, no Expo), navigation, i18n, Jest + RNTL harness + native mocks
2. **API** — `api` client + secure token storage
3. **AUTH** — AuthContext + RootNavigator gate + Onboarding/Register/Login/WaitingApproval
4. **HOME** — home dashboard + tabs + status banner
5. **LOG** — add expense/income core loop + imputed auto-suggest + receipt upload
6. **FARM** — plots + crop-cycle setup/detail (cash/true toggle)
7. **REP** — reports + share (PDF/WhatsApp)
8. **NOTIF** — FCM token + announcements
9. **ACCT** — account/subscription + deactivate
10. **BUILD** — Android/iOS release

---

## Module FS — Scaffold, navigation, i18n, test harness

### Task FS-1: Init the bare RN app + deps

**Files:** `farmer-app/` (via RN CLI)

- [ ] **Step 1:** From `D:/smart-farming/`: `npx @react-native-community/cli init SmartFarming --directory farmer-app --skip-git-init`. Confirm `npm run android` boots the template on an emulator.
- [ ] **Step 2: Install deps:**
```bash
npm i @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
npm i @tanstack/react-query react-native-keychain react-native-image-picker
npm i @react-native-firebase/app @react-native-firebase/messaging
npm i react-native-view-shot react-native-share react-native-svg
npm i i18next react-i18next
npm i -D @testing-library/react-native @testing-library/jest-native
```
- [ ] **Step 3:** iOS: `cd ios && pod install && cd ..`. **Commit** `chore(farmer-app): scaffold bare react native app + deps`.

### Task FS-2: Jest + RNTL harness with native-module mocks

**Files:** `jest.config.js`, `__tests__/setup.js`, `__tests__/mocks/native.js`

- [ ] **Step 1:** `jest.config.js`:
```js
module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/__tests__/mocks/native.js'],
  setupFilesAfterEach: ['<rootDir>/__tests__/setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|react-native-.*|@react-native-firebase)/)',
  ],
};
```
- [ ] **Step 2:** `__tests__/mocks/native.js` — mock the native modules so tests run headless:
```js
jest.mock('react-native-keychain', () => {
  let store = {};
  return {
    setGenericPassword: jest.fn(async (u, p, o) => { store[o?.service || 'default'] = p; return true; }),
    getGenericPassword: jest.fn(async (o) => (store[o?.service || 'default'] ? { password: store[o?.service || 'default'] } : false)),
    resetGenericPassword: jest.fn(async (o) => { delete store[o?.service || 'default']; return true; }),
  };
});
jest.mock('react-native-image-picker', () => ({ launchCamera: jest.fn(), launchImageLibrary: jest.fn() }));
jest.mock('@react-native-firebase/messaging', () => () => ({
  requestPermission: jest.fn(async () => 1), getToken: jest.fn(async () => 'fcm-token'), onMessage: jest.fn(() => () => {}),
}));
jest.mock('react-native-share', () => ({ open: jest.fn(async () => ({})) }));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => '/tmp/report.png') }));
```
- [ ] **Step 3:** `__tests__/setup.js`: `import '@testing-library/jest-native/extend-expect';` and a global `fetch` guard (per-test override). Add `"test": "jest"` to `package.json` scripts.
- [ ] **Step 4: Commit** `test(farmer-app): jest + RNTL harness with native mocks`.

### Task FS-3: i18n scaffold (English, i18n-ready)

**Files:** `src/i18n/index.js`, `src/i18n/en.json`

- [ ] Init i18next with `lng:'en'`, `resources:{ en:{ translation: <en.json> } }`, `interpolation:{escapeValue:false}`. Seed `en.json` with the keys used across screens (`common.save`, `auth.waitingTitle`, `home.thisMonth`, `add.pickCategory`, `add.howManyDays`, `report.cash`, `report.true`, `account.payOffline`, …). Wrap `App` in `<I18nextProvider>`. **Commit** `feat(farmer-app): i18n scaffold (en), strings via t()`.

---

## Module API — client + secure storage

### Task API-1: Secure token storage

**Files:** `src/storage/secureTokens.js`. **Test:** covered via the keychain mock in later tests.

- [ ] Implement a thin wrapper around `react-native-keychain` storing a JSON blob under service `sf_tokens`:
```js
import * as Keychain from 'react-native-keychain';
const SERVICE = 'sf_tokens';
export async function saveTokens({ accessToken, refreshToken }) {
  await Keychain.setGenericPassword('sf', JSON.stringify({ accessToken, refreshToken }), { service: SERVICE });
}
export async function loadTokens() {
  const r = await Keychain.getGenericPassword({ service: SERVICE });
  return r ? JSON.parse(r.password) : null;
}
export async function clearTokens() { await Keychain.resetGenericPassword({ service: SERVICE }); }
```
- [ ] **Commit** `feat(farmer-app): secure token storage`.

### Task API-2: The `api` client (401 refresh)

**Files:** `src/api/client.js`. **Test:** `__tests__/client.test.js`.

- [ ] **Step 1: Failing test** (401 → refresh → retry; non-401 → ApiError):
```js
import { createApi, ApiError } from '../src/api/client';
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

it('throws ApiError with code on non-401', async () => {
  global.fetch = jest.fn(async () => ({ status: 403, ok: false, json: async () => ({ error: { code: 'READ_ONLY', message: 'no' } }) }));
  const api = createApi(opts);
  await expect(api.post('/transactions', {})).rejects.toMatchObject({ status: 403, code: 'READ_ONLY' });
});
```
- [ ] **Step 2: FAIL. Step 3: Implement `src/api/client.js`** — identical shape to the web admin's (single-flight refresh, `ApiError`), `baseUrl` from a config constant `API_URL` (env or a `src/config.js`). Bodies are plain objects.
- [ ] **Step 4: Run — PASS. Commit** `feat(farmer-app): api client with 401 refresh`.

---

## Module AUTH — context, gate, onboarding

### Task AUTH-1: AuthContext (register, login, bootstrap, statuses)

**Files:** `src/auth/AuthContext.jsx`, `src/auth/useAuth.js`. **Test:** `__tests__/auth.flow.test.jsx`.

- [ ] Implement `AuthProvider`: holds `farmer`, `subscription`, `accessToken` (memory), `status` (`unauthenticated | pending_approval | active`), `ready`. Builds `api` via `createApi` wired to `secureTokens`. Methods:
  - `register(form)` → `POST /auth/farmer/register` → sets `status='pending_approval'`, stores `farmer`.
  - `login(phone,password)` → `POST /auth/farmer/login`; on success save tokens + `farmer`, then `GET /me` to get `subscription`; **catch `ApiError` with `code==='PENDING_APPROVAL'`** → set `status='pending_approval'` (drive the waiting screen) and rethrow a flag.
  - `refreshMe()` → `GET /me`, updates `farmer`+`subscription` (used by the waiting screen's "Check again" and on focus).
  - `logout()` → `POST /auth/logout` + `clearTokens()`.
  - On mount: `loadTokens()`; if present, `GET /me` (client auto-refreshes) → set `farmer`+`subscription`+`status='active'`; else `unauthenticated`. Set `ready`.
- [ ] Expose `{ farmer, subscription, api, status, ready, isReadOnly, register, login, logout, refreshMe }` where `isReadOnly = ['grace','expired'].includes(subscription?.status)`.
- [ ] **Test:** register sets pending; login with a `PENDING_APPROVAL` mock keeps pending; a successful `/me` sets active. **Commit** `feat(farmer-app): auth context with approval gate`.

### Task AUTH-2: RootNavigator (the gate) + MainTabs

**Files:** `src/navigation/RootNavigator.jsx`, `src/navigation/MainTabs.jsx`, `src/App.jsx`.

- [ ] `RootNavigator` branches on `status` (after `ready`):
  - `unauthenticated` → native-stack: Onboarding → Register / Login
  - `pending_approval` → `WaitingApprovalScreen`
  - `active` → `MainTabs`
- [ ] `MainTabs` (bottom tabs, icon-first labels via i18n): **Home · Reports · Add (center) · Notifications · Account**. `App.jsx` wires `QueryClientProvider` + `AuthProvider` + `I18nextProvider` + `NavigationContainer`. **Commit** `feat(farmer-app): root navigator gate + tabs`.

### Task AUTH-3: Onboarding, Register (consent), Login, Waiting-for-approval

**Files:** the four screens. **Test:** `auth.flow.test.jsx` — register → waiting; login-pending → waiting; approve (mock `/me` trial) → proceeds.

- [ ] **Onboarding:** 3 icon cards + "Get started" / "I already have an account".
- [ ] **Register:** name, phone (numeric keyboard), password (secure, show/hide), state/district/village pickers, **consent checkbox** (DPDP text) → submit sends `consentVersion:'2026-01-v1'` → **WaitingApproval**.
- [ ] **Login:** phone + password → on success MainTabs; on `PENDING_APPROVAL` → WaitingApproval; on `ACCOUNT_BLOCKED`/`INVALID_CREDENTIALS` show `error.message`. "Forgot password?" shows i18n text: "Contact us to reset your password" (admin-assisted; **no OTP**).
- [ ] **WaitingApproval:** friendly message, **"Check again"** button → `refreshMe()` (if now `trial`/`active`, navigate to tabs), and a logout link.
- [ ] Run tests. **Commit** `feat(farmer-app): onboarding, register, login, waiting-for-approval`.

---

## Module HOME — dashboard + status banner

### Task HOME-1: Home screen

**Files:** `src/screens/HomeScreen.jsx`, `src/components/StatusBanner.jsx`, `src/features/reports/useMonthly.js`, `src/lib/money.js`. **Test:** `__tests__/home.test.jsx`.

- [ ] `useMonthly(year,month)` → `api.get('/reports/monthly?year=&month=')` → `{income,expense,cashProfit}`. `StatusBanner` reads `subscription.status`: trial → "Trial: N days left"; grace/expired → "Renew to add entries" (and this is why Add is disabled); active → renews-on date.
- [ ] `HomeScreen`: StatusBanner + three big cards (This month income / expense / profit, ₹, green/red) from `useMonthly(current)` + a large center **+ Add** button (disabled when `isReadOnly`) + a recent-entries list (`useTransactions({})` first page). **Test** with a mocked `/reports/monthly` renders the profit; when `subscription.status==='grace'`, the Add button is disabled. **Commit** `feat(farmer-app): home dashboard + status banner`.

---

## Module LOG — the core loop (add entry, imputed, receipt)

### Task LOG-1: NumberPad + CategoryGrid components

**Files:** `src/components/NumberPad.jsx`, `src/components/CategoryGrid.jsx`. **Test:** `__tests__/numberpad` (tap digits → value; backspace).

- [ ] `NumberPad`: big 0–9 + backspace, whole rupees, emits numeric value. `CategoryGrid`: icon + label tiles from a category list; single tap selects (calls `onSelect(category)`). **Commit** `feat(farmer-app): number pad + category grid`.

### Task LOG-2: Add Expense / Add Income + create transaction

**Files:** `src/screens/AddExpenseScreen.jsx`, `src/screens/AddIncomeScreen.jsx`, `src/features/transactions/useCreateTransaction.js`, `src/features/catalog/useCatalog.js`. **Test:** `__tests__/addExpense.test.jsx`.

- [ ] **Step 1: Failing test** — select a category, punch an amount, Save → `POST /transactions` with `{type:'expense', categoryId, amount, date}`; success toast + navigate back:
```jsx
// mock GET /catalog/expense-categories -> {data:[{id:'c1',name:'Seeds',cacpTag:'A2',isImputed:false}]}
// mock POST /transactions -> {id:'t1'}
// render AddExpenseScreen; tap 'Seeds'; tap 1,5,0,0; tap Save; assert POST body {type:'expense',categoryId:'c1',amount:1500}
```
- [ ] **Step 2: Implement.** `useCatalog('expense-categories')` = query → `{data}` (active only). Flow: **CategoryGrid** → **NumberPad** for amount → optional crop-cycle picker + note + receipt (LOG-4) → **Save**. `useCreateTransaction` = mutation → `POST /transactions`, invalidate `['reports']`+`['transactions']`; on error `READ_ONLY` show "Renew to add entries". Toast + **Undo** (Undo calls `DELETE /transactions/:id` = void). Income screen mirrors this with `/catalog/income-categories` (no cacpTag).
- [ ] **Step 3: Imputed auto-suggest.** When the chosen expense category `isImputed` (Family labour / Own-land value): call `useSuggestedImputed(cropCycleId)` → `GET /transactions/suggested-imputed`. For **Family labour** ask "How many days did you & family work?" (NumberPad days) → `amount = days × ratePerDay`, save with `isImputed:true, quantity:days, unit:'day', rate:ratePerDay`. For **Own-land value** pre-fill `ownLandRentalValue.amount` — farmer confirms with one tap.
- [ ] **Step 4: Run — PASS. Commit** `feat(farmer-app): add expense/income core loop + imputed auto-suggest`.

### Task LOG-3: Receipt photo → signed Cloudinary upload

**Files:** `src/features/transactions/useUploadReceipt.js`. **Test:** `__tests__/uploadReceipt` (mock image-picker + fetch to Cloudinary).

- [ ] Flow: tap "Add bill photo" → `launchCamera` (image-picker) → get local file → `POST /uploads/receipt-signature` → if not `stub`, `POST` the image to `https://api.cloudinary.com/v1_1/{cloudName}/image/upload` with the signed params → receive `public_id` → attach as `photoPublicId` on the transaction body. Show a thumbnail. Handle permission-denied and upload-failure gracefully (entry still saves without a photo). **Commit** `feat(farmer-app): receipt capture + signed Cloudinary upload`.

---

## Module FARM — plots & crop cycles

### Task FARM-1: Plots (land-unit picker + normalizedAcres confirm)

**Files:** `src/screens/PlotsScreen.jsx`, `src/features/farm/usePlots.js`. **Test:** create-plot.

- [ ] `usePlots` = list (`{data}`) + create/deactivate mutations. **Add plot:** name, area value (NumberPad) + **unit picker** from `GET /catalog/land-units` + ownership (owned/leased). On save the API computes `area.normalizedAcres`; show it back ("≈ 2.0 acres") for confirmation (land-unit UX). Deactivate via `DELETE /plots/:id`. **Commit** `feat(farmer-app): plots with unit picker`.

### Task FARM-2: Crop-cycle setup + detail (cash/true toggle)

**Files:** `src/screens/CropCycleSetupScreen.jsx`, `src/screens/CropCycleDetailScreen.jsx`, `src/features/farm/useCropCycles.js`, `src/features/reports/useCropCycleReport.js`. **Test:** cash/true toggle.

- [ ] **Setup:** pick crop (`/catalog/crops`), season (auto from crop's `defaultSeason`, editable), year (e.g. "2025-26"), plot, area used → `POST /crop-cycles`.
- [ ] **Detail:** header (crop/season/year/area). `useCropCycleReport(id)` → `GET /reports/crop-cycle/:id` → `{cashProfit,trueProfit,perAcreCash,perAcreTrue,income,expense}`. Show **Cash profit** headline; a **"See my real profit" toggle** reveals `trueProfit` + `perAcreTrue`; show per-acre alongside. List the cycle's transactions (`/transactions?cropCycleId=`). **Test** asserts toggling shows `trueProfit`. **Commit** `feat(farmer-app): crop cycle setup + detail with cash/true toggle`.

---

## Module REP — reports + sharing

### Task REP-1: Reports screen

**Files:** `src/screens/ReportsScreen.jsx`, `src/features/reports/useReports.js`. **Test:** `__tests__/reports.test.jsx`.

- [ ] Segmented control: **Monthly · Yearly · Per crop · Per acre**. Monthly/Yearly via `/reports/monthly|yearly`; **Per acre** via `/reports/per-acre` (`{data}`); **"Which crop earned most per acre"** via `/reports/crop-ranking` (`{data}`, already ranked). Simple bar/pie via `react-native-svg`. Every profit view has the cash/true toggle. Numbers come from the API. **Test** renders crop-ranking rows from a mock. **Commit** `feat(farmer-app): reports screen`.

### Task REP-2: Share to PDF / WhatsApp

**Files:** `src/screens/ShareReportScreen.jsx`, `src/lib/share.js`. **Test:** mock view-shot + share; assert `Share.open` called.

- [ ] Render a clean report card, capture with `captureRef` (`react-native-view-shot`), then `Share.open({ url })` (`react-native-share`) — WhatsApp appears in the sheet. Include farmer name, crop, season, and cash/true/per-acre numbers. **Commit** `feat(farmer-app): share report (PDF/WhatsApp)`.

---

## Module NOTIF — FCM + announcements

### Task NOTIF-1: FCM registration + announcements list

**Files:** `src/screens/NotificationsScreen.jsx`, FCM init in `App.jsx`, `src/features/announcements/useAnnouncements.js`. **Test:** mock messaging.

- [ ] On reaching MainTabs, request notification permission, `getToken()`, then `POST /me/fcm-token {token}`. Foreground `onMessage` shows an in-app banner. `useAnnouncements` = `GET /announcements` (`{data}`) → list (title + body + date). **Commit** `feat(farmer-app): FCM token registration + announcements`.

---

## Module ACCT — account & subscription

### Task ACCT-1: Account screen + deactivate

**Files:** `src/screens/AccountScreen.jsx`.

- [ ] Show subscription **StatusBanner** (Trial days left / Active renews on… / Grace: renew now / Expired), the plan + **price (₹99/month or ₹799/year)**, and a clear line (i18n): **"To pay, use cash/UPI with us; we will activate your month"** (no in-app payment). Profile edit (`PATCH /me`), change password (`POST /auth/farmer/change-password`), logout, and **Deactivate my account** (confirm: "your data is kept; contact us to fully erase") → `POST /me/deactivate` → logout. **Commit** `feat(farmer-app): account & subscription screen + deactivate`.

---

## Module BUILD — release

### Task BUILD-1: Android + iOS release

**Files:** signing notes appended to `docs/plans/DEPLOY.md` (mobile section already stubbed there).

- [ ] Android: release keystore, `./gradlew assembleRelease` (APK) / `bundleRelease` (AAB). iOS: bundle id, signing, Xcode archive. Add Firebase config files (`google-services.json` / `GoogleService-Info.plist`). Point `API_URL` at the production Render URL. Document a smoke test: register → (admin approves in web admin) → login → add an expense with a photo → see profit → share. **Commit** `docs: mobile build & release guide`.

---

## Self-review checklist (run before handoff)

- [ ] **Contract coverage:** register (`consentVersion`) → pending ✓; login rejects `PENDING_APPROVAL` → waiting screen ✓; refresh rotation ✓; `GET /me` restore ✓; `/catalog/*` `{data}` ✓; plots/crop-cycles/transactions consume `{data}` and POST the contract bodies ✓; `suggested-imputed` shape ✓; receipt via `/uploads/receipt-signature` ✓; reports `monthly/yearly/per-acre/crop-ranking/crop-cycle/:id` with `perAcreCash`/`perAcreTrue` ✓; `/announcements` ✓; `/me/fcm-token` ✓; deactivate ✓.
- [ ] **Same building blocks:** one `api` (imported everywhere), access token in memory, refresh in keychain. No screen invents its own fetch.
- [ ] **Grace = read-only:** Add + edits disabled when `isReadOnly`; a `READ_ONLY` API error surfaces "Renew to add new entries".
- [ ] **No hard delete:** entries are voided (Undo → `DELETE`=void), plots/cycles deactivated, account deactivated.
- [ ] **Low-literacy UX:** icon-first CategoryGrid, big NumberPad, minimal typing, flat tabs; all strings via `t()`; ₹ money; phone+password, **no OTP**.

## Execution handoff

Two options after approval: **(1) subagent-driven** (fresh subagent per task, review between — recommended) or **(2) inline execution** (batched with checkpoints). The app integrates against the live backend (repo root, `npm start`), and the web admin approves accounts so login works end-to-end.
