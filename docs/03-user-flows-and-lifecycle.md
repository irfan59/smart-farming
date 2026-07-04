# User Flows & Account Lifecycle

*Part of the Smart Farming product specification - see [README](README.md) for the full index.*

## Purpose and audience

This section describes every important flow in the Smart Farming product, step by step. It covers what the farmer does in the mobile app, what the product owner does in the web admin panel, and how an account moves between states over its life. Use these flows as the reference when building screens and API endpoints. All flows assume online-first behaviour (a live connection to the backend).

## Open decision: instant trial vs approve-before-login

Before the flows, one decision must be made about how a new farmer gets in:

| Option | How it works | Pros | Cons |
| --- | --- | --- | --- |
| A. Instant free trial (recommended) | Farmer registers and can log in immediately; a 14-day trial starts at once. | Zero friction; farmer sees value the same minute; higher activation. | A few fake/junk accounts may register before any human check. |
| B. Approve-before-login (original idea) | Farmer registers but cannot log in until an admin approves the account. | Owner controls who gets in; less junk. | Farmer waits (maybe hours); many drop off before they ever try the app; admin becomes a bottleneck. |

**Recommendation: Option A (instant trial).** For a smallholder farmer, the first minutes decide whether the app is trusted and used. Making them wait for manual approval kills adoption. Junk accounts are a small, manageable problem: the admin can suspend a bad account later, and no money is at risk during the trial. The flows below assume Option A.

If the owner prefers Option B, the only change is an extra `pending_approval` state that comes before `trial`: registration creates the subscription in `pending_approval`, login is blocked, and an admin must approve the account before the trial starts. This value is already listed in the state-machine table below and in the `subscriptions.status` enum in the data model (file 05), so Option B is buildable without a schema change if the owner picks it.

## Farmer flows

### Flow 1: Registration and instant free-trial onboarding

1. Farmer opens the app and taps **Register**.
2. Farmer enters name, phone number, password, and selects state, district, and village. A consent checkbox (DPDP Act 2023) is shown and must be ticked.
3. App sends the details to the backend. Backend checks the phone is unique, hashes the password (bcrypt), and creates a `farmers` record with `status = active`.
4. Backend creates a `subscriptions` record with `status = trial`, `trialStartedAt = now`, `trialEndsAt = now + trialDays` (from `appConfig`, default 14).
5. Backend returns a JWT. The farmer is logged in immediately — no waiting for approval.
6. A short first-run guide shows how to add a plot and log an entry. The farmer optionally adds a first plot (name, area value + unit + state; app computes `normalizedAcres`).
7. A banner shows trial days left (e.g. "Trial: 13 days left").

### Flow 2: Daily expense/income logging (the 2-3 tap core loop)

This is the most-used screen and must be fast. Target: log one entry in 2-3 taps plus typing the amount.

1. From the home screen the farmer taps the big **+ Add** button.
2. Farmer taps **Expense** or **Income** (tap 1).
3. Farmer taps a category icon, e.g. Seeds, Fertilizer, Hired labour (tap 2). Categories come from the admin-managed master data and are shown icon-first.
4. The number-pad opens; farmer types the amount, e.g. `1500` (Rs 1,500). Date defaults to today.
5. Farmer taps **Save** (tap 3). A `transactions` record is created with `type`, `categoryId`, `categoryName` (denormalized), `amount`, `date`, and the linked `cropCycleId` if a crop cycle is selected.
6. Optional extras, all skippable: attach a photo of the receipt (camera or gallery → uploaded to Cloudinary → `photoUrl` saved); add quantity/unit/rate (e.g. 2 bags of urea); add a note.
7. A clear confirmation appears with an **Undo** option. Imputed items (family labour, own-land rental value) are only offered when the farmer is in the true-cost view, and are saved with `isImputed = true`.

### Flow 3: Viewing and sharing a report

1. Farmer taps the **Reports** tab.
2. Farmer picks a report: monthly summary, yearly summary, per-crop-cycle profit/loss, per-acre profit, expense/income breakdown, season comparison, or "which crop earned most per acre".
3. The report shows **Cash profit** first (income − paid-out expenses). A toggle **"See my real profit"** switches to true profit (adds imputed family labour, own-land rental value, interest on owned capital).
4. Per-acre figures use the crop cycle's `normalizedAcres`. Example: Cotton, Kharif 2025-26, profit Rs 24,000 on 3 acres = Rs 8,000/acre.
5. Farmer taps **Share**. The app generates a PDF and opens the OS share sheet, so the report can go to WhatsApp, email, or be saved as a PDF.
6. In grace mode all reports remain viewable (read-only); only new data entry is blocked.

### Flow 4: Trial ends → farmer pays → admin activates → paid

1. As the trial nears its end, the app shows a reminder (e.g. "Trial ends in 2 days"). An FCM push may also be sent.
2. When `trialEndsAt` has passed and no payment exists, the subscription is treated as `grace` (read-only). This is not flipped by a background job: the backend evaluates the dates on the farmer's next authenticated request (and on any admin dashboard read) and, if `trialEndsAt < now`, updates the stored `status` to `grace` at that moment. The farmer can still view past data and reports.
3. The farmer pays the owner **offline** — cash or UPI (there is no payment gateway in v1). Suggested price to validate: ~Rs 99/month or ~Rs 799/year.
4. The owner opens the web admin, finds the farmer, and records the payment (see Flow 6): a `payments` record plus an updated `subscriptions` record.
5. The subscription becomes `active` with `currentPeriodStart` and `currentPeriodEnd` set (e.g. one month ahead).
6. On the farmer's next app use, full access is restored: adding entries works again. An FCM push can confirm "Your subscription is active until 04 Aug 2026".

### Flow 5: Lapse → read-only grace → renew

1. A paid period ends (`currentPeriodEnd` passes) with no new payment recorded. Nothing changes at the instant the date passes — there is no scheduler watching the clock.
2. On the farmer's next authenticated request (or the next admin read of this farmer), the backend sees `currentPeriodEnd < now` with no newer paid period and moves the subscription to `grace`: the farmer can open the app, view all past entries and reports, and share PDFs, but **cannot add or edit entries**. A clear banner explains why and how to renew (pay the owner).
3. If the farmer pays, the owner records the new payment; status returns to `active` with a fresh period. Entry is unblocked.
4. If grace has continued past a configured limit (an open setting, e.g. 30 days), the same on-request evaluation moves the subscription to `expired`. Data is retained; the farmer must renew to regain any access beyond a login screen prompt to pay.

## Admin flows

### Flow 6: Review and activate a subscription / record a payment

1. Owner logs into the web admin with email + password (JWT).
2. Owner opens the **Farmers** list and searches by phone, name, or village. Filters show who is in trial, grace, or expired.
3. Owner opens a farmer's profile: sees personal details, current subscription status, plots, and full transaction/report history (admin can view any farmer's data).
4. When the farmer has paid offline, the owner clicks **Record payment**: enters amount, method (cash/upi/other), and the period it covers.
5. On save, the backend creates a `payments` record (`recordedByAdminId` set) and updates the `subscriptions` record to `status = active`, setting `currentPeriodStart`, `currentPeriodEnd`, and `activatedByAdminId`.
6. The change is immediate; the farmer regains full access on next use. This same flow handles the first paid month after trial and every later renewal.

### Flow 7: Manage master data

1. Owner opens **Master data** in the web admin.
2. Owner manages the shared catalogs used by every farmer app: `cropCatalog` (crops, default season, icon), `expenseCategories` (name, icon, `isPaidOut`, `isImputed`, `cacpTag`), `incomeCategories` (name, icon, type), and land-unit conversions in `appConfig` (including the state-specific bigha values).
3. Owner can add, edit, activate, or deactivate an item. Deactivating hides it from new entries but keeps old records readable.
4. Changes apply to all farmer apps the next time they fetch master data. Because categories are stored as master data (not hardcoded), the CACP-based template can be extended without an app release.

### Flow 8: Send an announcement

1. Owner opens **Announcements** and taps **New**.
2. Owner writes a title and body, and picks an audience (all farmers, or a segment such as a state or subscription status).
3. On send, the backend saves an `announcements` record and pushes the message to the chosen farmers via FCM. `pushSent` is set once dispatch succeeds.
4. Farmers see the announcement as a push notification and inside the app. Use cases: price reminders, new-feature notices, seasonal tips.

## Account / subscription state machine

The `subscriptions.status` field drives what a farmer can do. States and transitions:

| From | To | Trigger | Who triggers | Farmer access after |
| --- | --- | --- | --- | --- |
| (none) | `trial` | Registration completed (Option A, recommended) | Farmer (self) | Full access |
| (none) | `pending_approval` | Registration completed (Option B only) | Farmer (self) | Login blocked until approved |
| `pending_approval` | `trial` | Admin approves the account (Option B only) | Admin | Full access |
| `trial` | `active` | Payment recorded during trial | Admin | Full access |
| `trial` | `grace` | `trialEndsAt` has passed, no payment; detected on next request | System (on-request, time-based) | Read-only |
| `active` | `active` | Renewal payment recorded | Admin | Full access (new period) |
| `active` | `grace` | `currentPeriodEnd` has passed, no payment; detected on next request | System (on-request, time-based) | Read-only |
| `grace` | `active` | Payment recorded | Admin | Full access |
| `grace` | `expired` | Grace limit has passed (e.g. 30 days); detected on next request | System (on-request, time-based) | No access beyond a pay prompt |
| `expired` | `active` | Payment recorded | Admin | Full access |
| any | `suspended` | Manual block (junk/abuse) | Admin | No access |
| `suspended` | `active`/`trial` | Manual un-block | Admin | Restored |

Key rules:

- **Full access** = view reports + add/edit entries. **Read-only (grace)** = view and share reports only; no new or edited entries. **No access (expired/suspended/pending_approval)** = login shows a prompt to pay, wait for approval, or contact the owner; data is retained, not deleted.
- `pending_approval` exists only to support Option B (approve-before-login). Under the recommended Option A it is never used — registration goes straight to `trial`. Both this table and the `subscriptions.status` enum (file 05) include the value so either option is buildable without a schema change.
- Time-based transitions (`trial → grace`, `active → grace`, `grace → expired`) are **not** run by a scheduled job or cron. They are evaluated lazily: the backend compares the stored dates against `now` on the farmer's next authenticated request and on admin dashboard reads, and updates the stored `status` at that point. This is a deliberate choice for the Render free-tier, which sleeps after ~15 minutes idle and therefore cannot run a reliable always-on scheduler. The `subscriptions` indexes on `{ status, trialEndsAt }` and `{ status, currentPeriodEnd }` exist to make this on-read date check fast (and to let the admin list filter/scan by status), not to feed a scheduler.
- Every money-linked transition (`→ active`) is triggered by an admin recording a real offline payment; the app never charges a card in v1.

## Open questions

- **Grace limit length**: how many days of read-only grace before `expired`? Suggested 30 days; owner to confirm.
- **Approval model**: instant trial (Option A, recommended) vs approve-before-login (Option B, which uses the `pending_approval` state). Owner to confirm before build.
- **Expired data retention**: how long is a fully expired farmer's data kept before optional cleanup? Must respect DPDP deletion-on-request either way.