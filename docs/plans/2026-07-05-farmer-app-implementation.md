# Smart Farming — Farmer App Implementation Plan (Part 3 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the bare React Native (no Expo) app an Indian smallholder uses to register, log crop expenses/income in 2–3 taps (with a receipt photo), and see per-crop, per-acre cash & true profit — shareable as PDF/WhatsApp.

**Architecture:** A React Native CLI app (Android + iOS) consuming the Plan 1 API. An API client attaches the access token and refreshes on 401; tokens are kept in secure storage. Navigation is a flat bottom-tab shell after login, with a strict onboarding gate: register → **"waiting for approval"** → (admin approves) → login. UI follows the low-literacy SARAL principles (icon-first, big number-pad, minimal typing).

**Tech Stack:** React Native CLI 0.74+ (no Expo), React Navigation (native-stack + bottom-tabs), TanStack Query, react-native-keychain (secure token storage), react-native-image-picker (camera/receipt), @react-native-firebase/app + messaging (FCM push), react-native-view-shot + react-native-share (PDF/WhatsApp share), react-native-svg + a light chart lib for reports, i18next + react-i18next (English-only v1, i18n-ready). Tests: Jest + @testing-library/react-native + MSW (via a fetch polyfill).

> **Depends on:** Plan 1 API (all farmer endpoints) live, and Plan 2 admin able to approve accounts (needed to unblock login end-to-end).

---

## Conventions

- **No Expo:** native projects are committed; builds via Android Studio / Xcode; FCM via `@react-native-firebase`; camera via `react-native-image-picker` (all require native linking — autolinked in RN 0.74).
- **Test-first** with `@testing-library/react-native`. Network mocked with MSW (`msw/native`) or a manual fetch mock.
- **Secure storage:** access + refresh tokens in `react-native-keychain` (Keystore/Keychain). On launch, try refresh → restore session.
- **All UI strings** go through `t('key')` (i18next) — no hardcoded literals — even though v1 ships only `en`.
- **Money entry:** a big custom number-pad component, not the OS keyboard. Amounts are whole rupees.
- **Commits:** Conventional Commits.

---

## File structure

```
mobile/
  package.json
  app.json
  babel.config.js
  jest.config.js
  index.js
  src/
    App.jsx
    api/
      client.js             # fetch wrapper: auth header + 401 refresh
      endpoints.js          # typed-ish endpoint helpers (auth, plots, cycles, txns, reports, uploads, me)
    auth/
      AuthContext.jsx       # tokens (keychain), currentFarmer, status, login/register/logout/bootstrap
      useAuth.js
    storage/
      secureTokens.js       # keychain get/set/clear
    i18n/
      index.js
      en.json
    navigation/
      RootNavigator.jsx     # decides Onboarding vs WaitingApproval vs Main
      MainTabs.jsx          # Home · Reports · Add(+) · Notifications · Account
    components/
      NumberPad.jsx         # big numeric entry
      CategoryGrid.jsx      # icon-first category picker
      Money.jsx             # ₹ formatting
      Screen.jsx            # safe-area wrapper, loading/error states
      PrimaryButton.jsx
      StatusBanner.jsx      # trial days left / grace / approval
    screens/
      OnboardingScreen.jsx
      RegisterScreen.jsx
      LoginScreen.jsx
      WaitingApprovalScreen.jsx
      HomeScreen.jsx
      AddExpenseScreen.jsx
      AddIncomeScreen.jsx
      PlotsScreen.jsx  CropCycleSetupScreen.jsx  CropCycleDetailScreen.jsx
      ReportsScreen.jsx  ReportShareScreen.jsx
      NotificationsScreen.jsx
      AccountScreen.jsx
    features/
      transactions/ (useCreateTransaction, useSuggestedImputed, useUploadReceipt)
      reports/ (useMonthly, useYearly, useCropCycleReport, useBestPerAcre)
      farm/ (usePlots, useCreatePlot, useCropCycles, useCreateCropCycle)
      catalog/ (useExpenseCategories, useIncomeCategories, useCrops)
    lib/
      pdf.js                # render a report view to PDF
      share.js              # OS share sheet (WhatsApp/PDF)
  __tests__/
    client.test.js
    auth.flow.test.jsx
    addExpense.test.jsx
    reports.test.jsx
```

---

## Milestone 0 — RN CLI scaffold (no Expo), navigation, i18n, API client, test harness

### Task 0.1: Init the app + core deps

**Files:** Create `mobile/` via RN CLI.

- [ ] **Step 1:** `npx @react-native-community/cli init SmartFarming --version latest` (into `mobile/`). Confirm it runs on an emulator (`npm run android`).
- [ ] **Step 2: Install deps:**
```bash
npm i @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
npm i @tanstack/react-query react-native-keychain react-native-image-picker
npm i @react-native-firebase/app @react-native-firebase/messaging
npm i react-native-view-shot react-native-share react-native-svg
npm i i18next react-i18next
npm i -D @testing-library/react-native @testing-library/jest-native
```
- [ ] **Step 3:** iOS: `cd ios && pod install`. Configure `jest.config.js` with `preset: 'react-native'` and `setupFilesAfterEach`. **Commit** `chore: scaffold bare react native app + deps`.

### Task 0.2: i18n scaffold (English-only, i18n-ready)

**Files:** `src/i18n/index.js`, `src/i18n/en.json`.

- [ ] Init i18next with `lng: 'en'`, `resources: { en: { translation: require('./en.json') } }`. Seed `en.json` with keys used across screens (`common.save`, `home.thisMonth`, `add.pickCategory`, `approval.waiting`, etc.). Wrap `App` in `I18nextProvider`. **Commit** `feat: i18n scaffold (en), all strings via t()`.

### Task 0.3: Secure token storage + API client with refresh

**Files:** `src/storage/secureTokens.js`, `src/api/client.js`. Test: `__tests__/client.test.js`.

- [ ] **Step 1: Failing test** (same 401→refresh→retry behaviour as admin; mock fetch):
```js
// __tests__/client.test.js
import { createClient } from '../src/api/client';
it('refreshes on 401 then retries', async () => {
  let n = 0;
  global.fetch = jest.fn(async (url) => {
    if (url.endsWith('/reports/monthly?year=2025&month=11')) {
      n += 1;
      return n === 1 ? { status: 401, json: async () => ({}) } : { ok: true, status: 200, json: async () => ({ cashProfit: 1000 }) };
    }
    if (url.endsWith('/auth/refresh')) return { ok: true, status: 200, json: async () => ({ access: 'a2', refresh: 'r2' }) };
  });
  const api = createClient({ baseUrl: 'http://x/api', getAccess: () => 'a1', getRefresh: () => 'r1', onTokens: () => {}, onLogout: () => {} });
  const r = await api.get('/reports/monthly?year=2025&month=11');
  expect(r.cashProfit).toBe(1000);
});
```
- [ ] **Step 2: FAIL. Step 3: Implement `src/api/client.js`** — identical shape to the admin client (single-flight refresh, throws `{status,code,message}`). Implement `src/storage/secureTokens.js` with keychain `setTokens/getTokens/clear` (store a JSON blob under one service key).
- [ ] **Step 4: Run — PASS. Commit** `feat: secure token storage + api client with refresh`.

### Task 0.4: Endpoint helpers

**Files:** `src/api/endpoints.js`.

- [ ] Thin wrappers over the client for every farmer endpoint: `auth.register/login/refresh/logout/changePassword`, `me.get/deactivate/registerFcmToken`, `plots.list/create/update/deactivate`, `cropCycles.*`, `transactions.create/list/void/suggestedImputed`, `reports.monthly/yearly/cropCycle/byCategory/seasonComparison/bestPerAcre`, `uploads.receiptSignature/receiptView`, `catalog.expenseCategories/incomeCategories/crops`, `announcements.list`. **Commit** `feat: api endpoint helpers`.

---

## Milestone 1 — Auth flow with the approval gate

### Task 1.1: Auth context + bootstrap

**Files:** `src/auth/AuthContext.jsx`, `src/auth/useAuth.js`. Test: `__tests__/auth.flow.test.jsx`.

- [ ] Implement context: on mount, read keychain; if a refresh token exists, call `/auth/refresh` then `GET /me` to load `{farmer, subscriptionStatus}`. Expose `register`, `login`, `logout`, `refreshMe`, and `status` (`unauthenticated | pending_approval | active`). `login` stores tokens in keychain + memory. Handle the `pending_approval` login error specially (set a flag so the UI shows the waiting screen).
- [ ] **Commit** `feat: farmer auth context with bootstrap + approval status`.

### Task 1.2: Root navigator (the gate)

**Files:** `src/navigation/RootNavigator.jsx`, `src/navigation/MainTabs.jsx`.

- [ ] `RootNavigator` branches on auth state:
  - not authenticated → stack: Onboarding → Register / Login
  - registered but `pending_approval` → `WaitingApprovalScreen`
  - authenticated + approved → `MainTabs`
- [ ] `MainTabs`: bottom tabs **Home · Reports · Add(+, center) · Notifications · Account** (icon-first labels). **Commit** `feat: root navigator with approval gate + main tabs`.

### Task 1.3: Onboarding, Register (consent), Login, Waiting-for-approval

**Files:** the four screens. Test: `__tests__/auth.flow.test.jsx` — register shows waiting screen; login while pending shows waiting; after approval (mock `/me` returns trial) it proceeds to Home.

- [ ] **Onboarding:** 3 icon cards + "Get started"/"I have an account".
- [ ] **Register:** name, phone (numeric), password (show/hide), state/district/village pickers, **consent checkbox** (DPDP text) — submit → on success navigate to **WaitingApproval**.
- [ ] **Login:** phone + password → on `pending_approval` error, show WaitingApproval; on success → Main. "Forgot password?" shows text: "Contact us to reset your password" (admin-assisted; no OTP).
- [ ] **WaitingApproval:** friendly message ("Your account is being reviewed, please check back soon"), a **Refresh** button that re-calls `/me` (or login) to detect approval, and a logout link.
- [ ] Run tests. **Commit** `feat: onboarding, register (consent), login, waiting-for-approval`.

---

## Milestone 2 — Home dashboard

### Task 2.1: Home screen

**Files:** `src/screens/HomeScreen.jsx`, `src/components/StatusBanner.jsx`, `src/features/reports/useMonthly.js`. Test: render with mocked monthly data.

- [ ] Show a **StatusBanner** (trial days left / "Renew to add entries" in grace / active). Three big cards: **This month income / expense / profit** (green positive, red loss) from `reports.monthly` for the current month. A season badge. A recent-entries list. A large center **+ Add** action (also in the tab bar). **Commit** `feat: home dashboard with monthly summary + status banner`.

---

## Milestone 3 — The core loop: add expense / income (2–3 taps) + receipt

### Task 3.1: NumberPad + CategoryGrid components

**Files:** `src/components/NumberPad.jsx`, `src/components/CategoryGrid.jsx`. Test: `__tests__/numberpad.test.jsx` (tapping digits builds the amount; backspace works).

- [ ] `NumberPad`: large touch targets 0–9, backspace, decimal off (whole rupees). Emits the numeric value. `CategoryGrid`: icon + label tiles from a category list; single tap selects. **Commit** `feat: number pad + category grid components`.

### Task 3.2: Add Expense (and Add Income) flow

**Files:** `src/screens/AddExpenseScreen.jsx`, `src/screens/AddIncomeScreen.jsx`, `src/features/transactions/useCreateTransaction.js`, `useSuggestedImputed.js`. Test: `__tests__/addExpense.test.jsx`.

- [ ] **Step 1: Failing test** — select category → enter amount on number-pad → (optional crop cycle) → Save calls `transactions.create` with the right body; a toast "Saved" with Undo appears:
```jsx
// __tests__/addExpense.test.jsx (essence)
it('logs an expense in a few taps', async () => {
  // mock catalog.expenseCategories -> [{id:'c1', name:'Seeds', cacpTag:'A2'}]
  // mock transactions.create -> {id:'t1'}
  // render AddExpenseScreen; tap 'Seeds'; tap 1,5,0,0; tap Save
  // assert create called with { type:'expense', categoryId:'c1', amount:1500 }
});
```
- [ ] **Step 2: FAIL. Step 3: Implement.** Flow: **(1)** CategoryGrid (from `catalog.expenseCategories`, active only) → **(2)** NumberPad for amount → **(3)** optional: pick crop cycle, add note, attach receipt photo → **Save**. `useCreateTransaction` = mutation → invalidate `['reports']` + `['transactions']`. Show a **Saved** toast with **Undo** (Undo calls `transactions.void` on the new id). Income screen mirrors this with income categories (no cacpTag).
- [ ] **Step 4: Imputed auto-suggest (true-cost):** when the chosen expense category `isImputed` (Family labour / Own-land value), instead of raw typing: for Family labour ask "How many days did you & family work?" (NumberPad days) → multiply by `dailyWageINR` from `suggestedImputed`; for Own-land value pre-fill the suggested amount — farmer confirms with one tap (per doc 06). Save with `isImputed:true` and `quantity/unit/rate` for the labour basis.
- [ ] **Step 5: Run — PASS. Commit** `feat: add expense/income core loop with imputed auto-suggest`.

### Task 3.3: Receipt photo → signed Cloudinary upload

**Files:** `src/features/transactions/useUploadReceipt.js`. Test: `__tests__/uploadReceipt.test.jsx` (mock image-picker + fetch to Cloudinary).

- [ ] Flow: tap "Add bill photo" → `react-native-image-picker` camera → get local file → `uploads.receiptSignature` (API returns signed params) → `POST` the image directly to Cloudinary with those params → receive `public_id` → attach as `photoPublicId` on the transaction (set in the create body). Show the thumbnail. Handle permission-denied and upload-failure gracefully (entry can still save without a photo). **Commit** `feat: receipt capture + signed Cloudinary upload`.

---

## Milestone 4 — Farm setup: plots & crop cycles

### Task 4.1: Plots

**Files:** `src/screens/PlotsScreen.jsx`, `src/features/farm/usePlots.js`, `useCreatePlot.js`. Test: create-plot test.

- [ ] List active plots; **Add plot**: name, area value (NumberPad) + **unit picker** (acre/bigha/guntha/cent/hectare) + ownership (owned/leased). On save the API computes `normalizedAcres`; show it back ("≈ 2.0 acres") for the farmer to confirm (per the land-unit UX in doc 06). Deactivate (soft) from a row action. **Commit** `feat: plots list + add with unit picker`.

### Task 4.2: Crop cycle setup + detail

**Files:** `src/screens/CropCycleSetupScreen.jsx`, `src/screens/CropCycleDetailScreen.jsx`, hooks. Test: create-cycle test.

- [ ] **Setup:** pick crop (from `catalog.crops`), season (auto-fills from crop's default, editable), year (e.g. "2025-26"), plot, area used. Creates the cycle. **Detail:** header (crop/season/year/area); **Cash profit** headline with a **"See my real profit" toggle** → true profit (adds imputed); per-acre and per-local-unit shown side by side; income-vs-expense split; this cycle's transactions (from `transactions.list?cropCycleId`). **Commit** `feat: crop cycle setup + detail with cash/true toggle`.

---

## Milestone 5 — Reports + sharing

### Task 5.1: Reports screen

**Files:** `src/screens/ReportsScreen.jsx`, `src/features/reports/*`. Test: `__tests__/reports.test.jsx`.

- [ ] Segmented tabs: **Monthly · Yearly · Per crop · Per acre**. Charts (expense breakdown pie, income breakdown, season comparison bars via react-native-svg) + a **"Which crop earned most per acre"** ranking (from `reports.bestPerAcre`). Every profit view has the cash/true toggle. Numbers come from the API (no client math beyond formatting). **Commit** `feat: reports screen (monthly/yearly/per-crop/per-acre + best-per-acre)`.

### Task 5.2: Share to PDF / WhatsApp

**Files:** `src/screens/ReportShareScreen.jsx`, `src/lib/pdf.js`, `src/lib/share.js`. Test: mock view-shot + share; assert share called with a file.

- [ ] Render a clean report layout, capture it with `react-native-view-shot` (or build a simple HTML→PDF), then open the **OS share sheet** via `react-native-share` (WhatsApp appears automatically). Include farmer name, crop, season, and the cash/true/per-acre numbers. **Commit** `feat: share report as PDF / WhatsApp`.

---

## Milestone 6 — Notifications, account/subscription, deactivate

### Task 6.1: FCM registration + notifications list

**Files:** `src/screens/NotificationsScreen.jsx`, FCM init in `App.jsx`. Test: mock messaging.

- [ ] On login, request notification permission, get the FCM token, `me.registerFcmToken`. Foreground handler shows an in-app banner; list announcements from `announcements.list`. **Commit** `feat: FCM token registration + announcements list`.

### Task 6.2: Account & subscription screen

**Files:** `src/screens/AccountScreen.jsx`, `me.deactivate`.

- [ ] Show subscription **StatusBanner** (Trial days left / Active renews on… / Grace: renew now / Expired), the plan + **price (₹99/month or ₹799/year)**, and a clear line: **"To pay, use cash/UPI with us; we will activate your month"** (no in-app payment). Profile edit, language (en), logout, and **Deactivate my account** (confirmation: "your data is kept; contact us to fully erase") → `me.deactivate` → logout. **Commit** `feat: account & subscription screen + deactivate`.

---

## Milestone 7 — Build & release

### Task 7.1: Android + iOS builds

**Files:** signing config notes in `docs/plans/DEPLOY.md` (append mobile section).

- [ ] Android: configure release keystore, `./gradlew assembleRelease` (APK) / `bundleRelease` (AAB for Play). iOS: set bundle id, signing, archive in Xcode. Add the Firebase `google-services.json` (Android) / `GoogleService-Info.plist` (iOS) for FCM. Set the production API base URL. Document a smoke test: register → (admin approves) → login → add an expense with photo → see profit → share. **Commit** `docs: mobile build & release guide`.

---

## Self-review checklist

- [ ] **Spec coverage (docs 02 §A, 03, 04, 06):** register+consent ✓; approve-before-login → waiting screen ✓; phone+password, no OTP ✓; home monthly summary ✓; 2–3 tap add expense/income ✓; receipt photo via signed upload ✓; imputed auto-suggest (family labour days×wage, own-land value) ✓; plots with land-unit picker + normalizedAcres confirm ✓; crop cycle detail cash/true toggle + per-acre ✓; reports incl. best-per-acre ✓; PDF/WhatsApp share ✓; FCM notifications ✓; account/subscription with pay-offline note + deactivate ✓.
- [ ] **No hard delete:** entries are voided (Undo), account is deactivated. ✓
- [ ] **Low-literacy UX:** number-pad + icon category grid + minimal typing + flat tabs (SARAL). ✓
- [ ] **Naming consistency:** `createClient`, `useCreateTransaction`, `useSuggestedImputed`, `useUploadReceipt` consistent across tasks. ✓

---

## Build order recap (all three plans)

1. **Backend** (Plan 1) through Milestone 5 → real endpoints exist.
2. **Web Admin** (Plan 2) → you can approve farmers & record payments (unblocks farmer login).
3. **Farmer App** (Plan 3) → the farmer experience, integrated against the live API.

Deploy backend (Render) + admin (Vercel) first; ship the app to the stores last.
