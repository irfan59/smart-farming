# Smart Farming — API Contract (source of truth)

This document pins the **exact HTTP surface** of the backend so the web admin and farmer app build against one agreed shape. When the backend plan ([01-backend-plan.md](01-backend-plan.md)) and a client plan disagree, **this document wins** — implement the backend to match it and build clients against it.

> Why this exists: the first web-admin plan draft invented response shapes that did not match the backend (admin login with no `admin` object, `?query=` vs `?q=`, a flat farmer-detail vs a nested one). Pinning the contract here removes that drift for both clients.

## Conventions

- **Base URL:** clients read it from config (`VITE_API_URL` for web admin, `API_URL` for the app). All paths below are relative to `{BASE}/api`.
- **Auth header:** `Authorization: Bearer <accessToken>` on every protected call.
- **Content type:** `application/json` for request bodies.
- **Success:** the resource JSON directly (object), or `{ data: [...], total, page }` for lists.
- **Error (always this shape):** `{ "error": { "code": "STRING_CODE", "message": "human text" } }` with an HTTP status. Clients surface `message`; special-case `code` where noted.
- **Roles:** `farmer` (own data only), `admin`, `superadmin`.
- **Access token JWT payload:** `{ sub, role, tokenVersion }` (clients MAY decode `role`, but should prefer the `admin`/profile objects below for display).

## Enums

| Field | Values |
|---|---|
| `farmer.status` | `active`, `suspended`, `deactivated` |
| `subscription.status` | `pending_approval`, `trial`, `active`, `grace`, `expired`, `suspended` |
| `transaction.type` | `expense`, `income` |
| `cropCycle.season` | `kharif`, `rabi`, `zaid`, `perennial` |
| `cropCycle.status` | `active`, `closed`, `deactivated` |
| `payment.method` | `cash`, `upi`, `other` |
| `expenseCategory.cacpTag` | `A1`, `A2`, `FL`, `C2` |
| `admin.role` | `admin`, `superadmin` |

## Shared object shapes

```jsonc
// Admin
{ "id": "adm_1", "name": "Owner", "email": "owner@farm.in", "role": "superadmin" }

// Farmer (list row) — FLAT, with subscription status denormalized
{ "id": "f_1", "name": "Ramesh", "phone": "9800000001", "village": "Wardha",
  "state": "Maharashtra", "district": "Wardha", "status": "active",
  "subscriptionStatus": "pending_approval", "createdAt": "2026-06-01T00:00:00.000Z" }

// Subscription
{ "status": "trial", "plan": "monthly", "trialStartedAt": "...", "trialEndsAt": "...",
  "currentPeriodStart": null, "currentPeriodEnd": null, "approvedAt": "...", "notes": "" }

// Payment
{ "id": "p_1", "farmerId": "f_1", "amount": 99, "currency": "INR", "method": "upi",
  "receivedAt": "...", "periodStart": "...", "periodEnd": "...", "note": "" }
```

## Auth

| Method | Path | Body | Response | Role |
|---|---|---|---|---|
| POST | `/auth/farmer/register` | `{ name, phone, password, village, state, district, consentVersion }` | `{ farmer, subscription }` (subscription.status = `pending_approval`) | Public |
| POST | `/auth/farmer/login` | `{ phone, password }` | `{ accessToken, refreshToken, farmer }` — **rejects** `pending_approval` (403 `PENDING_APPROVAL`), `suspended`/`deactivated` (403) | Public |
| POST | `/auth/admin/login` | `{ email, password }` | `{ accessToken, refreshToken, admin }` — **`admin` object REQUIRED** (id, name, email, role) | Public |
| GET | `/admin/me` | — | `{ admin }` — used by the web admin to restore identity after reload | Admin |
| POST | `/auth/refresh` | `{ refreshToken }` | `{ accessToken, refreshToken }` (rotates) | Public + valid refresh |
| POST | `/auth/logout` | `{ refreshToken }` | `{ ok: true }` | Farmer/Admin |
| POST | `/auth/farmer/change-password` | `{ currentPassword, newPassword }` | `{ ok: true }` (bumps `tokenVersion`, revokes refresh tokens) | Farmer |

## Farmer endpoints

| Method | Path | Notes | Role |
|---|---|---|---|
| GET | `/me` | `{ farmer, subscription }` (subscription status is freshly evaluated) | Farmer |
| PATCH | `/me` | edit name/village/state/district/preferredLanguage (not phone) | Farmer |
| POST | `/me/deactivate` | sets `status=deactivated`; data retained; never deletes | Farmer |
| GET/POST | `/plots` | list excludes `isActive:false`; POST computes `area.normalizedAcres` | Farmer |
| PATCH/DELETE | `/plots/:id` | ownership→404; DELETE = deactivate (`isActive=false`) | Farmer |
| GET/POST | `/crop-cycles` | POST validates season/year, computes `areaUsed.normalizedAcres` | Farmer |
| GET/PATCH | `/crop-cycles/:id` | ownership→404; PATCH can close | Farmer |
| DELETE | `/crop-cycles/:id` | ownership→404; = deactivate | Farmer |
| GET/POST | `/transactions` | list filters `isVoid:false`; POST validates category, denormalizes `categoryName`, optional `photoPublicId`, `isImputed` | Farmer |
| PATCH | `/transactions/:id` | ownership→404 | Farmer |
| DELETE | `/transactions/:id` | ownership→404; = void (`isVoid=true`) | Farmer |
| POST | `/uploads/receipt-signature` | returns short-lived signed Cloudinary params (image-only, size-capped, unguessable id) | Farmer |
| GET | `/reports/monthly` · `/reports/yearly` · `/reports/per-acre` · `/reports/season-comparison` · `/reports/crop-ranking` | farmer-scoped, exclude voided | Farmer |
| GET | `/reports/crop-cycle/:id` | ownership→404; `{ cashProfit, trueProfit, perAcreCash, perAcreTrue, income, expense }` | Farmer |
| GET | `/catalog/crops` · `/catalog/expense-categories` · `/catalog/income-categories` · `/catalog/land-units` | active items only | Farmer |

## Admin endpoints

| Method | Path | Response / notes | Role |
|---|---|---|---|
| GET | `/admin/farmers?q=&status=&page=` | `{ data: [Farmer list row], total, page }` — search param is **`q`**; rows are **flat** with **`subscriptionStatus`** | Admin |
| GET | `/admin/farmers/:id` | `{ farmer, subscription, counts: { plots, cropCycles, transactions }, reportSummary: { totalIncome, totalExpense, cashProfit } }` | Admin |
| POST | `/admin/farmers/:id/approve` | approves a `pending_approval` account → starts 14-day trial (returns updated `{ farmer, subscription }`) | Admin |
| PATCH | `/admin/farmers/:id` | `{ status: "active" \| "suspended" }` (suspend / reactivate) | Admin |
| POST | `/admin/farmers/:id/reset-password` | `{ tempPassword }` (shared offline) | Admin |
| POST | `/admin/farmers/:id/deactivate` | sets `status=deactivated`; data retained; never deletes | Admin |
| POST | `/admin/subscriptions/:farmerId/activate` | activates a paid month (alt. to /payments) | Admin |
| PATCH | `/admin/subscriptions/:farmerId` | adjust status (force grace/expired) | Admin |
| POST | `/admin/payments` | `{ farmerId, amount, method, period: "monthly"\|"yearly", note }` → records payment + activates the month; returns `{ payment, subscription }` | Admin |
| GET | `/admin/payments?farmerId=&from=&to=` | `{ data: [Payment], total }` | Admin |
| GET/POST/PATCH | `/admin/crops` · `/admin/expense-categories` · `/admin/income-categories` | PATCH `{ isActive:false }` deactivates (never DELETE) | Admin |
| GET/PATCH | `/admin/config` | `{ trialDays, monthlyPriceINR, yearlyPriceINR, graceDays, dailyWageINR, ownLandRentalPerAcreINR, landUnitConversions }` | **Superadmin** |
| POST | `/admin/announcements` | `{ title, body, audience }` → persists + FCM; returns the announcement with `pushSent` | Admin |
| GET | `/admin/announcements` | `{ data: [ { id, title, body, audience, createdAt, pushSent } ] }` | Admin |
| GET | `/admin/dashboard` | see shape below | Admin |

### `GET /admin/dashboard` response (pinned)

```jsonc
{
  "pendingApprovals": 2,                 // count of subscriptions with status pending_approval — the owner's priority
  "farmersByStatus": { "active": 10, "suspended": 1, "deactivated": 0 },
  "subscriptionsByStatus": { "pending_approval": 2, "trial": 3, "active": 8, "grace": 1, "expired": 0 },
  "activeSubscriptions": 11,             // trial + active
  "revenueThisMonth": 990,               // INR, sum of payments this calendar month
  "revenueTotal": 12870                  // INR, all-time
}
```

## Backend addenda (enrichments over the 01-backend-plan draft)

The backend plan drafted a few endpoints thinner than the clients need. Implement these to the shapes above:

1. **Admin login returns an `admin` object** `{ id, name, email, role }` (not just tokens) — the web admin needs the name for display and `role` for the superadmin gate.
2. **Add `GET /admin/me`** returning `{ admin }`, so the web admin can restore identity after a page reload (it stores only the refresh token).
3. **`GET /admin/dashboard`** returns `pendingApprovals`, `revenueThisMonth`, `revenueTotal`, and `subscriptionsByStatus` explicitly (pending approval is a *subscription* status, not a farmer status).
4. **`GET /admin/farmers/:id`** includes a light `reportSummary { totalIncome, totalExpense, cashProfit }` alongside `counts`.
5. **Farmers list** uses query param **`q`** and returns flat rows with **`subscriptionStatus`**, plus `total` and `page`.

## Web-admin architecture conventions (pinned — all modules must follow)

To avoid the cross-module drift found in review, every web-admin module uses the SAME building blocks:

- **Project root:** everything under `D:/smart-farming/web-admin/` (its own `package.json`, `vite.config.js`, `src/`, `tests/`). No web-admin file lives at the repo root.
- **One API client** `src/api/client.js` exporting `api` with `api.get(path)`, `api.post(path, body)`, `api.patch(path, body)`, `api.del(path)`. Bodies are **plain objects** (the client stringifies and sets the JSON content-type). It attaches the Bearer token and, on `401`, calls `POST /auth/refresh` once then retries, else triggers logout. All feature modules import `{ api }` — no other client shape.
- **One AuthContext** `src/auth/AuthContext.jsx` exposing `{ admin, isAuthed, isSuperadmin, login(email,password), logout() }`. On load, if a refresh token exists it calls `/auth/refresh` then `GET /admin/me` to restore `admin`.
- **One `ProtectedRoute`** `src/routes/ProtectedRoute.jsx`, route-element style using `<Outlet/>`, prop `requireSuperadmin` (boolean).
- **App shell** `src/components/AdminLayout.jsx` with a nav (Dashboard, Farmers, Payments, Master data, Announcements, and Config only when `isSuperadmin`); all pages render inside it.
- **TDD is genuinely red-first:** every task's first test fails because the behaviour does not exist yet — never because code was temporarily sabotaged. No `require()` in ESM tests (use `import`).
- **Money in INR (Rs)**, English only.

## Farmer-app conventions (pinned)

- **Project root:** `D:/smart-farming/farmer-app/` (bare React Native CLI, no Expo).
- **API client** with the same `api.get/post/patch/del` shape and phone+password auth; access token in memory, refresh token in secure storage.
- **Auth gate:** after register, show a **"Waiting for approval"** screen; login rejects `PENDING_APPROVAL` with that screen. Grace = read-only (writes disabled).
- **All strings in an i18n resource file** (English v1), icon-first, big number-pad, INR.
