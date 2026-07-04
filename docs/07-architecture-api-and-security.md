# Architecture, API & Security

*Part of the Smart Farming product specification - see [README](README.md) for the full index.*

## System Architecture

The Smart Farming product has two clients talking to one shared backend. No client talks to the database directly.

```
[Farmer App]  React Native + Expo (Android + iOS)
[Web Admin]   React + Vite
        |
        |  HTTPS / REST + JSON
        v
[API]  Node.js + Express  (Render free web service)
        |
        +--> MongoDB Atlas M0  (all business data)
        +--> Cloudinary        (receipt photo bytes; we store only the URL)
        +--> Firebase Cloud Messaging (push / announcements)
```

- The **farmer app** and **web admin** are pure clients. They hold no secrets other than the logged-in user's JWT.
- The **Express API** is the only component with database and third-party credentials. All reads, writes, validation, and access checks happen here.
- **MongoDB Atlas** stores every collection in the data model (farmers, subscriptions, transactions, etc.).
- **Cloudinary** stores the actual receipt image. The image bytes never sit in our database; `transactions.photoUrl` holds the Cloudinary URL.
- **FCM** delivers admin announcements and system pushes to farmer devices.

### Free-tier hosting and honest caveats

| Component | Free tier | Caveat | Upgrade path |
|---|---|---|---|
| Render (API) | Free web service | Instance sleeps after ~15 min idle → **30–50s cold start** on first request | Paid plan (~$7/mo) keeps it always-on |
| MongoDB Atlas | M0, **512 MB** | Storage cap; shared performance; **no automatic backups** (see Data safety — this is a launch blocker, not just a caveat) | M2/M10 raises storage + gives automated backups + point-in-time recovery |
| Cloudinary | Free tier | Monthly **bandwidth/storage limits** on images, **shared across all farmers** | Paid plan lifts limits |
| Vercel/Netlify (admin) | Free | Fine for a low-traffic admin panel | Rarely needed |
| FCM | Free | No hard cost caveat for our volume | N/A |

**Cold-start handling (v1):** the farmer app shows a friendly "connecting…" state on the first request after idle instead of looking frozen. We may add a lightweight scheduled ping to reduce sleep, but the honest position is: v1 accepts the cold start; the paid Render upgrade removes it with no code change.

## REST API Endpoint List

All paths are prefixed `/api`. All responses are JSON. Auth roles: **Public** (no token), **Farmer** (farmer JWT, own data only), **Admin** (admin/superadmin JWT).

> **Global ownership rule for every `:id` endpoint (Farmer role).** Any endpoint that takes a document `_id` in the path (`/plots/:id`, `/crop-cycles/:id`, `/transactions/:id`, `/reports/crop-cycle/:id`) must (1) load the document, then (2) assert `doc.farmerId === token.sub` **before** reading or writing it. If the document does not exist **or** belongs to another farmer, the API returns **404 Not Found** (never 403, so the response does not confirm that someone else's id exists). This blocks the IDOR attack where farmer A guesses or increments an ObjectId to reach farmer B's data. See the Security section for the mandatory test.

### Auth
| Method | Path | Purpose | Role |
|---|---|---|---|
| POST | /auth/farmer/register | Register farmer (phone + password) + record DPDP consent → starts trial. **Rate-limited + bot check** | Public |
| POST | /auth/farmer/login | Farmer login with phone + password → access + refresh token | Public |
| POST | /auth/admin/login | Admin login with email + password | Public |
| POST | /auth/refresh | Exchange (and rotate) refresh token for a new access token | Public (valid refresh token) |
| POST | /auth/logout | Invalidate the current refresh token server-side | Farmer/Admin |
| POST | /auth/farmer/forgot-password | Start password reset (see Auth Design for the v1 flow) | Public |
| POST | /auth/farmer/reset-password | Complete password reset with a one-time token | Public (valid reset token) |

### Farmers / profile
| Method | Path | Purpose | Role |
|---|---|---|---|
| GET | /me | Get own profile + subscription status | Farmer |
| PATCH | /me | Update own profile (name, village, language) | Farmer |
| DELETE | /me | Request account + data deletion (DPDP) — sets `deletionRequestedAt`, starts the deletion pipeline | Farmer |

### Plots
| Method | Path | Purpose | Role |
|---|---|---|---|
| GET | /plots | List own plots | Farmer |
| POST | /plots | Create plot; server computes `normalizedAcres` from unit + state | Farmer |
| PATCH | /plots/:id | Update a plot (ownership-checked) | Farmer |
| DELETE | /plots/:id | Delete a plot (ownership-checked) | Farmer |

### Crop cycles
| Method | Path | Purpose | Role |
|---|---|---|---|
| GET | /crop-cycles | List own crop cycles (filter by season/year/status) | Farmer |
| POST | /crop-cycles | Start a crop cycle (crop + season + year + area) | Farmer |
| PATCH | /crop-cycles/:id | Update or close a crop cycle (ownership-checked) | Farmer |
| GET | /crop-cycles/:id | Get one crop cycle with its totals (ownership-checked) | Farmer |

### Transactions (core ledger)
| Method | Path | Purpose | Role |
|---|---|---|---|
| GET | /transactions | List own transactions (filter by cropCycle, type, date) | Farmer |
| POST | /transactions | Add expense/income entry (blocked in grace mode) | Farmer |
| PATCH | /transactions/:id | Edit an entry (ownership-checked) | Farmer |
| DELETE | /transactions/:id | Delete an entry (ownership-checked) | Farmer |
| POST | /uploads/receipt-signature | Get signed Cloudinary upload params for a receipt (image-only, size-capped, quota-checked) | Farmer |

**Receipt photo flow (Cloudinary):** the app calls `POST /uploads/receipt-signature`; the API returns short-lived signed upload params (never the API secret). The app uploads the image **directly** to Cloudinary and gets back a secure URL. The app then saves the transaction with that `photoUrl`. This keeps large image bytes off our Render instance and out of MongoDB.

The signature the API returns is **not** a blank cheque. The server pins these constraints into the signed params so Cloudinary rejects anything outside them:

- `allowed_formats`: `jpg,jpeg,png,webp` only (no PDFs, no arbitrary files).
- `resource_type`: `image` (blocks video/raw uploads).
- Max file size: **5 MB** (`max_file_size` / `max_bytes`).
- Fixed `folder` (e.g. `receipts/<farmerId>/`) and an eager transformation that downscales to a sane max dimension, so we never store a 40-megapixel original.
- One photo per transaction is enforced server-side (the transaction schema holds a single `photoUrl`).

The server also enforces a **per-farmer daily upload quota** (e.g. N receipts/day) before issuing a signature, so a single account cannot burn the shared Cloudinary free-tier bandwidth/storage for the whole product.

### Reports
| Method | Path | Purpose | Role |
|---|---|---|---|
| GET | /reports/monthly | Monthly income/expense/profit summary | Farmer |
| GET | /reports/yearly | Yearly summary | Farmer |
| GET | /reports/crop-cycle/:id | Per-crop-cycle P/L: cash + optional true-cost + per-acre (ownership-checked) | Farmer |
| GET | /reports/expense-breakdown | Expense split by category | Farmer |
| GET | /reports/income-breakdown | Income split by category | Farmer |
| GET | /reports/crop-ranking | "Which crop earned most per acre" | Farmer |

*PDF and WhatsApp sharing are done on-device (render + OS share sheet); no server endpoint needed.*

### Subscription (farmer-facing)
| Method | Path | Purpose | Role |
|---|---|---|---|
| GET | /subscription | Own subscription status, trial/period dates, days left | Farmer |

### Admin
| Method | Path | Purpose | Role |
|---|---|---|---|
| GET | /admin/farmers | List/search farmers | Admin |
| GET | /admin/farmers/:id | View one farmer's records & reports | Admin |
| PATCH | /admin/farmers/:id | Activate / suspend a farmer | Admin |
| POST | /admin/farmers/:id/reset-password | Admin-assisted password reset (issues a one-time reset token / temp password) | Admin |
| DELETE | /admin/farmers/:id | Action a DPDP deletion request (run the deletion pipeline) | Admin |
| POST | /admin/subscriptions/:farmerId/activate | Activate a paid month | Admin |
| PATCH | /admin/subscriptions/:farmerId | Adjust status (grace/expired/suspend) | Admin |
| POST | /admin/payments | Record a manual cash/UPI payment | Admin |
| GET | /admin/payments | List/filter payments | Admin |
| GET/POST/PATCH | /admin/crops | Manage crop catalog master data | Admin |
| GET/POST/PATCH | /admin/expense-categories | Manage expense categories | Admin |
| GET/POST/PATCH | /admin/income-categories | Manage income categories | Admin |
| POST | /admin/announcements | Create + push an announcement (FCM) | Admin |
| GET | /admin/announcements | List past announcements | Admin |
| GET | /admin/dashboard | Payments & revenue dashboard metrics | Admin |
| GET/PATCH | /admin/config | Read/update appConfig (trial days, price, conversions) | Superadmin |

## Auth Design

- **Farmer login:** phone number + password. (OTP is a later option; the phone field is already the unique identity, so adding OTP does not change the model.)
- **Admin login:** email + password.
- **Passwords:** hashed with **bcrypt** (never stored in plain text). Only `passwordHash` is saved.
- **Password policy (v1):** minimum 8 characters. The register and reset endpoints reject anything shorter. Keep the rule simple — the audience is low-literacy users, so we favour length over forced symbols.
- **Tokens:** JWT with two tokens.
  - **Access token** — short life (e.g. 15 min), sent on every request as `Authorization: Bearer <token>`. Carries `sub` (user id), `role`, and `tokenVersion`.
  - **Refresh token** — long life (e.g. 30 days), used only at `/auth/refresh` to get a new access token.
- **Refresh tokens are server-side and stored (DECIDED, not open).** Each refresh token is kept in a small `refreshTokens` collection (id, farmerId/adminId, hash, issuedAt, expiresAt, revokedAt). This makes revocation real:
  - **Logout** revokes the current refresh token immediately.
  - **Refresh rotation:** every call to `/auth/refresh` revokes the old token and issues a new one. A reused (already-revoked) token is treated as theft → revoke the whole chain.
  - **Suspend / delete** revokes all of that user's refresh tokens.
- **Killing already-issued access tokens.** A refresh-token store alone cannot stop an access token that is already in someone's hands (it stays valid until it expires, up to ~15 min). Two mechanisms close this:
  - **`tokenVersion` claim.** The farmer/admin record holds a `tokenVersion` integer. Suspend, delete, and password-reset **bump** it. Every request compares the token's `tokenVersion` to the stored one; a mismatch is rejected, hard-killing all outstanding access tokens instantly.
  - **Per-request status re-check.** On every authenticated request the middleware already loads the user by `sub`; it also checks the farmer is `active` (not suspended, not deletion-pending) and, for write endpoints, that the subscription is not expired/grace-blocked. So a suspend or delete takes effect on the **next request**, not after a 15-minute wait.
- **Password reset flow (v1, no OTP).** The Login screen's "Forgot password" now leads somewhere concrete. Two supported paths:
  1. **Admin-assisted reset (default):** the farmer contacts the owner; the admin calls `POST /admin/farmers/:id/reset-password`, which issues a one-time temporary password (shared with the farmer offline) and forces a change on next login.
  2. **Self-service one-time link (if SMS budget allows):** `POST /auth/farmer/forgot-password` sends a one-time, short-lived reset token by SMS to the registered phone; `POST /auth/farmer/reset-password` consumes it. Reset always bumps `tokenVersion` and revokes existing refresh tokens.
  > **Open question:** which reset path is primary for launch (admin-assisted vs. SMS link) depends on whether an SMS provider is in budget for v1. Admin-assisted works with zero extra cost and is the safe default.
- **Role in the token** decides which endpoints are allowed. A farmer token can never reach `/admin/*`.

## Security & Privacy

**Role-based access control.** Every request is checked twice: (1) is the token valid (signature, expiry, and `tokenVersion` match), (2) does this role own this data. A farmer can only read/write rows where `farmerId` matches their own id — enforced server-side, not trusted from the client. Admin routes require an admin/superadmin role; `/admin/config` requires superadmin.

**Object-level ownership (mandatory, tested).** Restated from the endpoint list because it is the single most important isolation rule: **every** endpoint that takes a document `_id` in the path must load the document and assert `doc.farmerId === token.sub` before acting, returning **404** otherwise. This applies to `/plots/:id`, `/crop-cycles/:id`, `/transactions/:id`, and `/reports/crop-cycle/:id`.

- **Acceptance criterion:** with farmer A's token, any attempt to GET/PATCH/DELETE a plot, crop cycle, transaction, or crop-cycle report that belongs to farmer B returns **404** and performs no read or write.
- **Automated test (required in CI):** create two farmers with data, then assert that A's token receives 404 (not 200, not 403) on B's `/transactions/:id`, `/plots/:id`, `/crop-cycles/:id`, and `/reports/crop-cycle/:id`. This test must pass before release; it is the guard against IDOR.

**Input validation.** All request bodies are validated (types, required fields, number ranges, allowed enum values like season and unit) before touching the database. Reject early with a clear error. The upload-signature endpoint is validated too: it checks the per-farmer daily quota and only signs image params within the pinned format/size/folder constraints described above.

**Rate limiting and account security.** The user base is Indian mobile users behind **carrier-grade NAT**, where thousands of farmers can share one egress IP. So we do **not** rely on hard per-IP blocks (they would lock out many real users at once). Instead:

- **Per-account graduated backoff, not lockout.** Login attempts are throttled per phone number with an increasing delay (slow down, do not hard-lock). This defeats brute force without letting an attacker deliberately lock out or enumerate a specific farmer by hammering their phone number.
- **Generic responses.** Login always returns a generic "wrong phone or password" (never "no such phone"), so an attacker cannot use the login endpoint to discover which phone numbers are registered.
- **Register is rate-limited + bot-checked.** `POST /auth/farmer/register` has its own limiter plus a lightweight bot check (e.g. a simple challenge/attestation). This is important because the instant-trial signup model tolerates junk signups, and unchecked automated flooding could fill the 512 MB M0 tier.
- **General API limits** protect the free Render instance from abuse, tuned to be generous enough for shared-IP legitimate traffic.

**Transport.** HTTPS everywhere (Render, Vercel, Cloudinary, Atlas all use TLS). No plain HTTP.

**DPDP Act 2023 compliance (India):**
- **Consent at signup** — the farmer gives clear consent to store their data during registration; consent time is recorded.
- **Minimal PII** — we collect only what the product needs: name, phone, village, state, district. No Aadhaar, no bank details, no location tracking.
- **Right to deletion (concrete pipeline).** `DELETE /me` does not wipe data on the spot; it starts a defined pipeline so financial-retention duties and DPDP both hold:
  - **Schema support.** The `farmers` document carries `deletionRequestedAt` (timestamp) and a `status` value of `deletion_pending`, then `deleted`. This lets the per-request status check block the account immediately (see Auth Design) while the wipe is completed.
  - **SLA.** Deletion is completed **within 30 days** of the request (admin actions it via `DELETE /admin/farmers/:id`).
  - **Hard-deleted (PII, unrecoverable):** name, phone, village, district, state, `passwordHash`, all `transactions` and their notes, `plots`, `cropCycles`, Cloudinary receipt images (deleted from Cloudinary, not just dereferenced), and FCM device tokens.
  - **Retained in anonymized form (lawful basis: financial/tax record-keeping):** `payments` and `subscriptions` rows keep amount, date, method, and period, but `farmerId` is replaced by an **opaque revenue key** (a random id that cannot be traced back to a person). This preserves the owner's revenue dashboard and audit trail without keeping PII. Retention period for these anonymized financial records: **8 years** (aligned with Indian bookkeeping norms), after which they are purged.
  - Because the identifiers are anonymized rather than the rows deleted, deletion never orphans a payment or breaks the revenue dashboard.
- **Purpose limit** — data is used only for the farmer's own bookkeeping and their subscription; it is not sold or shared.

## i18n Readiness

- **v1 is English-only**, but **no UI text is hardcoded**. All strings live in resource files (e.g. `en.json`) and are looked up by key.
- Adding Hindi, Marathi, or other languages later is a matter of adding a new resource file — no screen rewrite.
- `farmers.preferredLanguage` (default `en`) is stored so a farmer's language choice can drive the app and future localized pushes.
- Layouts are built to **flex** — regional strings are often longer than English, so screens must not break or clip when text grows.

## Online-First Now, Offline-Later Seam

v1 is **online-first**: entries are saved straight to the API. To make offline sync a later *add-on* and not a rewrite, we design the seam now:

- **Stable, idempotent write endpoints.** Each transaction can carry a client-generated `clientId` (a UUID). Re-sending the same `clientId` must not create a duplicate. This lets a future offline queue replay safely.
- **Local queue (later).** The app will keep an on-device queue of unsent entries; when the network returns, it flushes them to the same `POST /transactions` endpoint.
- **Sync endpoint (later).** A `POST /sync` (batch) endpoint can be added to accept many queued entries at once and return per-item results — without changing the single-entry API that already exists.
- **Timestamps from the client.** The entry `date` and `createdAt` come from the client, so an entry logged offline keeps its true time when it later syncs.

Because writes are already keyed and idempotent, offline support is an additive feature, not a redesign.

## Non-Functional Requirements

- **Performance on low-end devices.** Small JSON payloads, server-side pagination on lists (transactions, farmers), lazy loading of images, and charts rendered from small aggregated numbers — not raw row dumps. Reports are computed server-side so the phone does little work.
- **Availability.** Single free Render instance in v1; acceptable for early users, with the honest cold-start caveat above. The paid upgrade path is a config change, not a code change.
- **Data safety (LAUNCH BLOCKER, not just a caveat).** Atlas holds the single source of truth, and the whole product's value is the farmer's financial history — data the farmer cannot re-derive. The M0 free tier has **no automatic backups**, so before any real farmer data is stored we must put a concrete backup job in place:
  - **Backup cadence & method:** an **automated daily `mongodump`** to durable object storage (e.g. a scheduled GitHub Action / cron job writing to S3-compatible storage), **or** move to a low-cost paid Atlas tier that provides continuous backups + point-in-time recovery. Manual "export when I remember" is not acceptable.
  - **Retention:** keep at least the last 30 daily snapshots.
  - **Restore procedure:** a documented, step-by-step restore-into-a-fresh-cluster runbook.
  - **Verification:** a periodic **restore test** (e.g. monthly) that actually restores a snapshot and confirms row counts — a backup that has never been restored is not a backup.
  - **Owner:** a single named person is accountable for the backup job running and for the restore tests. Treat a broken backup job as a P1 incident.
  - This matters even more because expired/suspended farmers' data is explicitly **retained, not deleted**, so a dropped cluster or bad migration would lose ledgers we have promised to keep.
- **Scalability seam.** Indexed queries on `farmerId`, `cropCycleId`, and `date` keep reports fast as data grows within the 512 MB limit.

### Open questions

- **Password-reset primary path.** Admin-assisted reset (zero cost, works today) vs. an SMS one-time link (needs an SMS provider in budget). Decide before launch; admin-assisted is the safe default and both endpoints are already specified.
- **Anonymized-retention window fine-tuning.** The deletion pipeline retains anonymized financial records for 8 years (Indian bookkeeping norm). Confirm the exact retention period with the owner's accountant before launch; the schema (opaque revenue key) does not change either way.

*Note on previously-open items now decided in this doc: the refresh-token store is now specified (server-side collection with rotation), and the deletion-vs-retention rule is now concretely defined above — both are no longer open.*