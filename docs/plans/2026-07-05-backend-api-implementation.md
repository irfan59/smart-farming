# Smart Farming — Backend API Implementation Plan (Part 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete v1 REST API that powers both the farmer mobile app and the web admin — auth with admin-approve-before-login, the crop/expense/income data model, the cash-vs-true profit engine, reports, the manual subscription lifecycle, and admin management — on free-tier hosting.

**Architecture:** A single Node.js + Express service talking to MongoDB Atlas. All business rules, validation, and access checks live here; clients hold only a JWT. Receipt images go directly to Cloudinary via signed uploads (bytes never touch this server). Push goes through Firebase Cloud Messaging. Subscription state transitions are evaluated lazily on each request (no cron — the free Render tier sleeps). No record is ever hard-deleted (deactivate/void only).

**Tech Stack:** Node.js 20 LTS, Express 4, Mongoose 8 (MongoDB Atlas M0), JavaScript (CommonJS), Jest + Supertest + mongodb-memory-server for tests, bcrypt, jsonwebtoken, zod (validation), helmet, express-rate-limit, cloudinary, firebase-admin, pino (logging). Hosted on Render (free web service); backups via a scheduled GitHub Action running `mongodump`.

> **Source of truth:** every rule here is grounded in the specs in `../` — especially [05-data-model](../05-data-model.md), [06-cost-and-profit-engine](../06-cost-and-profit-engine.md), [07-architecture-api-and-security](../07-architecture-api-and-security.md), and [03-user-flows-and-lifecycle](../03-user-flows-and-lifecycle.md). When this plan and a spec disagree, stop and reconcile before coding.

---

## Conventions used in this plan

- **Language:** JavaScript (CommonJS `require`), Node 20. (If the team prefers TypeScript, the structure is identical; add `ts-jest` and types — but v1 ships JS to keep tooling minimal.)
- **Test-first:** every task writes a failing test, runs it (red), implements, runs it (green), commits.
- **Test runner:** `npm test` runs Jest. API tests use Supertest against the Express `app` (not a live server) with `mongodb-memory-server` for an in-process Mongo.
- **Money:** all amounts are integers in **paise** internally is NOT used — amounts are stored as rupee Numbers (e.g. `1500` = ₹1,500) exactly as doc 05 specifies (`amount: Number`). Keep it simple; no float cents.
- **IDs:** Mongo `ObjectId`. In JSON, serialize `_id` as `id` string.
- **Commit style:** Conventional Commits (`feat:`, `test:`, `chore:`, `fix:`).

---

## File structure (created across this plan)

```
backend/
  package.json
  .env.example              # documented env vars (never commit real .env)
  .eslintrc.json
  jest.config.js
  src/
    app.js                  # builds & returns the Express app (no listen) — testable
    server.js               # imports app, connects DB, listens (entrypoint)
    config/
      env.js                # loads + validates process.env with zod
      db.js                 # mongoose connect/disconnect
    models/
      index.js              # exports all models
      farmer.model.js
      admin.model.js
      subscription.model.js
      payment.model.js
      refreshToken.model.js
      plot.model.js
      cropCatalog.model.js
      cropCycle.model.js
      expenseCategory.model.js
      incomeCategory.model.js
      transaction.model.js
      announcement.model.js
      appConfig.model.js
    middleware/
      auth.js               # requireAuth (verify JWT, load user, status checks)
      requireRole.js        # requireFarmer / requireAdmin / requireSuperadmin
      loadOwned.js          # object-level ownership guard (anti-IDOR)
      validate.js           # zod body/params validation
      error.js              # central error handler + AppError
    lib/
      password.js           # bcrypt hash/compare
      tokens.js             # sign/verify access+refresh, rotation
      landUnits.js          # area -> normalizedAcres conversion
      costEngine.js         # cash profit, true profit, per-acre
      cloudinary.js         # signed upload params + signed view URL
      fcm.js                # push send wrapper
      subscription.js       # evaluateStatus (lazy state machine)
    routes/
      auth.routes.js
      me.routes.js
      plots.routes.js
      cropCycles.routes.js
      transactions.routes.js
      reports.routes.js
      uploads.routes.js
      admin.routes.js
    controllers/            # one file per route group (thin; call lib/models)
      ...
    scripts/
      seed.js               # seeds appConfig, master categories/crops, first admin
  tests/
    helpers/
      testApp.js            # boots app + in-memory mongo, factory helpers
    auth.test.js
    ownership.test.js       # the REQUIRED anti-IDOR CI test
    subscription.test.js
    landUnits.test.js
    costEngine.test.js
    transactions.test.js
    reports.test.js
    admin.test.js
.github/
  workflows/
    ci.yml                  # install, lint, test (must pass ownership.test.js)
    backup.yml              # scheduled daily mongodump to object storage
```

---

## Prerequisites (one-time, before Task 1)

- [ ] **Accounts (free tier):** MongoDB Atlas (create an M0 cluster + a DB user + IP allowlist `0.0.0.0/0` for dev), Cloudinary (get cloud name / API key / secret), Firebase project (create → Project settings → Service accounts → generate a private key JSON for FCM), Render (for later deploy).
- [ ] **Local tools:** Node 20 LTS + npm; Git; a MongoDB connection string for a dev database.
- [ ] Copy the Atlas connection string, Cloudinary keys, and the Firebase service-account JSON somewhere safe — they go into `.env` (Task 1), never into git.

---

## Milestone 0 — Project setup & test harness

### Task 0.1: Initialize the backend project

**Files:**
- Create: `backend/package.json`, `backend/.eslintrc.json`, `backend/jest.config.js`, `backend/.gitignore`, `backend/.env.example`

- [ ] **Step 1: Scaffold and install**

Run in `backend/`:
```bash
npm init -y
npm i express mongoose bcrypt jsonwebtoken zod helmet cors express-rate-limit pino pino-http cloudinary firebase-admin dayjs
npm i -D jest supertest mongodb-memory-server eslint nodemon cross-env
```

- [ ] **Step 2: Configure `package.json` scripts**

```json
{
  "name": "smart-farming-api",
  "version": "0.1.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "cross-env NODE_ENV=test jest --runInBand",
    "lint": "eslint src tests",
    "seed": "node src/scripts/seed.js"
  }
}
```

- [ ] **Step 3: `jest.config.js`**

```js
module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  setupFilesAfterEnv: [],
};
```

- [ ] **Step 4: `.gitignore` and `.env.example`**

`.gitignore`:
```
node_modules/
.env
coverage/
*.log
firebase-service-account.json
```

`.env.example` (documents every var; real values live in `.env`):
```
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb+srv://user:pass@cluster/smartfarming
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
ACCESS_TTL=15m
REFRESH_TTL=30d
CORS_ORIGINS=http://localhost:5173
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
FIREBASE_SERVICE_ACCOUNT_JSON=./firebase-service-account.json
```

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/.eslintrc.json backend/jest.config.js backend/.gitignore backend/.env.example
git commit -m "chore: scaffold backend project and tooling"
```

### Task 0.2: Env loader + config

**Files:**
- Create: `backend/src/config/env.js`
- Test: `backend/tests/env.test.js`

- [ ] **Step 1: Failing test**

```js
// tests/env.test.js
describe('env config', () => {
  it('throws when a required var is missing', () => {
    const prev = process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_ACCESS_SECRET;
    jest.resetModules();
    expect(() => require('../src/config/env')).toThrow(/JWT_ACCESS_SECRET/);
    process.env.JWT_ACCESS_SECRET = prev;
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`npm test -- env.test.js`) with "Cannot find module".

- [ ] **Step 3: Implement `src/config/env.js`**

```js
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1).optional(), // optional in test (in-memory)
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  ACCESS_TTL: z.string().default('15m'),
  REFRESH_TTL: z.string().default('30d'),
  CORS_ORIGINS: z.string().default(''),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
  throw new Error(`Invalid/missing environment variables: ${missing}`);
}
module.exports = parsed.data;
```

- [ ] **Step 4:** In `tests/setup`, set fake secrets before tests. Add to `jest.config.js` `setupFiles: ['<rootDir>/tests/env.setup.js']` and create `tests/env.setup.js`:

```js
process.env.JWT_ACCESS_SECRET = 'test-access';
process.env.JWT_REFRESH_SECRET = 'test-refresh';
process.env.NODE_ENV = 'test';
```

- [ ] **Step 5: Run — expect PASS. Commit** `test: add validated env config`.

### Task 0.3: DB connect + Express app skeleton + health check + test harness

**Files:**
- Create: `backend/src/config/db.js`, `backend/src/app.js`, `backend/src/server.js`, `backend/src/middleware/error.js`, `backend/tests/helpers/testApp.js`
- Test: `backend/tests/health.test.js`

- [ ] **Step 1: Failing test**

```js
// tests/health.test.js
const request = require('supertest');
const { makeApp } = require('./helpers/testApp');
let app;
beforeAll(async () => { app = await makeApp(); });
it('GET /api/health returns ok', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('ok');
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement error middleware `src/middleware/error.js`**

```js
class AppError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || 'error';
  }
}
function errorHandler(err, req, res, next) { // eslint-disable-line
  const status = err.status || 500;
  const body = { error: err.code || 'error', message: err.message || 'Server error' };
  if (status >= 500) req.log?.error({ err }, 'unhandled');
  res.status(status).json(body);
}
module.exports = { AppError, errorHandler };
```

- [ ] **Step 4: Implement `src/app.js`** (builds app, no listen)

```js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const env = require('./config/env');
const { errorHandler } = require('./middleware/error');

function buildApp() {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  const origins = env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : [];
  app.use(cors({ origin: origins.length ? origins : true, credentials: true }));
  if (env.NODE_ENV !== 'test') app.use(pinoHttp());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // route groups mounted here in later tasks:
  // app.use('/api/auth', require('./routes/auth.routes'));
  // ...

  app.use((req, res) => res.status(404).json({ error: 'not_found', message: 'Route not found' }));
  app.use(errorHandler);
  return app;
}
module.exports = { buildApp };
```

- [ ] **Step 5: Implement `src/config/db.js`**

```js
const mongoose = require('mongoose');
async function connectDb(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  return mongoose.connection;
}
async function disconnectDb() { await mongoose.disconnect(); }
module.exports = { connectDb, disconnectDb };
```

- [ ] **Step 6: Implement `src/server.js`**

```js
const env = require('./config/env');
const { buildApp } = require('./app');
const { connectDb } = require('./config/db');

(async () => {
  await connectDb(env.MONGODB_URI);
  const app = buildApp();
  app.listen(env.PORT, () => console.log(`API on :${env.PORT}`));
})();
```

- [ ] **Step 7: Implement `tests/helpers/testApp.js`** (in-memory Mongo + app + factories)

```js
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { buildApp } = require('../../src/app');

let mongo;
async function makeApp() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  return buildApp();
}
async function closeApp() {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}
async function resetDb() {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) await collections[key].deleteMany({});
}
module.exports = { makeApp, closeApp, resetDb };
```

- [ ] **Step 8:** Add `afterAll(async () => closeApp())` and `afterEach(async () => resetDb())` wiring to test files as they are created. Run — expect PASS. **Commit** `feat: express app skeleton, db connect, health check, test harness`.

### Task 0.4: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Implement CI**

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: backend } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: backend/package-lock.json }
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

- [ ] **Step 2: Commit** `ci: run lint and tests on push/PR`. (The anti-IDOR test in Task 2.4 runs here and must pass before release.)

---

## Milestone 1 — Data model (Mongoose) + seed

> Implements every collection, enum, and index from [05-data-model](../05-data-model.md). Enums are enforced at the schema level. Denormalized fields (`categoryName`, `cropName`) are set on write. `normalizedAcres` is computed on write (Task 4.1 provides the util). **Deactivate-only:** models carry soft-delete fields (`isVoid`, `isActive`, `deactivated` status) — nothing is ever removed.

### Task 1.1: Farmer, Admin, RefreshToken models

**Files:**
- Create: `src/models/farmer.model.js`, `src/models/admin.model.js`, `src/models/refreshToken.model.js`
- Test: `tests/models.test.js`

- [ ] **Step 1: Failing test**

```js
// tests/models.test.js
const { makeApp, closeApp, resetDb } = require('./helpers/testApp');
const { Farmer } = require('../src/models');
beforeAll(async () => { await makeApp(); });
afterAll(async () => { await closeApp(); });
afterEach(async () => { await resetDb(); });

it('farmer requires unique phone and defaults status active, tokenVersion 0', async () => {
  const f = await Farmer.create({ name: 'Ramesh', phone: '9990001111', state: 'Maharashtra', district: 'Wardha', village: 'X', passwordHash: 'h', consentGiven: true, consentAt: new Date(), consentVersion: '2026-01-v1', consentPurpose: 'bookkeeping' });
  expect(f.status).toBe('active');
  expect(f.tokenVersion).toBe(0);
  await expect(Farmer.create({ name: 'Dup', phone: '9990001111', state: 'MH', district: 'W', village: 'Y', passwordHash: 'h', consentGiven: true, consentAt: new Date(), consentVersion: 'v', consentPurpose: 'p' })).rejects.toThrow();
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement models.** `src/models/farmer.model.js`:

```js
const { Schema, model } = require('mongoose');
const farmerSchema = new Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  village: { type: String, required: true },
  state: { type: String, required: true },
  district: { type: String, required: true },
  preferredLanguage: { type: String, default: 'en' },
  passwordHash: { type: String, required: true },
  status: { type: String, enum: ['active', 'suspended', 'deactivated'], default: 'active', index: true },
  tokenVersion: { type: Number, default: 0 },
  fcmTokens: { type: [String], default: [] },
  deactivatedAt: { type: Date, default: null },
  // DPDP consent (doc 05/07)
  consentGiven: { type: Boolean, required: true },
  consentAt: { type: Date, required: true },
  consentVersion: { type: String, required: true },
  consentPurpose: { type: String, required: true },
}, { timestamps: true });
module.exports = model('Farmer', farmerSchema);
```

`src/models/admin.model.js`:
```js
const { Schema, model } = require('mongoose');
const adminSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
  tokenVersion: { type: Number, default: 0 },
}, { timestamps: true });
module.exports = model('Admin', adminSchema);
```

`src/models/refreshToken.model.js`:
```js
const { Schema, model, Types } = require('mongoose');
const refreshTokenSchema = new Schema({
  subjectId: { type: Types.ObjectId, required: true, index: true },
  subjectType: { type: String, enum: ['farmer', 'admin'], required: true },
  tokenHash: { type: String, required: true, index: true },
  issuedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });
module.exports = model('RefreshToken', refreshTokenSchema);
```

- [ ] **Step 4: Create `src/models/index.js`** exporting each model (add new ones as they're created):

```js
module.exports = {
  Farmer: require('./farmer.model'),
  Admin: require('./admin.model'),
  RefreshToken: require('./refreshToken.model'),
  // Subscription, Payment, Plot, CropCatalog, CropCycle, ExpenseCategory,
  // IncomeCategory, Transaction, Announcement, AppConfig added below.
};
```

- [ ] **Step 5: Run — expect PASS. Commit** `feat: farmer, admin, refreshToken models`.

### Task 1.2: Subscription, Payment models

**Files:** Create `src/models/subscription.model.js`, `src/models/payment.model.js`; extend `models/index.js`. Test: add a case to `models.test.js`.

- [ ] **Step 1: Failing test** — assert a subscription defaults to `pending_approval` and enforces the enum:

```js
const { Subscription } = require('../src/models');
it('subscription defaults to pending_approval', async () => {
  const s = await Subscription.create({ farmerId: new (require('mongoose').Types.ObjectId)(), plan: 'monthly' });
  expect(s.status).toBe('pending_approval');
});
```

- [ ] **Step 2: Run — FAIL. Step 3: Implement.**

`subscription.model.js` (enum + fields per doc 05, including approval fields):
```js
const { Schema, model, Types } = require('mongoose');
const subscriptionSchema = new Schema({
  farmerId: { type: Types.ObjectId, ref: 'Farmer', required: true, unique: true },
  status: { type: String, enum: ['pending_approval', 'trial', 'active', 'grace', 'expired', 'suspended'], default: 'pending_approval', index: true },
  plan: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  trialStartedAt: { type: Date, default: null },
  trialEndsAt: { type: Date, default: null },
  currentPeriodStart: { type: Date, default: null },
  currentPeriodEnd: { type: Date, default: null },
  activatedByAdminId: { type: Types.ObjectId, ref: 'Admin', default: null },
  approvedByAdminId: { type: Types.ObjectId, ref: 'Admin', default: null },
  approvedAt: { type: Date, default: null },
  notes: { type: String, default: '' },
}, { timestamps: true });
subscriptionSchema.index({ status: 1, trialEndsAt: 1 });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
module.exports = model('Subscription', subscriptionSchema);
```

`payment.model.js`:
```js
const { Schema, model, Types } = require('mongoose');
const paymentSchema = new Schema({
  farmerId: { type: Types.ObjectId, ref: 'Farmer', required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  method: { type: String, enum: ['cash', 'upi', 'other'], required: true },
  receivedAt: { type: Date, default: Date.now },
  recordedByAdminId: { type: Types.ObjectId, ref: 'Admin', required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  note: { type: String, default: '' },
}, { timestamps: true });
module.exports = model('Payment', paymentSchema);
```

- [ ] **Step 4: Run — PASS. Commit** `feat: subscription and payment models`.

### Task 1.3: Plot, CropCatalog, CropCycle models

**Files:** Create the three model files; extend `index.js`. Test: `models.test.js` case asserting `plot.isActive` defaults true and `cropCycle.status` enum includes `deactivated`.

- [ ] Implement `plot.model.js`:

```js
const { Schema, model, Types } = require('mongoose');
const plotSchema = new Schema({
  farmerId: { type: Types.ObjectId, ref: 'Farmer', required: true, index: true },
  name: { type: String, required: true },
  area: {
    value: { type: Number, required: true },
    unit: { type: String, required: true },            // acre | hectare | bigha | guntha | cent
    normalizedAcres: { type: Number, required: true }, // computed on write (Task 4.1)
  },
  state: { type: String, required: true },             // for bigha conversion
  ownership: { type: String, enum: ['owned', 'leased'], default: 'owned' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = model('Plot', plotSchema);
```

- [ ] Implement `cropCatalog.model.js`:

```js
const { Schema, model } = require('mongoose');
const cropCatalogSchema = new Schema({
  name: { type: String, required: true, unique: true },
  defaultSeason: { type: String, enum: ['kharif', 'rabi', 'zaid', 'perennial'], required: true },
  icon: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = model('CropCatalog', cropCatalogSchema);
```

- [ ] Implement `cropCycle.model.js`:

```js
const { Schema, model, Types } = require('mongoose');
const cropCycleSchema = new Schema({
  farmerId: { type: Types.ObjectId, ref: 'Farmer', required: true, index: true },
  plotId: { type: Types.ObjectId, ref: 'Plot', required: true },
  cropId: { type: Types.ObjectId, ref: 'CropCatalog', required: true },
  cropName: { type: String, required: true }, // denormalized
  season: { type: String, enum: ['kharif', 'rabi', 'zaid', 'perennial'], required: true },
  year: { type: String, required: true },     // "2025-26"
  areaUsed: {
    value: { type: Number, required: true },
    unit: { type: String, required: true },
    normalizedAcres: { type: Number, required: true },
  },
  sowingDate: { type: Date, default: null },
  harvestDate: { type: Date, default: null },
  status: { type: String, enum: ['active', 'closed', 'deactivated'], default: 'active' },
}, { timestamps: true });
cropCycleSchema.index({ farmerId: 1, season: 1, year: 1 });
cropCycleSchema.index({ farmerId: 1, status: 1 });
module.exports = model('CropCycle', cropCycleSchema);
```

- [ ] Run — PASS. **Commit** `feat: plot, cropCatalog, cropCycle models`.

### Task 1.4: Category, Transaction, Announcement, AppConfig models

**Files:** Create the four model files; extend `index.js`. Test: assert `transaction.isVoid` defaults false and `type`/`cacpTag` enums.

- [ ] Implement `expenseCategory.model.js`:

```js
const { Schema, model } = require('mongoose');
const expenseCategorySchema = new Schema({
  name: { type: String, required: true },
  icon: { type: String, default: '' },
  isPaidOut: { type: Boolean, required: true },  // in cash profit?
  isImputed: { type: Boolean, required: true },  // true-cost only (family labour, own-land)
  cacpTag: { type: String, enum: ['A1', 'A2', 'FL', 'C2'], required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = model('ExpenseCategory', expenseCategorySchema);
```

- [ ] Implement `incomeCategory.model.js`:

```js
const { Schema, model } = require('mongoose');
const incomeCategorySchema = new Schema({
  name: { type: String, required: true },
  icon: { type: String, default: '' },
  type: { type: String, enum: ['main_produce', 'by_product', 'subsidy', 'insurance', 'custom_hire', 'other'], required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = model('IncomeCategory', incomeCategorySchema);
```

- [ ] Implement `transaction.model.js` (the core ledger; note `isVoid` soft-delete + imputed flag + basis fields for family-labour days×wage):

```js
const { Schema, model, Types } = require('mongoose');
const transactionSchema = new Schema({
  farmerId: { type: Types.ObjectId, ref: 'Farmer', required: true, index: true },
  cropCycleId: { type: Types.ObjectId, ref: 'CropCycle', default: null }, // null = farm-level
  type: { type: String, enum: ['expense', 'income'], required: true },
  categoryId: { type: Types.ObjectId, required: true },
  categoryName: { type: String, required: true }, // denormalized
  cacpTag: { type: String, enum: ['A1', 'A2', 'FL', 'C2', null], default: null }, // copied from expense category
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
  quantity: { type: Number, default: null }, // e.g. labour days
  unit: { type: String, default: null },     // e.g. "day", "kg", "bag"
  rate: { type: Number, default: null },      // e.g. wage/day
  note: { type: String, default: '' },
  photoPublicId: { type: String, default: null }, // Cloudinary (never a public URL)
  isImputed: { type: Boolean, default: false },
  isVoid: { type: Boolean, default: false },       // soft-delete
  voidedAt: { type: Date, default: null },
}, { timestamps: true });
transactionSchema.index({ farmerId: 1, date: -1 });
transactionSchema.index({ cropCycleId: 1 });
transactionSchema.index({ farmerId: 1, type: 1, categoryId: 1 });
module.exports = model('Transaction', transactionSchema);
```

- [ ] Implement `announcement.model.js` and `appConfig.model.js`:

```js
// announcement.model.js
const { Schema, model, Types } = require('mongoose');
module.exports = model('Announcement', new Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  audience: { type: String, enum: ['all', 'segment'], default: 'all' },
  createdByAdminId: { type: Types.ObjectId, ref: 'Admin', required: true },
  pushSent: { type: Boolean, default: false },
}, { timestamps: true }));
```

```js
// appConfig.model.js  (single document)
const { Schema, model } = require('mongoose');
module.exports = model('AppConfig', new Schema({
  trialDays: { type: Number, default: 14 },
  monthlyPriceINR: { type: Number, default: 99 },
  yearlyPriceINR: { type: Number, default: 799 },
  graceDays: { type: Number, default: 30 },
  dailyWageINR: { type: Number, default: 350 },
  ownLandRentalPerAcreINR: { type: Number, default: 4000 },
  ownedCapitalInterestRatePct: { type: Number, default: 10 },
  landUnitConversions: { type: Object, default: {} }, // see Task 4.1 shape
  defaultCategories: { type: Object, default: {} },
}, { timestamps: true }));
```

- [ ] Run — PASS. **Commit** `feat: category, transaction, announcement, appConfig models`.

### Task 1.5: Seed script (appConfig, master data, first admin)

**Files:** Create `src/scripts/seed.js`. Test: `tests/seed.test.js` runs the seed function against in-memory Mongo and asserts categories + config exist.

- [ ] **Step 1: Failing test**

```js
// tests/seed.test.js
const { makeApp, closeApp, resetDb } = require('./helpers/testApp');
const { runSeed } = require('../src/scripts/seed');
const { ExpenseCategory, AppConfig, Admin } = require('../src/models');
beforeAll(async () => { await makeApp(); });
afterAll(async () => { await closeApp(); });
afterEach(async () => { await resetDb(); });

it('seeds config, categories, and an admin', async () => {
  await runSeed({ adminEmail: 'owner@rk.com', adminPassword: 'pass1234' });
  expect(await AppConfig.countDocuments()).toBe(1);
  expect(await ExpenseCategory.countDocuments()).toBeGreaterThanOrEqual(14);
  expect(await Admin.countDocuments()).toBe(1);
});
```

- [ ] **Step 2: FAIL. Step 3: Implement `src/scripts/seed.js`.** Export `runSeed`; the CACP expense template from [06-cost-and-profit-engine](../06-cost-and-profit-engine.md) drives `isPaidOut`/`isImputed`/`cacpTag`:

```js
const bcrypt = require('bcrypt');
const { AppConfig, ExpenseCategory, IncomeCategory, CropCatalog, Admin } = require('../models');

const EXPENSE_CATEGORIES = [
  { name: 'Seeds', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Fertilizer', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Manure', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Pesticides & insecticides', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Irrigation / water', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Hired labour', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Hired machinery / fuel', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Owned machinery fuel', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Bullock labour (hired)', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Land rent (leased-in)', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Interest on loan', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Transport', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Land revenue / taxes', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Miscellaneous', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  // Imputed (true-cost only):
  { name: 'Family labour', cacpTag: 'FL', isPaidOut: false, isImputed: true },
  { name: 'Own-land rental value', cacpTag: 'C2', isPaidOut: false, isImputed: true },
  { name: 'Owned machinery depreciation', cacpTag: 'C2', isPaidOut: false, isImputed: true },
];
const INCOME_CATEGORIES = [
  { name: 'Crop sale', type: 'main_produce' },
  { name: 'By-product sale', type: 'by_product' },
  { name: 'Government subsidy / MSP', type: 'subsidy' },
  { name: 'Crop insurance payout', type: 'insurance' },
  { name: 'Custom hire income', type: 'custom_hire' },
  { name: 'Other income', type: 'other' },
];
const CROPS = [
  { name: 'Wheat', defaultSeason: 'rabi' }, { name: 'Paddy', defaultSeason: 'kharif' },
  { name: 'Cotton', defaultSeason: 'kharif' }, { name: 'Soybean', defaultSeason: 'kharif' },
  { name: 'Sugarcane', defaultSeason: 'perennial' }, { name: 'Gram (chana)', defaultSeason: 'rabi' },
];
// Minimal land-unit conversion table (sq ft per unit; acre = 43560). Bigha is state-keyed.
const LAND_UNIT_CONVERSIONS = {
  acre: { default: 43560 }, hectare: { default: 107639 }, guntha: { default: 1089 }, cent: { default: 435.6 },
  bigha: { 'West Bengal': 14400, 'Uttar Pradesh': 27000, 'Punjab': 9070, 'Haryana': 9070, 'Rajasthan': 27225, default: 27000 },
};

async function runSeed({ adminEmail, adminPassword } = {}) {
  if (!(await AppConfig.countDocuments())) await AppConfig.create({ landUnitConversions: LAND_UNIT_CONVERSIONS });
  if (!(await ExpenseCategory.countDocuments())) await ExpenseCategory.insertMany(EXPENSE_CATEGORIES);
  if (!(await IncomeCategory.countDocuments())) await IncomeCategory.insertMany(INCOME_CATEGORIES);
  if (!(await CropCatalog.countDocuments())) await CropCatalog.insertMany(CROPS);
  if (adminEmail && !(await Admin.countDocuments())) {
    await Admin.create({ name: 'Owner', email: adminEmail, role: 'superadmin', passwordHash: await bcrypt.hash(adminPassword, 10) });
  }
}
if (require.main === module) {
  const env = require('../config/env');
  const { connectDb, disconnectDb } = require('../config/db');
  (async () => {
    await connectDb(env.MONGODB_URI);
    await runSeed({ adminEmail: process.env.SEED_ADMIN_EMAIL, adminPassword: process.env.SEED_ADMIN_PASSWORD });
    await disconnectDb();
    console.log('seed complete');
  })();
}
module.exports = { runSeed, LAND_UNIT_CONVERSIONS };
```

- [ ] Run — PASS. **Commit** `feat: seed script for config, master data, first admin`.

---

## Milestone 2 — Auth, tokens & the anti-IDOR ownership guard

> Implements [07 Auth Design](../07-architecture-api-and-security.md): bcrypt, JWT access+refresh with rotation, `tokenVersion`, per-request status re-check, and the **mandatory object-level ownership guard** with its **required CI test**. Farmer login is **phone + password (no OTP)**; a `pending_approval` account cannot log in.

### Task 2.1: Password + token libs

**Files:** Create `src/lib/password.js`, `src/lib/tokens.js`. Test: `tests/tokens.test.js`.

- [ ] **Step 1: Failing test**

```js
// tests/tokens.test.js
const { hashPassword, comparePassword } = require('../src/lib/password');
const { signAccess, verifyAccess } = require('../src/lib/tokens');
it('hashes and verifies a password', async () => {
  const h = await hashPassword('secret12');
  expect(await comparePassword('secret12', h)).toBe(true);
  expect(await comparePassword('wrong', h)).toBe(false);
});
it('signs and verifies an access token carrying sub, role, tokenVersion', () => {
  const t = signAccess({ sub: 'abc', role: 'farmer', tokenVersion: 3 });
  const p = verifyAccess(t);
  expect(p.sub).toBe('abc'); expect(p.role).toBe('farmer'); expect(p.tokenVersion).toBe(3);
});
```

- [ ] **Step 2: FAIL. Step 3: Implement.**

`src/lib/password.js`:
```js
const bcrypt = require('bcrypt');
const hashPassword = (pw) => bcrypt.hash(pw, 10);
const comparePassword = (pw, hash) => bcrypt.compare(pw, hash);
module.exports = { hashPassword, comparePassword };
```

`src/lib/tokens.js`:
```js
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const signAccess = (payload) => jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TTL });
const verifyAccess = (t) => jwt.verify(t, env.JWT_ACCESS_SECRET);
// Refresh token: an opaque random string; we store only its hash.
const newRefreshToken = () => {
  const raw = crypto.randomBytes(48).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
};
const hashRefresh = (raw) => crypto.createHash('sha256').update(raw).digest('hex');
module.exports = { signAccess, verifyAccess, newRefreshToken, hashRefresh };
```

- [ ] Run — PASS. **Commit** `feat: password and token libraries`.

### Task 2.2: `requireAuth` + `requireRole` middleware

**Files:** Create `src/middleware/auth.js`, `src/middleware/requireRole.js`. Test: covered via route tests in 2.3; add a focused unit test `tests/authmiddleware.test.js` asserting a missing/invalid token → 401 and a `tokenVersion` mismatch → 401.

- [ ] **Step 1: Failing test** (mount a tiny protected route in a throwaway app):

```js
// tests/authmiddleware.test.js
const express = require('express');
const request = require('supertest');
const { makeApp, closeApp, resetDb } = require('./helpers/testApp');
const { Farmer } = require('../src/models');
const { requireAuth } = require('../src/middleware/auth');
const { signAccess } = require('../src/lib/tokens');
let app;
beforeAll(async () => {
  await makeApp();
  app = express();
  app.get('/protected', requireAuth, (req, res) => res.json({ id: req.user.id }));
});
afterAll(async () => closeApp());
afterEach(async () => resetDb());

it('401 without token', async () => (await request(app).get('/protected')).status === 401);
it('401 when tokenVersion mismatches', async () => {
  const f = await Farmer.create({ name: 'R', phone: '9', village: 'v', state: 's', district: 'd', passwordHash: 'h', tokenVersion: 5, consentGiven: true, consentAt: new Date(), consentVersion: 'v', consentPurpose: 'p' });
  const token = signAccess({ sub: f.id, role: 'farmer', tokenVersion: 1 }); // stale
  const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(401);
});
```

- [ ] **Step 2: FAIL. Step 3: Implement `src/middleware/auth.js`.** Loads the user, checks `tokenVersion`, and enforces account status (suspended/deactivated blocked). This is the per-request re-check from doc 07.

```js
const { verifyAccess } = require('../lib/tokens');
const { Farmer, Admin } = require('../models');
const { AppError } = require('./error');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new AppError(401, 'Missing token', 'unauthorized');
    let payload;
    try { payload = verifyAccess(token); } catch { throw new AppError(401, 'Invalid or expired token', 'unauthorized'); }

    const Model = payload.role === 'farmer' ? Farmer : Admin;
    const user = await Model.findById(payload.sub);
    if (!user) throw new AppError(401, 'Account not found', 'unauthorized');
    if (user.tokenVersion !== payload.tokenVersion) throw new AppError(401, 'Session expired, please log in again', 'unauthorized');
    if (payload.role === 'farmer' && (user.status === 'suspended' || user.status === 'deactivated')) {
      throw new AppError(403, 'Account is not active', 'account_blocked');
    }
    req.user = { id: user.id, role: payload.role, doc: user };
    next();
  } catch (e) { next(e); }
}
module.exports = { requireAuth };
```

`src/middleware/requireRole.js`:
```js
const { AppError } = require('./error');
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new AppError(403, 'Forbidden', 'forbidden'));
  next();
};
module.exports = {
  requireRole,
  requireFarmer: requireRole('farmer'),
  requireAdmin: requireRole('admin', 'superadmin'),
  requireSuperadmin: requireRole('superadmin'),
};
```

- [ ] Run — PASS. **Commit** `feat: auth and role middleware with tokenVersion + status checks`.

### Task 2.3: Auth routes — register (pending), login, refresh, logout, change-password, admin login

**Files:** Create `src/routes/auth.routes.js`, `src/controllers/auth.controller.js`, `src/middleware/validate.js`. Mount `/api/auth` in `app.js`. Test: `tests/auth.test.js`.

- [ ] **Step 1: Failing tests** (the key behaviours from docs 02/03/07):

```js
// tests/auth.test.js
const request = require('supertest');
const { makeApp, closeApp, resetDb } = require('./helpers/testApp');
const { runSeed } = require('../src/scripts/seed');
let app;
const reg = { name: 'Ramesh', phone: '9990001111', password: 'secret12', village: 'X', state: 'Maharashtra', district: 'Wardha', consent: true };
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => closeApp());
afterEach(async () => resetDb());

it('registers a farmer as pending_approval and blocks login', async () => {
  const r = await request(app).post('/api/auth/farmer/register').send(reg);
  expect(r.status).toBe(201);
  const login = await request(app).post('/api/auth/farmer/login').send({ phone: reg.phone, password: reg.password });
  expect(login.status).toBe(403);
  expect(login.body.error).toBe('pending_approval');
});

it('rejects registration without consent', async () => {
  const r = await request(app).post('/api/auth/farmer/register').send({ ...reg, consent: false });
  expect(r.status).toBe(400);
});

it('rejects wrong password with a generic message (no user enumeration)', async () => {
  await request(app).post('/api/auth/farmer/register').send(reg);
  const r = await request(app).post('/api/auth/farmer/login').send({ phone: reg.phone, password: 'nope' });
  expect(r.status).toBe(401);
});
```

- [ ] **Step 2: FAIL. Step 3: Implement validation middleware `src/middleware/validate.js`:**

```js
const { AppError } = require('./error');
const validate = (schema, where = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[where]);
  if (!result.success) return next(new AppError(400, result.error.issues[0].message, 'validation'));
  req[where] = result.data;
  next();
};
module.exports = { validate };
```

- [ ] **Step 4: Implement `src/controllers/auth.controller.js`** (register creates farmer `active` + subscription `pending_approval`; login blocks `pending_approval`; issues + rotates refresh tokens):

```js
const dayjs = require('dayjs');
const { z } = require('zod');
const { Farmer, Admin, Subscription, RefreshToken, AppConfig } = require('../models');
const { hashPassword, comparePassword } = require('../lib/password');
const { signAccess, newRefreshToken, hashRefresh } = require('../lib/tokens');
const { AppError } = require('../middleware/error');
const env = require('../config/env');

const CONSENT_VERSION = '2026-01-v1';

const registerSchema = z.object({
  name: z.string().min(1), phone: z.string().regex(/^\d{10}$/), password: z.string().min(8),
  village: z.string().min(1), state: z.string().min(1), district: z.string().min(1),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required' }) }),
});

async function issueTokens(subjectType, user) {
  const access = signAccess({ sub: user.id, role: subjectType === 'admin' ? user.role : 'farmer', tokenVersion: user.tokenVersion });
  const { raw, hash } = newRefreshToken();
  await RefreshToken.create({ subjectId: user.id, subjectType, tokenHash: hash, expiresAt: dayjs().add(30, 'day').toDate() });
  return { access, refresh: raw };
}

async function registerFarmer(req, res) {
  const data = req.body;
  if (await Farmer.exists({ phone: data.phone })) throw new AppError(409, 'This phone number is already registered', 'phone_taken');
  const farmer = await Farmer.create({
    name: data.name, phone: data.phone, village: data.village, state: data.state, district: data.district,
    passwordHash: await hashPassword(data.password),
    consentGiven: true, consentAt: new Date(), consentVersion: CONSENT_VERSION, consentPurpose: 'farm bookkeeping & reports',
  });
  await Subscription.create({ farmerId: farmer.id, status: 'pending_approval', plan: 'monthly' });
  res.status(201).json({ id: farmer.id, status: 'pending_approval', message: 'Registered. Waiting for admin approval.' });
}

async function loginFarmer(req, res) {
  const { phone, password } = req.body;
  const farmer = await Farmer.findOne({ phone });
  const ok = farmer && await comparePassword(password, farmer.passwordHash);
  if (!ok) throw new AppError(401, 'Wrong phone number or password', 'invalid_credentials'); // generic
  if (farmer.status !== 'active') throw new AppError(403, 'Account is not active', 'account_blocked');
  const sub = await Subscription.findOne({ farmerId: farmer.id });
  if (sub.status === 'pending_approval') throw new AppError(403, 'Your account is waiting for approval', 'pending_approval');
  const tokens = await issueTokens('farmer', farmer);
  res.json({ ...tokens, farmer: { id: farmer.id, name: farmer.name } });
}

module.exports = { registerSchema, registerFarmer, loginFarmer, issueTokens /* + refresh/logout/changePassword/adminLogin below */ };
```

- [ ] **Step 5: Add `refresh`, `logout`, `changePassword`, `adminLogin`** to the controller:
  - `refresh`: look up the presented refresh token by hash; if missing/revoked → 401 and (if reused) revoke the whole subject's chain; else revoke old, issue new (rotation), return new access+refresh.
  - `logout`: revoke the presented refresh token (`revokedAt = now`).
  - `changePassword` (farmer, requires auth): verify current password (or accept an admin-issued temp password flag), set new hash, **bump `tokenVersion`**, revoke all refresh tokens for the farmer.
  - `adminLogin`: email + password → tokens (role from admin doc).

  Full code for `refresh` (the subtle one):
```js
const { hashRefresh } = require('../lib/tokens');
async function refresh(req, res) {
  const raw = req.body.refresh;
  if (!raw) throw new AppError(401, 'Missing refresh token', 'unauthorized');
  const rec = await RefreshToken.findOne({ tokenHash: hashRefresh(raw) });
  if (!rec) throw new AppError(401, 'Invalid refresh token', 'unauthorized');
  if (rec.revokedAt) { // reuse of a revoked token → treat as theft
    await RefreshToken.updateMany({ subjectId: rec.subjectId, revokedAt: null }, { revokedAt: new Date() });
    throw new AppError(401, 'Session revoked', 'unauthorized');
  }
  rec.revokedAt = new Date(); await rec.save();
  const Model = rec.subjectType === 'admin' ? Admin : Farmer;
  const user = await Model.findById(rec.subjectId);
  if (!user) throw new AppError(401, 'Account not found', 'unauthorized');
  const tokens = await issueTokens(rec.subjectType, user);
  res.json(tokens);
}
```

- [ ] **Step 6: Implement `src/routes/auth.routes.js`** and mount it:

```js
const router = require('express').Router();
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/auth.controller');
const { z } = require('zod');

const loginSchema = z.object({ phone: z.string(), password: z.string() });
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.post('/farmer/register', validate(c.registerSchema), wrap(c.registerFarmer));
router.post('/farmer/login', validate(loginSchema), wrap(c.loginFarmer));
router.post('/refresh', wrap(c.refresh));
router.post('/logout', wrap(c.logout));
router.post('/farmer/change-password', requireAuth, wrap(c.changePassword));
router.post('/admin/login', validate(z.object({ email: z.string().email(), password: z.string() })), wrap(c.adminLogin));
module.exports = router;
```

In `app.js` add: `app.use('/api/auth', require('./routes/auth.routes'));`

- [ ] **Step 7: Run — PASS. Commit** `feat: auth routes (register pending, login, refresh rotation, change-password, admin login)`.

### Task 2.4: The mandatory anti-IDOR ownership guard + REQUIRED CI test

**Files:** Create `src/middleware/loadOwned.js`. Test: `tests/ownership.test.js` (this is the release-gating test named in doc 07).

- [ ] **Step 1: Write the REQUIRED failing test** (doc 07: farmer A must get **404** on farmer B's object, no read/write):

```js
// tests/ownership.test.js  — REQUIRED: must pass before release
const request = require('supertest');
const { makeApp, closeApp, resetDb } = require('./helpers/testApp');
const { Farmer, Subscription, Plot } = require('../src/models');
const { signAccess } = require('../src/lib/tokens');

let app;
async function makeActiveFarmer(phone) {
  const f = await Farmer.create({ name: 'F', phone, village: 'v', state: 'Maharashtra', district: 'd', passwordHash: 'h', consentGiven: true, consentAt: new Date(), consentVersion: 'v', consentPurpose: 'p' });
  await Subscription.create({ farmerId: f.id, status: 'trial', trialStartedAt: new Date(), trialEndsAt: new Date(Date.now() + 6e8) });
  return { f, token: signAccess({ sub: f.id, role: 'farmer', tokenVersion: 0 }) };
}
beforeAll(async () => { app = await makeApp(); });
afterAll(async () => closeApp());
afterEach(async () => resetDb());

it('farmer A gets 404 on farmer B plot (GET/PATCH/DELETE), no leak', async () => {
  const A = await makeActiveFarmer('9990000001');
  const B = await makeActiveFarmer('9990000002');
  const plotB = await Plot.create({ farmerId: B.f.id, name: 'B plot', state: 'Maharashtra', area: { value: 2, unit: 'acre', normalizedAcres: 2 } });
  for (const method of ['get', 'patch', 'delete']) {
    const res = await request(app)[method](`/api/plots/${plotB.id}`).set('Authorization', `Bearer ${A.token}`).send({ name: 'hack' });
    expect(res.status).toBe(404); // never 200, never 403
  }
});
```

- [ ] **Step 2: Run — FAIL** (route/middleware not present yet; will pass once plots routes exist in Task 4.2 — keep this test and ensure it goes green there). Implement the guard now so 4.2 can use it.

- [ ] **Step 3: Implement `src/middleware/loadOwned.js`** — loads the doc by `:id`, asserts `farmerId === req.user.id`, returns **404** otherwise, attaches `req.owned`:

```js
const { AppError } = require('./error');
const loadOwned = (Model) => async (req, res, next) => {
  try {
    const doc = await Model.findById(req.params.id);
    if (!doc || String(doc.farmerId) !== String(req.user.id)) {
      throw new AppError(404, 'Not found', 'not_found'); // never confirm another farmer's id
    }
    req.owned = doc;
    next();
  } catch (e) { next(e); }
};
module.exports = { loadOwned };
```

- [ ] **Step 4: Commit** `feat: object-level ownership guard (anti-IDOR)`. (The `ownership.test.js` goes green in Task 4.2 and is enforced by CI.)

---

## Milestone 3 — Subscription lifecycle (lazy state machine) + admin approval/payments

> Implements the state machine in [03](../03-user-flows-and-lifecycle.md): `pending_approval → trial → active ⇄ grace → expired`, evaluated **on each request** (no cron). Admin approval starts the trial; recording a payment activates a paid month.

### Task 3.1: `evaluateStatus` — lazy time-based transitions

**Files:** Create `src/lib/subscription.js`. Test: `tests/subscription.test.js`.

- [ ] **Step 1: Failing tests**

```js
// tests/subscription.test.js
const { evaluateStatus } = require('../src/lib/subscription');
const cfg = { graceDays: 30 };
const day = 86400000;
it('trial past end -> grace', () => {
  const s = { status: 'trial', trialEndsAt: new Date(Date.now() - day) };
  expect(evaluateStatus(s, cfg, new Date()).status).toBe('grace');
});
it('active past period end -> grace', () => {
  const s = { status: 'active', currentPeriodEnd: new Date(Date.now() - day) };
  expect(evaluateStatus(s, cfg, new Date()).status).toBe('grace');
});
it('grace past graceDays after period end -> expired', () => {
  const s = { status: 'grace', currentPeriodEnd: new Date(Date.now() - 40 * day) };
  expect(evaluateStatus(s, cfg, new Date()).status).toBe('expired');
});
it('trial still valid stays trial', () => {
  const s = { status: 'trial', trialEndsAt: new Date(Date.now() + day) };
  expect(evaluateStatus(s, cfg, new Date()).status).toBe('trial');
});
```

- [ ] **Step 2: FAIL. Step 3: Implement `src/lib/subscription.js`** (pure function; caller persists if status changed):

```js
// Returns { status, changed } after applying time-based rules. Does not save.
function evaluateStatus(sub, cfg, now = new Date()) {
  const graceMs = (cfg.graceDays || 30) * 86400000;
  let status = sub.status;
  if (status === 'trial' && sub.trialEndsAt && now > sub.trialEndsAt) status = 'grace';
  if (status === 'active' && sub.currentPeriodEnd && now > sub.currentPeriodEnd) status = 'grace';
  if (status === 'grace') {
    const anchor = sub.currentPeriodEnd || sub.trialEndsAt;
    if (anchor && now > new Date(anchor.getTime() + graceMs)) status = 'expired';
  }
  return { status, changed: status !== sub.status };
}
module.exports = { evaluateStatus };
```

- [ ] **Step 4: Add a `loadSubscription` middleware** (`src/middleware/subscription.js`) used by farmer routes: loads the farmer's subscription, runs `evaluateStatus`, persists if changed, attaches `req.subscription`, and for **write** endpoints blocks when status is `grace/expired/pending_approval/suspended` with 403 `read_only`/`subscription_inactive`. Read endpoints allow `grace` (read-only) but block `expired`.

```js
const { Subscription, AppConfig } = require('../models');
const { evaluateStatus } = require('../lib/subscription');
const { AppError } = require('./error');
function loadSubscription({ write = false } = {}) {
  return async (req, res, next) => {
    try {
      const sub = await Subscription.findOne({ farmerId: req.user.id });
      if (!sub) throw new AppError(403, 'No subscription', 'subscription_inactive');
      const cfg = await AppConfig.findOne();
      const { status, changed } = evaluateStatus(sub, cfg || {}, new Date());
      if (changed) { sub.status = status; await sub.save(); }
      const canRead = ['trial', 'active', 'grace'].includes(sub.status);
      const canWrite = ['trial', 'active'].includes(sub.status);
      if (write && !canWrite) throw new AppError(403, sub.status === 'grace' ? 'Renew to add entries' : 'Subscription inactive', 'read_only');
      if (!write && !canRead) throw new AppError(403, 'Subscription inactive', 'subscription_inactive');
      req.subscription = sub;
      next();
    } catch (e) { next(e); }
  };
}
module.exports = { loadSubscription };
```

- [ ] **Step 5: Run — PASS. Commit** `feat: lazy subscription state machine + gating middleware`.

### Task 3.2: Admin approve / record-payment / deactivate / suspend

**Files:** Create `src/controllers/adminFarmers.controller.js`, start `src/routes/admin.routes.js`. Test: `tests/admin.test.js`.

- [ ] **Step 1: Failing tests** (approve moves pending→trial and sets trial dates; record-payment moves →active with a period; deactivate sets status without deleting):

```js
// tests/admin.test.js (excerpt)
it('admin approve starts the trial', async () => {
  // register farmer -> pending; admin login -> approve; subscription becomes trial with dates
  // asserts sub.status === 'trial' and trialEndsAt ~ now + 14 days
});
it('record payment activates a paid month and writes a payment row', async () => {
  // after approve, POST /api/admin/payments -> sub.status active, currentPeriodEnd set, Payment count 1
});
it('deactivate sets status deactivated and retains data', async () => {
  // POST /api/admin/farmers/:id/deactivate -> farmer.status deactivated; transactions still in DB
});
```

- [ ] **Step 2: FAIL. Step 3: Implement controller** (key handlers):

```js
const dayjs = require('dayjs');
const { Farmer, Subscription, Payment, AppConfig } = require('../models');
const { AppError } = require('../middleware/error');

async function approve(req, res) {
  const sub = await Subscription.findOne({ farmerId: req.params.id });
  if (!sub) throw new AppError(404, 'Not found', 'not_found');
  if (sub.status !== 'pending_approval') throw new AppError(409, 'Already approved', 'conflict');
  const cfg = await AppConfig.findOne();
  const now = new Date();
  Object.assign(sub, {
    status: 'trial', trialStartedAt: now, trialEndsAt: dayjs(now).add(cfg?.trialDays || 14, 'day').toDate(),
    approvedByAdminId: req.user.id, approvedAt: now,
  });
  await sub.save();
  res.json({ status: sub.status, trialEndsAt: sub.trialEndsAt });
}

async function recordPayment(req, res) {
  const { farmerId, amount, method, plan = 'monthly', note = '' } = req.body;
  const sub = await Subscription.findOne({ farmerId });
  if (!sub) throw new AppError(404, 'Not found', 'not_found');
  const now = new Date();
  const periodStart = now;
  const periodEnd = dayjs(now).add(plan === 'yearly' ? 1 : 1, plan === 'yearly' ? 'year' : 'month').toDate();
  await Payment.create({ farmerId, amount, method, recordedByAdminId: req.user.id, periodStart, periodEnd, note });
  Object.assign(sub, { status: 'active', plan, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, activatedByAdminId: req.user.id });
  await sub.save();
  res.json({ status: sub.status, currentPeriodEnd: sub.currentPeriodEnd });
}

async function deactivateFarmer(req, res) {
  const farmer = await Farmer.findById(req.params.id);
  if (!farmer) throw new AppError(404, 'Not found', 'not_found');
  farmer.status = 'deactivated'; farmer.deactivatedAt = new Date(); farmer.tokenVersion += 1;
  await farmer.save(); // data retained, never deleted
  res.json({ status: 'deactivated' });
}
module.exports = { approve, recordPayment, deactivateFarmer /* + suspend, reactivate */ };
```

- [ ] **Step 4: Wire routes** in `src/routes/admin.routes.js` behind `requireAuth` + `requireAdmin`:

```js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireAdmin, requireSuperadmin } = require('../middleware/requireRole');
const f = require('../controllers/adminFarmers.controller');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
router.use(requireAuth, requireAdmin);
router.post('/farmers/:id/approve', wrap(f.approve));
router.post('/farmers/:id/deactivate', wrap(f.deactivateFarmer));
router.patch('/farmers/:id', wrap(f.suspendOrReactivate));
router.post('/payments', wrap(f.recordPayment));
// (more admin routes in Milestone 7)
module.exports = router;
```

Mount `app.use('/api/admin', require('./routes/admin.routes'));`

- [ ] **Step 5: Run — PASS. Commit** `feat: admin approve, record payment, deactivate/suspend`.

### Task 3.3: Farmer self-service — `GET /me`, `POST /me/deactivate`

**Files:** Create `src/routes/me.routes.js`, `src/controllers/me.controller.js`. Test: extend `auth.test.js` — `GET /me` returns profile + subscription status; `/me/deactivate` sets status + bumps tokenVersion.

- [ ] Implement `GET /me` (profile + evaluated subscription status) and `POST /me/deactivate` (sets `farmers.status = deactivated`, `tokenVersion += 1`, retains data). Mount behind `requireAuth` + `requireFarmer`. Run tests. **Commit** `feat: farmer profile and self-deactivate`.

---

## Milestone 4 — Core domain: land units, plots, crop cycles, transactions

### Task 4.1: Land-unit conversion util

**Files:** Create `src/lib/landUnits.js`. Test: `tests/landUnits.test.js`.

- [ ] **Step 1: Failing tests** (acre uniform; bigha state-varying; per doc 06/05):

```js
// tests/landUnits.test.js
const { toNormalizedAcres } = require('../src/lib/landUnits');
const table = require('../src/scripts/seed').LAND_UNIT_CONVERSIONS;
it('1 acre = 1 acre', () => expect(toNormalizedAcres(1, 'acre', 'Maharashtra', table)).toBeCloseTo(1));
it('1 guntha = 0.025 acre', () => expect(toNormalizedAcres(1, 'guntha', 'Maharashtra', table)).toBeCloseTo(1089 / 43560, 4));
it('1 bigha differs by state', () => {
  expect(toNormalizedAcres(1, 'bigha', 'West Bengal', table)).toBeCloseTo(14400 / 43560, 4);
  expect(toNormalizedAcres(1, 'bigha', 'Punjab', table)).toBeCloseTo(9070 / 43560, 4);
});
```

- [ ] **Step 2: FAIL. Step 3: Implement `src/lib/landUnits.js`:**

```js
const ACRE_SQFT = 43560;
function sqftPerUnit(unit, state, table) {
  const entry = table[unit];
  if (!entry) throw new Error(`Unknown land unit: ${unit}`);
  if (typeof entry === 'number') return entry;
  return entry[state] ?? entry.default;
}
function toNormalizedAcres(value, unit, state, table) {
  return (value * sqftPerUnit(unit, state, table)) / ACRE_SQFT;
}
module.exports = { toNormalizedAcres, ACRE_SQFT };
```

- [ ] **Step 4: Run — PASS. Commit** `feat: land-unit conversion (state-varying bigha)`.

### Task 4.2: Plots CRUD (+ deactivate) — makes `ownership.test.js` go green

**Files:** Create `src/routes/plots.routes.js`, `src/controllers/plots.controller.js`. Test: `ownership.test.js` (from 2.4) + `tests/plots.test.js`.

- [ ] **Step 1: Tests** — create computes `normalizedAcres`; list returns only active own plots; `DELETE` sets `isActive=false` (not removed); ownership test passes.

- [ ] **Step 2: Implement controller** (create/list/get/update/deactivate). Create uses `toNormalizedAcres` with the farmer's state and `AppConfig.landUnitConversions`:

```js
const { Plot, AppConfig } = require('../models');
const { toNormalizedAcres } = require('../lib/landUnits');
async function create(req, res) {
  const cfg = await AppConfig.findOne();
  const { name, area, ownership } = req.body; // area: {value, unit}
  const state = req.user.doc.state;
  const normalizedAcres = toNormalizedAcres(area.value, area.unit, state, cfg.landUnitConversions);
  const plot = await Plot.create({ farmerId: req.user.id, name, state, ownership, area: { ...area, normalizedAcres } });
  res.status(201).json(plot);
}
async function list(req, res) { res.json(await Plot.find({ farmerId: req.user.id, isActive: true })); }
async function get(req, res) { res.json(req.owned); }
async function update(req, res) { Object.assign(req.owned, req.body); await req.owned.save(); res.json(req.owned); }
async function deactivate(req, res) { req.owned.isActive = false; await req.owned.save(); res.json({ ok: true }); }
module.exports = { create, list, get, update, deactivate };
```

- [ ] **Step 3: Routes** — note `loadOwned(Plot)` on every `:id` route (this is what satisfies the anti-IDOR test):

```js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireFarmer } = require('../middleware/requireRole');
const { loadSubscription } = require('../middleware/subscription');
const { loadOwned } = require('../middleware/loadOwned');
const { Plot } = require('../models');
const c = require('../controllers/plots.controller');
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
router.use(requireAuth, requireFarmer);
router.get('/', loadSubscription({ write: false }), wrap(c.list));
router.post('/', loadSubscription({ write: true }), wrap(c.create));
router.get('/:id', loadSubscription({ write: false }), loadOwned(Plot), wrap(c.get));
router.patch('/:id', loadSubscription({ write: true }), loadOwned(Plot), wrap(c.update));
router.delete('/:id', loadSubscription({ write: true }), loadOwned(Plot), wrap(c.deactivate));
module.exports = router;
```

Mount `/api/plots`.

- [ ] **Step 4: Run — `ownership.test.js` + `plots.test.js` PASS. Commit** `feat: plots CRUD with ownership guard and soft-delete`.

### Task 4.3: Crop cycles CRUD (+ deactivate)

**Files:** `src/routes/cropCycles.routes.js`, `src/controllers/cropCycles.controller.js`. Test: `tests/cropCycles.test.js`.

- [ ] Mirror the plots pattern (same `requireAuth`+`requireFarmer`+`loadSubscription`+`loadOwned(CropCycle)` chain). Create validates the plot belongs to the farmer, denormalizes `cropName` from `CropCatalog`, computes `areaUsed.normalizedAcres`. Endpoints: `GET /` (filter by season/year/status, active only), `POST /`, `GET/:id`, `PATCH /:id` (edit or set `status:'closed'`), `DELETE /:id` (set `status:'deactivated'`). Run tests. **Commit** `feat: crop cycles CRUD`.

### Task 4.4: Transactions — create (with photo), list, void; imputed auto-suggest

**Files:** `src/routes/transactions.routes.js`, `src/controllers/transactions.controller.js`. Test: `tests/transactions.test.js`.

- [ ] **Step 1: Tests** — create an expense copies `cacpTag`/`isPaidOut`/`isImputed`/`categoryName` from the category; list excludes `isVoid`; `DELETE` sets `isVoid=true` (row retained); `GET /transactions/suggested-imputed?cropCycleId=...` returns computed family-labour & own-land suggestions from `AppConfig`.

- [ ] **Step 2: Implement controller.** Create resolves the category (expense or income), copies denormalized fields, stores `photoPublicId` if provided:

```js
const { Transaction, ExpenseCategory, IncomeCategory, CropCycle, AppConfig } = require('../models');
const { AppError } = require('../middleware/error');

async function create(req, res) {
  const { type, categoryId, cropCycleId = null, amount, date, quantity = null, unit = null, rate = null, note = '', photoPublicId = null } = req.body;
  let categoryName, cacpTag = null, isImputed = false;
  if (type === 'expense') {
    const cat = await ExpenseCategory.findById(categoryId);
    if (!cat) throw new AppError(400, 'Unknown expense category', 'validation');
    categoryName = cat.name; cacpTag = cat.cacpTag; isImputed = cat.isImputed;
  } else {
    const cat = await IncomeCategory.findById(categoryId);
    if (!cat) throw new AppError(400, 'Unknown income category', 'validation');
    categoryName = cat.name;
  }
  if (cropCycleId) { // ownership of the referenced cycle
    const owns = await CropCycle.exists({ _id: cropCycleId, farmerId: req.user.id });
    if (!owns) throw new AppError(404, 'Crop cycle not found', 'not_found');
  }
  const tx = await Transaction.create({ farmerId: req.user.id, type, categoryId, categoryName, cacpTag, cropCycleId, amount, date, quantity, unit, rate, note, photoPublicId, isImputed });
  res.status(201).json(tx);
}
async function list(req, res) {
  const q = { farmerId: req.user.id, isVoid: false };
  if (req.query.cropCycleId) q.cropCycleId = req.query.cropCycleId;
  if (req.query.type) q.type = req.query.type;
  res.json(await Transaction.find(q).sort({ date: -1 }).limit(200));
}
async function voidTx(req, res) { req.owned.isVoid = true; req.owned.voidedAt = new Date(); await req.owned.save(); res.json({ ok: true }); }

async function suggestedImputed(req, res) {
  const cfg = await AppConfig.findOne();
  const cycle = await CropCycle.findOne({ _id: req.query.cropCycleId, farmerId: req.user.id });
  if (!cycle) throw new AppError(404, 'Not found', 'not_found');
  const acres = cycle.areaUsed.normalizedAcres;
  res.json({
    familyLabour: { basis: 'days × wage', ratePerDay: cfg.dailyWageINR, prompt: 'About how many days did you and your family work on this crop?' },
    ownLandRentalValue: { amount: Math.round(cfg.ownLandRentalPerAcreINR * acres), basis: `${cfg.ownLandRentalPerAcreINR}/acre × ${acres} acres` },
  });
}
module.exports = { create, list, voidTx, suggestedImputed };
```

- [ ] **Step 3: Routes** — `loadOwned(Transaction)` on `DELETE /:id`; `loadSubscription({write:true})` on create/void, `{write:false}` on list/suggested. Mount `/api/transactions`. Run tests. **Commit** `feat: transactions create/list/void + imputed auto-suggest`.

---

## Milestone 5 — Cost & profit engine + reports

> The differentiator. Formulas and the worked example come straight from [06-cost-and-profit-engine](../06-cost-and-profit-engine.md).

### Task 5.1: Cost engine (cash vs true profit, per-acre) — with the doc's worked example

**Files:** Create `src/lib/costEngine.js`. Test: `tests/costEngine.test.js`.

- [ ] **Step 1: Write the failing test using the exact numbers from doc 06** (Wheat, 2 acres: income ₹50,000; paid-out ₹24,000; imputed ₹20,000 → cash profit ₹26,000, true profit ₹6,000; per-acre ₹13,000 vs ₹3,000):

```js
// tests/costEngine.test.js
const { computeProfit } = require('../src/lib/costEngine');
const txns = [
  { type: 'income', amount: 45000, isImputed: false },      // crop sale
  { type: 'income', amount: 5000, isImputed: false },       // by-product
  { type: 'expense', amount: 24000, isImputed: false, cacpTag: 'A2' }, // paid-out total
  { type: 'expense', amount: 10500, isImputed: true, cacpTag: 'FL' },  // family labour 30d×350
  { type: 'expense', amount: 8000, isImputed: true, cacpTag: 'C2' },   // own-land rental value
  { type: 'expense', amount: 1500, isImputed: true, cacpTag: 'C2' },   // owned-machinery depreciation
];
it('computes cash and true profit and per-acre', () => {
  const r = computeProfit(txns, 2);
  expect(r.income).toBe(50000);
  expect(r.paidOut).toBe(24000);
  expect(r.imputed).toBe(20000);
  expect(r.cashProfit).toBe(26000);
  expect(r.trueProfit).toBe(6000);
  expect(r.cashProfitPerAcre).toBe(13000);
  expect(r.trueProfitPerAcre).toBe(3000);
});
it('ignores voided rows (caller must pre-filter) and handles zero acres', () => {
  expect(computeProfit([], 0).cashProfitPerAcre).toBe(0);
});
```

- [ ] **Step 2: FAIL. Step 3: Implement `src/lib/costEngine.js`** (pure; caller passes only non-void transactions):

```js
function computeProfit(txns, normalizedAcres = 0) {
  let income = 0, paidOut = 0, imputed = 0;
  for (const t of txns) {
    if (t.type === 'income') income += t.amount;
    else if (t.isImputed) imputed += t.amount;
    else paidOut += t.amount; // expense, paid-out
  }
  const cashProfit = income - paidOut;
  const trueProfit = income - (paidOut + imputed);
  const perAcre = (n) => (normalizedAcres > 0 ? Math.round(n / normalizedAcres) : 0);
  return { income, paidOut, imputed, cashProfit, trueProfit, cashProfitPerAcre: perAcre(cashProfit), trueProfitPerAcre: perAcre(trueProfit) };
}
module.exports = { computeProfit };
```

- [ ] **Step 4: Run — PASS. Commit** `feat: cost engine (cash/true profit, per-acre) matching doc 06 worked example`.

### Task 5.2: Reports endpoints

**Files:** Create `src/routes/reports.routes.js`, `src/controllers/reports.controller.js`. Test: `tests/reports.test.js`.

- [ ] **Step 1: Tests** for each report (seed a farmer with a couple of crop cycles + transactions; assert numbers). Endpoints (all `GET`, farmer role, `loadSubscription({write:false})`, exclude `isVoid`):
  - `GET /reports/monthly?year=2025&month=11` → `{ income, paidOutExpense, cashProfit }` for that month (all cycles).
  - `GET /reports/yearly?year=2025-26` → totals for the crop year.
  - `GET /reports/crop-cycle/:id` → `loadOwned(CropCycle)`; returns `computeProfit` over that cycle's non-void transactions with `normalizedAcres` from the cycle (cash + true + per-acre).
  - `GET /reports/by-category?type=expense&from=&to=` → grouped sums for the pie/bar.
  - `GET /reports/season-comparison?crop=Wheat` → per `{season,year}` cash & true profit.
  - `GET /reports/best-per-acre` → closed cycles ranked by `trueProfitPerAcre` (and cash).

- [ ] **Step 2: Implement controller** using Mongo aggregation for grouped reports and `computeProfit` for per-cycle. Example `crop-cycle`:

```js
const { Transaction } = require('../models');
const { computeProfit } = require('../lib/costEngine');
async function cropCycle(req, res) {
  const cycle = req.owned; // from loadOwned(CropCycle)
  const txns = await Transaction.find({ cropCycleId: cycle.id, isVoid: false });
  res.json({ cycle: { id: cycle.id, cropName: cycle.cropName, season: cycle.season, year: cycle.year }, ...computeProfit(txns, cycle.areaUsed.normalizedAcres) });
}
```

- [ ] **Step 3: Run — PASS. Commit** `feat: reports (monthly/yearly/per-crop/per-acre/breakdown/season/best-per-acre)`.

> **PDF/WhatsApp sharing** is done **client-side** (the app renders the report to PDF and uses the OS share sheet) per doc 04 — no backend endpoint needed. The reports API returns the numbers; the app formats them.

---

## Milestone 6 — Receipt uploads (Cloudinary signed) + view URLs

### Task 6.1: Signed upload params + signed view URL

**Files:** Create `src/lib/cloudinary.js`, `src/routes/uploads.routes.js`, `src/controllers/uploads.controller.js`. Test: `tests/uploads.test.js` (mock the cloudinary SDK; assert the signature endpoint returns pinned params and requires auth).

- [ ] Implement `POST /api/uploads/receipt-signature` (farmer, `loadSubscription({write:true})`): returns short-lived signed params pinned to `folder=receipts/<farmerId>`, `resource_type=image`, allowed formats, size cap, and an unguessable `public_id` (per doc 07). The app uploads directly to Cloudinary and saves the returned `photoPublicId` on the transaction.
- [ ] Implement `GET /api/uploads/receipt-view/:transactionId` (farmer, `loadOwned(Transaction)`): mints a **short-lived signed view URL** for the private image only after ownership passes. Never store or return public delivery URLs.
- [ ] Wire `cloudinary` config from env; guard: if Cloudinary env vars are absent (e.g. tests), return a stubbed signature so tests run offline. **Commit** `feat: signed Cloudinary receipt upload + private view URL`.

---

## Milestone 7 — Announcements + FCM push, admin data views, dashboard, master data

### Task 7.1: FCM wrapper + announcements

**Files:** `src/lib/fcm.js`, extend `admin.routes.js` + `me.routes.js`. Test: `tests/announcements.test.js` (mock firebase-admin).

- [ ] `src/lib/fcm.js`: init firebase-admin from the service-account JSON (skip init if env absent); `sendToTokens(tokens, {title, body})`.
- [ ] `POST /api/admin/announcements` (admin): create announcement, collect farmer `fcmTokens`, call `sendToTokens`, set `pushSent`. `GET /api/admin/announcements` list. `GET /api/announcements` (farmer) lists recent. `POST /api/me/fcm-token` (farmer) registers a device token. **Commit** `feat: announcements + FCM push`.

### Task 7.2: Admin farmer views + dashboard + master-data CRUD + config

**Files:** extend `admin.routes.js`, add `src/controllers/adminData.controller.js`. Test: `tests/adminData.test.js`.

- [ ] Implement:
  - `GET /api/admin/farmers` (search by name/phone/village/state; paginated; include subscription status).
  - `GET /api/admin/farmers/:id` (profile + subscription + counts; **admin can view any farmer** — this is allowed by role, unlike farmer-to-farmer).
  - `GET /api/admin/farmers/:id/reports/*` (reuse the report functions for a given farmerId).
  - `POST /api/admin/farmers/:id/reset-password` (issues a temp password, bumps farmer `tokenVersion`).
  - `GET/POST/PATCH /api/admin/crops`, `/expense-categories`, `/income-categories` (master data; `PATCH` can `isActive:false` to deactivate — never delete).
  - `GET /api/admin/payments` (list/filter).
  - `GET /api/admin/dashboard` (counts: total/active/trial/pending farmers; revenue = sum of payments this month/all-time).
  - `GET/PATCH /api/admin/config` (superadmin only) to edit `appConfig` (trial days, prices, wage/rental defaults, land-unit table).
- [ ] Run tests. **Commit** `feat: admin farmer views, dashboard, master-data + config`.

---

## Milestone 8 — Hardening, backups, deploy

### Task 8.1: Rate limiting, validation coverage, security headers

**Files:** extend `app.js`, add `src/middleware/rateLimit.js`. Test: `tests/ratelimit.test.js`.

- [ ] Add `express-rate-limit`: a **per-phone graduated limiter** on `/api/auth/farmer/login` and a global limiter on `/api/auth/farmer/register` (doc 07: register is rate-limited + bot-checked). Ensure `helmet` is on (Task 0.3) and CORS is restricted to `CORS_ORIGINS` in production. Confirm every write route has a zod validation schema. **Commit** `feat: rate limiting on auth + validation hardening`.

### Task 8.2: Daily backup GitHub Action

**Files:** Create `.github/workflows/backup.yml`.

- [ ] Implement a scheduled (cron `0 1 * * *`) workflow that runs `mongodump` against `MONGODB_URI` (from a GitHub secret) and uploads the archive to object storage (S3-compatible) using repo secrets; retain 30 days. Add a monthly **restore-test** reminder (doc 07: a backup never restored is not a backup). **Commit** `ci: daily mongodump backup workflow`.

### Task 8.3: Deploy to Render

**Files:** Create `backend/render.yaml` (or document the dashboard settings) and `docs/plans/DEPLOY.md`.

- [ ] Document: Render web service, build `npm ci`, start `npm start`, Node 20, health check path `/api/health`, all env vars set in the Render dashboard (never in git), and the free-tier cold-start note. Run the `seed` once against production (`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`) to create the first admin + master data. **Commit** `docs: backend deployment guide`.

---

## Self-review checklist (run before handing off)

- [ ] **Spec coverage:** auth+approval (02/03/07) ✓; deactivate-only + soft-delete (05/07) ✓; land units (05/06) ✓; cost engine cash/true/per-acre (06) ✓; reports incl. best-per-acre (06/04) ✓; subscription lifecycle (03/08) ✓; signed receipts (07) ✓; announcements/FCM (02/07) ✓; admin views/dashboard/master-data/config (02/07) ✓; DPDP consent captured at register (07) ✓; anti-IDOR ownership guard + CI test (07) ✓; daily backups (07) ✓; pricing config ₹99/₹799/14-day (08) ✓.
- [ ] **No hard deletes anywhere:** every "delete" route sets `isVoid`/`isActive=false`/`status=deactivated`. ✓
- [ ] **Type/name consistency:** `loadOwned`, `loadSubscription`, `computeProfit`, `evaluateStatus`, `toNormalizedAcres`, `issueTokens` used with identical signatures across tasks. ✓
- [ ] **Enums match doc 05** exactly (subscription includes `pending_approval`; farmers/cropCycles include `deactivated`; transactions have `isVoid`). ✓

---

## What this plan deliberately leaves to Plans 2 & 3

- **Web Admin (Plan 2):** React + Vite app consuming `/api/admin/*` — login, pending-approvals queue + approve, farmer list/detail with reports, record-payment, master-data editors, announcements composer, revenue dashboard.
- **Farmer App (Plan 3):** bare React Native app consuming the farmer endpoints — onboarding + "waiting for approval", home dashboard, 2–3 tap add expense/income (+ camera receipt via signed upload), crop/plot setup, reports with cash/true toggle and per-acre, PDF/WhatsApp share, notifications, account/subscription screen.

Both depend only on this API. Build and deploy this backend first (through at least Milestone 5) so the clients have real endpoints to integrate against.
