# Screens & UI Specification

*Part of the Smart Farming product specification - see [README](README.md) for the full index.*

## Screens & UI Specification

This section specifies every screen in the **farmer mobile app** (React Native + Expo) and, in lighter detail, the **web admin panel** (React + Vite). All UI text lives in an i18n resource file (English v1, no hardcoded strings). Layouts must not break when longer regional strings are added later. Every farmer screen follows the SARAL principles: icon-first, big number-pad, minimal typing, flat navigation, 2-3 taps to log an entry, clear confirmation and undo.

### Global conventions

| Concern | Rule |
|---|---|
| Navigation | Flat bottom tab bar: **Home · Reports · Add (center +) · Notifications · Account**. No deep nested menus. |
| Loading | Skeleton placeholders, never a blank screen. First API call after idle may take **30-50s** (Render cold start) — show a friendly "Waking up, please wait..." message, not a spinner that looks stuck. |
| Errors | Full-screen retry card with a big icon + "Try again" button. Never show raw error codes. |
| Offline (future seam) | v1 is online-first. UI reserves space for a later "saved, will sync" chip; writes go through one queue-able API layer. |
| Money | All amounts in **INR (Rs)**, entered on a large numeric keypad. |

---

### Farmer app — core screens

#### Splash / Onboarding
- **Purpose:** brand load + first-run intro to the value ("Track your kheti kharcha, see real profit").
- **Key UI:** logo, 3 swipeable intro cards (icon + one line each: *Add expense/income → See profit per acre → Share report*), "Get started" button.
- **Primary actions:** Get started → Register; "I already have an account" → Login.
- **States:** *Loading* — logo while checking stored JWT; auto-skip to Home if a valid token exists. *Error* — if token refresh fails, fall back to Login.
- **Low-literacy note:** picture-driven cards; skippable; no wall of text.

#### Register / Login
- **Purpose:** account creation and sign-in. Farmer signs in with **phone number + one-time password (OTP)** sent by SMS — no password to create or remember.
- **Key UI:** phone field (numeric pad), name, village, state + district pickers; **consent checkbox** (DPDP Act 2023: "I agree to my data being stored to run my account"). Login screen: phone field → **"Send code"** → 4/6-digit OTP entry with auto-advance boxes and a **"Resend code"** timer. No password field, no "Forgot password" flow.
- **Primary actions:** Register → **instant free trial starts (14 days), login enabled immediately** (recommended model); Login → enter phone → enter OTP → Home.
- **States:** *Loading* — button spinner; "Sending code..." then "Checking code...". *Error* — "This phone number is already registered" / "Wrong or expired code — resend", inline, in plain words.
- **Low-literacy note:** phone number + a code the farmer just received is far less friction than inventing and recalling a password; minimum fields; state/district as searchable dropdowns, not free typing.

> **Why OTP, not a password:** phone is already the unique farmer identity in the data model, so switching the login factor from password to OTP does not change the model — it only removes the password-creation and password-recall friction that would hurt trust in the critical first minute for a low-literacy, WhatsApp-comfortable user. Password login (or password-as-fallback) can be added later without a rewrite.

> **Open question — v1 language:** the spine locks **English-only for v1** (built i18n-ready). Because the design is icon-first, the actual on-screen string count is small (category labels, the DPDP consent line, status pills, error text). Owners should decide whether to also ship the pilot state's regional language (e.g. Hindi + one more) in v1, since that is a small translation task rather than a rebuild. This is a decision to make, not resolved here.

> **Open question — first-login gate:** whether first login requires **admin approval before activation** (original idea) or the **instant-trial** flow shown above (recommended). The screen supports both — approval mode simply shows a "Waiting for approval" state after Register instead of opening Home.

#### Home / Dashboard
- **Purpose:** the daily landing screen — this month's money at a glance.
- **Key UI:** big cards for **This Month Income**, **This Month Expense**, **Profit** (green if positive, red if loss, in Rs); a small season badge (e.g. "Rabi 2025-26"); list of recent entries; large center **+ Add** button.
- **Primary actions:** tap **+** → choose Add Expense / Add Income; tap a crop cycle → Crop cycle detail; tap Profit card → Reports.
- **States:** *Empty* — friendly "Add your first entry" with a big + arrow. *Loading* — skeleton cards. *Grace mode* — a read-only banner: "Your subscription ended. You can view but not add. Renew to continue." with **+ disabled**.
- **Low-literacy note:** numbers dominate; colour tells profit vs loss without reading; one obvious action button.

#### Add Expense / Add Income
- **Purpose:** the most-used screens — log money in 2-3 taps.
- **Key UI:** **icon grid of categories** (Seeds, Fertilizer, Pesticides, Irrigation, Hired labour, Transport… for expense; Main crop sale, By-product, Subsidy/MSP, Insurance payout… for income) sourced from admin master data; a **big number-pad** for amount; crop cycle picker (or "General/farm-level"); date (default today); optional quantity + unit + rate; optional note; **camera icon to attach a receipt photo** (Cloudinary). True-cost/imputed categories (Family labour, Own-land rental value) appear only when the farmer opts into "see my real profit".
- **Primary actions:** pick category → type amount → **Save**; instant toast "Saved" with **Undo**.
- **States:** *Loading* — save button spinner; photo upload progress bar. *Error* — "Could not save, check internet — Try again", entry kept on screen so nothing is lost. *Empty* — if no crop cycle exists, prompt to add one or save as general.
- **Low-literacy note:** tap-an-icon then type-a-number is the whole flow; words are optional; receipt photo lets a farmer skip typing details.

#### Crop / Plot setup
- **Purpose:** define land (plots) and start crop cycles — the base for per-acre profit.
- **Key UI:** **Plot:** name, area **{value + unit}** where unit picker offers acre, hectare, guntha, cent, **bigha**. Because bigha varies by state, the app uses the plot's **state** to convert to **normalizedAcres** automatically from the conversion table — no confirm gate. It then shows the result transparently as an editable line: **"We treated your 2 bigha as ≈ 0.66 acre"** with a small **"Change"** link if the farmer knows their land differs. **Crop cycle:** pick crop from catalog, season (Kharif/Rabi/Zaid/Perennial), year ("2025-26"), area used, sowing/harvest dates.
- **Primary actions:** Save plot (proceeds with the computed acre value by default); Start crop cycle; Close cycle at harvest.
- **States:** *Empty* — "Add your first plot". *Error* — validation only if area value is zero/missing (unit is never a blocker; the state table always yields a value). *Loading* — skeleton.
- **Low-literacy note:** the farmer keeps working in their own unit (bigha/guntha/cent); the acre figure is computed for them and shown, not demanded. Nothing is blocked on validating a decimal conversion they cannot independently check.

#### Crop cycle detail
- **Purpose:** the primary unit of profit analysis — everything about one crop on one plot.
- **Key UI:** header (crop, season, year, area, plot); **Cash profit** headline (income − paid-out) with an optional **"See my real profit" toggle** revealing True profit (adds imputed family labour, own-land rental value, interest on owned capital — CACP A2+FL / C2); per-acre profit **and per-bigha/per-local-unit profit shown side by side** so the number is meaningful in the farmer's own terms; income vs expense split; list of this cycle's transactions.
- **Primary actions:** add entry to this cycle; toggle true-cost; share report; close cycle.
- **States:** *Empty* — "No entries yet for this crop". *Loading* — skeleton. *Grace* — read-only, add disabled.
- **Low-literacy note:** cash profit shown first and simply; true profit is one optional toggle, never forced; per-unit profit is given in both acre and the farmer's local unit.

#### Reports (monthly / yearly / per-crop / per-acre)
- **Purpose:** turn entries into insight.
- **Key UI:** tabs/segmented control — **Monthly**, **Yearly**, **Per crop cycle**, **Per acre**; charts: expense breakdown pie, income breakdown, season comparison bars, and a **"Which crop earned most per acre"** ranking; each report shows cash profit with optional true-profit toggle. Per-acre figures use the auto-computed `normalizedAcres`; the report shows the same value in the farmer's local unit alongside acres.
- **Primary actions:** pick period/crop; open a report; **Share** (opens preview).
- **States:** *Empty* — "Not enough data yet — add entries to see reports". *Loading* — skeleton charts. *Error* — retry card. *Grace* — reports remain **viewable** (read-only).
- **Low-literacy note:** per-acre reporting is never hard-blocked — the app always has a computed acre value to divide by, and shows the conversion openly with a "Change" affordance instead of a locked prompt. Charts and colour first; big numbers; minimal reading; ranking answers "which crop pays best" visually.

#### Report share / preview
- **Purpose:** review then share a report.
- **Key UI:** rendered report page (farmer name, crop/period, profit, per-acre, charts), **Share to WhatsApp** and **Save/Share as PDF** buttons using the OS share sheet.
- **Primary actions:** Share to WhatsApp; export PDF.
- **States:** *Loading* — "Preparing PDF...". *Error* — "Could not create PDF — Try again".
- **Low-literacy note:** WhatsApp is a one-tap icon farmers already know.

#### Subscription / Account
- **Purpose:** show plan status and how to pay.
- **Key UI:** status pill — **Trial (days left) / Active (renews on…) / Grace (renew now) / Expired**; plan and price (**~Rs 99/month or ~Rs 799/year — to validate**); clear line: **"To pay, use cash/UPI with us; admin will activate your month"** (no in-app payment in v1); payment history list.
- **Primary actions:** view status; contact/how-to-pay info.
- **States:** *Grace/Expired* — prominent renew message; *Trial* — countdown.
- **Low-literacy note:** one colour-coded pill tells the whole status; no confusing gateway.

#### Notifications & Settings
- **Purpose:** receive admin announcements (FCM push) and manage the account.
- **Key UI (Notifications):** list of announcements (title + body + date), unread dots. **Settings:** language (English v1, ready for more), profile edit, logout, **delete my account/data** (DPDP), about.
- **Primary actions:** read announcement; edit profile; logout; request data deletion.
- **States:** *Empty* — "No messages yet". *Loading* — skeleton list.
- **Low-literacy note:** icon + short title per item; settings kept short and flat.

---

### Admin web panel — screens (lighter detail)

| Screen | Purpose | Key UI & primary actions | States |
|---|---|---|---|
| **Login** | Owner sign-in | Email + password; JWT session | Error: "Wrong email or password"; rate-limited |
| **Dashboard (KPIs)** | Business at a glance | Cards: total farmers, active/trial/grace/expired counts, revenue this month; recent payments | Loading skeletons; empty on first run |
| **Farmers list + detail** | Manage & inspect farmers | Searchable/filterable table (name, phone, village, state, status); detail = profile, plots, crop cycles, all transactions & reports (read-only), suspend/activate | Empty, loading, error |
| **Subscriptions / Payments** | The money workflow | Per farmer: current status; **Record payment** (amount, method cash/UPI/other, period start/end, note) → **activates paid month**; move lapsed to **grace/expired**; payment history | Confirm dialog on activation; validation errors |
| **Master data editors** | Own the catalogues | CRUD for **crops** (name, default season, icon), **expense categories** (isPaidOut, isImputed, cacpTag A1/A2/FL/C2, icon), **income categories** (type, icon), **land-unit conversions** (unit, state → factor) and app config (trialDays, price) | Inline edit, activate/deactivate, validation |
| **Announcements composer** | Broadcast to app | Title + body, audience (all/segment), **Send** → FCM push; sent-history with pushSent flag | Confirm before send; delivery status |

**Admin UX note:** desktop-first, data-dense tables and forms (the opposite of the farmer app). Role-based access (admin/superadmin); every farmer's data is view-scoped and edits are limited to subscription/payment activation and master data — the admin never edits a farmer's own ledger entries.

> **Open question — "new signups" KPI:** the dashboard KPIs above are limited to what the feature spec and dashboard endpoint currently guarantee (revenue this month and the active/trial/grace/expired counts). A "new signups in period" card is **not yet in scope** here because no dashboard requirement or endpoint field defines it. `farmers.createdAt` exists in the data model, so if owners want this card, add "new signups in period" to the dashboard feature acceptance criteria and have the dashboard endpoint return the count of farmers whose `createdAt` falls in the selected date range. Until that is agreed, the card is intentionally omitted so the overview, feature spec, and API stay consistent.