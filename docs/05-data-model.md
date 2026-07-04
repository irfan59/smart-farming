# Data Model (MongoDB)

*Part of the Smart Farming product specification - see [README](README.md) for the full index.*

## Data Model (MongoDB)

This section defines every MongoDB collection for Smart Farming. Field types use Mongoose-style terms (`ObjectId`, `String`, `Number`, `Date`, `Boolean`). All money is stored in whole Indian rupees (INR) as `Number`. All timestamps are stored in UTC (`Date`) and formatted in the app.

Two rules apply to every collection:
1. **Ownership scoping:** every farmer-owned document carries `farmerId`. The API always filters by the logged-in farmer's id, so no farmer can read another farmer's data.
2. **Denormalization:** we copy some display names (like `categoryName`, `cropName`) into child documents. This is explained at the end.

### Enums (used across collections)

| Enum | Allowed values |
|---|---|
| `subscriptions.status` | `trial`, `active`, `grace`, `expired`, `suspended` |
| `farmers.status` | `active`, `suspended` |
| `transactions.type` | `expense`, `income` |
| `cropCycles.season` | `kharif`, `rabi`, `zaid`, `perennial` |
| `cropCycles.status` | `active`, `closed` |
| `payments.method` | `cash`, `upi`, `other` |
| `admins.role` | `admin`, `superadmin` |
| `expenseCategories.cacpTag` | `A1`, `A2`, `FL`, `C2` |

---

### farmers

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | yes | Primary key |
| `name` | String | yes | Farmer full name |
| `phone` | String | yes | 10-digit mobile, login id, **unique** |
| `village` | String | yes | Village name — **required** (the manual collection/renewal model depends on locating farmers by locality) |
| `state` | String | yes | Indian state (drives bigha conversion) |
| `district` | String | yes | District name — **required** (admin search/filtering by locality) |
| `preferredLanguage` | String | yes | Default `en` |
| `passwordHash` | String | yes | bcrypt hash (never returned by API) |
| `consentGiven` | Boolean | yes | DPDP consent captured at signup (must be `true` to register) |
| `consentAt` | Date | yes | Timestamp when consent was given (audit evidence) |
| `consentVersion` | String | yes | Privacy-notice version the farmer agreed to (e.g. `"2025-11-v1"`) |
| `consentPurpose` | String | yes | Stated purpose the consent covers (e.g. `"farm bookkeeping & reports"`) |
| `status` | String | yes | `active` / `suspended` |
| `createdAt` | Date | yes | Signup time |

**Relationships:** one farmer has one `subscription`, many `plots`, `cropCycles`, `transactions`, and `payments`.
**Indexes:** `{ phone: 1 }` **unique**; `{ state: 1 }` and `{ village: 1 }` (admin filtering/search by locality).

**DPDP consent (why these fields exist):** the Digital Personal Data Protection (DPDP) Act 2023 requires the data fiduciary (RK Websoft) to *demonstrate* that valid consent was obtained for a stated purpose. Consent that is not persisted is not auditable, cannot be shown to a regulator, cannot be tied to a policy version, and cannot support withdrawal. So `consentGiven`, `consentAt`, `consentVersion`, and `consentPurpose` are written **atomically** inside `POST /auth/farmer/register` (see file 07) — registration fails if consent is not `true`. Storing `consentVersion` also means that when the privacy notice changes, the app can detect an outdated version and force **re-consent** on next login. (If preferred, the same four fields can live in a small dedicated `consents` collection keyed by `farmerId` with one row per consent event; for v1 we keep them on the `farmers` document for simplicity.)

### admins

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | yes | Primary key |
| `name` | String | yes | Admin name |
| `email` | String | yes | Login id, **unique** |
| `passwordHash` | String | yes | bcrypt hash |
| `role` | String | yes | `admin` / `superadmin` |

**Indexes:** `{ email: 1 }` **unique**.

### subscriptions

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | yes | Primary key |
| `farmerId` | ObjectId | yes | Ref → farmers, **one per farmer** |
| `status` | String | yes | See enum |
| `plan` | String | yes | `monthly` in v1 |
| `trialStartedAt` | Date | yes | Set at signup (instant trial) |
| `trialEndsAt` | Date | yes | `trialStartedAt + trialDays` |
| `currentPeriodStart` | Date | no | Start of paid month |
| `currentPeriodEnd` | Date | no | End of paid month |
| `activatedByAdminId` | ObjectId | no | Ref → admins (who activated) |
| `notes` | String | no | Free text |

**Indexes:** `{ farmerId: 1 }` **unique**; `{ status: 1, trialEndsAt: 1 }` and `{ status: 1, currentPeriodEnd: 1 }` (these support the on-request, time-based status checks described in doc 03 that move trials/paid months into `grace`/`expired`; if a periodic sweep is ever added later it can reuse them).

### payments

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | yes | Primary key |
| `farmerId` | ObjectId | yes | Ref → farmers |
| `amount` | Number | yes | Rupees received (e.g. `99`) |
| `currency` | String | yes | `INR` |
| `method` | String | yes | `cash` / `upi` / `other` |
| `receivedAt` | Date | yes | When money was received |
| `recordedByAdminId` | ObjectId | yes | Ref → admins |
| `periodStart` | Date | yes | Paid month start |
| `periodEnd` | Date | yes | Paid month end |
| `note` | String | no | e.g. "UPI ref 4432" |

**Indexes:** `{ farmerId: 1, receivedAt: -1 }` (payment history); `{ receivedAt: -1 }` (revenue dashboard).

### plots

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | yes | Primary key |
| `farmerId` | ObjectId | yes | Ref → farmers |
| `name` | String | yes | e.g. "North field" |
| `area.value` | Number | yes | As the farmer entered it |
| `area.unit` | String | yes | `acre` / `hectare` / `guntha` / `cent` / `bigha` |
| `area.normalizedAcres` | Number | yes | **Computed on write** (see below) |
| `state` | String | yes | Used for bigha conversion |
| `createdAt` | Date | yes | Creation time |

**Indexes:** `{ farmerId: 1 }`.

### cropCatalog (master, admin-managed)

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | yes | Primary key |
| `name` | String | yes | e.g. "Wheat", "Paddy", "Cotton" |
| `defaultSeason` | String | no | Suggested season |
| `icon` | String | no | Icon key |
| `isActive` | Boolean | yes | Hidden when `false` |

### cropCycles

The crop cycle is **the primary unit of profit analysis**.

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | yes | Primary key |
| `farmerId` | ObjectId | yes | Ref → farmers |
| `plotId` | ObjectId | yes | Ref → plots |
| `cropId` | ObjectId | yes | Ref → cropCatalog |
| `cropName` | String | yes | **Denormalized** from cropCatalog |
| `season` | String | yes | `kharif` / `rabi` / `zaid` / `perennial` |
| `year` | String | yes | e.g. `"2025-26"` |
| `areaUsed.value` | Number | yes | Area planted for this cycle |
| `areaUsed.unit` | String | yes | Land unit |
| `areaUsed.normalizedAcres` | Number | yes | **Computed on write**; basis of per-acre reports |
| `sowingDate` | Date | no | Sowing date |
| `harvestDate` | Date | no | Harvest date |
| `status` | String | yes | `active` / `closed` |

**Indexes:** `{ farmerId: 1, season: 1, year: 1 }`; `{ farmerId: 1, status: 1 }`.

### expenseCategories (master, admin-managed)

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | yes | Primary key |
| `name` | String | yes | e.g. "Seeds", "Family labour" |
| `icon` | String | no | Icon key |
| `isPaidOut` | Boolean | yes | Counts in CASH profit when `true` |
| `isImputed` | Boolean | yes | True-cost only (e.g. family labour) |
| `cacpTag` | String | yes | `A1` / `A2` / `FL` / `C2` grouping |
| `isActive` | Boolean | yes | Hidden when `false` |

### incomeCategories (master, admin-managed)

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | yes | Primary key |
| `name` | String | yes | e.g. "Main crop sale" |
| `icon` | String | no | Icon key |
| `type` | String | no | Grouping tag for reports |
| `isActive` | Boolean | yes | Hidden when `false` |

### transactions (the core ledger)

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | yes | Primary key |
| `farmerId` | ObjectId | yes | Ref → farmers |
| `cropCycleId` | ObjectId | no | Ref → cropCycles; **null = general/farm-level** |
| `type` | String | yes | `expense` / `income` |
| `categoryId` | ObjectId | yes | Ref → expense/income category |
| `categoryName` | String | yes | **Denormalized** from category |
| `amount` | Number | yes | Rupees |
| `date` | Date | yes | Transaction date |
| `quantity` | Number | no | e.g. `2` |
| `unit` | String | no | e.g. `bag`, `kg`, `day` |
| `rate` | Number | no | Price per unit |
| `note` | String | no | Free text |
| `photoPublicId` | String | no | Cloudinary `public_id` of the receipt image (unguessable). The API stores this, **not** a public URL. |
| `isImputed` | Boolean | yes | `true` for true-cost items |
| `createdAt` | Date | yes | Entry time |

**Indexes:** `{ farmerId: 1, date: -1 }` (monthly/yearly reports); `{ cropCycleId: 1 }` (per-crop profit); `{ farmerId: 1, type: 1, categoryId: 1 }` (category breakdown).

**Receipt photos are private (DPDP-relevant PII).** A receipt can show the farmer's name, amounts, phone numbers, and UPI/bank references, so it must not be world-readable. Default Cloudinary delivery URLs are **public** — anyone with the link (and often anyone who guesses a `public_id`) can view the image, which would sit *outside* the API's per-farmer scoping. So:
- Store only the **`photoPublicId`** in the DB, never a public delivery URL.
- Upload receipts as **authenticated/private** assets (Cloudinary `type=authenticate` / `private`) using **unguessable** `public_id`s.
- The API mints a **short-lived signed view URL** per request, *after* it has checked that the requesting farmer owns the transaction. The signed URL expires quickly, so a leaked link cannot be reused.
- On **transaction delete** and on **account deletion (`DELETE /me`)**, the API must also delete the underlying image from Cloudinary (by `public_id`) — not just remove the DB row.

### announcements

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | yes | Primary key |
| `title` | String | yes | Push title |
| `body` | String | yes | Push body |
| `audience` | String | yes | `all` / `segment` |
| `createdByAdminId` | ObjectId | yes | Ref → admins |
| `createdAt` | Date | yes | Creation time |
| `pushSent` | Boolean | yes | Whether FCM push fired |

### appConfig (single document)

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | yes | Primary key |
| `trialDays` | Number | yes | e.g. `14` |
| `monthlyPriceINR` | Number | yes | e.g. `99` |
| `landUnitConversions` | Object | yes | Table keyed by `(unit, state)` → sq ft / acres |
| `defaultCategories` | Object | no | Seed lists for new installs |

---

### Sample documents

**A farmer**
```json
{
  "_id": "6650a1f2c3d4e5f601000001",
  "name": "Ramesh Patil",
  "phone": "9876543210",
  "village": "Shirur",
  "state": "Maharashtra",
  "district": "Pune",
  "preferredLanguage": "en",
  "passwordHash": "$2b$10$K1x...redacted...9uQ",
  "consentGiven": true,
  "consentAt": "2025-11-02T05:30:00.000Z",
  "consentVersion": "2025-11-v1",
  "consentPurpose": "farm bookkeeping & reports",
  "status": "active",
  "createdAt": "2025-11-02T05:30:00.000Z"
}
```

**A crop cycle — "Wheat, Rabi 2025-26"** (area entered in guntha, normalized to acres on write)
```json
{
  "_id": "6650a1f2c3d4e5f601000010",
  "farmerId": "6650a1f2c3d4e5f601000001",
  "plotId": "6650a1f2c3d4e5f601000005",
  "cropId": "6650a1f2c3d4e5f601000031",
  "cropName": "Wheat",
  "season": "rabi",
  "year": "2025-26",
  "areaUsed": { "value": 80, "unit": "guntha", "normalizedAcres": 2.0 },
  "sowingDate": "2025-11-15T00:00:00.000Z",
  "harvestDate": "2026-03-20T00:00:00.000Z",
  "status": "active"
}
```
*(In Maharashtra 40 guntha = 1 acre, so 80 guntha = 2.0 acres.)*

**An expense transaction with a receipt photo** (2 bags of fertilizer at Rs 1,350)
```json
{
  "_id": "6650a1f2c3d4e5f601000020",
  "farmerId": "6650a1f2c3d4e5f601000001",
  "cropCycleId": "6650a1f2c3d4e5f601000010",
  "type": "expense",
  "categoryId": "6650a1f2c3d4e5f601000042",
  "categoryName": "Fertilizer",
  "amount": 2700,
  "date": "2025-11-18T00:00:00.000Z",
  "quantity": 2,
  "unit": "bag",
  "rate": 1350,
  "note": "Urea, 50kg bags",
  "photoPublicId": "receipts/6650a1f2c3d4e5f601000001/9f3b7c2e1a8d4f60",
  "isImputed": false,
  "createdAt": "2025-11-18T09:12:00.000Z"
}
```
*(The client never receives a raw Cloudinary link. When it needs to show this receipt, it asks the API, which verifies ownership and returns a short-lived signed view URL derived from `photoPublicId`.)*

**An income transaction** (main crop sale — wheat produce)
```json
{
  "_id": "6650a1f2c3d4e5f601000021",
  "farmerId": "6650a1f2c3d4e5f601000001",
  "cropCycleId": "6650a1f2c3d4e5f601000010",
  "type": "income",
  "categoryId": "6650a1f2c3d4e5f601000051",
  "categoryName": "Main crop sale",
  "amount": 48000,
  "date": "2026-03-25T00:00:00.000Z",
  "quantity": 16,
  "unit": "quintal",
  "rate": 3000,
  "note": "Sold at local mandi",
  "photoPublicId": null,
  "isImputed": false,
  "createdAt": "2026-03-25T18:40:00.000Z"
}
```

---

### Denormalization choices (and why)

We copy a few display fields into child documents on purpose:

- **`transactions.categoryName`** copied from the category, and **`cropCycles.cropName`** copied from `cropCatalog`. Reports list hundreds of transactions. Without the copy, every list and report would need a `$lookup` join (or many extra queries) just to show a label. On MongoDB Atlas M0 (free, 512 MB, shared CPU) fewer joins means faster reports and lower load. The `categoryId` / `cropId` reference is still stored, so data stays linked.
- **Trade-off:** if an admin later renames a master category (e.g. "Fertilizer" → "Fertiliser"), old transactions keep the old label. This is acceptable and even desirable — a ledger should show the name as it was at entry time. If a global rename is ever needed, a one-time background update script can refresh the denormalized copies.

### normalizedAcres is computed on write

`area.normalizedAcres` (on `plots`) and `areaUsed.normalizedAcres` (on `cropCycles`) are **never entered by the farmer**. When a plot or crop cycle is saved, the API reads `{ value, unit }` plus the farmer's `state`, looks up `appConfig.landUnitConversions` keyed by `(unit, state)`, converts to acres, and stores the result. This matters most for **bigha**, which varies by state (~14,400 sq ft in West Bengal vs ~27,000 sq ft in West UP vs ~9,070 sq ft in Punjab/Haryana). The farmer can confirm or override the converted value. Because all per-acre reports divide by `normalizedAcres`, computing it once on write keeps every report fast and consistent, and avoids re-running conversions at read time.