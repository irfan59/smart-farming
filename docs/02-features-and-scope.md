# Features & Scope

*Part of the Smart Farming product specification - see [README](README.md) for the full index.*

## Features & Scope

This section lists every feature planned for v1, split into the **Farmer Mobile App** and the **Web Admin Panel**. Each feature has a one-line description, a **MoSCoW priority** (Must / Should / Could), and testable acceptance criteria. A final "Out of scope for v1" list records what we deliberately defer to v2/v3.

**MoSCoW legend:** *Must* = v1 does not ship without it. *Should* = important, include if time allows. *Could* = nice-to-have, first to be dropped under pressure.

---

## A. Farmer Mobile App (React Native — bare CLI, Android + iOS, no Expo)

### A1. Auth & Onboarding — *Must*
Farmer registers with phone number + password; an admin approves the account, which starts the free trial and enables login.
- Registration captures name, phone (unique), village, state, district; consent checkbox shown at signup (DPDP Act 2023).
- On registration, a `subscriptions` record is created with status `pending_approval` and login is **blocked**. When an admin approves, status becomes `trial`, `trialStartedAt` = approval time, `trialEndsAt` = approval time + `appConfig.trialDays` (14), and login is enabled.
- Login returns a JWT (with expiry + refresh); wrong password is rejected with a clear message; a `pending_approval` account is rejected with a "waiting for approval" message.
- A farmer can only see their own data; another farmer's ID in an API call returns 403.

> **Decided:** admin approval is **required before first login**. Registration creates a `pending_approval` account; an admin approves it from the web to start the trial and enable login.

### A2. Farm & Crop Setup (Plots + Crop Cycles) — *Must*
Farmer defines plots with area, then creates crop cycles (the primary unit of profit analysis).
- Farmer adds a plot with `name`, `area {value, unit}` and `state`; the app computes `normalizedAcres` from the (unit, state) conversion table and asks the farmer to confirm or override.
- Bigha is never hardcoded to one value; the conversion depends on the plot's state.
- Farmer creates a crop cycle: crop (from `cropCatalog`), season (kharif/rabi/zaid/perennial), year (e.g. "2025-26"), plot, and area used.
- Per-acre reports are blocked with a prompt if `normalizedAcres` is missing for that cycle.

### A3. Expense Logging — *Must*
Log a crop-wise or farm-level expense in 2–3 taps using icon-first categories.
- Farmer picks an expense category (icon-first master list), enters amount on a big number-pad, and saves in ≤3 taps.
- Expense can be linked to a crop cycle or left as general/farm-level (`cropCycleId = null`).
- Optional `quantity`, `unit` (kg/bag/day), `rate`, `date`, and `note` can be added but are not required.
- Imputed categories (Family labour, Own-land rental value) are clearly marked and only affect true-profit, not cash profit.

### A4. Income Logging — *Must*
Log crop-wise or farm-level income using the income category master list.
- Farmer picks an income category (e.g. Main crop sale, By-product sale, Government subsidy/MSP, Insurance payout), enters amount, and saves.
- Income can be linked to a crop cycle or left farm-level.
- Saved entry appears immediately in that crop cycle's and the monthly totals.

### A5. Receipt Photo Attachment — *Should*
Attach a photo of a paper receipt to any expense or income entry.
- Farmer can capture or pick one photo per entry; the image uploads to Cloudinary and the returned URL is stored in `transactions.photoUrl`.
- The DB stores only the URL, never the image bytes.
- If upload fails, the entry still saves without a photo and the failure is shown clearly.

### A6. Reports & Profit (Cash + True) — *Must*
Show monthly, yearly, per-crop-cycle and per-acre profit/loss, with a true-cost toggle.
- **Cash profit** (default, shown first) = total income − total paid-out expenses.
- A **"See my real profit"** toggle switches to **true profit** = income − (paid-out + imputed family labour + imputed own-land rental + interest on owned capital).
- Per-acre profit = profit ÷ `normalizedAcres` of the cycle; a "which crop earned most per acre" ranking is available.
- Reports include expense-by-category and income breakdowns (pie/bar) and season comparison; all reports are read-only in grace mode.

### A7. Sharing (PDF + WhatsApp) — *Should*
Export any report as PDF and share via the OS share sheet (WhatsApp etc.).
- Any report can be generated as a PDF file on the device.
- The OS share sheet opens so the farmer can send to WhatsApp or any app.
- The shared PDF shows the farmer name, crop cycle / period, and the same numbers as on screen.

### A8. Notifications (Announcements + Reminders) — *Should*
Receive admin push announcements and subscription reminders via FCM.
- Device registers an FCM token after login; admin announcements arrive as push.
- Trial-ending and grace-mode notices are delivered as push and/or in-app.
- Tapping a notification opens the relevant screen.

### A9. Subscription Status & Grace Mode — *Must*
Farmer always sees their plan state (trial / active / grace / expired) and what they can do.
- Current status and the trial or paid end-date are visible in the app.
- On a lapsed paid month the app enters **read-only grace mode**: past data and reports remain viewable, but new expense/income entries are blocked with a clear "renew to continue" message.
- `expired` / `suspended` states are handled with an appropriate blocked-access screen.

---

## B. Web Admin Panel (React + Vite, on Vercel)

### B1. Admin Auth — *Must*
Product owner logs in with email + password; access is role-based.
- Admin logs in with email (unique) + password; JWT issued with expiry + refresh.
- Roles `admin` / `superadmin` are enforced; a farmer JWT cannot access admin APIs.
- Passwords are bcrypt-hashed; brute-force attempts are rate-limited.

### B2. Farmer Management — *Must*
View, search and manage all farmers and their status.
- Admin can list and search farmers by name, phone, village, state.
- Admin can **approve** a `pending_approval` farmer (this starts the trial and enables login), and set a farmer's status to `active` / `suspended` / `deactivated`.
- Opening a farmer shows their profile and subscription state.
- A farmer's account can be **deactivated** (data retained, never hard-deleted); a formal DPDP legal-erasure demand is handled as a manual admin exception (see doc 07).

### B3. Subscription & Payment Activation — *Must*
Record an offline (cash/UPI) payment and activate the paid month. No payment gateway in v1.
- Admin records a payment (`amount`, `method` cash/upi/other, `receivedAt`, period) against a farmer; a `payments` record is created with `recordedByAdminId`.
- Recording a payment updates the `subscriptions` record to `active` with new `currentPeriodStart/End` and sets `activatedByAdminId`.
- Admin can move a lapsed farmer into `grace` and see who is in trial / active / grace / expired.

### B4. View Farmer Data & Reports — *Must*
Admin can open any farmer's plots, crop cycles, transactions and reports (read-only).
- Admin can view any farmer's crop cycles, transactions (with receipt photos) and computed reports.
- The same cash/true profit and per-acre logic used in the app is used here.
- Admin viewing is read-only; admin does not create farmer transactions.

### B5. Master-Data Management — *Must*
Manage crops, expense/income categories and land-unit conversions.
- Admin can add/edit/deactivate `cropCatalog`, `expenseCategories` (with `isPaidOut`, `isImputed`, `cacpTag`, icon) and `incomeCategories`.
- Admin can edit `appConfig`: `trialDays`, `monthlyPriceINR`, and the `landUnitConversions` table (including per-state bigha values).
- Deactivating a category hides it from new entries but does not break existing transactions (denormalized `categoryName` preserved).

### B6. Announcements (Push) — *Should*
Compose an announcement and push it to farmers via FCM.
- Admin creates an announcement (`title`, `body`, `audience` all/segment); an `announcements` record is stored.
- Sending triggers FCM push to the target audience and sets `pushSent`.
- Announcement history is visible to the admin.

### B7. Payments & Revenue Dashboard — *Should*
See revenue and subscription health at a glance.
- Dashboard shows total revenue (INR) over a selected period and count of active / trial / grace / expired farmers.
- Revenue figures are derived from the `payments` collection.
- Numbers reconcile with the individual payment records.

---

## Out of Scope for v1

These are intentionally excluded from v1. The architecture leaves a clean seam for each so no rewrite is needed later.

| Feature | Why deferred | Target |
|---|---|---|
| **Offline mode / sync** | v1 is online-first; a local write queue + `/sync` endpoint is the planned seam. | **v2** |
| **Multi-language (Hindi + regional)** | App is built i18n-ready (all strings in resource files); English only in v1. | **v2** |
| **Voice input for entries** | Helps low-literacy users but adds cost/complexity. | **v2/v3** |
| **Payment gateway (online UPI/cards)** | v1 uses manual admin-recorded offline payments. | **v2** |
| **Weather + mandi (market) prices** | Needs external data feeds; not core to profit tracking. | **v3** |
| **Crop advisory / recommendations** | Advisory content and agronomy are a separate product effort. | **v3** |
| **Multi-user farms (multiple logins per farm)** | v1 assumes one farmer = one account. | **v3** |
| **OTP / SMS login** | Excluded by owner decision — login is phone + password only, with admin-assisted reset. | **Not planned** |

**Guiding rule for v1:** ship the smallest complete loop — a farmer can log expenses and income against a crop cycle, see cash and true profit per acre, and share it; the owner can activate subscriptions and see revenue. Everything above that loop is a *Should* or a *Could*, and everything in the table is out of scope.