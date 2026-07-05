# Smart Farming Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Smart Farming v1 backend — a Node.js + Express + MongoDB REST API providing auth (admin-approved farmers), farm/crop/transaction records, a CACP-based cash-and-true profit engine, reports, a manual subscription lifecycle, admin management, Cloudinary receipts and FCM push — fully test-driven and deployed to Render.

**Architecture:** Layered Express app (routes -> controllers -> services -> Mongoose models). JWT auth (access + refresh, `tokenVersion`), per-document ownership checks (IDOR-safe -> 404), on-request subscription-state evaluation (no cron, free-tier friendly), and a deactivate-only data policy (no hard deletes). Tested with Jest + Supertest against an in-memory MongoDB.

**Tech Stack:** Node 20 (ES modules), Express 4, Mongoose 8, zod, bcrypt, jsonwebtoken, Cloudinary, firebase-admin; Jest + Supertest + mongodb-memory-server; hosted on Render + MongoDB Atlas.

> _The exact request/response shapes the clients rely on are pinned in [API-CONTRACT.md](API-CONTRACT.md) — that document is the source of truth for the API surface; implement these endpoints to match it._

## Modules & build order

1. **Module S — Project setup & test harness** — task prefix `S`
2. **Module AUTH — Authentication & tokens** — task prefix `AUTH`
3. **Module F — Farmer profile & self-deactivation** — task prefix `F`
4. **Module SEC — Ownership/IDOR, validation & rate limiting** — task prefix `SEC`
5. **Module MD — Master data & app config** — task prefix `MD`
6. **Module P — Plots & land-unit normalization** — task prefix `P`
7. **Module CC — Crop cycles** — task prefix `CC`
8. **Module TX — Transactions & Cloudinary receipts** — task prefix `TX`
9. **Module R — Cost/profit engine & reports** — task prefix `R`
10. **Module SUB — Subscription lifecycle & payments** — task prefix `SUB`
11. **Module ADM — Admin management, announcements & dashboard** — task prefix `ADM`
12. **Module DEP — Deployment, backups & CI** — task prefix `DEP`

---

## Module S — Project setup & test harness

**Files:**
- Create: `D:/smart-farming/package.json`
- Create: `D:/smart-farming/.gitignore`
- Create: `D:/smart-farming/.env.example`
- Create: `D:/smart-farming/jest.config.js`
- Create: `D:/smart-farming/src/config/env.js`
- Create: `D:/smart-farming/src/config/db.js`
- Create: `D:/smart-farming/src/utils/AppError.js`
- Create: `D:/smart-farming/src/middleware/error.js`
- Create: `D:/smart-farming/src/routes/index.routes.js`
- Create: `D:/smart-farming/src/app.js`
- Create: `D:/smart-farming/src/server.js`
- Create: `D:/smart-farming/tests/helpers/db.js`
- Create: `D:/smart-farming/tests/helpers/factories.js`
- Create: `D:/smart-farming/tests/helpers/auth.js`
- Test: `D:/smart-farming/tests/health.test.js`

---

### Task S-1: Initialize the Node ESM project and install dependencies

**Files:** `D:/smart-farming/package.json`, `D:/smart-farming/.gitignore`

- [ ] **Step 1: Create `package.json`.** This declares the project as an ES module (`"type": "module"`) and defines the exact scripts the whole team will use. The `test` script forces `NODE_ENV=test` via `cross-env` so tests never touch a real database.

  Create `D:/smart-farming/package.json`:
  ```json
  {
    "name": "smart-farming-backend",
    "version": "1.0.0",
    "description": "Smart Farming backend — Node + Express + MongoDB",
    "type": "module",
    "main": "src/server.js",
    "scripts": {
      "start": "node src/server.js",
      "dev": "node --watch src/server.js",
      "test": "cross-env NODE_ENV=test node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand",
      "test:watch": "cross-env NODE_ENV=test node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --watch"
    },
    "engines": {
      "node": ">=20"
    },
    "license": "UNLICENSED",
    "private": true
  }
  ```

  Notes: `--experimental-vm-modules` is what lets Jest run native ESM. `--runInBand` runs tests serially, which is required because `mongodb-memory-server` shares one in-memory instance across the suite.

- [ ] **Step 2: Create `.gitignore`.** Keep secrets and build noise out of git.

  Create `D:/smart-farming/.gitignore`:
  ```gitignore
  node_modules/
  .env
  .env.local
  coverage/
  *.log
  .DS_Store
  dist/
  ```

- [ ] **Step 3: Install runtime dependencies.** Run in `D:/smart-farming`:
  ```
  npm install express mongoose zod bcrypt jsonwebtoken express-rate-limit dotenv cloudinary firebase-admin
  ```
  Expected: `npm` completes and `package.json` gains a `dependencies` block containing all nine packages.

- [ ] **Step 4: Install dev/test dependencies.** Run in `D:/smart-farming`:
  ```
  npm install --save-dev jest supertest mongodb-memory-server cross-env
  ```
  Expected: `npm` completes and `package.json` gains a `devDependencies` block with `jest`, `supertest`, `mongodb-memory-server`, and `cross-env`.

- [ ] **Step 5: Commit.**
  ```
  git add package.json package-lock.json .gitignore
  git commit -m "chore(setup): scaffold Node ESM project with deps and scripts"
  ```

---

### Task S-2: Add Jest config for native ESM

**Files:** `D:/smart-farming/jest.config.js`

- [ ] **Step 1: Create the Jest config.** With `"type":"module"` the config file itself is ESM, so it uses `export default`. We set the Node test environment (not jsdom — this is a backend), point Jest at the `tests/` folder, and give a generous timeout because spinning up `mongodb-memory-server` on first run can be slow.

  Create `D:/smart-farming/jest.config.js`:
  ```js
  export default {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    testTimeout: 30000,
    clearMocks: true,
    // We drive native ESM via node --experimental-vm-modules (see the test script),
    // so no Babel transform is needed.
    transform: {},
  };
  ```

- [ ] **Step 2: Commit.**
  ```
  git add jest.config.js
  git commit -m "chore(setup): add Jest config for native ESM"
  ```

---

### Task S-3: Environment config and example file

**Files:** `D:/smart-farming/src/config/env.js`, `D:/smart-farming/.env.example`

- [ ] **Step 1: Create `.env.example`.** This documents every variable the app reads. It is committed; the real `.env` is git-ignored.

  Create `D:/smart-farming/.env.example`:
  ```dotenv
  # Server
  NODE_ENV=development
  PORT=4000

  # Database
  MONGODB_URI=mongodb://127.0.0.1:27017/smart_farming

  # Auth — JWT
  JWT_ACCESS_SECRET=change-me-access-secret
  JWT_REFRESH_SECRET=change-me-refresh-secret
  ACCESS_TOKEN_TTL=15m
  REFRESH_TOKEN_TTL=30d

  # Cloudinary (signed uploads)
  CLOUDINARY_CLOUD_NAME=
  CLOUDINARY_API_KEY=
  CLOUDINARY_API_SECRET=

  # Firebase Admin (FCM) — path to service account JSON, or leave blank in dev
  FIREBASE_SERVICE_ACCOUNT=
  ```

- [ ] **Step 2: Create `src/config/env.js`.** It loads `.env` via `dotenv`, then validates and coerces everything through a zod schema. In `test` mode the DB URI and secrets are not required (tests inject an in-memory Mongo URI and use fixed test secrets), so the schema is relaxed for `NODE_ENV==='test'`. A validation failure throws immediately with a clear message so the app never boots half-configured.

  Create `D:/smart-farming/src/config/env.js`:
  ```js
  import dotenv from 'dotenv';
  import { z } from 'zod';

  dotenv.config();

  const isTest = process.env.NODE_ENV === 'test';

  const schema = z.object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(4000),

    // Required outside tests; in tests we spin up mongodb-memory-server instead.
    MONGODB_URI: isTest
      ? z.string().optional()
      : z.string().min(1, 'MONGODB_URI is required'),

    // Secrets: real values required outside tests; fixed fallbacks in tests.
    JWT_ACCESS_SECRET: isTest
      ? z.string().default('test-access-secret')
      : z.string().min(1, 'JWT_ACCESS_SECRET is required'),
    JWT_REFRESH_SECRET: isTest
      ? z.string().default('test-refresh-secret')
      : z.string().min(1, 'JWT_REFRESH_SECRET is required'),

    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL: z.string().default('30d'),

    CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
    CLOUDINARY_API_KEY: z.string().optional().default(''),
    CLOUDINARY_API_SECRET: z.string().optional().default(''),

    FIREBASE_SERVICE_ACCOUNT: z.string().optional().default(''),
  });

  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  export const env = parsed.data;
  export default env;
  ```

- [ ] **Step 3: Commit.**
  ```
  git add src/config/env.js .env.example
  git commit -m "feat(config): validate env with zod and add .env.example"
  ```

---

### Task S-4: AppError utility and central error middleware

**Files:** `D:/smart-farming/src/utils/AppError.js`, `D:/smart-farming/src/middleware/error.js`

- [ ] **Step 1: Create `AppError`.** Every deliberate failure in the app throws `new AppError(statusCode, code, message)`. The `code` is a stable machine-readable string (e.g. `NOT_FOUND`, `PENDING_APPROVAL`) the mobile app can switch on; `message` is human text.

  Create `D:/smart-farming/src/utils/AppError.js`:
  ```js
  export class AppError extends Error {
    /**
     * @param {number} statusCode HTTP status (e.g. 400, 401, 403, 404).
     * @param {string} code Stable machine code (e.g. 'NOT_FOUND').
     * @param {string} message Human-readable message.
     */
    constructor(statusCode, code, message) {
      super(message);
      this.name = 'AppError';
      this.statusCode = statusCode;
      this.code = code;
      // Mark ours so the error middleware can trust these fields.
      this.isOperational = true;
      Error.captureStackTrace?.(this, AppError);
    }
  }

  export default AppError;
  ```

- [ ] **Step 2: Create the error middleware.** It is the LAST middleware mounted. A thrown `AppError` maps to its own status and `{ error: { code, message } }`. Anything else (a real bug) becomes a generic 500 `INTERNAL` so we never leak stack traces to clients; in non-test mode we log it.

  Create `D:/smart-farming/src/middleware/error.js`:
  ```js
  import { AppError } from '../utils/AppError.js';

  // Express recognizes an error handler by its four arguments (err, req, res, next).
  // eslint-disable-next-line no-unused-vars
  export function errorHandler(err, req, res, next) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        error: { code: err.code, message: err.message },
      });
    }

    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.error('Unhandled error:', err);
    }

    return res.status(500).json({
      error: { code: 'INTERNAL', message: 'Something went wrong' },
    });
  }

  export default errorHandler;
  ```

- [ ] **Step 3: Commit.**
  ```
  git add src/utils/AppError.js src/middleware/error.js
  git commit -m "feat(core): add AppError and central error middleware"
  ```

---

### Task S-5: Failing health-check test (RED)

This is the first TDD step: write the test before the app exists, watch it fail, then build the minimum to make it pass in S-6.

**Files:** `D:/smart-farming/tests/health.test.js`

- [ ] **Step 1: Write the failing test.** It imports the app from `src/app.js` (which does not exist yet) and asserts `GET /api/health` returns `200` with `{ status: 'ok' }`. Using supertest against the exported app means no real network port is opened.

  Create `D:/smart-farming/tests/health.test.js`:
  ```js
  import request from 'supertest';
  import app from '../src/app.js';

  describe('GET /api/health', () => {
    it('returns 200 and { status: "ok" }', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('returns { error: { code, message } } for an unknown route', async () => {
      const res = await request(app).get('/api/does-not-exist');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error.code', 'NOT_FOUND');
      expect(res.body).toHaveProperty('error.message');
    });
  });
  ```

- [ ] **Step 2: Run the test and confirm it FAILS.**
  ```
  npm test -- tests/health.test.js
  ```
  Expected: FAIL. Jest cannot resolve the import and reports something like `Cannot find module '../src/app.js'` (the app and its router do not exist yet).

- [ ] **Step 3: Commit the red test.**
  ```
  git add tests/health.test.js
  git commit -m "test(health): add failing health-check and 404 tests"
  ```

---

### Task S-6: Build the Express app, router, health route, and server (GREEN)

Now write the minimum to make S-5 pass: the `/api` router with a `health` route, a catch-all 404 that throws `AppError`, the app wiring (JSON body parser, mount router, error middleware LAST), and the listen-only server file.

**Files:** `D:/smart-farming/src/routes/index.routes.js`, `D:/smart-farming/src/app.js`, `D:/smart-farming/src/server.js`

- [ ] **Step 1: Create the `/api` router placeholder with the health route.** Other modules will mount their sub-routers onto this same router later. For now it exposes `GET /health`. This file exports an Express `Router`.

  Create `D:/smart-farming/src/routes/index.routes.js`:
  ```js
  import { Router } from 'express';

  const router = Router();

  // Liveness probe — no auth, no DB. Used by tests and uptime monitors.
  router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  export default router;
  ```

- [ ] **Step 2: Create `src/app.js`.** It builds and exports the Express app but never calls `listen` (that belongs in `server.js` so tests can import the app without opening a port). Order matters: JSON parser first, then the `/api` router, then a catch-all that throws `AppError(404,'NOT_FOUND',...)`, then the error middleware LAST.

  Create `D:/smart-farming/src/app.js`:
  ```js
  import express from 'express';
  import apiRouter from './routes/index.routes.js';
  import { AppError } from './utils/AppError.js';
  import { errorHandler } from './middleware/error.js';

  export function buildApp() {
    const app = express();

    // Parse JSON bodies.
    app.use(express.json());

    // All routes live under /api.
    app.use('/api', apiRouter);

    // Anything else is a not-found — throw so the error middleware shapes it.
    app.use((req, res, next) => {
      next(new AppError(404, 'NOT_FOUND', 'Not found'));
    });

    // Central error handler MUST be last.
    app.use(errorHandler);

    return app;
  }

  export const app = buildApp();
  export default app;
  ```

- [ ] **Step 3: Create `src/server.js`.** This is the only place that opens a port. It connects to MongoDB first, then listens. It imports the shared `app`.

  Create `D:/smart-farming/src/server.js`:
  ```js
  import app from './app.js';
  import env from './config/env.js';
  import { connectDb } from './config/db.js';

  async function start() {
    await connectDb(env.MONGODB_URI);
    app.listen(env.PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Smart Farming API listening on port ${env.PORT}`);
    });
  }

  start().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', err);
    process.exit(1);
  });
  ```

  Note: `server.js` imports `src/config/db.js`, which you create in the next step. The health test only imports `app.js`, so it does not need the DB — but keeping the import here documents the real boot sequence.

- [ ] **Step 4: Create `src/config/db.js`.** A thin wrapper around `mongoose.connect`. `server.js` uses it for the real DB; the test harness (S-7) calls it with the in-memory Mongo URI.

  Create `D:/smart-farming/src/config/db.js`:
  ```js
  import mongoose from 'mongoose';

  /**
   * Connect Mongoose to the given URI.
   * @param {string} uri MongoDB connection string.
   */
  export async function connectDb(uri) {
    if (!uri) {
      throw new Error('connectDb: a MongoDB URI is required');
    }
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri);
    return mongoose.connection;
  }

  /** Disconnect Mongoose (used on shutdown and in tests). */
  export async function disconnectDb() {
    await mongoose.disconnect();
  }

  export default connectDb;
  ```

- [ ] **Step 4: Run the test and confirm it PASSES.**
  ```
  npm test -- tests/health.test.js
  ```
  Expected: PASS. Both tests green — `GET /api/health` returns `200 { status: 'ok' }`, and the unknown route returns `404 { error: { code: 'NOT_FOUND', message: 'Not found' } }`.

- [ ] **Step 5: Commit.**
  ```
  git add src/routes/index.routes.js src/app.js src/server.js src/config/db.js
  git commit -m "feat(core): add Express app, /api router, health route, and server"
  ```

---

### Task S-7: Test harness — in-memory Mongo helper

**Files:** `D:/smart-farming/tests/helpers/db.js`

- [ ] **Step 1: Create the DB helper.** It boots one `mongodb-memory-server` for the whole suite, connects Mongoose to it (`beforeAll`), clears every collection after each test (`afterEach`) so tests are isolated, and tears down (`afterAll`). Exposing `setupTestDb()` lets each test file opt in with a single call. This is why the `test` script uses `--runInBand`: a single shared in-memory server.

  Create `D:/smart-farming/tests/helpers/db.js`:
  ```js
  import mongoose from 'mongoose';
  import { MongoMemoryServer } from 'mongodb-memory-server';

  let mongod;

  /**
   * Wire up an isolated in-memory MongoDB for a test file.
   * Call once at the top of a describe-less test module or inside describe().
   */
  export function setupTestDb() {
    beforeAll(async () => {
      mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      mongoose.set('strictQuery', true);
      await mongoose.connect(uri);
    });

    afterEach(async () => {
      const { collections } = mongoose.connection;
      for (const key of Object.keys(collections)) {
        await collections[key].deleteMany({});
      }
    });

    afterAll(async () => {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
      if (mongod) {
        await mongod.stop();
      }
    });
  }

  export default setupTestDb;
  ```

- [ ] **Step 2: Commit.**
  ```
  git add tests/helpers/db.js
  git commit -m "test(harness): add in-memory MongoDB setup helper"
  ```

---

### Task S-8: Test harness — factory and auth helper stubs

These stubs establish the exact shape and signatures other modules will import. They intentionally return the minimum needed now; the AUTH and model modules will flesh out the real fields against the contract. Keeping the signatures fixed here prevents churn later.

**Files:** `D:/smart-farming/tests/helpers/factories.js`, `D:/smart-farming/tests/helpers/auth.js`

- [ ] **Step 1: Create `tests/helpers/factories.js`.** Factories build valid documents with sensible defaults and allow per-test overrides. They deliberately depend on the Mongoose models by path; those model files are created in later modules. Until then these helpers are imported only by tests in those modules, so the health test (which does not import them) still passes. Field names match the contract EXACTLY (`phone`, `passwordHash`, `consentGiven`, etc.).

  Create `D:/smart-farming/tests/helpers/factories.js`:
  ```js
  import bcrypt from 'bcrypt';

  /**
   * Default attributes for a Farmer document (contract field names).
   * Pass overrides to change any field.
   * @param {object} [overrides]
   */
  export async function farmerAttrs(overrides = {}) {
    const password = overrides.password ?? 'password123';
    const passwordHash = await bcrypt.hash(password, 10);
    const attrs = {
      name: 'Test Farmer',
      phone: '9000000001',
      village: 'Testville',
      state: 'MH',
      district: 'Pune',
      preferredLanguage: 'en',
      passwordHash,
      status: 'active',
      tokenVersion: 0,
      consentGiven: true,
      consentAt: new Date(),
      consentVersion: 'v1',
      consentPurpose: 'app-usage',
      createdAt: new Date(),
      ...overrides,
    };
    delete attrs.password;
    return attrs;
  }

  /**
   * Default attributes for an Admin document (contract field names).
   * @param {object} [overrides]
   */
  export async function adminAttrs(overrides = {}) {
    const password = overrides.password ?? 'password123';
    const passwordHash = await bcrypt.hash(password, 10);
    const attrs = {
      name: 'Test Admin',
      email: 'admin@example.com',
      passwordHash,
      role: 'admin',
      tokenVersion: 0,
      ...overrides,
    };
    delete attrs.password;
    return attrs;
  }

  export default { farmerAttrs, adminAttrs };
  ```

- [ ] **Step 2: Create `tests/helpers/auth.js`.** A helper that signs a valid access token for a given user id/role/tokenVersion, using the SAME payload shape (`{ sub, role, tokenVersion }`) and the SAME secret env var (`JWT_ACCESS_SECRET`) the real `authenticate` middleware will verify. Tests use this to make authenticated requests without going through login.

  Create `D:/smart-farming/tests/helpers/auth.js`:
  ```js
  import jwt from 'jsonwebtoken';
  import env from '../../src/config/env.js';

  /**
   * Sign a valid access token matching the contract payload { sub, role, tokenVersion }.
   * @param {object} params
   * @param {string} params.id User _id as a string (becomes `sub`).
   * @param {string} params.role 'farmer' | 'admin' | 'superadmin'.
   * @param {number} [params.tokenVersion=0] Must match the user's tokenVersion.
   * @returns {string} A signed JWT.
   */
  export function signAccessToken({ id, role, tokenVersion = 0 }) {
    return jwt.sign(
      { sub: id, role, tokenVersion },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.ACCESS_TOKEN_TTL },
    );
  }

  /**
   * Build an Authorization header value for supertest:
   *   request(app).get(url).set(...authHeader({ id, role }))
   * @param {object} params Same as signAccessToken.
   * @returns {[string, string]} Tuple usable with supertest's .set().
   */
  export function authHeader(params) {
    return ['Authorization', `Bearer ${signAccessToken(params)}`];
  }

  export default { signAccessToken, authHeader };
  ```

- [ ] **Step 3: Sanity-run the full suite.** Confirm nothing is broken and the health suite still passes. The new helper files are not imported by any test yet, so Jest simply does not execute them.
  ```
  npm test
  ```
  Expected: PASS. One test suite runs (`tests/health.test.js`) with 2 passing tests; the helper files are present but not yet referenced.

- [ ] **Step 4: Commit.**
  ```
  git add tests/helpers/factories.js tests/helpers/auth.js
  git commit -m "test(harness): add farmer/admin factories and token-signing auth helper"
  ```

---

**Module S complete.** The project now has: a Node ESM scaffold with the exact scripts, validated env config, `AppError` + central error middleware, a running Express app exported from `src/app.js` with `GET /api/health` and a JSON 404, a listen-only `src/server.js`, and a test harness (`db.js` + `factories.js` + `auth.js`) ready for every downstream module. The commit rhythm — failing test, minimal code, passing test, commit — is established.

---

## Module AUTH — Authentication & tokens

**Files:**
- Create: `src/utils/AppError.js` (test: covered via endpoint tests)
- Create: `src/config/env.js`
- Create: `src/config/db.js`
- Create: `src/app.js`
- Create: `src/models/farmer.model.js`
- Create: `src/models/admin.model.js`
- Create: `src/models/refreshToken.model.js`
- Create: `src/models/subscription.model.js`
- Create: `src/utils/password.js`
- Create: `src/utils/jwt.js`
- Create: `src/middleware/error.js`
- Create: `src/middleware/validate.js`
- Create: `src/middleware/authenticate.js`
- Create: `src/middleware/requireRole.js`
- Create: `src/services/auth.service.js`
- Create: `src/controllers/auth.controller.js`
- Create: `src/routes/auth.routes.js`
- Create: `tests/helpers/db.js`
- Create: `tests/helpers/factories.js`
- Create: `tests/helpers/auth.js`
- Create: `tests/utils.password.test.js`
- Create: `tests/utils.jwt.test.js`
- Create: `tests/auth.register.test.js`
- Create: `tests/auth.login.test.js`
- Create: `tests/auth.refresh.test.js`
- Create: `tests/auth.changePassword.test.js`
- Create: `tests/middleware.authenticate.test.js`

---

### Task AUTH-1: Project bootstrap, env config, AppError, and test harness

**Files:** `package.json`, `jest.config.js`, `.env.test`, `src/config/env.js`, `src/utils/AppError.js`, `src/config/db.js`, `tests/helpers/db.js`, `src/app.js`, `src/middleware/error.js`, `tests/app.health.test.js`

- [ ] **Step 1: Initialize the project and install dependencies.** Run these exact commands from `D:/smart-farming`:
  ```
  npm init -y
  npm install express@4 mongoose@8 zod bcrypt jsonwebtoken express-rate-limit dotenv cloudinary firebase-admin
  npm install -D jest supertest mongodb-memory-server cross-env
  ```

- [ ] **Step 2: Set `package.json` to ESM and add the test script.** Edit `package.json` so it contains these fields (keep the generated dependency versions):
  ```json
  {
    "name": "smart-farming",
    "version": "1.0.0",
    "type": "module",
    "scripts": {
      "test": "cross-env NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules jest --runInBand",
      "start": "node src/server.js"
    }
  }
  ```

- [ ] **Step 3: Create the Jest config.** Write `jest.config.js`:
  ```js
  export default {
    testEnvironment: 'node',
    transform: {},
    testMatch: ['**/tests/**/*.test.js'],
    testTimeout: 30000,
  };
  ```

- [ ] **Step 4: Create the test env file.** Write `.env.test`:
  ```
  NODE_ENV=test
  JWT_ACCESS_SECRET=test_access_secret_change_me
  JWT_REFRESH_SECRET=test_refresh_secret_change_me
  ACCESS_TOKEN_TTL=15m
  REFRESH_TOKEN_TTL=30d
  MONGODB_URI=mongodb://localhost:27017/smartfarming_test
  ```

- [ ] **Step 5: Write the failing health test.** Write `tests/app.health.test.js`:
  ```js
  import request from 'supertest';
  import app from '../src/app.js';

  describe('GET /api/health', () => {
    it('returns 200 and { status: "ok" }', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('unknown route', () => {
    it('returns a 404 AppError JSON shape', async () => {
      const res = await request(app).get('/api/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    });
  });
  ```

- [ ] **Step 6: Run the test and expect FAIL.** Run:
  ```
  npm test -- tests/app.health.test.js
  ```
  Expected: FAIL — `Cannot find module '../src/app.js'` (the app does not exist yet).

- [ ] **Step 7: Create `src/utils/AppError.js`.**
  ```js
  export default class AppError extends Error {
    constructor(statusCode, code, message) {
      super(message);
      this.name = 'AppError';
      this.statusCode = statusCode;
      this.code = code;
      this.isOperational = true;
    }
  }
  ```

- [ ] **Step 8: Create `src/config/env.js`.** Reads and validates env with zod. Loads `.env.test` when `NODE_ENV=test`, otherwise `.env`.
  ```js
  import dotenv from 'dotenv';
  import { z } from 'zod';

  const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
  dotenv.config({ path: envFile });

  const schema = z.object({
    NODE_ENV: z.string().default('development'),
    JWT_ACCESS_SECRET: z.string().min(1),
    JWT_REFRESH_SECRET: z.string().min(1),
    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL: z.string().default('30d'),
    MONGODB_URI: z.string().min(1),
  });

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  export const env = parsed.data;
  ```

- [ ] **Step 9: Create `src/config/db.js`.**
  ```js
  import mongoose from 'mongoose';
  import { env } from './env.js';

  export async function connectDb(uri = env.MONGODB_URI) {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri);
    return mongoose.connection;
  }

  export async function disconnectDb() {
    await mongoose.disconnect();
  }
  ```

- [ ] **Step 10: Create `src/middleware/error.js`.** Central error middleware mapping `AppError` -> JSON, plus a `notFound` handler.
  ```js
  import AppError from '../utils/AppError.js';

  export function notFound(req, res, next) {
    next(new AppError(404, 'NOT_FOUND', 'Not found'));
  }

  // eslint-disable-next-line no-unused-vars
  export function errorHandler(err, req, res, next) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    }
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  }
  ```

- [ ] **Step 11: Create `src/app.js`.** Builds the Express app, mounts `/api/health`, then `notFound` + `errorHandler`. NO `app.listen`.
  ```js
  import express from 'express';
  import { notFound, errorHandler } from './middleware/error.js';

  export function buildApp() {
    const app = express();
    app.use(express.json());

    app.get('/api/health', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    // Routes are mounted here in later tasks, e.g. app.use('/api/auth', authRoutes);

    app.use(notFound);
    app.use(errorHandler);
    return app;
  }

  const app = buildApp();
  export default app;
  ```

- [ ] **Step 12: Create the DB test helper `tests/helpers/db.js`.** Starts `mongodb-memory-server`, connects Mongoose, clears collections after each test, stops after all.
  ```js
  import mongoose from 'mongoose';
  import { MongoMemoryServer } from 'mongodb-memory-server';

  let mongod;

  export async function connectTestDb() {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri);
  }

  export async function clearTestDb() {
    const { collections } = mongoose.connection;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
  }

  export async function stopTestDb() {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
  ```

- [ ] **Step 13: Run the health test and expect PASS.** Run:
  ```
  npm test -- tests/app.health.test.js
  ```
  Expected: PASS — 2 passing tests (health returns ok; unknown route returns the 404 AppError shape).

- [ ] **Step 14: Commit.**
  ```
  git add -A && git commit -m "chore(auth): bootstrap app, env, AppError, error middleware, test harness"
  ```

---

### Task AUTH-2: Farmer, Admin, RefreshToken, and Subscription models

**Files:** `src/models/farmer.model.js`, `src/models/admin.model.js`, `src/models/refreshToken.model.js`, `src/models/subscription.model.js`, `tests/models.test.js`

- [ ] **Step 1: Write the failing model test.** Write `tests/models.test.js`:
  ```js
  import { beforeAll, afterEach, afterAll, describe, it, expect } from '@jest/globals';
  import { connectTestDb, clearTestDb, stopTestDb } from './helpers/db.js';
  import Farmer from '../src/models/farmer.model.js';
  import Admin from '../src/models/admin.model.js';
  import RefreshToken from '../src/models/refreshToken.model.js';
  import Subscription from '../src/models/subscription.model.js';

  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(stopTestDb);

  describe('Farmer model', () => {
    it('applies defaults and requires phone/name/passwordHash/consent', async () => {
      const f = await Farmer.create({
        name: 'Ravi',
        phone: '9990001111',
        passwordHash: 'hash',
        consentGiven: true,
        consentAt: new Date(),
        consentVersion: 'v1',
        consentPurpose: 'app-usage',
      });
      expect(f.status).toBe('active');
      expect(f.tokenVersion).toBe(0);
      expect(f.preferredLanguage).toBe('en');
      expect(f.createdAt).toBeInstanceOf(Date);
    });

    it('enforces unique phone', async () => {
      const base = {
        name: 'A', phone: '9990002222', passwordHash: 'h',
        consentGiven: true, consentAt: new Date(), consentVersion: 'v1', consentPurpose: 'app',
      };
      await Farmer.create(base);
      await expect(Farmer.create({ ...base, name: 'B' })).rejects.toThrow();
    });

    it('rejects an invalid status enum', async () => {
      await expect(Farmer.create({
        name: 'X', phone: '9990003333', passwordHash: 'h', status: 'bogus',
        consentGiven: true, consentAt: new Date(), consentVersion: 'v1', consentPurpose: 'app',
      })).rejects.toThrow();
    });
  });

  describe('Admin model', () => {
    it('creates an admin with role and unique email', async () => {
      const a = await Admin.create({ name: 'Boss', email: 'boss@x.com', passwordHash: 'h', role: 'admin' });
      expect(a.role).toBe('admin');
      expect(a.tokenVersion).toBe(0);
      await expect(Admin.create({ name: 'Dup', email: 'boss@x.com', passwordHash: 'h', role: 'admin' }))
        .rejects.toThrow();
    });
  });

  describe('RefreshToken model', () => {
    it('defaults revokedAt to null', async () => {
      const rt = await RefreshToken.create({
        userId: new (await import('mongoose')).default.Types.ObjectId(),
        userType: 'farmer', tokenHash: 'abc', issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
      });
      expect(rt.revokedAt).toBeNull();
    });
  });

  describe('Subscription model', () => {
    it('enforces unique farmerId and a valid status enum', async () => {
      const farmerId = new (await import('mongoose')).default.Types.ObjectId();
      const s = await Subscription.create({ farmerId, status: 'pending_approval' });
      expect(s.plan).toBe('monthly');
      await expect(Subscription.create({ farmerId, status: 'trial' })).rejects.toThrow();
    });
  });
  ```

- [ ] **Step 2: Run the test and expect FAIL.** Run:
  ```
  npm test -- tests/models.test.js
  ```
  Expected: FAIL — `Cannot find module '../src/models/farmer.model.js'`.

- [ ] **Step 3: Create `src/models/farmer.model.js`.**
  ```js
  import mongoose from 'mongoose';

  const farmerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true, index: true },
    village: { type: String },
    state: { type: String },
    district: { type: String },
    preferredLanguage: { type: String, default: 'en' },
    passwordHash: { type: String, required: true },
    status: { type: String, enum: ['active', 'suspended', 'deactivated'], default: 'active' },
    tokenVersion: { type: Number, default: 0 },
    consentGiven: { type: Boolean, required: true },
    consentAt: { type: Date, required: true },
    consentVersion: { type: String, required: true },
    consentPurpose: { type: String, required: true },
    deactivatedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  });

  export default mongoose.model('Farmer', farmerSchema);
  ```

- [ ] **Step 4: Create `src/models/admin.model.js`.**
  ```js
  import mongoose from 'mongoose';

  const adminSchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String, unique: true },
    passwordHash: { type: String },
    role: { type: String, enum: ['admin', 'superadmin'] },
    tokenVersion: { type: Number, default: 0 },
  });

  export default mongoose.model('Admin', adminSchema);
  ```

- [ ] **Step 5: Create `src/models/refreshToken.model.js`.**
  ```js
  import mongoose from 'mongoose';

  const refreshTokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userType: { type: String, enum: ['farmer', 'admin'], required: true },
    tokenHash: { type: String, required: true },
    issuedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  });

  export default mongoose.model('RefreshToken', refreshTokenSchema);
  ```

- [ ] **Step 6: Create `src/models/subscription.model.js`.**
  ```js
  import mongoose from 'mongoose';

  const subscriptionSchema = new mongoose.Schema({
    farmerId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    status: {
      type: String,
      enum: ['pending_approval', 'trial', 'active', 'grace', 'expired', 'suspended'],
      required: true,
    },
    plan: { type: String, default: 'monthly' },
    trialStartedAt: { type: Date },
    trialEndsAt: { type: Date },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    approvedByAdminId: { type: mongoose.Schema.Types.ObjectId },
    approvedAt: { type: Date },
    activatedByAdminId: { type: mongoose.Schema.Types.ObjectId },
    notes: { type: String },
  });

  subscriptionSchema.index({ farmerId: 1 }, { unique: true });
  subscriptionSchema.index({ status: 1, trialEndsAt: 1 });
  subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

  export default mongoose.model('Subscription', subscriptionSchema);
  ```

- [ ] **Step 7: Run the test and expect PASS.** Run:
  ```
  npm test -- tests/models.test.js
  ```
  Expected: PASS — all model tests green (defaults, unique phone, enum rejection, unique email, revokedAt null, unique farmerId). Note: unique-index tests rely on `mongodb-memory-server` building indexes; if a unique test flakes on the very first run, it is because indexes build asynchronously — the models call `mongoose.model` which registers `unique:true`, and `mongodb-memory-server` honors it. Keep `--runInBand`.

- [ ] **Step 8: Commit.**
  ```
  git add -A && git commit -m "feat(auth): add Farmer, Admin, RefreshToken, Subscription models"
  ```

---

### Task AUTH-3: Password hashing util

**Files:** `src/utils/password.js`, `tests/utils.password.test.js`

- [ ] **Step 1: Write the failing test.** Write `tests/utils.password.test.js`:
  ```js
  import { describe, it, expect } from '@jest/globals';
  import { hashPassword, verifyPassword } from '../src/utils/password.js';

  describe('password util', () => {
    it('hashes a password to something other than the plaintext', async () => {
      const hash = await hashPassword('supersecret1');
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe('supersecret1');
      expect(hash.length).toBeGreaterThan(20);
    });

    it('verifies a correct password', async () => {
      const hash = await hashPassword('supersecret1');
      await expect(verifyPassword('supersecret1', hash)).resolves.toBe(true);
    });

    it('rejects an incorrect password', async () => {
      const hash = await hashPassword('supersecret1');
      await expect(verifyPassword('wrongpass1', hash)).resolves.toBe(false);
    });
  });
  ```

- [ ] **Step 2: Run the test and expect FAIL.** Run:
  ```
  npm test -- tests/utils.password.test.js
  ```
  Expected: FAIL — `Cannot find module '../src/utils/password.js'`.

- [ ] **Step 3: Create `src/utils/password.js`.**
  ```js
  import bcrypt from 'bcrypt';

  const SALT_ROUNDS = 10;

  export async function hashPassword(plain) {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  export async function verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  }
  ```

- [ ] **Step 4: Run the test and expect PASS.** Run:
  ```
  npm test -- tests/utils.password.test.js
  ```
  Expected: PASS — 3 passing tests.

- [ ] **Step 5: Commit.**
  ```
  git add -A && git commit -m "feat(auth): add bcrypt password hashing util"
  ```

---

### Task AUTH-4: JWT util (access/refresh sign+verify, tokenVersion, refresh token hashing)

**Files:** `src/utils/jwt.js`, `tests/utils.jwt.test.js`

- [ ] **Step 1: Write the failing test.** Write `tests/utils.jwt.test.js`:
  ```js
  import { describe, it, expect } from '@jest/globals';
  import {
    signAccessToken,
    verifyAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    hashRefreshToken,
  } from '../src/utils/jwt.js';

  describe('access token', () => {
    it('signs and verifies, preserving sub/role/tokenVersion', () => {
      const token = signAccessToken({ sub: 'abc123', role: 'farmer', tokenVersion: 2 });
      const payload = verifyAccessToken(token);
      expect(payload.sub).toBe('abc123');
      expect(payload.role).toBe('farmer');
      expect(payload.tokenVersion).toBe(2);
    });

    it('throws on a tampered/invalid access token', () => {
      expect(() => verifyAccessToken('not.a.jwt')).toThrow();
    });
  });

  describe('refresh token', () => {
    it('signs and verifies, preserving sub and jti', () => {
      const token = signRefreshToken({ sub: 'abc123', jti: 'jti-1' });
      const payload = verifyRefreshToken(token);
      expect(payload.sub).toBe('abc123');
      expect(payload.jti).toBe('jti-1');
    });

    it('hashRefreshToken is deterministic and not the raw token', () => {
      const token = signRefreshToken({ sub: 'abc123', jti: 'jti-2' });
      const h1 = hashRefreshToken(token);
      const h2 = hashRefreshToken(token);
      expect(h1).toBe(h2);
      expect(h1).not.toBe(token);
      expect(h1).toHaveLength(64); // sha256 hex
    });
  });
  ```

- [ ] **Step 2: Run the test and expect FAIL.** Run:
  ```
  npm test -- tests/utils.jwt.test.js
  ```
  Expected: FAIL — `Cannot find module '../src/utils/jwt.js'`.

- [ ] **Step 3: Create `src/utils/jwt.js`.** Uses secrets/TTLs from `env`; `hashRefreshToken` uses SHA-256 (so we store only a hash, per the contract).
  ```js
  import jwt from 'jsonwebtoken';
  import crypto from 'crypto';
  import { env } from '../config/env.js';

  export function signAccessToken({ sub, role, tokenVersion }) {
    return jwt.sign({ sub, role, tokenVersion }, env.JWT_ACCESS_SECRET, {
      expiresIn: env.ACCESS_TOKEN_TTL,
    });
  }

  export function verifyAccessToken(token) {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
  }

  export function signRefreshToken({ sub, jti }) {
    return jwt.sign({ sub, jti }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.REFRESH_TOKEN_TTL,
    });
  }

  export function verifyRefreshToken(token) {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
  }

  export function hashRefreshToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
  ```

- [ ] **Step 4: Run the test and expect PASS.** Run:
  ```
  npm test -- tests/utils.jwt.test.js
  ```
  Expected: PASS — access sign/verify preserves claims, invalid token throws, refresh sign/verify preserves sub+jti, hash is deterministic 64-char hex.

- [ ] **Step 5: Commit.**
  ```
  git add -A && git commit -m "feat(auth): add JWT sign/verify util with refresh-token hashing"
  ```

---

### Task AUTH-5: validate middleware + auth service (register/login/refresh/change-password logic)

**Files:** `src/middleware/validate.js`, `src/services/auth.service.js`, `tests/helpers/factories.js`, `tests/auth.service.test.js`

- [ ] **Step 1: Create the `validate` middleware `src/middleware/validate.js`.** Validates `req.body` against a zod schema; on failure throws `AppError(400,'VALIDATION','...')`.
  ```js
  import AppError from '../utils/AppError.js';

  export function validate(schema) {
    return (req, res, next) => {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const first = result.error.issues[0];
        const message = first ? `${first.path.join('.')}: ${first.message}` : 'Validation failed';
        return next(new AppError(400, 'VALIDATION', message));
      }
      req.body = result.data;
      next();
    };
  }
  ```

- [ ] **Step 2: Write the failing auth-service test.** Write `tests/auth.service.test.js`. This drives the pure service logic against the in-memory DB (register creates farmer+subscription, login rejects pending_approval, refresh rotates, reuse revokes chain, change-password bumps tokenVersion).
  ```js
  import { beforeAll, afterEach, afterAll, describe, it, expect } from '@jest/globals';
  import { connectTestDb, clearTestDb, stopTestDb } from './helpers/db.js';
  import Farmer from '../src/models/farmer.model.js';
  import Subscription from '../src/models/subscription.model.js';
  import RefreshToken from '../src/models/refreshToken.model.js';
  import {
    registerFarmer,
    loginFarmer,
    rotateRefreshToken,
    changeFarmerPassword,
  } from '../src/services/auth.service.js';
  import { verifyPassword } from '../src/utils/password.js';
  import AppError from '../src/utils/AppError.js';

  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(stopTestDb);

  const baseReg = {
    name: 'Ravi', phone: '9990001111', password: 'supersecret1',
    village: 'Anand', state: 'Gujarat', district: 'Anand', preferredLanguage: 'gu',
    consentGiven: true, consentVersion: 'v1', consentPurpose: 'app-usage',
  };

  describe('registerFarmer', () => {
    it('creates an active farmer, a pending_approval subscription, and stores consent', async () => {
      const { farmer } = await registerFarmer(baseReg);
      expect(farmer.status).toBe('active');
      expect(farmer.consentGiven).toBe(true);
      expect(farmer.consentAt).toBeInstanceOf(Date);
      const stored = await Farmer.findById(farmer._id);
      expect(await verifyPassword('supersecret1', stored.passwordHash)).toBe(true);
      const sub = await Subscription.findOne({ farmerId: farmer._id });
      expect(sub.status).toBe('pending_approval');
    });

    it('rejects a duplicate phone with AppError 409', async () => {
      await registerFarmer(baseReg);
      await expect(registerFarmer(baseReg)).rejects.toMatchObject({ statusCode: 409, code: 'PHONE_TAKEN' });
    });
  });

  describe('loginFarmer', () => {
    it('rejects a pending_approval farmer with 403 PENDING_APPROVAL', async () => {
      const { farmer } = await registerFarmer(baseReg);
      // subscription is pending_approval by default from register
      await expect(loginFarmer({ phone: farmer.phone, password: 'supersecret1' }))
        .rejects.toMatchObject({ statusCode: 403, code: 'PENDING_APPROVAL' });
    });

    it('rejects a suspended farmer with 403', async () => {
      const { farmer } = await registerFarmer(baseReg);
      await Subscription.updateOne({ farmerId: farmer._id }, { status: 'trial' });
      await Farmer.updateOne({ _id: farmer._id }, { status: 'suspended' });
      await expect(loginFarmer({ phone: farmer.phone, password: 'supersecret1' }))
        .rejects.toMatchObject({ statusCode: 403 });
    });

    it('logs in an approved (trial) active farmer and returns tokens', async () => {
      const { farmer } = await registerFarmer(baseReg);
      await Subscription.updateOne({ farmerId: farmer._id }, { status: 'trial' });
      const out = await loginFarmer({ phone: farmer.phone, password: 'supersecret1' });
      expect(out.accessToken).toBeTruthy();
      expect(out.refreshToken).toBeTruthy();
      const count = await RefreshToken.countDocuments({ userId: farmer._id, revokedAt: null });
      expect(count).toBe(1);
    });

    it('rejects a wrong password with 401', async () => {
      const { farmer } = await registerFarmer(baseReg);
      await Subscription.updateOne({ farmerId: farmer._id }, { status: 'trial' });
      await expect(loginFarmer({ phone: farmer.phone, password: 'wrongpass1' }))
        .rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
    });
  });

  describe('rotateRefreshToken', () => {
    it('rotates: revokes the old token and issues a new valid one', async () => {
      const { farmer } = await registerFarmer(baseReg);
      await Subscription.updateOne({ farmerId: farmer._id }, { status: 'trial' });
      const { refreshToken } = await loginFarmer({ phone: farmer.phone, password: 'supersecret1' });
      const out = await rotateRefreshToken(refreshToken);
      expect(out.refreshToken).toBeTruthy();
      expect(out.refreshToken).not.toBe(refreshToken);
      const active = await RefreshToken.countDocuments({ userId: farmer._id, revokedAt: null });
      expect(active).toBe(1);
    });

    it('reuse of an already-rotated token revokes the whole chain (403)', async () => {
      const { farmer } = await registerFarmer(baseReg);
      await Subscription.updateOne({ farmerId: farmer._id }, { status: 'trial' });
      const { refreshToken } = await loginFarmer({ phone: farmer.phone, password: 'supersecret1' });
      await rotateRefreshToken(refreshToken); // first rotation OK
      await expect(rotateRefreshToken(refreshToken)) // reuse of revoked token
        .rejects.toMatchObject({ statusCode: 403, code: 'TOKEN_REUSE' });
      const active = await RefreshToken.countDocuments({ userId: farmer._id, revokedAt: null });
      expect(active).toBe(0); // whole chain revoked
    });
  });

  describe('changeFarmerPassword', () => {
    it('changes password, bumps tokenVersion, and revokes all refresh tokens', async () => {
      const { farmer } = await registerFarmer(baseReg);
      await Subscription.updateOne({ farmerId: farmer._id }, { status: 'trial' });
      await loginFarmer({ phone: farmer.phone, password: 'supersecret1' });
      await changeFarmerPassword({ farmerId: farmer._id, oldPassword: 'supersecret1', newPassword: 'brandnew123' });
      const updated = await Farmer.findById(farmer._id);
      expect(updated.tokenVersion).toBe(1);
      expect(await verifyPassword('brandnew123', updated.passwordHash)).toBe(true);
      const active = await RefreshToken.countDocuments({ userId: farmer._id, revokedAt: null });
      expect(active).toBe(0);
    });

    it('rejects a wrong old password with 401', async () => {
      const { farmer } = await registerFarmer(baseReg);
      await expect(changeFarmerPassword({ farmerId: farmer._id, oldPassword: 'nope12345', newPassword: 'brandnew123' }))
        .rejects.toMatchObject({ statusCode: 401 });
    });
  });
  ```

- [ ] **Step 3: Create the factory helper `tests/helpers/factories.js`.** Reusable creators the later endpoint tests also use.
  ```js
  import Farmer from '../../src/models/farmer.model.js';
  import Admin from '../../src/models/admin.model.js';
  import Subscription from '../../src/models/subscription.model.js';
  import { hashPassword } from '../../src/utils/password.js';

  export async function makeFarmer(overrides = {}) {
    const password = overrides.password || 'supersecret1';
    const passwordHash = await hashPassword(password);
    const farmer = await Farmer.create({
      name: overrides.name || 'Test Farmer',
      phone: overrides.phone || '9000000001',
      village: overrides.village || 'Vill',
      state: overrides.state || 'Gujarat',
      district: overrides.district || 'Anand',
      preferredLanguage: overrides.preferredLanguage || 'en',
      passwordHash,
      status: overrides.status || 'active',
      tokenVersion: overrides.tokenVersion ?? 0,
      consentGiven: true,
      consentAt: new Date(),
      consentVersion: 'v1',
      consentPurpose: 'app-usage',
    });
    const subStatus = overrides.subscriptionStatus || 'trial';
    await Subscription.create({ farmerId: farmer._id, status: subStatus });
    return { farmer, password };
  }

  export async function makeAdmin(overrides = {}) {
    const password = overrides.password || 'adminpass1';
    const passwordHash = await hashPassword(password);
    const admin = await Admin.create({
      name: overrides.name || 'Admin One',
      email: overrides.email || 'admin1@example.com',
      passwordHash,
      role: overrides.role || 'admin',
      tokenVersion: overrides.tokenVersion ?? 0,
    });
    return { admin, password };
  }
  ```

- [ ] **Step 4: Run the test and expect FAIL.** Run:
  ```
  npm test -- tests/auth.service.test.js
  ```
  Expected: FAIL — `Cannot find module '../src/services/auth.service.js'`.

- [ ] **Step 5: Create `src/services/auth.service.js`.** Implements register/login/refresh-rotation/reuse-detection/change-password using the models and utils. Emits access+refresh, stores only the refresh hash, chains refresh tokens via a `chainId`.
  ```js
  import crypto from 'crypto';
  import mongoose from 'mongoose';
  import Farmer from '../models/farmer.model.js';
  import Admin from '../models/admin.model.js';
  import Subscription from '../models/subscription.model.js';
  import RefreshToken from '../models/refreshToken.model.js';
  import AppError from '../utils/AppError.js';
  import { hashPassword, verifyPassword } from '../utils/password.js';
  import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    hashRefreshToken,
  } from '../utils/jwt.js';

  const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

  // Issue a refresh token bound to a chain. All tokens in one login share a chainId (stored in jti as `${chainId}.${unique}`).
  async function issueRefreshToken(userId, userType, chainId) {
    const jti = `${chainId}.${crypto.randomUUID()}`;
    const token = signRefreshToken({ sub: String(userId), jti });
    await RefreshToken.create({
      userId,
      userType,
      tokenHash: hashRefreshToken(token),
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      revokedAt: null,
    });
    return token;
  }

  function issueTokensPayload(user, role) {
    return signAccessToken({ sub: String(user._id), role, tokenVersion: user.tokenVersion });
  }

  export async function registerFarmer(input) {
    const existing = await Farmer.findOne({ phone: input.phone });
    if (existing) throw new AppError(409, 'PHONE_TAKEN', 'Phone number already registered');

    const passwordHash = await hashPassword(input.password);
    const farmer = await Farmer.create({
      name: input.name,
      phone: input.phone,
      village: input.village,
      state: input.state,
      district: input.district,
      preferredLanguage: input.preferredLanguage || 'en',
      passwordHash,
      status: 'active',
      consentGiven: input.consentGiven,
      consentAt: new Date(),
      consentVersion: input.consentVersion,
      consentPurpose: input.consentPurpose,
    });
    await Subscription.create({ farmerId: farmer._id, status: 'pending_approval' });
    return { farmer };
  }

  export async function loginFarmer({ phone, password }) {
    const farmer = await Farmer.findOne({ phone });
    if (!farmer) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid phone or password');

    const ok = await verifyPassword(password, farmer.passwordHash);
    if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid phone or password');

    if (farmer.status === 'suspended') throw new AppError(403, 'SUSPENDED', 'Your account is suspended');
    if (farmer.status === 'deactivated') throw new AppError(403, 'DEACTIVATED', 'Your account is deactivated');

    const sub = await Subscription.findOne({ farmerId: farmer._id });
    if (sub && sub.status === 'pending_approval') {
      throw new AppError(403, 'PENDING_APPROVAL', 'Your account is waiting for approval');
    }

    const chainId = crypto.randomUUID();
    const accessToken = issueTokensPayload(farmer, 'farmer');
    const refreshToken = await issueRefreshToken(farmer._id, 'farmer', chainId);
    return { farmer, accessToken, refreshToken };
  }

  export async function loginAdmin({ email, password }) {
    const admin = await Admin.findOne({ email });
    if (!admin) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    const ok = await verifyPassword(password, admin.passwordHash);
    if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

    const chainId = crypto.randomUUID();
    const accessToken = issueTokensPayload(admin, admin.role);
    const refreshToken = await issueRefreshToken(admin._id, 'admin', chainId);
    return { admin, accessToken, refreshToken };
  }

  // Rotation + reuse-detection. chainId is the part of jti before the first dot.
  export async function rotateRefreshToken(oldToken) {
    let payload;
    try {
      payload = verifyRefreshToken(oldToken);
    } catch {
      throw new AppError(401, 'INVALID_REFRESH', 'Invalid refresh token');
    }
    const chainId = String(payload.jti).split('.')[0];
    const oldHash = hashRefreshToken(oldToken);
    const record = await RefreshToken.findOne({ tokenHash: oldHash });

    if (!record) throw new AppError(401, 'INVALID_REFRESH', 'Invalid refresh token');

    // Reuse detection: a revoked token being presented again -> revoke the entire chain.
    if (record.revokedAt) {
      await RefreshToken.updateMany(
        { userId: record.userId, tokenHash: chainHashRegexFilter(chainId) ? undefined : undefined },
        {},
      );
      // Revoke all tokens for this user whose jti-chain matches. We stored only hashes, so revoke by userId+userType chain via a chain marker:
      await revokeChain(record.userId, chainId);
      throw new AppError(403, 'TOKEN_REUSE', 'Refresh token reuse detected');
    }

    // Rotate: revoke old, issue new in the same chain.
    record.revokedAt = new Date();
    await record.save();

    const userType = record.userType;
    const newToken = await issueRefreshToken(record.userId, userType, chainId);

    // Re-issue an access token too.
    let user;
    let role;
    if (userType === 'farmer') {
      user = await Farmer.findById(record.userId);
      role = 'farmer';
    } else {
      user = await Admin.findById(record.userId);
      role = user.role;
    }
    const accessToken = signAccessToken({ sub: String(user._id), role, tokenVersion: user.tokenVersion });
    return { accessToken, refreshToken: newToken, userType };
  }

  // Helper placeholder kept for readability; real revoke below.
  function chainHashRegexFilter() {
    return false;
  }

  // Revoke every non-revoked refresh token belonging to this chain.
  // We identify chain membership by re-deriving: we store the chainId inside a side field.
  async function revokeChain(userId, chainId) {
    await RefreshToken.updateMany(
      { userId, chainId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }

  export async function changeFarmerPassword({ farmerId, oldPassword, newPassword }) {
    const farmer = await Farmer.findById(farmerId);
    if (!farmer) throw new AppError(404, 'NOT_FOUND', 'Not found');
    const ok = await verifyPassword(oldPassword, farmer.passwordHash);
    if (!ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Old password is incorrect');

    farmer.passwordHash = await hashPassword(newPassword);
    farmer.tokenVersion += 1;
    await farmer.save();

    await RefreshToken.updateMany(
      { userId: farmer._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    return { farmer };
  }

  export async function logout(refreshToken) {
    if (!refreshToken) return;
    const hash = hashRefreshToken(refreshToken);
    await RefreshToken.updateOne({ tokenHash: hash, revokedAt: null }, { $set: { revokedAt: new Date() } });
  }
  ```
  **Note:** the `revokeChain` helper needs a `chainId` field on refresh tokens. Update `src/models/refreshToken.model.js` to add it (this keeps chain revocation simple and index-friendly). Add to the schema:
  ```js
  chainId: { type: String, index: true },
  ```
  and set it when creating tokens by extending `issueRefreshToken` to store `chainId`. Replace the `RefreshToken.create({...})` call inside `issueRefreshToken` with:
  ```js
  await RefreshToken.create({
    userId,
    userType,
    chainId,
    tokenHash: hashRefreshToken(token),
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    revokedAt: null,
  });
  ```
  Also delete the dead `chainHashRegexFilter` usage — simplify the reuse branch to:
  ```js
  if (record.revokedAt) {
    await revokeChain(record.userId, chainId);
    throw new AppError(403, 'TOKEN_REUSE', 'Refresh token reuse detected');
  }
  ```

- [ ] **Step 6: Apply the two edits from the note.** Edit `src/models/refreshToken.model.js` to add `chainId: { type: String, index: true }` after `tokenHash`. Edit `src/services/auth.service.js` so `issueRefreshToken` stores `chainId`, and the reuse branch is the simplified version (no `chainHashRegexFilter`). Final `issueRefreshToken` and reuse branch:
  ```js
  async function issueRefreshToken(userId, userType, chainId) {
    const jti = `${chainId}.${crypto.randomUUID()}`;
    const token = signRefreshToken({ sub: String(userId), jti });
    await RefreshToken.create({
      userId,
      userType,
      chainId,
      tokenHash: hashRefreshToken(token),
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      revokedAt: null,
    });
    return token;
  }
  ```
  and remove the `chainHashRegexFilter` function entirely.

- [ ] **Step 7: Run the test and expect PASS.** Run:
  ```
  npm test -- tests/auth.service.test.js
  ```
  Expected: PASS — register creates farmer+pending subscription and hashes password; duplicate phone -> 409 PHONE_TAKEN; pending_approval login -> 403 PENDING_APPROVAL; suspended -> 403; approved login returns tokens with exactly 1 active refresh token; wrong password -> 401; rotation revokes old + issues new (still 1 active); reuse -> 403 TOKEN_REUSE and 0 active (chain revoked); change-password bumps tokenVersion to 1, re-hashes, revokes all refresh tokens.

- [ ] **Step 8: Commit.**
  ```
  git add -A && git commit -m "feat(auth): auth service (register/login/refresh-rotation/reuse/change-password) + validate middleware + factories"
  ```

---

### Task AUTH-6: authenticate + requireRole middleware

**Files:** `src/middleware/authenticate.js`, `src/middleware/requireRole.js`, `tests/helpers/auth.js`, `tests/middleware.authenticate.test.js`

- [ ] **Step 1: Create the token test helper `tests/helpers/auth.js`.** Signs a valid access token for a created user (used by many later modules).
  ```js
  import { signAccessToken } from '../../src/utils/jwt.js';

  export function farmerToken(farmer) {
    return signAccessToken({ sub: String(farmer._id), role: 'farmer', tokenVersion: farmer.tokenVersion });
  }

  export function adminToken(admin) {
    return signAccessToken({ sub: String(admin._id), role: admin.role, tokenVersion: admin.tokenVersion });
  }

  export function bearer(token) {
    return { Authorization: `Bearer ${token}` };
  }
  ```

- [ ] **Step 2: Write the failing middleware test.** Write `tests/middleware.authenticate.test.js`. It mounts a tiny throwaway router that uses the real middleware against the in-memory DB.
  ```js
  import { beforeAll, afterEach, afterAll, describe, it, expect } from '@jest/globals';
  import express from 'express';
  import request from 'supertest';
  import { connectTestDb, clearTestDb, stopTestDb } from './helpers/db.js';
  import { makeFarmer, makeAdmin } from './helpers/factories.js';
  import { farmerToken, adminToken, bearer } from './helpers/auth.js';
  import { authenticate } from '../src/middleware/authenticate.js';
  import { requireRole } from '../src/middleware/requireRole.js';
  import { notFound, errorHandler } from '../src/middleware/error.js';
  import Farmer from '../src/models/farmer.model.js';

  function buildTestApp() {
    const app = express();
    app.use(express.json());
    app.get('/whoami', authenticate, (req, res) => res.json(req.user));
    app.get('/admin-only', authenticate, requireRole('admin', 'superadmin'), (req, res) =>
      res.json({ ok: true }),
    );
    app.use(notFound);
    app.use(errorHandler);
    return app;
  }

  const app = buildTestApp();

  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(stopTestDb);

  describe('authenticate middleware', () => {
    it('401 when no Authorization header', async () => {
      const res = await request(app).get('/whoami');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('401 on a malformed token', async () => {
      const res = await request(app).get('/whoami').set(bearer('not.a.jwt'));
      expect(res.status).toBe(401);
    });

    it('attaches req.user for a valid farmer token', async () => {
      const { farmer } = await makeFarmer();
      const res = await request(app).get('/whoami').set(bearer(farmerToken(farmer)));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(String(farmer._id));
      expect(res.body.role).toBe('farmer');
    });

    it('401 when tokenVersion is stale', async () => {
      const { farmer } = await makeFarmer();
      const token = farmerToken(farmer); // tokenVersion 0
      await Farmer.updateOne({ _id: farmer._id }, { $inc: { tokenVersion: 1 } }); // now 1
      const res = await request(app).get('/whoami').set(bearer(token));
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_VERSION_MISMATCH');
    });
  });

  describe('requireRole middleware', () => {
    it('403 for a farmer hitting an admin-only route', async () => {
      const { farmer } = await makeFarmer();
      const res = await request(app).get('/admin-only').set(bearer(farmerToken(farmer)));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('200 for an admin hitting an admin-only route', async () => {
      const { admin } = await makeAdmin();
      const res = await request(app).get('/admin-only').set(bearer(adminToken(admin)));
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });
  ```

- [ ] **Step 3: Run the test and expect FAIL.** Run:
  ```
  npm test -- tests/middleware.authenticate.test.js
  ```
  Expected: FAIL — `Cannot find module '../src/middleware/authenticate.js'`.

- [ ] **Step 4: Create `src/middleware/authenticate.js`.** Verifies the access JWT, loads the user by `sub` (farmer or admin), asserts `tokenVersion` match, attaches `req.user = { id, role, tokenVersion }`.
  ```js
  import AppError from '../utils/AppError.js';
  import { verifyAccessToken } from '../utils/jwt.js';
  import Farmer from '../models/farmer.model.js';
  import Admin from '../models/admin.model.js';

  export async function authenticate(req, res, next) {
    try {
      const header = req.headers.authorization || '';
      const [scheme, token] = header.split(' ');
      if (scheme !== 'Bearer' || !token) {
        throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
      }

      let payload;
      try {
        payload = verifyAccessToken(token);
      } catch {
        throw new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired token');
      }

      const { sub, role, tokenVersion } = payload;
      const user = role === 'farmer' ? await Farmer.findById(sub) : await Admin.findById(sub);
      if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');

      if (user.tokenVersion !== tokenVersion) {
        throw new AppError(401, 'TOKEN_VERSION_MISMATCH', 'Session expired, please log in again');
      }

      req.user = { id: String(user._id), role, tokenVersion: user.tokenVersion };
      next();
    } catch (err) {
      next(err);
    }
  }
  ```

- [ ] **Step 5: Create `src/middleware/requireRole.js`.**
  ```js
  import AppError from '../utils/AppError.js';

  export function requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action'));
      }
      next();
    };
  }
  ```

- [ ] **Step 6: Run the test and expect PASS.** Run:
  ```
  npm test -- tests/middleware.authenticate.test.js
  ```
  Expected: PASS — missing header -> 401 UNAUTHENTICATED; malformed token -> 401; valid farmer token attaches `req.user`; stale tokenVersion -> 401 TOKEN_VERSION_MISMATCH; farmer on admin route -> 403 FORBIDDEN; admin on admin route -> 200.

- [ ] **Step 7: Commit.**
  ```
  git add -A && git commit -m "feat(auth): authenticate + requireRole middleware with tokenVersion check"
  ```

---

### Task AUTH-7: Auth routes + controller wired into the app (register/login/refresh/logout/change-password)

**Files:** `src/controllers/auth.controller.js`, `src/routes/auth.routes.js`, `src/middleware/rateLimit.js`, `src/app.js` (modify), `tests/auth.register.test.js`, `tests/auth.login.test.js`, `tests/auth.refresh.test.js`, `tests/auth.changePassword.test.js`

- [ ] **Step 1: Write the failing register endpoint test.** Write `tests/auth.register.test.js`:
  ```js
  import { beforeAll, afterEach, afterAll, describe, it, expect } from '@jest/globals';
  import request from 'supertest';
  import app from '../src/app.js';
  import { connectTestDb, clearTestDb, stopTestDb } from './helpers/db.js';
  import Farmer from '../src/models/farmer.model.js';
  import Subscription from '../src/models/subscription.model.js';

  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(stopTestDb);

  const body = {
    name: 'Ravi', phone: '9990001111', password: 'supersecret1',
    village: 'Anand', state: 'Gujarat', district: 'Anand', preferredLanguage: 'gu',
    consentGiven: true, consentVersion: 'v1', consentPurpose: 'app-usage',
  };

  describe('POST /api/auth/farmer/register', () => {
    it('registers a farmer (201), creates a pending_approval subscription, does not leak passwordHash', async () => {
      const res = await request(app).post('/api/auth/farmer/register').send(body);
      expect(res.status).toBe(201);
      expect(res.body.phone).toBe('9990001111');
      expect(res.body.status).toBe('active');
      expect(res.body.passwordHash).toBeUndefined();
      const sub = await Subscription.findOne({ farmerId: res.body._id });
      expect(sub.status).toBe('pending_approval');
      expect(await Farmer.countDocuments()).toBe(1);
    });

    it('rejects a short password with 400 VALIDATION', async () => {
      const res = await request(app).post('/api/auth/farmer/register').send({ ...body, password: 'short' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION');
    });

    it('rejects missing consent with 400', async () => {
      const res = await request(app).post('/api/auth/farmer/register').send({ ...body, consentGiven: false });
      expect(res.status).toBe(400);
    });

    it('rejects a duplicate phone with 409 PHONE_TAKEN', async () => {
      await request(app).post('/api/auth/farmer/register').send(body);
      const res = await request(app).post('/api/auth/farmer/register').send(body);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('PHONE_TAKEN');
    });
  });
  ```

- [ ] **Step 2: Write the failing login endpoint test.** Write `tests/auth.login.test.js`:
  ```js
  import { beforeAll, afterEach, afterAll, describe, it, expect } from '@jest/globals';
  import request from 'supertest';
  import app from '../src/app.js';
  import { connectTestDb, clearTestDb, stopTestDb } from './helpers/db.js';
  import { makeFarmer, makeAdmin } from './helpers/factories.js';
  import Farmer from '../src/models/farmer.model.js';
  import Subscription from '../src/models/subscription.model.js';

  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(stopTestDb);

  describe('POST /api/auth/farmer/login', () => {
    it('logs in an approved (trial) farmer and returns access + refresh tokens', async () => {
      const { farmer, password } = await makeFarmer({ subscriptionStatus: 'trial' });
      const res = await request(app).post('/api/auth/farmer/login').send({ phone: farmer.phone, password });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
    });

    it('rejects a pending_approval farmer with 403 PENDING_APPROVAL', async () => {
      const { farmer, password } = await makeFarmer({ subscriptionStatus: 'pending_approval' });
      const res = await request(app).post('/api/auth/farmer/login').send({ phone: farmer.phone, password });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PENDING_APPROVAL');
      expect(res.body.error.message).toBe('Your account is waiting for approval');
    });

    it('rejects a suspended farmer with 403', async () => {
      const { farmer, password } = await makeFarmer({ status: 'suspended', subscriptionStatus: 'trial' });
      const res = await request(app).post('/api/auth/farmer/login').send({ phone: farmer.phone, password });
      expect(res.status).toBe(403);
    });

    it('rejects a wrong password with 401 INVALID_CREDENTIALS', async () => {
      const { farmer } = await makeFarmer({ subscriptionStatus: 'trial' });
      const res = await request(app).post('/api/auth/farmer/login').send({ phone: farmer.phone, password: 'wrongpass1' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/auth/admin/login', () => {
    it('logs in an admin and returns tokens', async () => {
      const { admin, password } = await makeAdmin();
      const res = await request(app).post('/api/auth/admin/login').send({ email: admin.email, password });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
    });

    it('rejects a wrong password with 401', async () => {
      const { admin } = await makeAdmin();
      const res = await request(app).post('/api/auth/admin/login').send({ email: admin.email, password: 'nope12345' });
      expect(res.status).toBe(401);
    });
  });
  ```

- [ ] **Step 3: Write the failing refresh + logout endpoint test.** Write `tests/auth.refresh.test.js`:
  ```js
  import { beforeAll, afterEach, afterAll, describe, it, expect } from '@jest/globals';
  import request from 'supertest';
  import app from '../src/app.js';
  import { connectTestDb, clearTestDb, stopTestDb } from './helpers/db.js';
  import { makeFarmer } from './helpers/factories.js';
  import RefreshToken from '../src/models/refreshToken.model.js';

  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(stopTestDb);

  async function loginFarmer() {
    const { farmer, password } = await makeFarmer({ subscriptionStatus: 'trial' });
    const res = await request(app).post('/api/auth/farmer/login').send({ phone: farmer.phone, password });
    return { farmer, tokens: res.body };
  }

  describe('POST /api/auth/refresh', () => {
    it('rotates the refresh token and returns a new pair', async () => {
      const { tokens } = await loginFarmer();
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: tokens.refreshToken });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
      expect(res.body.refreshToken).not.toBe(tokens.refreshToken);
    });

    it('detects reuse of a rotated token and revokes the chain with 403 TOKEN_REUSE', async () => {
      const { farmer, tokens } = await loginFarmer();
      await request(app).post('/api/auth/refresh').send({ refreshToken: tokens.refreshToken }); // rotate once
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: tokens.refreshToken }); // reuse
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('TOKEN_REUSE');
      const active = await RefreshToken.countDocuments({ userId: farmer._id, revokedAt: null });
      expect(active).toBe(0);
    });

    it('rejects a garbage refresh token with 401', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'garbage.token.value' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('revokes the presented refresh token', async () => {
      const { farmer, tokens } = await loginFarmer();
      const res = await request(app).post('/api/auth/logout').send({ refreshToken: tokens.refreshToken });
      expect(res.status).toBe(200);
      const active = await RefreshToken.countDocuments({ userId: farmer._id, revokedAt: null });
      expect(active).toBe(0);
    });
  });
  ```

- [ ] **Step 4: Write the failing change-password endpoint test.** Write `tests/auth.changePassword.test.js`:
  ```js
  import { beforeAll, afterEach, afterAll, describe, it, expect } from '@jest/globals';
  import request from 'supertest';
  import app from '../src/app.js';
  import { connectTestDb, clearTestDb, stopTestDb } from './helpers/db.js';
  import { makeFarmer } from './helpers/factories.js';
  import { farmerToken, bearer } from './helpers/auth.js';
  import Farmer from '../src/models/farmer.model.js';
  import RefreshToken from '../src/models/refreshToken.model.js';

  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(stopTestDb);

  describe('POST /api/auth/farmer/change-password', () => {
    it('changes password, bumps tokenVersion, revokes refresh tokens, and old access token stops working', async () => {
      const { farmer, password } = await makeFarmer({ subscriptionStatus: 'trial' });
      const login = await request(app).post('/api/auth/farmer/login').send({ phone: farmer.phone, password });
      const oldAccess = login.body.accessToken;

      const res = await request(app)
        .post('/api/auth/farmer/change-password')
        .set(bearer(oldAccess))
        .send({ oldPassword: password, newPassword: 'brandnew123' });
      expect(res.status).toBe(200);

      const updated = await Farmer.findById(farmer._id);
      expect(updated.tokenVersion).toBe(1);
      const active = await RefreshToken.countDocuments({ userId: farmer._id, revokedAt: null });
      expect(active).toBe(0);

      // Old access token now fails tokenVersion check on a protected route.
      const check = await request(app).post('/api/auth/farmer/change-password')
        .set(bearer(oldAccess))
        .send({ oldPassword: 'brandnew123', newPassword: 'anothernew1' });
      expect(check.status).toBe(401);
      expect(check.body.error.code).toBe('TOKEN_VERSION_MISMATCH');
    });

    it('rejects a wrong old password with 401', async () => {
      const { farmer, password } = await makeFarmer({ subscriptionStatus: 'trial' });
      const token = farmerToken(farmer);
      const res = await request(app)
        .post('/api/auth/farmer/change-password')
        .set(bearer(token))
        .send({ oldPassword: 'wrongold1', newPassword: 'brandnew123' });
      expect(res.status).toBe(401);
    });

    it('rejects a new password shorter than 8 chars with 400 VALIDATION', async () => {
      const { farmer } = await makeFarmer({ subscriptionStatus: 'trial' });
      const token = farmerToken(farmer);
      const res = await request(app)
        .post('/api/auth/farmer/change-password')
        .set(bearer(token))
        .send({ oldPassword: 'supersecret1', newPassword: 'short' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION');
    });
  });
  ```

- [ ] **Step 5: Run all four endpoint tests and expect FAIL.** Run:
  ```
  npm test -- tests/auth.register.test.js tests/auth.login.test.js tests/auth.refresh.test.js tests/auth.changePassword.test.js
  ```
  Expected: FAIL — routes are not mounted yet (register returns the 404 `NOT_FOUND` shape, so assertions on 201/200/403 fail).

- [ ] **Step 6: Create `src/middleware/rateLimit.js`.** A limiter for the register endpoint; disabled under test so it never interferes.
  ```js
  import rateLimit from 'express-rate-limit';

  const isTest = process.env.NODE_ENV === 'test';

  export const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTest ? 1000 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
  });
  ```

- [ ] **Step 7: Create `src/controllers/auth.controller.js`.** Thin controllers that call the service and shape responses. `register` returns a sanitized farmer (no `passwordHash`).
  ```js
  import {
    registerFarmer,
    loginFarmer,
    loginAdmin,
    rotateRefreshToken,
    changeFarmerPassword,
    logout as logoutService,
  } from '../services/auth.service.js';

  function sanitizeFarmer(farmer) {
    const obj = farmer.toObject ? farmer.toObject() : farmer;
    delete obj.passwordHash;
    delete obj.tokenVersion;
    return obj;
  }

  export async function registerFarmerController(req, res, next) {
    try {
      const { farmer } = await registerFarmer(req.body);
      res.status(201).json(sanitizeFarmer(farmer));
    } catch (err) {
      next(err);
    }
  }

  export async function loginFarmerController(req, res, next) {
    try {
      const { accessToken, refreshToken } = await loginFarmer(req.body);
      res.status(200).json({ accessToken, refreshToken });
    } catch (err) {
      next(err);
    }
  }

  export async function loginAdminController(req, res, next) {
    try {
      const { accessToken, refreshToken } = await loginAdmin(req.body);
      res.status(200).json({ accessToken, refreshToken });
    } catch (err) {
      next(err);
    }
  }

  export async function refreshController(req, res, next) {
    try {
      const { accessToken, refreshToken } = await rotateRefreshToken(req.body.refreshToken);
      res.status(200).json({ accessToken, refreshToken });
    } catch (err) {
      next(err);
    }
  }

  export async function logoutController(req, res, next) {
    try {
      await logoutService(req.body.refreshToken);
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  }

  export async function changePasswordController(req, res, next) {
    try {
      await changeFarmerPassword({
        farmerId: req.user.id,
        oldPassword: req.body.oldPassword,
        newPassword: req.body.newPassword,
      });
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
  ```

- [ ] **Step 8: Create `src/routes/auth.routes.js`.** Zod schemas + `validate` + `authenticate` on change-password. Register is rate-limited.
  ```js
  import { Router } from 'express';
  import { z } from 'zod';
  import { validate } from '../middleware/validate.js';
  import { authenticate } from '../middleware/authenticate.js';
  import { registerLimiter } from '../middleware/rateLimit.js';
  import {
    registerFarmerController,
    loginFarmerController,
    loginAdminController,
    refreshController,
    logoutController,
    changePasswordController,
  } from '../controllers/auth.controller.js';

  const router = Router();

  const registerSchema = z.object({
    name: z.string().min(1),
    phone: z.string().min(6),
    password: z.string().min(8),
    village: z.string().optional(),
    state: z.string().optional(),
    district: z.string().optional(),
    preferredLanguage: z.string().optional(),
    consentGiven: z.literal(true),
    consentVersion: z.string().min(1),
    consentPurpose: z.string().min(1),
  });

  const farmerLoginSchema = z.object({
    phone: z.string().min(6),
    password: z.string().min(1),
  });

  const adminLoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  const refreshSchema = z.object({
    refreshToken: z.string().min(1),
  });

  const logoutSchema = z.object({
    refreshToken: z.string().min(1),
  });

  const changePasswordSchema = z.object({
    oldPassword: z.string().min(1),
    newPassword: z.string().min(8),
  });

  router.post('/farmer/register', registerLimiter, validate(registerSchema), registerFarmerController);
  router.post('/farmer/login', validate(farmerLoginSchema), loginFarmerController);
  router.post('/admin/login', validate(adminLoginSchema), loginAdminController);
  router.post('/refresh', validate(refreshSchema), refreshController);
  router.post('/logout', validate(logoutSchema), logoutController);
  router.post('/farmer/change-password', authenticate, validate(changePasswordSchema), changePasswordController);

  export default router;
  ```

- [ ] **Step 9: Mount the auth router in `src/app.js`.** Edit `src/app.js` to import and mount the router BEFORE `notFound`. The file becomes:
  ```js
  import express from 'express';
  import { notFound, errorHandler } from './middleware/error.js';
  import authRoutes from './routes/auth.routes.js';

  export function buildApp() {
    const app = express();
    app.use(express.json());

    app.get('/api/health', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    app.use('/api/auth', authRoutes);

    app.use(notFound);
    app.use(errorHandler);
    return app;
  }

  const app = buildApp();
  export default app;
  ```

- [ ] **Step 10: Run all four endpoint tests and expect PASS.** Run:
  ```
  npm test -- tests/auth.register.test.js tests/auth.login.test.js tests/auth.refresh.test.js tests/auth.changePassword.test.js
  ```
  Expected: PASS — register 201 with sanitized body + pending_approval sub, short password/missing consent -> 400 VALIDATION, duplicate phone -> 409 PHONE_TAKEN; farmer login returns tokens, pending_approval -> 403 PENDING_APPROVAL with the exact message, suspended -> 403, wrong password -> 401; admin login returns tokens; refresh rotates, reuse -> 403 TOKEN_REUSE with chain revoked, garbage -> 401; logout revokes; change-password bumps tokenVersion + revokes refresh tokens + old access token then fails with 401 TOKEN_VERSION_MISMATCH, wrong old password -> 401, short new password -> 400.

- [ ] **Step 11: Create `src/server.js`** (so `npm start` works; not used by tests).
  ```js
  import app from './app.js';
  import { connectDb } from './config/db.js';
  import { env } from './config/env.js';

  const PORT = process.env.PORT || 4000;

  connectDb()
    .then(() => {
      app.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`Smart Farming API listening on :${PORT} (${env.NODE_ENV})`);
      });
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to start server', err);
      process.exit(1);
    });
  ```

- [ ] **Step 12: Run the whole suite and expect PASS.** Run:
  ```
  npm test
  ```
  Expected: PASS — every AUTH test green (health, models, password, jwt, auth.service, authenticate middleware, register, login, refresh, change-password).

- [ ] **Step 13: Commit.**
  ```
  git add -A && git commit -m "feat(auth): auth routes + controller + rate limit, mount under /api/auth, add server entrypoint"
  ```

---

## Module F — Farmer profile & self-deactivation

**Files:**
- Create: `src/routes/me.routes.js`
- Create: `src/controllers/me.controller.js`
- Create: `src/services/me.service.js`
- Create: `tests/me.test.js`
- Modify: `src/app.js` (mount `/api/me` router)
- Depends on (already built in earlier modules): `src/middleware/authenticate.js`, `src/middleware/requireRole.js`, `src/middleware/validate.js`, `src/middleware/error.js`, `src/utils/AppError.js`, `src/models/farmer.model.js`, `src/models/subscription.model.js`, `src/models/refreshToken.model.js`, `src/services/subscription.service.js` (`evaluateStatus`), `tests/helpers/db.js`, `tests/helpers/factories.js`, `tests/helpers/auth.js`.

> This module assumes the AUTH module built `authenticate`, `requireRole('farmer')`, `validate`, the central `error` middleware, `AppError`, and the test helpers. All routes here are farmer-only. `GET /me` returns the farmer profile plus the freshly evaluated subscription status; `PATCH /me` edits profile fields but NEVER `phone`; `POST /me/deactivate` performs a soft deactivation (status retained data), bumps `tokenVersion`, and revokes refresh tokens.

---

### Task F-1: `GET /me` returns profile + evaluated subscription status

**Files:** create `tests/me.test.js`, create `src/services/me.service.js`, create `src/controllers/me.controller.js`, create `src/routes/me.routes.js`, modify `src/app.js`

- [ ] **Step 1: Write the failing test.** Create `tests/me.test.js` with the complete code below. It exercises the happy-path profile read and asserts the evaluated subscription status is included and `passwordHash` is never leaked.

```js
// tests/me.test.js
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectTestDb, clearTestDb, stopTestDb } from './helpers/db.js';
import { createFarmer, createSubscription } from './helpers/factories.js';
import { farmerAccessToken } from './helpers/auth.js';
import { Farmer } from '../src/models/farmer.model.js';
import { Subscription } from '../src/models/subscription.model.js';
import { RefreshToken } from '../src/models/refreshToken.model.js';

beforeAll(async () => { await connectTestDb(); });
afterEach(async () => { await clearTestDb(); });
afterAll(async () => { await stopTestDb(); });

describe('GET /api/me', () => {
  test('returns the farmer profile plus evaluated subscription status, no passwordHash', async () => {
    const farmer = await createFarmer({ name: 'Ramesh', village: 'Kadwa', state: 'MH', district: 'Nashik' });
    // trial that has already ended -> evaluateStatus must return 'grace'
    await createSubscription({
      farmerId: farmer._id,
      status: 'trial',
      trialStartedAt: new Date('2026-06-01T00:00:00Z'),
      trialEndsAt: new Date('2026-06-15T00:00:00Z'),
    });
    const token = farmerAccessToken(farmer);

    const res = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(String(farmer._id));
    expect(res.body.name).toBe('Ramesh');
    expect(res.body.phone).toBe(farmer.phone);
    expect(res.body.village).toBe('Kadwa');
    expect(res.body.state).toBe('MH');
    expect(res.body.district).toBe('Nashik');
    expect(res.body.preferredLanguage).toBe('en');
    expect(res.body.status).toBe('active');
    expect(res.body.subscription.status).toBe('grace');
    expect(res.body.passwordHash).toBeUndefined();
  });

  test('persists the evaluated status back to the subscription document', async () => {
    const farmer = await createFarmer({});
    await createSubscription({
      farmerId: farmer._id,
      status: 'trial',
      trialStartedAt: new Date('2026-06-01T00:00:00Z'),
      trialEndsAt: new Date('2026-06-15T00:00:00Z'),
    });
    const token = farmerAccessToken(farmer);

    await request(app).get('/api/me').set('Authorization', `Bearer ${token}`);

    const sub = await Subscription.findOne({ farmerId: farmer._id });
    expect(sub.status).toBe('grace');
  });

  test('returns subscription null when the farmer has no subscription', async () => {
    const farmer = await createFarmer({});
    const token = farmerAccessToken(farmer);

    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.subscription).toBeNull();
  });

  test('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/me.test.js
```

Expected: the suite FAILS. `src/services/me.service.js`, `src/controllers/me.controller.js`, and `src/routes/me.routes.js` do not exist yet, and `/api/me` is not mounted, so requests 404 and the imports throw `Cannot find module`.

- [ ] **Step 3: Write the service.** Create `src/services/me.service.js`. It loads the farmer and subscription, evaluates the subscription status on-request, persists a changed status, and returns a plain serializable profile object (never exposing `passwordHash`).

```js
// src/services/me.service.js
import { Farmer } from '../models/farmer.model.js';
import { Subscription } from '../models/subscription.model.js';
import { evaluateStatus } from './subscription.service.js';
import { AppError } from '../utils/AppError.js';

function serializeFarmer(farmer) {
  return {
    id: String(farmer._id),
    name: farmer.name,
    phone: farmer.phone,
    village: farmer.village ?? null,
    state: farmer.state ?? null,
    district: farmer.district ?? null,
    preferredLanguage: farmer.preferredLanguage,
    status: farmer.status,
    createdAt: farmer.createdAt,
  };
}

export async function getProfile(farmerId, now = new Date()) {
  const farmer = await Farmer.findById(farmerId);
  if (!farmer) throw new AppError(404, 'NOT_FOUND', 'Not found');

  let subscription = null;
  const sub = await Subscription.findOne({ farmerId });
  if (sub) {
    const evaluated = evaluateStatus(sub, now);
    if (evaluated !== sub.status) {
      sub.status = evaluated;
      await sub.save();
    }
    subscription = {
      status: sub.status,
      plan: sub.plan,
      trialEndsAt: sub.trialEndsAt ?? null,
      currentPeriodEnd: sub.currentPeriodEnd ?? null,
    };
  }

  return { ...serializeFarmer(farmer), subscription };
}
```

- [ ] **Step 4: Write the controller.** Create `src/controllers/me.controller.js`.

```js
// src/controllers/me.controller.js
import { getProfile } from '../services/me.service.js';

export async function getMe(req, res, next) {
  try {
    const profile = await getProfile(req.user.id);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 5: Write the router.** Create `src/routes/me.routes.js`. All routes are farmer-only.

```js
// src/routes/me.routes.js
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { getMe } from '../controllers/me.controller.js';

const router = Router();

router.use(authenticate, requireRole('farmer'));

router.get('/', getMe);

export default router;
```

- [ ] **Step 6: Mount the router in `src/app.js`.** Add the import near the other route imports and mount it under `/api/me`, before the central error middleware.

```js
// src/app.js — add with the other route imports
import meRoutes from './routes/me.routes.js';

// src/app.js — add with the other app.use('/api/...') mounts, BEFORE app.use(errorHandler)
app.use('/api/me', meRoutes);
```

- [ ] **Step 7: Run the test — expect PASS.**

```
npm test -- tests/me.test.js
```

Expected: all four `GET /api/me` tests PASS.

- [ ] **Step 8: Commit.**

```
git add src/services/me.service.js src/controllers/me.controller.js src/routes/me.routes.js tests/me.test.js src/app.js
git commit -m "feat(me): GET /api/me returns profile with evaluated subscription status"
```

---

### Task F-2: `PATCH /me` edits allowed profile fields (never phone)

**Files:** modify `tests/me.test.js`, modify `src/services/me.service.js`, modify `src/controllers/me.controller.js`, create `src/validators/me.validator.js`, modify `src/routes/me.routes.js`

- [ ] **Step 1: Write the failing tests.** Append this `describe` block to `tests/me.test.js` (below the `GET /api/me` block, before the file end).

```js
// tests/me.test.js — append this describe block
describe('PATCH /api/me', () => {
  test('updates name, village, state, district and preferredLanguage', async () => {
    const farmer = await createFarmer({ name: 'Old', village: 'OldV', state: 'MH', district: 'OldD' });
    const token = farmerAccessToken(farmer);

    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New', village: 'NewV', state: 'GJ', district: 'NewD', preferredLanguage: 'hi' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New');
    expect(res.body.village).toBe('NewV');
    expect(res.body.state).toBe('GJ');
    expect(res.body.district).toBe('NewD');
    expect(res.body.preferredLanguage).toBe('hi');

    const fresh = await Farmer.findById(farmer._id);
    expect(fresh.name).toBe('New');
    expect(fresh.preferredLanguage).toBe('hi');
  });

  test('ignores phone even if supplied in the body', async () => {
    const farmer = await createFarmer({});
    const originalPhone = farmer.phone;
    const token = farmerAccessToken(farmer);

    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed', phone: '9999999999' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Renamed');
    expect(res.body.phone).toBe(originalPhone);

    const fresh = await Farmer.findById(farmer._id);
    expect(fresh.phone).toBe(originalPhone);
  });

  test('rejects an empty name with 400', async () => {
    const farmer = await createFarmer({});
    const token = farmerAccessToken(farmer);

    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('rejects a body with no updatable fields with 400', async () => {
    const farmer = await createFarmer({});
    const token = farmerAccessToken(farmer);

    const res = await request(app)
      .patch('/api/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '9999999999' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('rejects an unauthenticated PATCH with 401', async () => {
    const res = await request(app).patch('/api/me').send({ name: 'X' });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/me.test.js
```

Expected: the new `PATCH /api/me` tests FAIL — the route does not exist yet, so PATCH returns 404 (and the validator module import will fail once wired). The `GET /api/me` tests still PASS.

- [ ] **Step 3: Write the zod validator.** Create `src/validators/me.validator.js`. It allows only the editable fields, forbids unknown keys (so `phone` is stripped/rejected), and requires at least one updatable field.

```js
// src/validators/me.validator.js
import { z } from 'zod';

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    village: z.string().trim().max(120).optional(),
    state: z.string().trim().max(120).optional(),
    district: z.string().trim().max(120).optional(),
    preferredLanguage: z.string().trim().min(2).max(10).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one updatable field is required',
  });
```

> `.strict()` makes zod reject a body whose only key is `phone` (unknown key). The `.refine` guards against an empty `{}`. The shared `validate` middleware maps any zod failure to `AppError(400, 'VALIDATION_ERROR', ...)`.

- [ ] **Step 4: Extend the service.** Add an `updateProfile` function to `src/services/me.service.js`. It applies only whitelisted fields (defence-in-depth even though the validator already stripped extras) and returns the same serialized shape as `getProfile`, including the evaluated subscription.

```js
// src/services/me.service.js — add this export
const EDITABLE_FIELDS = ['name', 'village', 'state', 'district', 'preferredLanguage'];

export async function updateProfile(farmerId, patch, now = new Date()) {
  const farmer = await Farmer.findById(farmerId);
  if (!farmer) throw new AppError(404, 'NOT_FOUND', 'Not found');

  for (const field of EDITABLE_FIELDS) {
    if (patch[field] !== undefined) {
      farmer[field] = patch[field];
    }
  }
  await farmer.save();

  let subscription = null;
  const sub = await Subscription.findOne({ farmerId });
  if (sub) {
    const evaluated = evaluateStatus(sub, now);
    if (evaluated !== sub.status) {
      sub.status = evaluated;
      await sub.save();
    }
    subscription = {
      status: sub.status,
      plan: sub.plan,
      trialEndsAt: sub.trialEndsAt ?? null,
      currentPeriodEnd: sub.currentPeriodEnd ?? null,
    };
  }

  return { ...serializeFarmer(farmer), subscription };
}
```

- [ ] **Step 5: Add the controller handler.** Append `patchMe` to `src/controllers/me.controller.js`.

```js
// src/controllers/me.controller.js — update imports and add handler
import { getProfile, updateProfile } from '../services/me.service.js';

export async function patchMe(req, res, next) {
  try {
    const profile = await updateProfile(req.user.id, req.body);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}
```

> Change the existing import line `import { getProfile } from '../services/me.service.js';` to the combined import shown above.

- [ ] **Step 6: Wire the route.** Update `src/routes/me.routes.js` to add the PATCH route with validation.

```js
// src/routes/me.routes.js
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { getMe, patchMe } from '../controllers/me.controller.js';
import { updateMeSchema } from '../validators/me.validator.js';

const router = Router();

router.use(authenticate, requireRole('farmer'));

router.get('/', getMe);
router.patch('/', validate(updateMeSchema), patchMe);

export default router;
```

> This assumes the shared `validate(schema)` middleware validates `req.body` against the zod schema, replaces `req.body` with the parsed result, and throws `AppError(400, 'VALIDATION_ERROR', ...)` on failure. If your `validate` signature differs (e.g. `validate({ body: schema })`), adapt this one call to match the AUTH module's convention.

- [ ] **Step 7: Run the test — expect PASS.**

```
npm test -- tests/me.test.js
```

Expected: all `GET` and `PATCH /api/me` tests PASS.

- [ ] **Step 8: Commit.**

```
git add src/validators/me.validator.js src/services/me.service.js src/controllers/me.controller.js src/routes/me.routes.js tests/me.test.js
git commit -m "feat(me): PATCH /api/me edits profile fields, never phone"
```

---

### Task F-3: `POST /me/deactivate` soft-deactivates, bumps tokenVersion, revokes refresh tokens

**Files:** modify `tests/me.test.js`, modify `src/services/me.service.js`, modify `src/controllers/me.controller.js`, modify `src/routes/me.routes.js`

- [ ] **Step 1: Write the failing tests.** Append this `describe` block to `tests/me.test.js`.

```js
// tests/me.test.js — append this describe block
describe('POST /api/me/deactivate', () => {
  test('sets status=deactivated, deactivatedAt, bumps tokenVersion and revokes refresh tokens', async () => {
    const farmer = await createFarmer({});
    const token = farmerAccessToken(farmer);

    // two live refresh tokens for this farmer
    await RefreshToken.create({
      userId: farmer._id,
      userType: 'farmer',
      tokenHash: 'hash-1',
      issuedAt: new Date('2026-07-01T00:00:00Z'),
      expiresAt: new Date('2026-08-01T00:00:00Z'),
      revokedAt: null,
    });
    await RefreshToken.create({
      userId: farmer._id,
      userType: 'farmer',
      tokenHash: 'hash-2',
      issuedAt: new Date('2026-07-01T00:00:00Z'),
      expiresAt: new Date('2026-08-01T00:00:00Z'),
      revokedAt: null,
    });

    const res = await request(app)
      .post('/api/me/deactivate')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('deactivated');

    const fresh = await Farmer.findById(farmer._id);
    expect(fresh.status).toBe('deactivated');
    expect(fresh.deactivatedAt).toBeInstanceOf(Date);
    expect(fresh.tokenVersion).toBe(farmer.tokenVersion + 1);

    const live = await RefreshToken.countDocuments({ userId: farmer._id, revokedAt: null });
    expect(live).toBe(0);
  });

  test('retains the farmer document and its data (no delete)', async () => {
    const farmer = await createFarmer({ name: 'Keep Me' });
    const token = farmerAccessToken(farmer);

    await request(app).post('/api/me/deactivate').set('Authorization', `Bearer ${token}`);

    const fresh = await Farmer.findById(farmer._id);
    expect(fresh).not.toBeNull();
    expect(fresh.name).toBe('Keep Me');
  });

  test('the deactivated farmer can no longer call an authed endpoint with the old token', async () => {
    const farmer = await createFarmer({});
    const token = farmerAccessToken(farmer);

    await request(app).post('/api/me/deactivate').set('Authorization', `Bearer ${token}`);

    // old access token now has a stale tokenVersion -> authenticate rejects it
    const res = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  test('rejects an unauthenticated deactivate with 401', async () => {
    const res = await request(app).post('/api/me/deactivate');
    expect(res.status).toBe(401);
  });
});
```

> The third test relies on the AUTH contract: `authenticate` asserts `token.tokenVersion === user.tokenVersion`. Because deactivation bumps `tokenVersion`, the previously-issued access token becomes stale and is rejected with 401.

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/me.test.js
```

Expected: the new `POST /api/me/deactivate` tests FAIL — the route returns 404 because the handler and route are not defined yet. `GET` and `PATCH` tests still PASS.

- [ ] **Step 3: Extend the service.** Add a `deactivateSelf` function to `src/services/me.service.js`. It performs the soft-deactivation atomically enough for our needs: flip status, stamp `deactivatedAt`, bump `tokenVersion`, and revoke all the farmer's live refresh tokens. Data is retained — nothing is deleted.

```js
// src/services/me.service.js — add imports and this export
import { RefreshToken } from '../models/refreshToken.model.js';

export async function deactivateSelf(farmerId, now = new Date()) {
  const farmer = await Farmer.findById(farmerId);
  if (!farmer) throw new AppError(404, 'NOT_FOUND', 'Not found');

  farmer.status = 'deactivated';
  farmer.deactivatedAt = now;
  farmer.tokenVersion = farmer.tokenVersion + 1;
  await farmer.save();

  await RefreshToken.updateMany(
    { userId: farmerId, userType: 'farmer', revokedAt: null },
    { $set: { revokedAt: now } }
  );

  return serializeFarmer(farmer);
}
```

> Add `import { RefreshToken } from '../models/refreshToken.model.js';` to the top of `src/services/me.service.js` alongside the existing model imports. `serializeFarmer` is already defined in this file (Task F-1) and returns `status`, so the response body carries `status: 'deactivated'`.

- [ ] **Step 4: Add the controller handler.** Append `deactivateMe` to `src/controllers/me.controller.js` and extend the service import.

```js
// src/controllers/me.controller.js — update imports and add handler
import { getProfile, updateProfile, deactivateSelf } from '../services/me.service.js';

export async function deactivateMe(req, res, next) {
  try {
    const result = await deactivateSelf(req.user.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
```

> Update the existing import line to the three-symbol import shown above.

- [ ] **Step 5: Wire the route.** Update `src/routes/me.routes.js` to add the deactivate route.

```js
// src/routes/me.routes.js
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { getMe, patchMe, deactivateMe } from '../controllers/me.controller.js';
import { updateMeSchema } from '../validators/me.validator.js';

const router = Router();

router.use(authenticate, requireRole('farmer'));

router.get('/', getMe);
router.patch('/', validate(updateMeSchema), patchMe);
router.post('/deactivate', deactivateMe);

export default router;
```

- [ ] **Step 6: Run the test — expect PASS.**

```
npm test -- tests/me.test.js
```

Expected: every test in `tests/me.test.js` PASSES (`GET`, `PATCH`, and `POST /deactivate`).

- [ ] **Step 7: Commit.**

```
git add src/services/me.service.js src/controllers/me.controller.js src/routes/me.routes.js tests/me.test.js
git commit -m "feat(me): POST /api/me/deactivate soft-deactivates and revokes tokens"
```

---

### Task F-4: A deactivated farmer cannot log in

**Files:** modify `tests/me.test.js`

> This task adds no new production code — the login rejection is owned by the AUTH module's `POST /auth/farmer/login`, which per the contract rejects `deactivated` with 403. This task adds an end-to-end regression test proving self-deactivation locks the account out of login, closing the loop for Module F.

- [ ] **Step 1: Write the failing/regression test.** Append this `describe` block to `tests/me.test.js`. It registers-then-deactivates via the real endpoints, then attempts a fresh login and asserts 403.

```js
// tests/me.test.js — append this describe block
describe('deactivated farmer cannot log in', () => {
  test('login is rejected with 403 after self-deactivation', async () => {
    // create a farmer with a known password so we can attempt a real login
    const password = 'secret12';
    const farmer = await createFarmer({ password });
    const token = farmerAccessToken(farmer);

    // self-deactivate through the real endpoint
    const deac = await request(app)
      .post('/api/me/deactivate')
      .set('Authorization', `Bearer ${token}`);
    expect(deac.status).toBe(200);

    // now a fresh login must be rejected with 403
    const res = await request(app)
      .post('/api/auth/farmer/login')
      .send({ phone: farmer.phone, password });

    expect(res.status).toBe(403);
  });
});
```

> This test depends on the AUTH module being present (the `/api/auth/farmer/login` route and the `createFarmer` factory accepting a `password` that it hashes into `passwordHash`). If your `createFarmer` factory does not yet accept a plaintext `password` option, add that option in `tests/helpers/factories.js` as part of the AUTH module — this module consumes it.

- [ ] **Step 2: Run the test — expect PASS (or FAIL revealing a gap).**

```
npm test -- tests/me.test.js
```

Expected: PASS if the AUTH login already rejects `deactivated` with 403 (per the contract). If it FAILS with a 200/401, that is a real gap in the AUTH module's login guard — fix it there (add the `deactivated` status check to `POST /auth/farmer/login`), not here.

- [ ] **Step 3: Commit.**

```
git add tests/me.test.js
git commit -m "test(me): deactivated farmer is locked out of login (e2e regression)"
```

---

## Module SEC — Ownership/IDOR, validation & rate limiting

This module builds the three cross-cutting middleware every farmer-facing route depends on — `ownership`, `validate`, and the auth rate limiters — plus the mandatory IDOR CI test. The `ownership` middleware and its unit test are fully written and passing here. Because the full IDOR CI test needs real `/plots`, `/crop-cycles`, `/transactions` and `/reports/crop-cycle/:id` routes to exist, this module ships the IDOR test file in two stages: a **scaffold** that runs green against the Plot route (proving the pattern end-to-end) in Task SEC-4, then a task (SEC-5) that expands it to the full four-resource matrix once those routes land. Task SEC-5 is explicitly marked as a gated follow-up so the engineer runs it after the PLOTS, CROP-CYCLE, TRANSACTIONS and REPORTS modules are merged.

Depends on: models exist (`Plot`, `CropCycle`, `Transaction` and their `farmerId` fields), `AppError`, `authenticate`, the test helpers (`tests/helpers/db.js`, `factories.js`, `auth.js`) and `src/app.js`. These come from the AUTH / MODELS / test-harness modules.

**Files:**
- create `src/middleware/ownership.js`
- create `src/middleware/validate.js`
- create `src/middleware/rateLimit.js`
- create `tests/ownership.test.js`
- create `tests/validate.test.js`
- create `tests/rateLimit.test.js`
- create `tests/security.idor.test.js`
- modify `src/routes/auth.routes.js` (mount the rate limiters — this file is owned by the AUTH module; here we only add the two limiter references)

---

### Task SEC-1: `ownership(Model, param)` middleware + unit test

Loads a document by `req.params[param]`, and if it is missing **or** not owned by `req.user.id`, throws `AppError(404, 'NOT_FOUND', 'Not found')`. Never 403. On success attaches `req.doc`.

**Files:** create `tests/ownership.test.js`, create `src/middleware/ownership.js`

- [ ] **Step 1: Write the failing test.** Create `tests/ownership.test.js` with COMPLETE code. It drives the middleware directly with fake `req/res/next` objects against a throwaway Mongoose model so it needs no routes.

```js
// tests/ownership.test.js
import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import { connect, clear, disconnect } from './helpers/db.js';
import { ownership } from '../src/middleware/ownership.js';

// A minimal model with a farmerId, used only by this unit test.
const WidgetSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: String,
});
const Widget = mongoose.models.Widget || mongoose.model('Widget', WidgetSchema);

beforeAll(connect);
afterEach(clear);
afterAll(disconnect);

// Build a fake Express req/res/next trio.
function mockCtx({ params = {}, userId }) {
  const req = { params, user: { id: userId, role: 'farmer' } };
  const res = {};
  const next = jest.fn();
  return { req, res, next };
}

describe('ownership(Model, param)', () => {
  it('attaches req.doc and calls next() when the caller owns the document', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const widget = await Widget.create({ farmerId: ownerId, name: 'mine' });

    const { req, res, next } = mockCtx({
      params: { id: widget._id.toString() },
      userId: ownerId.toString(),
    });

    await ownership(Widget)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    // next() with no argument = success (no error passed).
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(req.doc).toBeDefined();
    expect(String(req.doc._id)).toBe(widget._id.toString());
  });

  it('calls next(AppError 404 NOT_FOUND) when the document belongs to another farmer', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const attackerId = new mongoose.Types.ObjectId();
    const widget = await Widget.create({ farmerId: ownerId, name: 'not yours' });

    const { req, res, next } = mockCtx({
      params: { id: widget._id.toString() },
      userId: attackerId.toString(),
    });

    await ownership(Widget)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(req.doc).toBeUndefined();
  });

  it('calls next(AppError 404 NOT_FOUND) when the document does not exist', async () => {
    const attackerId = new mongoose.Types.ObjectId();
    const missingId = new mongoose.Types.ObjectId(); // never created

    const { req, res, next } = mockCtx({
      params: { id: missingId.toString() },
      userId: attackerId.toString(),
    });

    await ownership(Widget)(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('calls next(AppError 404 NOT_FOUND) when the id is not a valid ObjectId (no throw leaks)', async () => {
    const attackerId = new mongoose.Types.ObjectId();

    const { req, res, next } = mockCtx({
      params: { id: 'not-an-object-id' },
      userId: attackerId.toString(),
    });

    await ownership(Widget)(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('reads the id from a custom param name when one is given', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const widget = await Widget.create({ farmerId: ownerId, name: 'custom-param' });

    const { req, res, next } = mockCtx({
      params: { farmerId: widget._id.toString() }, // note: different param key
      userId: ownerId.toString(),
    });

    await ownership(Widget, 'farmerId')(req, res, next);

    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(String(req.doc._id)).toBe(widget._id.toString());
  });
});
```

- [ ] **Step 2: Run the test and expect FAIL.**
  ```
  npm test -- tests/ownership.test.js
  ```
  Expected: FAIL — `Cannot find module '../src/middleware/ownership.js'` (the file does not exist yet).

- [ ] **Step 3: Write the minimal implementation.** Create `src/middleware/ownership.js` with COMPLETE code.

```js
// src/middleware/ownership.js
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';

/**
 * ownership(Model, param='id')
 * Loads Model by req.params[param]. If the document is missing OR its
 * farmerId does not match req.user.id, responds 404 NOT_FOUND (never 403,
 * so we do not confirm another farmer's id exists). On success attaches
 * req.doc and calls next().
 */
export function ownership(Model, param = 'id') {
  return async (req, res, next) => {
    try {
      const id = req.params[param];

      // An invalid ObjectId must look identical to "not found" to the caller.
      if (!mongoose.isValidObjectId(id)) {
        throw new AppError(404, 'NOT_FOUND', 'Not found');
      }

      const doc = await Model.findById(id);

      if (!doc || String(doc.farmerId) !== req.user.id) {
        throw new AppError(404, 'NOT_FOUND', 'Not found');
      }

      req.doc = doc;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
```

- [ ] **Step 4: Run the test and expect PASS.**
  ```
  npm test -- tests/ownership.test.js
  ```
  Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit.**
  ```
  git add src/middleware/ownership.js tests/ownership.test.js
  git commit -m "feat(security): add ownership middleware returning 404 for missing-or-not-owned"
  ```

---

### Task SEC-2: `validate(schema)` middleware with zod

A factory that validates any of `body`, `params`, `query` against a zod object schema, **replaces** the request part with the parsed (coerced/stripped) value, and throws `AppError(400, 'VALIDATION_ERROR', ...)` on failure with the first field error in the message.

**Files:** create `tests/validate.test.js`, create `src/middleware/validate.js`

- [ ] **Step 1: Write the failing test.** Create `tests/validate.test.js` with COMPLETE code. It builds a tiny Express app that mounts `validate` + the central `error` middleware, and drives it with supertest.

```js
// tests/validate.test.js
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validate } from '../src/middleware/validate.js';
import { error } from '../src/middleware/error.js';

// A tiny app that exercises the middleware in isolation.
function buildApp() {
  const app = express();
  app.use(express.json());

  const bodySchema = z.object({
    name: z.string().min(1),
    amount: z.coerce.number().positive(), // coercion: "50" -> 50
  });

  app.post('/things', validate({ body: bodySchema }), (req, res) => {
    // Echo back so the test can prove parsing/coercion happened.
    res.status(201).json(req.body);
  });

  const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
  });

  app.get('/things', validate({ query: querySchema }), (req, res) => {
    res.status(200).json({ page: req.validatedQuery.page });
  });

  app.use(error);
  return app;
}

describe('validate(schema)', () => {
  const app = buildApp();

  it('passes valid body through and coerces types', async () => {
    const res = await request(app)
      .post('/things')
      .send({ name: 'seed', amount: '50' }); // amount is a string on the wire

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ name: 'seed', amount: 50 }); // coerced to number
  });

  it('rejects an invalid body with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/things')
      .send({ name: '', amount: -5 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(typeof res.body.error.message).toBe('string');
    expect(res.body.error.message.length).toBeGreaterThan(0);
  });

  it('rejects a missing required field with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/things')
      .send({ amount: 10 }); // name missing

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('strips unknown body keys (zod object default)', async () => {
    const res = await request(app)
      .post('/things')
      .send({ name: 'seed', amount: 10, hacker: 'DROP TABLE' });

    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('hacker');
  });

  it('applies query defaults and coercion via req.validatedQuery', async () => {
    const res = await request(app).get('/things'); // no ?page

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ page: 1 }); // default applied
  });

  it('coerces a provided query value', async () => {
    const res = await request(app).get('/things?page=3');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ page: 3 });
  });
});
```

- [ ] **Step 2: Run the test and expect FAIL.**
  ```
  npm test -- tests/validate.test.js
  ```
  Expected: FAIL — `Cannot find module '../src/middleware/validate.js'`.

- [ ] **Step 3: Write the minimal implementation.** Create `src/middleware/validate.js` with COMPLETE code.

Note on `query`: in Express 5 `req.query` is a getter and cannot be reassigned, and even on Express 4 we avoid mutating it in place. So the parsed query is written to `req.validatedQuery` (controllers read from there); `body` and `params` are safe to overwrite and are replaced in place with the parsed value.

```js
// src/middleware/validate.js
import { AppError } from '../utils/AppError.js';

/**
 * validate({ body?, params?, query? })
 * Each provided value is a zod schema. On success the parsed result replaces
 * req.body / req.params, and the parsed query is exposed as req.validatedQuery
 * (req.query is not reliably writable across Express versions).
 * On failure throws AppError(400, 'VALIDATION_ERROR', <first issue>).
 */
export function validate(schemas = {}) {
  return (req, res, next) => {
    try {
      if (schemas.params) {
        req.params = parseOrThrow(schemas.params, req.params, 'params');
      }
      if (schemas.query) {
        req.validatedQuery = parseOrThrow(schemas.query, req.query, 'query');
      }
      if (schemas.body) {
        req.body = parseOrThrow(schemas.body, req.body, 'body');
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

function parseOrThrow(schema, value, where) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue.path.length ? issue.path.join('.') : where;
    throw new AppError(400, 'VALIDATION_ERROR', `${path}: ${issue.message}`);
  }
  return result.data;
}
```

- [ ] **Step 4: Run the test and expect PASS.**
  ```
  npm test -- tests/validate.test.js
  ```
  Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit.**
  ```
  git add src/middleware/validate.js tests/validate.test.js
  git commit -m "feat(security): add zod validate middleware for body/params/query"
  ```

---

### Task SEC-3: rate limiters for `/auth/*` and `/auth/farmer/register`

Two `express-rate-limit` instances: a general `authLimiter` for all auth traffic (login, refresh) and a stricter `registerLimiter` for account creation. Both emit the standard error envelope `{ error: { code, message } }` via a custom handler that throws `AppError(429, 'RATE_LIMITED', ...)`. Counting is disabled under `NODE_ENV==='test'` by default so unrelated tests are not throttled; the test in this task flips a flag to prove the limiter actually blocks.

**Files:** create `tests/rateLimit.test.js`, create `src/middleware/rateLimit.js`, modify `src/routes/auth.routes.js`

- [ ] **Step 1: Write the failing test.** Create `tests/rateLimit.test.js` with COMPLETE code. It builds a small app that mounts the two limiters (forced active) and asserts the Nth+1 request returns 429 with the right envelope.

```js
// tests/rateLimit.test.js
import express from 'express';
import request from 'supertest';
import {
  makeAuthLimiter,
  makeRegisterLimiter,
} from '../src/middleware/rateLimit.js';
import { error } from '../src/middleware/error.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  // Force the limiters ON regardless of NODE_ENV, with tiny caps for the test.
  app.use('/auth', makeAuthLimiter({ windowMs: 60_000, max: 3, force: true }));
  app.post(
    '/auth/farmer/register',
    makeRegisterLimiter({ windowMs: 60_000, max: 2, force: true }),
    (req, res) => res.status(201).json({ ok: true })
  );
  app.post('/auth/farmer/login', (req, res) => res.status(200).json({ ok: true }));
  app.use(error);
  return app;
}

describe('auth rate limiters', () => {
  it('allows up to max login requests then blocks with 429 RATE_LIMITED', async () => {
    const app = buildApp();

    // max = 3 -> first 3 pass, 4th is blocked
    for (let i = 0; i < 3; i++) {
      const ok = await request(app).post('/auth/farmer/login').send({});
      expect(ok.status).toBe(200);
    }

    const blocked = await request(app).post('/auth/farmer/login').send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });

  it('applies a stricter cap to /auth/farmer/register', async () => {
    const app = buildApp();

    // register max = 2 -> first 2 pass, 3rd blocked.
    // (register also passes through the /auth limiter first; its max=3 is looser,
    //  so the register-specific limiter is what trips at the 3rd call.)
    const a = await request(app).post('/auth/farmer/register').send({});
    const b = await request(app).post('/auth/farmer/register').send({});
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);

    const c = await request(app).post('/auth/farmer/register').send({});
    expect(c.status).toBe(429);
    expect(c.body.error.code).toBe('RATE_LIMITED');
  });
});
```

- [ ] **Step 2: Run the test and expect FAIL.**
  ```
  npm test -- tests/rateLimit.test.js
  ```
  Expected: FAIL — `Cannot find module '../src/middleware/rateLimit.js'`.

- [ ] **Step 3: Write the minimal implementation.** Create `src/middleware/rateLimit.js` with COMPLETE code.

```js
// src/middleware/rateLimit.js
import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/AppError.js';

// Shared handler: turn a rate-limit hit into our standard error envelope.
function limitHandler(req, res, next) {
  next(new AppError(429, 'RATE_LIMITED', 'Too many requests, please try again later'));
}

// A middleware that does nothing (used to disable limiting under test).
function passthrough(req, res, next) {
  return next();
}

/**
 * Build a limiter. In NODE_ENV==='test' it is a no-op UNLESS opts.force is true,
 * so the suite is not throttled but the rate-limit test can still exercise it.
 */
function build(opts) {
  const { windowMs, max, force = false } = opts;
  if (process.env.NODE_ENV === 'test' && !force) {
    return passthrough;
  }
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: limitHandler,
  });
}

// General auth traffic (login, refresh, logout, admin login): 20 / 15 min.
export function makeAuthLimiter(opts = {}) {
  return build({ windowMs: 15 * 60 * 1000, max: 20, ...opts });
}

// Account creation: much stricter, 5 / hour.
export function makeRegisterLimiter(opts = {}) {
  return build({ windowMs: 60 * 60 * 1000, max: 5, ...opts });
}

// Ready-to-mount singletons for the real app.
export const authLimiter = makeAuthLimiter();
export const registerLimiter = makeRegisterLimiter();
```

- [ ] **Step 4: Run the test and expect PASS.**
  ```
  npm test -- tests/rateLimit.test.js
  ```
  Expected: PASS — both tests green.

- [ ] **Step 5: Wire the limiters into the auth routes.** Modify `src/routes/auth.routes.js` (created by the AUTH module) to apply `authLimiter` to the whole router and `registerLimiter` to the register route. Add the import and the two `use`/route positions; leave the AUTH controllers untouched.

```js
// src/routes/auth.routes.js  — add these to the existing file
import { authLimiter, registerLimiter } from '../middleware/rateLimit.js';

// ...after `const router = express.Router();` add:
router.use(authLimiter); // every /auth/* request passes the general limiter

// ...and on the register route, put registerLimiter BEFORE validate/controller:
// router.post('/farmer/register', registerLimiter, validate({ body: registerSchema }), register);
```

- [ ] **Step 6: Run the full suite to confirm nothing else is throttled.**
  ```
  npm test
  ```
  Expected: PASS — the `test`-env no-op keeps every other suite unthrottled; only `tests/rateLimit.test.js` forces the limiter on.

- [ ] **Step 7: Commit.**
  ```
  git add src/middleware/rateLimit.js tests/rateLimit.test.js src/routes/auth.routes.js
  git commit -m "feat(security): add auth + register rate limiters with RATE_LIMITED envelope"
  ```

---

### Task SEC-4: IDOR CI test scaffold (proves the pattern against `/plots/:id`)

Stand up `tests/security.idor.test.js` now with the two-farmer setup and the assertion helpers, wired against the one owned-resource route that exists earliest: `/plots/:id`. This proves the whole IDOR pattern (token A → 404 on B's `:id`, never 200/403) end-to-end through the real `src/app.js`. Task SEC-5 expands the same file to the full four-resource matrix once the other routes exist.

**Files:** create `tests/security.idor.test.js`

- [ ] **Step 1: Write the failing test.** Create `tests/security.idor.test.js` with COMPLETE code. It uses the shared factories/auth helpers to create farmers A and B, gives each a plot, and asserts A cannot touch B's plot.

```js
// tests/security.idor.test.js
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connect, clear, disconnect } from './helpers/db.js';
import { createFarmer } from './helpers/factories.js';
import { farmerAccessToken } from './helpers/auth.js';
import { Plot } from '../src/models/plot.model.js';

beforeAll(connect);
afterEach(clear);
afterAll(disconnect);

/**
 * Sets up two farmers, each with their own plot.
 * Returns tokens and the *victim's* (B's) resource ids so the attacker (A)
 * can attempt to reach them.
 */
async function setupTwoFarmers() {
  const farmerA = await createFarmer({ phone: '9000000001' });
  const farmerB = await createFarmer({ phone: '9000000002' });

  const tokenA = farmerAccessToken(farmerA);

  const plotB = await Plot.create({
    farmerId: farmerB._id,
    name: 'B plot',
    area: { value: 1, unit: 'acre', normalizedAcres: 1 },
    state: 'MH',
    isActive: true,
  });

  return { tokenA, victim: { plotId: plotB._id.toString() } };
}

describe('IDOR: farmer A must get 404 (never 200/403) on farmer B resources', () => {
  it('GET /api/plots/:id of another farmer returns 404 NOT_FOUND', async () => {
    const { tokenA, victim } = await setupTwoFarmers();

    const res = await request(app)
      .get(`/api/plots/${victim.plotId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(403);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /api/plots/:id of another farmer returns 404 NOT_FOUND', async () => {
    const { tokenA, victim } = await setupTwoFarmers();

    const res = await request(app)
      .patch(`/api/plots/${victim.plotId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'hijacked' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /api/plots/:id of another farmer returns 404 NOT_FOUND', async () => {
    const { tokenA, victim } = await setupTwoFarmers();

    const res = await request(app)
      .delete(`/api/plots/${victim.plotId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('a random non-existent id also returns 404 (does not confirm existence)', async () => {
    const { tokenA } = await setupTwoFarmers();
    const ghostId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .get(`/api/plots/${ghostId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
```

- [ ] **Step 2: Run the test and expect FAIL.**
  ```
  npm test -- tests/security.idor.test.js
  ```
  Expected: FAIL. If the `/api/plots/:id` route already exists and correctly uses `ownership(Plot)`, it may fail only on setup import paths; if the route is not yet built or omits `ownership`, expect 404-on-route or a 200/500. Either way this is RED until the PLOTS module wires `ownership(Plot)`.

- [ ] **Step 3: Make it pass by ensuring `/api/plots/:id` uses the ownership middleware.** This route is owned by the PLOTS module; the SEC deliverable is that its `:id` handlers are guarded by `ownership(Plot)`. Confirm the PLOTS router matches this shape (do not duplicate the route here — this snippet documents the required guard):

```js
// src/routes/plots.routes.js — the :id handlers MUST be guarded like this
import { ownership } from '../middleware/ownership.js';
import { Plot } from '../models/plot.model.js';

router.get('/:id', ownership(Plot), getPlot);
router.patch('/:id', ownership(Plot), validate({ body: updatePlotSchema }), updatePlot);
router.delete('/:id', ownership(Plot), deletePlot); // soft: sets isActive=false
```

- [ ] **Step 4: Run the test and expect PASS.**
  ```
  npm test -- tests/security.idor.test.js
  ```
  Expected: PASS — all 4 assertions green, proving the ownership pattern end-to-end through `src/app.js`.

- [ ] **Step 5: Commit.**
  ```
  git add tests/security.idor.test.js
  git commit -m "test(security): IDOR CI test scaffold enforcing 404 on cross-farmer plots"
  ```

---

### Task SEC-5: Expand the IDOR CI test to the full four-resource matrix (GATED)

**Run this task only after the CROP-CYCLE, TRANSACTIONS and REPORTS modules are merged** (their `/api/crop-cycles/:id`, `/api/transactions/:id`, `/api/reports/crop-cycle/:id` routes must exist). This grows `tests/security.idor.test.js` into the exact test the contract mandates: two farmers each with a plot, crop cycle and transaction, asserting A gets **404** (not 200, not 403) on GET/PATCH/DELETE of B's `/transactions/:id`, `/plots/:id`, `/crop-cycles/:id` and GET of B's `/reports/crop-cycle/:id`.

**Files:** modify `tests/security.idor.test.js`

- [ ] **Step 1: Rewrite the test to the full matrix.** Replace the entire contents of `tests/security.idor.test.js` with COMPLETE code below.

```js
// tests/security.idor.test.js
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connect, clear, disconnect } from './helpers/db.js';
import { createFarmer } from './helpers/factories.js';
import { farmerAccessToken } from './helpers/auth.js';
import { Plot } from '../src/models/plot.model.js';
import { CropCycle } from '../src/models/cropCycle.model.js';
import { Transaction } from '../src/models/transaction.model.js';

beforeAll(connect);
afterEach(clear);
afterAll(disconnect);

/**
 * Two farmers, each fully populated with a plot, an active crop cycle and one
 * (non-void) transaction. Returns farmer A's token (the attacker) and farmer
 * B's resource ids (the victim). Everything is created directly via the models
 * so the test does not depend on write endpoints.
 */
async function setupTwoFarmers() {
  const farmerA = await createFarmer({ phone: '9000000001' });
  const farmerB = await createFarmer({ phone: '9000000002' });
  const tokenA = farmerAccessToken(farmerA);

  const plotB = await Plot.create({
    farmerId: farmerB._id,
    name: 'B plot',
    area: { value: 1, unit: 'acre', normalizedAcres: 1 },
    state: 'MH',
    isActive: true,
  });

  const cycleB = await CropCycle.create({
    farmerId: farmerB._id,
    plotId: plotB._id,
    cropId: new mongoose.Types.ObjectId(),
    cropName: 'Wheat',
    season: 'rabi',
    year: '2025-26',
    areaUsed: { value: 1, unit: 'acre', normalizedAcres: 1 },
    status: 'active',
  });

  const txnB = await Transaction.create({
    farmerId: farmerB._id,
    cropCycleId: cycleB._id,
    type: 'expense',
    categoryId: new mongoose.Types.ObjectId(),
    categoryName: 'Seeds',
    amount: 500,
    date: new Date('2026-01-15'),
    isImputed: false,
    isVoid: false,
  });

  return {
    tokenA,
    victim: {
      plotId: plotB._id.toString(),
      cropCycleId: cycleB._id.toString(),
      transactionId: txnB._id.toString(),
    },
  };
}

// A tiny helper so each row of the matrix reads clearly.
function auth(req, token) {
  return req.set('Authorization', `Bearer ${token}`);
}

describe('IDOR CI test — farmer A gets 404 (never 200/403) on farmer B resources', () => {
  // ---- /transactions/:id ----
  it('GET /api/transactions/:id → 404', async () => {
    const { tokenA, victim } = await setupTwoFarmers();
    const res = await auth(request(app).get(`/api/transactions/${victim.transactionId}`), tokenA);
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(403);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /api/transactions/:id → 404', async () => {
    const { tokenA, victim } = await setupTwoFarmers();
    const res = await auth(
      request(app).patch(`/api/transactions/${victim.transactionId}`).send({ amount: 1 }),
      tokenA
    );
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(403);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /api/transactions/:id → 404', async () => {
    const { tokenA, victim } = await setupTwoFarmers();
    const res = await auth(request(app).delete(`/api/transactions/${victim.transactionId}`), tokenA);
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(403);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // ---- /plots/:id ----
  it('GET /api/plots/:id → 404', async () => {
    const { tokenA, victim } = await setupTwoFarmers();
    const res = await auth(request(app).get(`/api/plots/${victim.plotId}`), tokenA);
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(403);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /api/plots/:id → 404', async () => {
    const { tokenA, victim } = await setupTwoFarmers();
    const res = await auth(
      request(app).patch(`/api/plots/${victim.plotId}`).send({ name: 'hijacked' }),
      tokenA
    );
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(403);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /api/plots/:id → 404', async () => {
    const { tokenA, victim } = await setupTwoFarmers();
    const res = await auth(request(app).delete(`/api/plots/${victim.plotId}`), tokenA);
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(403);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // ---- /crop-cycles/:id ----
  it('GET /api/crop-cycles/:id → 404', async () => {
    const { tokenA, victim } = await setupTwoFarmers();
    const res = await auth(request(app).get(`/api/crop-cycles/${victim.cropCycleId}`), tokenA);
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(403);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /api/crop-cycles/:id → 404', async () => {
    const { tokenA, victim } = await setupTwoFarmers();
    const res = await auth(
      request(app).patch(`/api/crop-cycles/${victim.cropCycleId}`).send({ status: 'closed' }),
      tokenA
    );
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(403);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /api/crop-cycles/:id → 404', async () => {
    const { tokenA, victim } = await setupTwoFarmers();
    const res = await auth(request(app).delete(`/api/crop-cycles/${victim.cropCycleId}`), tokenA);
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(403);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // ---- /reports/crop-cycle/:id ----
  it('GET /api/reports/crop-cycle/:id → 404', async () => {
    const { tokenA, victim } = await setupTwoFarmers();
    const res = await auth(request(app).get(`/api/reports/crop-cycle/${victim.cropCycleId}`), tokenA);
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(403);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // ---- existence is never confirmed ----
  it('a random non-existent id also returns 404 on every :id route', async () => {
    const { tokenA } = await setupTwoFarmers();
    const ghost = new mongoose.Types.ObjectId().toString();

    for (const path of [
      `/api/transactions/${ghost}`,
      `/api/plots/${ghost}`,
      `/api/crop-cycles/${ghost}`,
      `/api/reports/crop-cycle/${ghost}`,
    ]) {
      const res = await auth(request(app).get(path), tokenA);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    }
  });
});
```

- [ ] **Step 2: Run the test and expect FAIL for any route missing its ownership guard.**
  ```
  npm test -- tests/security.idor.test.js
  ```
  Expected: FAIL on any `:id` route whose module forgot `ownership(...)` (it would return 200 or 500 instead of 404). This is exactly the safety net the contract requires — the RED here points at the offending route.

- [ ] **Step 3: Confirm each guarded route.** For every failing row, ensure the owning module's route uses the middleware with the correct model. No new code lives in this module; the fixes belong in the respective route files, which must match:

```js
// transactions.routes.js
router.get('/:id',    ownership(Transaction), getTransaction);
router.patch('/:id',  ownership(Transaction), validate({ body: updateTransactionSchema }), updateTransaction);
router.delete('/:id', ownership(Transaction), voidTransaction); // soft: isVoid=true

// crop-cycles.routes.js
router.get('/:id',    ownership(CropCycle), getCropCycle);
router.patch('/:id',  ownership(CropCycle), validate({ body: updateCropCycleSchema }), updateCropCycle);
router.delete('/:id', ownership(CropCycle), deactivateCropCycle); // status='deactivated'

// reports.routes.js
router.get('/crop-cycle/:id', ownership(CropCycle), cropCycleReport);
```

- [ ] **Step 4: Run the test and expect PASS.**
  ```
  npm test -- tests/security.idor.test.js
  ```
  Expected: PASS — all 11 assertions green across all four resources.

- [ ] **Step 5: Run the whole suite to confirm the release gate.**
  ```
  npm test
  ```
  Expected: PASS — the full IDOR gate is green; release is unblocked.

- [ ] **Step 6: Commit.**
  ```
  git add tests/security.idor.test.js
  git commit -m "test(security): expand IDOR CI test to plots, crop-cycles, transactions and reports"
  ```

---

**Module SEC deliverables recap:** `src/middleware/ownership.js` (404-not-403, ObjectId-safe, `req.doc`), `src/middleware/validate.js` (zod body/params/query with coercion + strip, `req.validatedQuery`), `src/middleware/rateLimit.js` (`authLimiter` + `registerLimiter`, `RATE_LIMITED` envelope, test-safe), and the mandatory `tests/security.idor.test.js` — scaffolded green here (SEC-4) and expanded to the full four-resource 404 matrix once the dependent routes exist (SEC-5, the required pre-release CI gate).

Relevant absolute paths for this module:
- `D:/smart-farming/src/middleware/ownership.js`
- `D:/smart-farming/src/middleware/validate.js`
- `D:/smart-farming/src/middleware/rateLimit.js`
- `D:/smart-farming/src/routes/auth.routes.js` (modified — AUTH-owned)
- `D:/smart-farming/tests/ownership.test.js`
- `D:/smart-farming/tests/validate.test.js`
- `D:/smart-farming/tests/rateLimit.test.js`
- `D:/smart-farming/tests/security.idor.test.js`

---

## Module MD — Master data & app config

This module implements the master-data collections that everything else references: `CropCatalog`, `ExpenseCategory` (with the CACP `isPaidOut` / `isImputed` / `cacpTag` flags), `IncomeCategory`, and the single-document `AppConfig`. It ships a **seed script** (`src/seed/seed.js`) that inserts the CACP-based default expense categories, income categories, a starter `landUnitConversions` table, and `appConfig` defaults. Finally it exposes the farmer-facing **read endpoints** `GET /api/catalog/*` that return only active items.

> **Assumed already built by earlier modules** (do not re-create): `src/app.js` (exports the Express app, mounts routers under `/api`, wires the central error middleware), `src/config/db.js`, `src/config/env.js`, `src/middleware/authenticate.js`, `src/middleware/requireRole.js`, `src/middleware/error.js`, `src/utils/AppError.js`, and the test helpers `tests/helpers/db.js` (mongodb-memory-server: `beforeAll` connect, `afterEach` clear, `afterAll` stop) and `tests/helpers/auth.js` (`farmerToken()` etc.). This module registers its router by editing `src/app.js` only.

**Files:**

- Create: `src/models/cropCatalog.model.js`
- Create: `src/models/expenseCategory.model.js`
- Create: `src/models/incomeCategory.model.js`
- Create: `src/models/appConfig.model.js`
- Create: `src/seed/defaults.js` (the raw default data — imported by both the seed script and tests)
- Create: `src/seed/seed.js` (idempotent seeder; runnable via `node src/seed/seed.js`)
- Create: `src/services/catalog.service.js`
- Create: `src/controllers/catalog.controller.js`
- Create: `src/routes/catalog.routes.js`
- Modify: `src/app.js` (mount the catalog router)
- Test: `tests/models.masterdata.test.js`
- Test: `tests/seed.test.js`
- Test: `tests/catalog.test.js`

---

### Task MD-1: CropCatalog, IncomeCategory & AppConfig models

**Files:** create `tests/models.masterdata.test.js`, `src/models/cropCatalog.model.js`, `src/models/incomeCategory.model.js`, `src/models/appConfig.model.js`

- [ ] **Step 1: Write the failing test.** Create `tests/models.masterdata.test.js` with COMPLETE code. It asserts each model's collection name, defaults, and required-field validation.

```js
// tests/models.masterdata.test.js
import mongoose from 'mongoose';
import { connect, clear, close } from './helpers/db.js';
import CropCatalog from '../src/models/cropCatalog.model.js';
import IncomeCategory from '../src/models/incomeCategory.model.js';
import AppConfig from '../src/models/appConfig.model.js';

beforeAll(async () => { await connect(); });
afterEach(async () => { await clear(); });
afterAll(async () => { await close(); });

describe('CropCatalog model', () => {
  test('uses the cropCatalog collection', () => {
    expect(CropCatalog.collection.collectionName).toBe('cropCatalog');
  });

  test('requires name and defaults isActive to true', async () => {
    const crop = await CropCatalog.create({ name: 'Wheat', defaultSeason: 'rabi' });
    expect(crop.name).toBe('Wheat');
    expect(crop.isActive).toBe(true);
    await expect(CropCatalog.create({ defaultSeason: 'rabi' })).rejects.toThrow(
      mongoose.Error.ValidationError,
    );
  });
});

describe('IncomeCategory model', () => {
  test('uses the incomeCategories collection', () => {
    expect(IncomeCategory.collection.collectionName).toBe('incomeCategories');
  });

  test('requires name and defaults isActive to true', async () => {
    const cat = await IncomeCategory.create({ name: 'Main crop sale', type: 'main' });
    expect(cat.name).toBe('Main crop sale');
    expect(cat.isActive).toBe(true);
    await expect(IncomeCategory.create({ type: 'main' })).rejects.toThrow(
      mongoose.Error.ValidationError,
    );
  });
});

describe('AppConfig model', () => {
  test('uses the appConfig collection', () => {
    expect(AppConfig.collection.collectionName).toBe('appConfig');
  });

  test('applies the contract defaults', async () => {
    const cfg = await AppConfig.create({});
    expect(cfg.trialDays).toBe(14);
    expect(cfg.monthlyPriceINR).toBe(99);
    expect(cfg.yearlyPriceINR).toBe(799);
    expect(cfg.graceDays).toBe(30);
    expect(cfg.dailyWageINR).toBe(350);
    expect(cfg.ownLandRentalPerAcreINR).toBe(4000);
    expect(cfg.landUnitConversions).toEqual({});
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/models.masterdata.test.js
```

Expected: FAIL — `Cannot find module '../src/models/cropCatalog.model.js'` (the model files do not exist yet).

- [ ] **Step 3: Implement `CropCatalog`.** Create `src/models/cropCatalog.model.js` with COMPLETE code.

```js
// src/models/cropCatalog.model.js
import mongoose from 'mongoose';

const cropCatalogSchema = new mongoose.Schema({
  name: { type: String, required: true },
  defaultSeason: { type: String },
  icon: { type: String },
  isActive: { type: Boolean, default: true },
});

export default mongoose.model('CropCatalog', cropCatalogSchema, 'cropCatalog');
```

- [ ] **Step 4: Implement `IncomeCategory`.** Create `src/models/incomeCategory.model.js` with COMPLETE code.

```js
// src/models/incomeCategory.model.js
import mongoose from 'mongoose';

const incomeCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String },
  type: { type: String },
  isActive: { type: Boolean, default: true },
});

export default mongoose.model('IncomeCategory', incomeCategorySchema, 'incomeCategories');
```

- [ ] **Step 5: Implement `AppConfig`.** Create `src/models/appConfig.model.js` with COMPLETE code. It is a single-document collection; `landUnitConversions` and `defaultCategories` are free-form objects, and every numeric field carries its contract default.

```js
// src/models/appConfig.model.js
import mongoose from 'mongoose';

const appConfigSchema = new mongoose.Schema({
  trialDays: { type: Number, default: 14 },
  monthlyPriceINR: { type: Number, default: 99 },
  yearlyPriceINR: { type: Number, default: 799 },
  graceDays: { type: Number, default: 30 },
  dailyWageINR: { type: Number, default: 350 },
  ownLandRentalPerAcreINR: { type: Number, default: 4000 },
  ownedCapitalInterestRatePct: { type: Number, default: 6 },
  landUnitConversions: { type: Object, default: {} },
  defaultCategories: { type: Object, default: {} },
});

export default mongoose.model('AppConfig', appConfigSchema, 'appConfig');
```

- [ ] **Step 6: Run the test — expect PASS.**

```
npm test -- tests/models.masterdata.test.js
```

Expected: PASS — all 6 tests green (collection names, defaults, and required-field validation).

- [ ] **Step 7: Commit.**

```
git add src/models/cropCatalog.model.js src/models/incomeCategory.model.js src/models/appConfig.model.js tests/models.masterdata.test.js
git commit -m "feat(master-data): add CropCatalog, IncomeCategory and AppConfig models"
```

---

### Task MD-2: ExpenseCategory model with CACP flags

**Files:** modify `tests/models.masterdata.test.js`, create `src/models/expenseCategory.model.js`

- [ ] **Step 1: Add the failing test.** Append this block to `tests/models.masterdata.test.js` and add the import at the top. First add the import next to the others:

```js
import ExpenseCategory from '../src/models/expenseCategory.model.js';
```

Then append the describe block at the end of the file:

```js
describe('ExpenseCategory model', () => {
  test('uses the expenseCategories collection', () => {
    expect(ExpenseCategory.collection.collectionName).toBe('expenseCategories');
  });

  test('stores CACP flags and defaults isActive to true', async () => {
    const cat = await ExpenseCategory.create({
      name: 'Seeds',
      isPaidOut: true,
      isImputed: false,
      cacpTag: 'A2',
    });
    expect(cat.name).toBe('Seeds');
    expect(cat.isPaidOut).toBe(true);
    expect(cat.isImputed).toBe(false);
    expect(cat.cacpTag).toBe('A2');
    expect(cat.isActive).toBe(true);
  });

  test('rejects a cacpTag outside the enum', async () => {
    await expect(
      ExpenseCategory.create({
        name: 'Bad',
        isPaidOut: true,
        isImputed: false,
        cacpTag: 'Z9',
      }),
    ).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('requires name, isPaidOut, isImputed and cacpTag', async () => {
    await expect(ExpenseCategory.create({ cacpTag: 'A2' })).rejects.toThrow(
      mongoose.Error.ValidationError,
    );
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/models.masterdata.test.js
```

Expected: FAIL — `Cannot find module '../src/models/expenseCategory.model.js'`.

- [ ] **Step 3: Implement `ExpenseCategory`.** Create `src/models/expenseCategory.model.js` with COMPLETE code. `cacpTag` is an enum `['A1','A2','FL','C2']`; `isPaidOut` and `isImputed` are required booleans (they are not derived at read time — the seed writes the correct pair per row).

```js
// src/models/expenseCategory.model.js
import mongoose from 'mongoose';

const expenseCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String },
  isPaidOut: { type: Boolean, required: true },
  isImputed: { type: Boolean, required: true },
  cacpTag: { type: String, enum: ['A1', 'A2', 'FL', 'C2'], required: true },
  isActive: { type: Boolean, default: true },
});

export default mongoose.model('ExpenseCategory', expenseCategorySchema, 'expenseCategories');
```

- [ ] **Step 4: Run the test — expect PASS.**

```
npm test -- tests/models.masterdata.test.js
```

Expected: PASS — all model tests green, including the new ExpenseCategory block.

- [ ] **Step 5: Commit.**

```
git add src/models/expenseCategory.model.js tests/models.masterdata.test.js
git commit -m "feat(master-data): add ExpenseCategory model with CACP tag flags"
```

---

### Task MD-3: Default master-data definitions

This task defines the raw defaults in one place, `src/seed/defaults.js`, so the seed script and the tests share exactly one source of truth. The expense-category flags follow the CACP mapping table in doc 06: everything is `A2` paid-out except **Family labour** (`FL`, imputed), **Own-land rental value** (`C2`, imputed), **Owned-machinery depreciation** (`C2`, imputed), and **Interest on owned capital** (`C2`, imputed). Note that **Owned-machinery fuel / running is `A2` paid-out**, kept separate from its depreciation.

**Files:** create `src/seed/defaults.js`, create `tests/seed.test.js` (defaults section only)

- [ ] **Step 1: Write the failing test.** Create `tests/seed.test.js` with COMPLETE code asserting the shape and CACP correctness of the defaults. (This same file gets a second describe block in Task MD-4.)

```js
// tests/seed.test.js
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_LAND_UNIT_CONVERSIONS,
  DEFAULT_APP_CONFIG,
} from '../src/seed/defaults.js';

describe('default master-data definitions', () => {
  test('has exactly the 17 CACP expense categories', () => {
    expect(DEFAULT_EXPENSE_CATEGORIES).toHaveLength(17);
    const names = DEFAULT_EXPENSE_CATEGORIES.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'Seeds',
        'Fertilizer',
        'Manure',
        'Pesticides & insecticides',
        'Irrigation / water charges',
        'Hired labour',
        'Family labour',
        'Hired machinery / tractor / fuel',
        'Owned machinery fuel / running',
        'Owned machinery depreciation',
        'Bullock labour',
        'Land rent (leased-in, paid)',
        'Own-land rental value',
        'Interest on loan / working capital',
        'Transport',
        'Land revenue / cess / taxes',
        'Miscellaneous',
      ]),
    );
  });

  test('every expense category has consistent CACP flags', () => {
    for (const c of DEFAULT_EXPENSE_CATEGORIES) {
      expect(['A1', 'A2', 'FL', 'C2']).toContain(c.cacpTag);
      // paid-out and imputed are mutually exclusive in this dataset
      expect(c.isPaidOut).toBe(!c.isImputed);
      // A2 rows are paid-out; FL and C2 rows are imputed
      if (c.cacpTag === 'A2') {
        expect(c.isPaidOut).toBe(true);
        expect(c.isImputed).toBe(false);
      }
      if (c.cacpTag === 'FL' || c.cacpTag === 'C2') {
        expect(c.isPaidOut).toBe(false);
        expect(c.isImputed).toBe(true);
      }
    }
  });

  test('the four imputed categories carry the right tags', () => {
    const byName = Object.fromEntries(DEFAULT_EXPENSE_CATEGORIES.map((c) => [c.name, c]));
    expect(byName['Family labour'].cacpTag).toBe('FL');
    expect(byName['Own-land rental value'].cacpTag).toBe('C2');
    expect(byName['Owned machinery depreciation'].cacpTag).toBe('C2');
    expect(byName['Interest on owned capital'].cacpTag).toBe('C2');
    // owned-machinery FUEL stays A2 paid-out, distinct from depreciation
    expect(byName['Owned machinery fuel / running'].cacpTag).toBe('A2');
    expect(byName['Owned machinery fuel / running'].isPaidOut).toBe(true);
  });

  test('income categories are present and active-shaped', () => {
    const names = DEFAULT_INCOME_CATEGORIES.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining(['Main crop sale', 'By-product / fodder sale', 'Other income']),
    );
  });

  test('land-unit conversions cover fixed units and a few state bighas', () => {
    expect(DEFAULT_LAND_UNIT_CONVERSIONS.acre.sqft).toBe(43560);
    expect(DEFAULT_LAND_UNIT_CONVERSIONS.guntha.sqft).toBe(1089);
    expect(DEFAULT_LAND_UNIT_CONVERSIONS.cent.sqft).toBe(435.6);
    // hectare = 43560 * 2.471
    expect(DEFAULT_LAND_UNIT_CONVERSIONS.hectare.sqft).toBeCloseTo(107636.76, 2);
    // bigha varies by state
    expect(DEFAULT_LAND_UNIT_CONVERSIONS.bigha.byState['West Bengal']).toBe(14400);
    expect(DEFAULT_LAND_UNIT_CONVERSIONS.bigha.byState['Uttar Pradesh']).toBe(27000);
    expect(DEFAULT_LAND_UNIT_CONVERSIONS.bigha.byState['Punjab']).toBe(9070);
  });

  test('app config defaults match the contract', () => {
    expect(DEFAULT_APP_CONFIG).toMatchObject({
      trialDays: 14,
      monthlyPriceINR: 99,
      yearlyPriceINR: 799,
      graceDays: 30,
      dailyWageINR: 350,
      ownLandRentalPerAcreINR: 4000,
    });
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/seed.test.js
```

Expected: FAIL — `Cannot find module '../src/seed/defaults.js'`.

- [ ] **Step 3: Implement the defaults.** Create `src/seed/defaults.js` with COMPLETE code. Each expense category sets `isPaidOut` / `isImputed` explicitly to match its `cacpTag`.

```js
// src/seed/defaults.js
// Single source of truth for the CACP-based master data seeded into a fresh install.
// See docs/06-cost-and-profit-engine.md (CACP mapping table) and docs/05-data-model.md.

// A2 = paid-out cash/kind; FL = imputed family labour; C2 = imputed own-resource cost.
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Seeds', icon: 'seeds', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Fertilizer', icon: 'fertilizer', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Manure', icon: 'manure', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Pesticides & insecticides', icon: 'pesticide', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Irrigation / water charges', icon: 'water', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Hired labour', icon: 'labour', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Family labour', icon: 'family', cacpTag: 'FL', isPaidOut: false, isImputed: true },
  { name: 'Hired machinery / tractor / fuel', icon: 'tractor', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Owned machinery fuel / running', icon: 'fuel', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Owned machinery depreciation', icon: 'depreciation', cacpTag: 'C2', isPaidOut: false, isImputed: true },
  { name: 'Bullock labour', icon: 'bullock', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Land rent (leased-in, paid)', icon: 'land-rent', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Own-land rental value', icon: 'own-land', cacpTag: 'C2', isPaidOut: false, isImputed: true },
  { name: 'Interest on loan / working capital', icon: 'interest', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Transport', icon: 'transport', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Land revenue / cess / taxes', icon: 'tax', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  { name: 'Miscellaneous', icon: 'misc', cacpTag: 'A2', isPaidOut: true, isImputed: false },
  // Interest on owned capital is the imputed C2 counterpart of the paid-out loan interest above.
  { name: 'Interest on owned capital', icon: 'own-interest', cacpTag: 'C2', isPaidOut: false, isImputed: true },
];

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Main crop sale', icon: 'crop', type: 'main' },
  { name: 'By-product / fodder sale', icon: 'fodder', type: 'byproduct' },
  { name: 'Other income', icon: 'other', type: 'other' },
];

// Fixed nationwide units store sqft directly; bigha varies by state.
// acre = 43,560 sqft; hectare = 43,560 * 2.471; guntha = 1,089 sqft; cent = 435.6 sqft.
export const DEFAULT_LAND_UNIT_CONVERSIONS = {
  acre: { sqft: 43560 },
  hectare: { sqft: 43560 * 2.471 },
  guntha: { sqft: 1089 },
  cent: { sqft: 435.6 },
  bigha: {
    byState: {
      'West Bengal': 14400,
      'Uttar Pradesh': 27000,
      Punjab: 9070,
      Haryana: 9070,
      Rajasthan: 27225,
      Bihar: 27220,
    },
  },
};

export const DEFAULT_APP_CONFIG = {
  trialDays: 14,
  monthlyPriceINR: 99,
  yearlyPriceINR: 799,
  graceDays: 30,
  dailyWageINR: 350,
  ownLandRentalPerAcreINR: 4000,
  ownedCapitalInterestRatePct: 6,
  landUnitConversions: DEFAULT_LAND_UNIT_CONVERSIONS,
};
```

Because the assertion counts 17 categories, note the count: the 16 rows named in the module brief plus the explicit `Interest on owned capital` C2 row from the doc-06 table = **17** rows total (`Owned machinery fuel / running` and `Owned machinery depreciation` are two separate entries, as the doc requires).

- [ ] **Step 4: Run the test — expect PASS.**

```
npm test -- tests/seed.test.js
```

Expected: PASS — all default-definition assertions green.

- [ ] **Step 5: Commit.**

```
git add src/seed/defaults.js tests/seed.test.js
git commit -m "feat(master-data): add CACP default categories, land units and config values"
```

---

### Task MD-4: Idempotent seed script

`src/seed/seed.js` inserts the defaults into MongoDB. It must be **idempotent** — running it twice must not create duplicates and must not overwrite an existing `appConfig`. It exports a `seed(options)` function (so tests can call it against the in-memory DB) and, when run directly with `node src/seed/seed.js`, connects via `src/config/db.js`, seeds, and disconnects.

**Files:** modify `tests/seed.test.js` (add a DB-backed describe block), create `src/seed/seed.js`

- [ ] **Step 1: Add the failing test.** Add the imports and a new describe block to `tests/seed.test.js`. Add these imports at the top of the file:

```js
import { connect, clear, close } from './helpers/db.js';
import { seed } from '../src/seed/seed.js';
import ExpenseCategory from '../src/models/expenseCategory.model.js';
import IncomeCategory from '../src/models/incomeCategory.model.js';
import AppConfig from '../src/models/appConfig.model.js';
```

Then append this describe block at the end of the file:

```js
describe('seed(): inserts defaults into MongoDB', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await clear(); });
  afterAll(async () => { await close(); });

  test('inserts all expense and income categories and one app config', async () => {
    await seed();
    expect(await ExpenseCategory.countDocuments()).toBe(17);
    expect(await IncomeCategory.countDocuments()).toBe(3);
    expect(await AppConfig.countDocuments()).toBe(1);

    const cfg = await AppConfig.findOne();
    expect(cfg.dailyWageINR).toBe(350);
    expect(cfg.landUnitConversions.acre.sqft).toBe(43560);
    expect(cfg.landUnitConversions.bigha.byState['West Bengal']).toBe(14400);

    const family = await ExpenseCategory.findOne({ name: 'Family labour' });
    expect(family.cacpTag).toBe('FL');
    expect(family.isImputed).toBe(true);
    expect(family.isPaidOut).toBe(false);
  });

  test('is idempotent — running twice does not duplicate rows or configs', async () => {
    await seed();
    await seed();
    expect(await ExpenseCategory.countDocuments()).toBe(17);
    expect(await IncomeCategory.countDocuments()).toBe(3);
    expect(await AppConfig.countDocuments()).toBe(1);
  });

  test('does not overwrite an existing app config on re-seed', async () => {
    await seed();
    await AppConfig.updateOne({}, { $set: { dailyWageINR: 500 } });
    await seed();
    const cfg = await AppConfig.findOne();
    expect(cfg.dailyWageINR).toBe(500); // preserved, not reset to 350
    expect(await AppConfig.countDocuments()).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/seed.test.js
```

Expected: FAIL — `Cannot find module '../src/seed/seed.js'`.

- [ ] **Step 3: Implement the seed script.** Create `src/seed/seed.js` with COMPLETE code. It upserts categories by `name` (idempotent) and creates `appConfig` only if none exists.

```js
// src/seed/seed.js
// Idempotent seeder for master data. Import { seed } in tests, or run:
//   node src/seed/seed.js
import mongoose from 'mongoose';
import ExpenseCategory from '../models/expenseCategory.model.js';
import IncomeCategory from '../models/incomeCategory.model.js';
import AppConfig from '../models/appConfig.model.js';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_APP_CONFIG,
} from './defaults.js';

export async function seed() {
  // Upsert categories by name so re-running never duplicates a row.
  for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
    await ExpenseCategory.updateOne(
      { name: cat.name },
      { $set: cat, $setOnInsert: { isActive: true } },
      { upsert: true },
    );
  }
  for (const cat of DEFAULT_INCOME_CATEGORIES) {
    await IncomeCategory.updateOne(
      { name: cat.name },
      { $set: cat, $setOnInsert: { isActive: true } },
      { upsert: true },
    );
  }

  // appConfig is a single document: create it only if none exists.
  const existingConfig = await AppConfig.findOne();
  if (!existingConfig) {
    await AppConfig.create(DEFAULT_APP_CONFIG);
  }

  return { seeded: true };
}

// Allow running directly: `node src/seed/seed.js`
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;
if (isMain) {
  const { connectDB } = await import('../config/db.js');
  await connectDB();
  await seed();
  // eslint-disable-next-line no-console
  console.log('Seed complete: master data inserted/updated.');
  await mongoose.disconnect();
  process.exit(0);
}
```

> Note: `connectDB` is the exported connect function from the shared `src/config/db.js` established by the foundation module. If that module named it differently (e.g. `connect`), adjust this one import name to match — the `seed()` function itself is DB-connection agnostic and is what the tests exercise.

- [ ] **Step 4: Run the test — expect PASS.**

```
npm test -- tests/seed.test.js
```

Expected: PASS — insert, idempotency, and config-preservation tests all green.

- [ ] **Step 5: Commit.**

```
git add src/seed/seed.js tests/seed.test.js
git commit -m "feat(master-data): add idempotent seed script for categories and config"
```

---

### Task MD-5: Catalog service (active-only reads)

The service holds the query logic so the controller stays thin. Every function returns **only active items** (`isActive: true`), and `getLandUnits` reads `landUnitConversions` off the single `appConfig` document.

**Files:** create `src/services/catalog.service.js`, create `tests/catalog.test.js` (service section only)

- [ ] **Step 1: Write the failing test.** Create `tests/catalog.test.js` with COMPLETE code. (Task MD-6 adds an HTTP describe block to the same file.)

```js
// tests/catalog.test.js
import { connect, clear, close } from './helpers/db.js';
import { seed } from '../src/seed/seed.js';
import CropCatalog from '../src/models/cropCatalog.model.js';
import ExpenseCategory from '../src/models/expenseCategory.model.js';
import IncomeCategory from '../src/models/incomeCategory.model.js';
import * as catalog from '../src/services/catalog.service.js';

beforeAll(async () => { await connect(); });
afterEach(async () => { await clear(); });
afterAll(async () => { await close(); });

describe('catalog.service', () => {
  test('listCrops returns only active crops', async () => {
    await CropCatalog.create([
      { name: 'Wheat', isActive: true },
      { name: 'Retired crop', isActive: false },
    ]);
    const crops = await catalog.listCrops();
    const names = crops.map((c) => c.name);
    expect(names).toContain('Wheat');
    expect(names).not.toContain('Retired crop');
  });

  test('listExpenseCategories returns only active categories', async () => {
    await seed();
    await ExpenseCategory.updateOne({ name: 'Miscellaneous' }, { $set: { isActive: false } });
    const cats = await catalog.listExpenseCategories();
    const names = cats.map((c) => c.name);
    expect(names).toContain('Seeds');
    expect(names).not.toContain('Miscellaneous');
    // CACP flags survive the read
    const family = cats.find((c) => c.name === 'Family labour');
    expect(family.cacpTag).toBe('FL');
    expect(family.isImputed).toBe(true);
  });

  test('listIncomeCategories returns only active categories', async () => {
    await IncomeCategory.create([
      { name: 'Main crop sale', isActive: true },
      { name: 'Old income', isActive: false },
    ]);
    const cats = await catalog.listIncomeCategories();
    const names = cats.map((c) => c.name);
    expect(names).toContain('Main crop sale');
    expect(names).not.toContain('Old income');
  });

  test('getLandUnits returns the conversions from appConfig', async () => {
    await seed();
    const units = await catalog.getLandUnits();
    expect(units.acre.sqft).toBe(43560);
    expect(units.bigha.byState['West Bengal']).toBe(14400);
  });

  test('getLandUnits returns an empty object when no appConfig exists', async () => {
    const units = await catalog.getLandUnits();
    expect(units).toEqual({});
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/catalog.test.js
```

Expected: FAIL — `Cannot find module '../src/services/catalog.service.js'`.

- [ ] **Step 3: Implement the service.** Create `src/services/catalog.service.js` with COMPLETE code.

```js
// src/services/catalog.service.js
import CropCatalog from '../models/cropCatalog.model.js';
import ExpenseCategory from '../models/expenseCategory.model.js';
import IncomeCategory from '../models/incomeCategory.model.js';
import AppConfig from '../models/appConfig.model.js';

export async function listCrops() {
  return CropCatalog.find({ isActive: true }).sort({ name: 1 }).lean();
}

export async function listExpenseCategories() {
  return ExpenseCategory.find({ isActive: true }).sort({ name: 1 }).lean();
}

export async function listIncomeCategories() {
  return IncomeCategory.find({ isActive: true }).sort({ name: 1 }).lean();
}

export async function getLandUnits() {
  const cfg = await AppConfig.findOne().lean();
  return cfg?.landUnitConversions ?? {};
}
```

- [ ] **Step 4: Run the test — expect PASS.**

```
npm test -- tests/catalog.test.js
```

Expected: PASS — active-only filtering and land-unit lookup all green.

- [ ] **Step 5: Commit.**

```
git add src/services/catalog.service.js tests/catalog.test.js
git commit -m "feat(catalog): add active-only catalog read service"
```

---

### Task MD-6: Catalog read endpoints (GET /api/catalog/*)

Expose the four farmer-facing read endpoints. All require an authenticated **farmer** (per the contract, catalog reads are role `F`). Lists return the contract's list shape `{ data: [...] }`; `land-units` returns the conversion object directly. The controller is thin and delegates to the service.

**Files:** create `src/controllers/catalog.controller.js`, create `src/routes/catalog.routes.js`, modify `src/app.js`, modify `tests/catalog.test.js`

- [ ] **Step 1: Add the failing HTTP test.** Add these imports at the top of `tests/catalog.test.js`:

```js
import request from 'supertest';
import app from '../src/app.js';
import { farmerToken } from './helpers/auth.js';
```

Then append this describe block to `tests/catalog.test.js`:

```js
describe('GET /api/catalog/* endpoints', () => {
  let token;

  beforeEach(async () => {
    await seed();
    // farmerToken() from tests/helpers/auth.js creates a farmer and returns a signed access token
    token = await farmerToken();
  });

  test('GET /api/catalog/crops returns active crops in { data: [...] }', async () => {
    await CropCatalog.create([
      { name: 'Wheat', isActive: true },
      { name: 'Retired', isActive: false },
    ]);
    const res = await request(app)
      .get('/api/catalog/crops')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const names = res.body.data.map((c) => c.name);
    expect(names).toContain('Wheat');
    expect(names).not.toContain('Retired');
  });

  test('GET /api/catalog/expense-categories returns active categories with CACP flags', async () => {
    const res = await request(app)
      .get('/api/catalog/expense-categories')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(17);
    const family = res.body.data.find((c) => c.name === 'Family labour');
    expect(family.cacpTag).toBe('FL');
    expect(family.isImputed).toBe(true);
    expect(family.isPaidOut).toBe(false);
  });

  test('GET /api/catalog/income-categories returns active categories', async () => {
    const res = await request(app)
      .get('/api/catalog/income-categories')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((c) => c.name)).toContain('Main crop sale');
  });

  test('GET /api/catalog/land-units returns the conversion object', async () => {
    const res = await request(app)
      .get('/api/catalog/land-units')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.acre.sqft).toBe(43560);
    expect(res.body.bigha.byState['West Bengal']).toBe(14400);
  });

  test('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/catalog/crops');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/catalog.test.js
```

Expected: FAIL — the four routes are not mounted, so `GET /api/catalog/crops` returns 404 (`expect(res.status).toBe(200)` fails).

- [ ] **Step 3: Implement the controller.** Create `src/controllers/catalog.controller.js` with COMPLETE code. Errors bubble to the central error middleware via `next`.

```js
// src/controllers/catalog.controller.js
import * as catalog from '../services/catalog.service.js';

export async function getCrops(req, res, next) {
  try {
    const data = await catalog.listCrops();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getExpenseCategories(req, res, next) {
  try {
    const data = await catalog.listExpenseCategories();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getIncomeCategories(req, res, next) {
  try {
    const data = await catalog.listIncomeCategories();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getLandUnits(req, res, next) {
  try {
    const units = await catalog.getLandUnits();
    res.json(units);
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 4: Implement the router.** Create `src/routes/catalog.routes.js` with COMPLETE code. Every route is protected by `authenticate` + `requireRole('farmer')` per the contract.

```js
// src/routes/catalog.routes.js
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import requireRole from '../middleware/requireRole.js';
import {
  getCrops,
  getExpenseCategories,
  getIncomeCategories,
  getLandUnits,
} from '../controllers/catalog.controller.js';

const router = Router();

router.use(authenticate, requireRole('farmer'));

router.get('/crops', getCrops);
router.get('/expense-categories', getExpenseCategories);
router.get('/income-categories', getIncomeCategories);
router.get('/land-units', getLandUnits);

export default router;
```

> Note: `authenticate` and `requireRole` are the shared middleware from the AUTH module. If they are named exports rather than default exports there, change these two import lines to `import { authenticate } from ...` / `import { requireRole } from ...` to match — the router logic is unchanged.

- [ ] **Step 5: Mount the router in `src/app.js`.** Add the import alongside the other route imports and mount it under `/api/catalog`. The exact edit — add near the other `import ...Routes` lines:

```js
import catalogRoutes from './routes/catalog.routes.js';
```

and add this line where the other routers are mounted (before the central error middleware):

```js
app.use('/api/catalog', catalogRoutes);
```

- [ ] **Step 6: Run the test — expect PASS.**

```
npm test -- tests/catalog.test.js
```

Expected: PASS — all four endpoints return active-only data in the correct shape, and the unauthenticated request returns 401.

- [ ] **Step 7: Run the full suite to confirm nothing else broke.**

```
npm test
```

Expected: PASS — `tests/models.masterdata.test.js`, `tests/seed.test.js`, and `tests/catalog.test.js` all green (alongside earlier modules' suites).

- [ ] **Step 8: Commit.**

```
git add src/controllers/catalog.controller.js src/routes/catalog.routes.js src/app.js tests/catalog.test.js
git commit -m "feat(catalog): add GET /api/catalog/* farmer read endpoints"
```

---

**Module MD complete.** Master-data models (`CropCatalog`, `ExpenseCategory` with CACP flags, `IncomeCategory`, single-doc `AppConfig`) exist and validate; the idempotent seed script populates the 17 CACP expense categories, income categories, the starter `landUnitConversions` table (fixed units + state bighas), and `appConfig` defaults (`trialDays 14`, `monthlyPriceINR 99`, `yearlyPriceINR 799`, `graceDays 30`, `dailyWageINR 350`, `ownLandRentalPerAcreINR 4000`); and farmers can read active-only master data through `GET /api/catalog/crops`, `/expense-categories`, `/income-categories`, and `/land-units`. Downstream modules (cost engine, transactions, reports, plot/crop-cycle creation) can now rely on these categories, tags, and conversions.

---

## Module P — Plots & land-unit normalization

**Files:**
- create `src/services/costEngine.service.js` (the `normalizeToAcres` function only — later modules add `cashProfit`, `trueProfit`, etc.)
- create `src/models/Plot.model.js`
- create `src/routes/plots.routes.js`
- create `src/controllers/plots.controller.js`
- modify `src/app.js` (mount `/api/plots`)
- create `tests/costEngine.normalize.test.js`
- create `tests/plots.test.js`

This module assumes the shared foundation already exists (from earlier modules): `src/app.js`, `src/config/env.js`, `src/models/Farmer.model.js`, `src/middleware/(authenticate.js, requireRole.js, ownership.js, validate.js, error.js)`, `src/utils/AppError.js`, `tests/helpers/(db.js, factories.js, auth.js)`. The land-unit conversions come from `AppConfig.landUnitConversions`; where a test needs a state-varying bigha we pass an explicit conversions object.

---

### Task P-1: `normalizeToAcres` pure function with full unit tests

**Files:** create `tests/costEngine.normalize.test.js`, create `src/services/costEngine.service.js`

- [ ] **Step 1: Write the failing test.** Create `tests/costEngine.normalize.test.js` with COMPLETE code:

```js
import { describe, it, expect } from '@jest/globals';
import { normalizeToAcres } from '../src/services/costEngine.service.js';

// A representative conversions table (shape mirrors AppConfig.landUnitConversions).
// bighaSqft varies by state, which is the whole point of keying by state.
const conversions = {
  MH: { bighaSqft: 26910 }, // Maharashtra-style large bigha
  UP: { bighaSqft: 27000 }, // Uttar Pradesh pucca bigha
  RJ: { bighaSqft: 27225 }, // Rajasthan bigha
};

describe('normalizeToAcres', () => {
  it('treats acre as factor 1 (1 acre = 1 acre)', () => {
    const acres = normalizeToAcres({ value: 3, unit: 'acre' }, conversions);
    expect(acres).toBeCloseTo(3, 6);
  });

  it('converts hectare using 43560 * 2.471 sqft per hectare', () => {
    // 1 hectare = 43560 * 2.471 sqft = 107636.76 sqft; /43560 = 2.471 acres
    const acres = normalizeToAcres({ value: 1, unit: 'hectare' }, conversions);
    expect(acres).toBeCloseTo(2.471, 6);
  });

  it('converts guntha using 1089 sqft each (40 guntha = 1 acre)', () => {
    const acres = normalizeToAcres({ value: 40, unit: 'guntha' }, conversions);
    expect(acres).toBeCloseTo(1, 6);
  });

  it('converts cent using 435.6 sqft each (100 cent = 1 acre)', () => {
    const acres = normalizeToAcres({ value: 100, unit: 'cent' }, conversions);
    expect(acres).toBeCloseTo(1, 6);
  });

  it('converts a state-varying bigha for Maharashtra (MH)', () => {
    // 1 MH bigha = 26910 sqft; /43560 = 0.617768... acres
    const acres = normalizeToAcres({ value: 1, unit: 'bigha', state: 'MH' }, conversions);
    expect(acres).toBeCloseTo(26910 / 43560, 6);
  });

  it('uses a DIFFERENT bigha factor for a different state (UP)', () => {
    const acres = normalizeToAcres({ value: 2, unit: 'bigha', state: 'UP' }, conversions);
    expect(acres).toBeCloseTo((2 * 27000) / 43560, 6);
  });

  it('is case-insensitive on the unit name', () => {
    const acres = normalizeToAcres({ value: 1, unit: 'HECTARE' }, conversions);
    expect(acres).toBeCloseTo(2.471, 6);
  });

  it('throws AppError(400) for an unknown unit with no conversion', () => {
    expect(() => normalizeToAcres({ value: 1, unit: 'kanal' }, conversions)).toThrow();
    try {
      normalizeToAcres({ value: 1, unit: 'kanal' }, conversions);
    } catch (err) {
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('UNKNOWN_UNIT');
    }
  });

  it('throws AppError(400) for bigha when the state has no conversion entry', () => {
    expect(() => normalizeToAcres({ value: 1, unit: 'bigha', state: 'ZZ' }, conversions)).toThrow();
    try {
      normalizeToAcres({ value: 1, unit: 'bigha', state: 'ZZ' }, conversions);
    } catch (err) {
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('UNKNOWN_UNIT');
    }
  });

  it('throws AppError(400) for a non-positive or non-numeric value', () => {
    expect(() => normalizeToAcres({ value: 0, unit: 'acre' }, conversions)).toThrow();
    expect(() => normalizeToAcres({ value: -5, unit: 'acre' }, conversions)).toThrow();
    expect(() => normalizeToAcres({ value: 'abc', unit: 'acre' }, conversions)).toThrow();
  });
});
```

- [ ] **Step 2: Run the test, expect FAIL.**

```
npm test -- tests/costEngine.normalize.test.js
```

Expected: FAIL — `Cannot find module '../src/services/costEngine.service.js'` (the file does not exist yet), so every test in the suite errors.

- [ ] **Step 3: Write the minimal implementation.** Create `src/services/costEngine.service.js` with COMPLETE code:

```js
import { AppError } from '../utils/AppError.js';

const SQFT_PER_ACRE = 43560;

// Fixed sqft-per-unit factors that do NOT vary by state.
// hectare = 43560 * 2.471 sqft; guntha = 1089 sqft; cent = 435.6 sqft; acre = 43560 sqft.
const FIXED_SQFT = {
  acre: SQFT_PER_ACRE,
  hectare: SQFT_PER_ACRE * 2.471,
  guntha: 1089,
  cent: 435.6,
};

/**
 * Convert a land area to acres.
 * @param {{ value:number, unit:string, state?:string }} area
 * @param {Object} conversions - AppConfig.landUnitConversions, keyed by state -> { bighaSqft }.
 * @returns {number} area in acres
 * @throws {AppError} 400 UNKNOWN_UNIT for an unknown unit or a bigha with no state conversion.
 */
export function normalizeToAcres({ value, unit, state } = {}, conversions = {}) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new AppError(400, 'INVALID_AREA', 'Area value must be a positive number');
  }
  if (typeof unit !== 'string' || unit.trim() === '') {
    throw new AppError(400, 'UNKNOWN_UNIT', 'Unknown land unit');
  }

  const key = unit.trim().toLowerCase();

  let sqftPerUnit;
  if (key === 'bigha') {
    const entry = state && conversions ? conversions[state] : undefined;
    if (!entry || !Number.isFinite(Number(entry.bighaSqft))) {
      throw new AppError(400, 'UNKNOWN_UNIT', `No bigha conversion for state ${state ?? '(none)'}`);
    }
    sqftPerUnit = Number(entry.bighaSqft);
  } else if (Object.prototype.hasOwnProperty.call(FIXED_SQFT, key)) {
    sqftPerUnit = FIXED_SQFT[key];
  } else {
    throw new AppError(400, 'UNKNOWN_UNIT', `Unknown land unit: ${unit}`);
  }

  return (num * sqftPerUnit) / SQFT_PER_ACRE;
}
```

- [ ] **Step 4: Run the test, expect PASS.**

```
npm test -- tests/costEngine.normalize.test.js
```

Expected: PASS — all 10 tests green.

- [ ] **Step 5: Commit.**

```
git add src/services/costEngine.service.js tests/costEngine.normalize.test.js
git commit -m "feat(plots): add normalizeToAcres land-unit conversion with unit tests"
```

---

### Task P-2: `Plot` model

**Files:** create `src/models/Plot.model.js`

- [ ] **Step 1: Write the failing test.** Create `tests/plots.test.js` with COMPLETE code for the model shape (later tasks append the endpoint tests to this same file):

```js
import { describe, it, expect, beforeAll, afterEach, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import { connectTestDb, clearTestDb, stopTestDb } from './helpers/db.js';
import { Plot } from '../src/models/Plot.model.js';

beforeAll(async () => { await connectTestDb(); });
afterEach(async () => { await clearTestDb(); });
afterAll(async () => { await stopTestDb(); });

describe('Plot model', () => {
  it('creates a plot with the exact area sub-shape and defaults isActive=true', async () => {
    const farmerId = new mongoose.Types.ObjectId();
    const plot = await Plot.create({
      farmerId,
      name: 'North field',
      area: { value: 2, unit: 'acre', normalizedAcres: 2 },
      state: 'MH',
    });

    expect(String(plot.farmerId)).toBe(String(farmerId));
    expect(plot.name).toBe('North field');
    expect(plot.area.value).toBe(2);
    expect(plot.area.unit).toBe('acre');
    expect(plot.area.normalizedAcres).toBe(2);
    expect(plot.state).toBe('MH');
    expect(plot.isActive).toBe(true);
    expect(plot.createdAt).toBeInstanceOf(Date);
  });

  it('requires farmerId, name and area', async () => {
    await expect(Plot.create({})).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the test, expect FAIL.**

```
npm test -- tests/plots.test.js
```

Expected: FAIL — `Cannot find module '../src/models/Plot.model.js'`.

- [ ] **Step 3: Write the model.** Create `src/models/Plot.model.js` with COMPLETE code:

```js
import mongoose from 'mongoose';

const areaSchema = new mongoose.Schema(
  {
    value: { type: Number, required: true },
    unit: { type: String, required: true },
    normalizedAcres: { type: Number, required: true },
  },
  { _id: false }
);

const plotSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
  name: { type: String, required: true },
  area: { type: areaSchema, required: true },
  state: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export const Plot = mongoose.model('Plot', plotSchema);
```

- [ ] **Step 4: Run the test, expect PASS.**

```
npm test -- tests/plots.test.js
```

Expected: PASS — both model tests green.

- [ ] **Step 5: Commit.**

```
git add src/models/Plot.model.js tests/plots.test.js
git commit -m "feat(plots): add Plot model with area sub-schema"
```

---

### Task P-3: `POST /api/plots` — create a plot (computes `normalizedAcres`)

**Files:** create `src/controllers/plots.controller.js`, create `src/routes/plots.routes.js`, modify `src/app.js`

- [ ] **Step 1: Write the failing test.** Append to `tests/plots.test.js`:

```js
import request from 'supertest';
import { app } from '../src/app.js';
import { createFarmer } from './helpers/factories.js';
import { farmerToken } from './helpers/auth.js';

describe('POST /api/plots', () => {
  it('creates a plot and computes area.normalizedAcres from the unit', async () => {
    const farmer = await createFarmer({ state: 'MH' });
    const token = farmerToken(farmer);

    const res = await request(app)
      .post('/api/plots')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'South field', area: { value: 40, unit: 'guntha' } });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('South field');
    expect(res.body.area.value).toBe(40);
    expect(res.body.area.unit).toBe('guntha');
    // 40 guntha = 1 acre
    expect(res.body.area.normalizedAcres).toBeCloseTo(1, 6);
    expect(String(res.body.farmerId)).toBe(String(farmer._id));
    expect(res.body.isActive).toBe(true);
  });

  it('uses the request-body state over the farmer state for a bigha', async () => {
    const farmer = await createFarmer({ state: 'MH' });
    const token = farmerToken(farmer);

    const res = await request(app)
      .post('/api/plots')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bigha plot', area: { value: 1, unit: 'bigha' }, state: 'UP' });

    expect(res.status).toBe(201);
    // resolved against UP bigha from seeded AppConfig conversions
    expect(res.body.area.normalizedAcres).toBeCloseTo(27000 / 43560, 4);
    expect(res.body.state).toBe('UP');
  });

  it('rejects an unknown unit with 400 UNKNOWN_UNIT', async () => {
    const farmer = await createFarmer({ state: 'MH' });
    const token = farmerToken(farmer);

    const res = await request(app)
      .post('/api/plots')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad', area: { value: 1, unit: 'kanal' } });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNKNOWN_UNIT');
  });

  it('rejects a missing name with 400 VALIDATION_ERROR', async () => {
    const farmer = await createFarmer({ state: 'MH' });
    const token = farmerToken(farmer);

    const res = await request(app)
      .post('/api/plots')
      .set('Authorization', `Bearer ${token}`)
      .send({ area: { value: 1, unit: 'acre' } });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app)
      .post('/api/plots')
      .send({ name: 'X', area: { value: 1, unit: 'acre' } });

    expect(res.status).toBe(401);
  });
});
```

This test seeds an `AppConfig` doc holding `landUnitConversions`. Add a small helper so the plots controller can read it. The test relies on the shared `createFarmer` factory (already provided) writing `state` onto the farmer, and on an `AppConfig` doc existing. Extend `tests/helpers/factories.js` with a `seedAppConfig` helper (append it; do not remove existing helpers):

```js
// --- append to tests/helpers/factories.js ---
import { AppConfig } from '../../src/models/AppConfig.model.js';

export async function seedAppConfig(overrides = {}) {
  const doc = {
    trialDays: 14,
    monthlyPriceINR: 99,
    yearlyPriceINR: 799,
    graceDays: 30,
    dailyWageINR: 350,
    ownLandRentalPerAcreINR: 4000,
    landUnitConversions: {
      MH: { bighaSqft: 26910 },
      UP: { bighaSqft: 27000 },
      RJ: { bighaSqft: 27225 },
    },
    ...overrides,
  };
  return AppConfig.findOneAndUpdate({}, doc, { upsert: true, new: true, setDefaultsOnInsert: true });
}
```

And seed it in the `POST /api/plots` describe block by adding a `beforeEach`. Update the top of that describe block so it reads:

```js
describe('POST /api/plots', () => {
  beforeEach(async () => { await seedAppConfig(); });
  // ...the it(...) cases above...
});
```

Remember to add `seedAppConfig` (and `beforeEach`) to the imports at the top of `tests/plots.test.js`:

```js
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from '@jest/globals';
import { createFarmer, seedAppConfig } from './helpers/factories.js';
```

- [ ] **Step 2: Run the test, expect FAIL.**

```
npm test -- tests/plots.test.js
```

Expected: FAIL — `Cannot find module '../src/routes/plots.routes.js'` (and `/api/plots` is not mounted), so the POST tests 404 or error.

- [ ] **Step 3: Write the controller.** Create `src/controllers/plots.controller.js` with COMPLETE code:

```js
import { z } from 'zod';
import { Plot } from '../models/Plot.model.js';
import { AppConfig } from '../models/AppConfig.model.js';
import { Farmer } from '../models/Farmer.model.js';
import { normalizeToAcres } from '../services/costEngine.service.js';
import { AppError } from '../utils/AppError.js';

export const createPlotSchema = z.object({
  name: z.string().min(1),
  area: z.object({
    value: z.number().positive(),
    unit: z.string().min(1),
  }),
  state: z.string().min(1).optional(),
});

async function resolveConversions() {
  const cfg = await AppConfig.findOne({});
  return cfg?.landUnitConversions ?? {};
}

// POST /api/plots
export async function createPlot(req, res) {
  const { name, area, state: bodyState } = req.body;

  const farmer = await Farmer.findById(req.user.id);
  const state = bodyState ?? farmer?.state;

  const conversions = await resolveConversions();
  const normalizedAcres = normalizeToAcres(
    { value: area.value, unit: area.unit, state },
    conversions
  );

  const plot = await Plot.create({
    farmerId: req.user.id,
    name,
    area: { value: area.value, unit: area.unit, normalizedAcres },
    state,
  });

  res.status(201).json(plot.toJSON());
}

// GET /api/plots
export async function listPlots(req, res) {
  const plots = await Plot.find({ farmerId: req.user.id, isActive: true }).sort({ createdAt: -1 });
  res.json({ data: plots });
}

// PATCH /api/plots/:id  (ownership middleware has attached req.doc)
export async function updatePlot(req, res) {
  const plot = req.doc;

  if (typeof req.body.name === 'string' && req.body.name.trim() !== '') {
    plot.name = req.body.name;
  }

  if (req.body.area) {
    const value = req.body.area.value ?? plot.area.value;
    const unit = req.body.area.unit ?? plot.area.unit;
    const state = req.body.state ?? plot.state;
    const conversions = await resolveConversions();
    const normalizedAcres = normalizeToAcres({ value, unit, state }, conversions);
    plot.area = { value, unit, normalizedAcres };
    if (req.body.state) plot.state = req.body.state;
  }

  await plot.save();
  res.json(plot.toJSON());
}

// DELETE /api/plots/:id  (ownership middleware has attached req.doc) — deactivate, never delete
export async function deletePlot(req, res) {
  const plot = req.doc;
  plot.isActive = false;
  await plot.save();
  res.json(plot.toJSON());
}
```

- [ ] **Step 4: Write the validation schema wiring + routes.** Create `src/routes/plots.routes.js` with COMPLETE code (PATCH/DELETE ownership are wired here now so the same file is complete; their tests come in P-4 and P-5):

```js
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { ownership } from '../middleware/ownership.js';
import { Plot } from '../models/Plot.model.js';
import {
  createPlot,
  listPlots,
  updatePlot,
  deletePlot,
  createPlotSchema,
} from '../controllers/plots.controller.js';

const updatePlotSchema = z.object({
  name: z.string().min(1).optional(),
  area: z
    .object({
      value: z.number().positive().optional(),
      unit: z.string().min(1).optional(),
    })
    .optional(),
  state: z.string().min(1).optional(),
});

const router = Router();

router.use(authenticate, requireRole('farmer'));

router.get('/', listPlots);
router.post('/', validate(createPlotSchema), createPlot);
router.patch('/:id', validate(updatePlotSchema), ownership(Plot), updatePlot);
router.delete('/:id', ownership(Plot), deletePlot);

export default router;
```

Mount it in `src/app.js`. Add the import near the other route imports and the `app.use` near the other mounts:

```js
// near the other route imports
import plotsRoutes from './routes/plots.routes.js';

// near the other app.use('/api/...') mounts, BEFORE the error middleware
app.use('/api/plots', plotsRoutes);
```

- [ ] **Step 5: Run the test, expect PASS.**

```
npm test -- tests/plots.test.js
```

Expected: PASS — model tests plus all five `POST /api/plots` cases green.

- [ ] **Step 6: Commit.**

```
git add src/controllers/plots.controller.js src/routes/plots.routes.js src/app.js tests/plots.test.js tests/helpers/factories.js
git commit -m "feat(plots): add POST /api/plots computing normalizedAcres from land units"
```

---

### Task P-4: `GET /api/plots` — list own active plots (excludes `isActive:false`)

**Files:** modify `tests/plots.test.js` (uses the `listPlots` controller + route already created in P-3)

- [ ] **Step 1: Write the failing test.** Append to `tests/plots.test.js`:

```js
describe('GET /api/plots', () => {
  beforeEach(async () => { await seedAppConfig(); });

  it('returns only the caller\'s active plots, newest first, as { data: [...] }', async () => {
    const farmer = await createFarmer({ state: 'MH' });
    const token = farmerToken(farmer);

    // two active plots
    await request(app)
      .post('/api/plots')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Plot A', area: { value: 1, unit: 'acre' } });
    const b = await request(app)
      .post('/api/plots')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Plot B', area: { value: 2, unit: 'acre' } });

    // deactivate Plot B -> must be excluded from the list
    await request(app)
      .delete(`/api/plots/${b.body._id}`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get('/api/plots')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Plot A');
  });

  it('does not return another farmer\'s plots', async () => {
    const a = await createFarmer({ phone: '9000000001', state: 'MH' });
    const bFarmer = await createFarmer({ phone: '9000000002', state: 'MH' });
    const tokenA = farmerToken(a);
    const tokenB = farmerToken(bFarmer);

    await request(app)
      .post('/api/plots')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'B only', area: { value: 1, unit: 'acre' } });

    const res = await request(app)
      .get('/api/plots')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/plots');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the test, expect PASS immediately** (the `listPlots` controller and `GET /` route were created in P-3; this task locks the list behavior with tests).

```
npm test -- tests/plots.test.js
```

Expected: PASS — the list-filtering and ownership-scoping cases are green. If any fail, fix `listPlots` to filter `{ farmerId: req.user.id, isActive: true }` (it already does) before proceeding.

- [ ] **Step 3: Commit.**

```
git add tests/plots.test.js
git commit -m "test(plots): lock GET /api/plots active-only, owner-scoped listing"
```

---

### Task P-5: `PATCH /api/plots/:id` — update with ownership + recompute `normalizedAcres`

**Files:** modify `tests/plots.test.js` (uses the `updatePlot` controller + route already created in P-3)

- [ ] **Step 1: Write the failing test.** Append to `tests/plots.test.js`:

```js
describe('PATCH /api/plots/:id', () => {
  beforeEach(async () => { await seedAppConfig(); });

  it('renames a plot without touching area', async () => {
    const farmer = await createFarmer({ state: 'MH' });
    const token = farmerToken(farmer);
    const created = await request(app)
      .post('/api/plots')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Old name', area: { value: 1, unit: 'acre' } });

    const res = await request(app)
      .patch(`/api/plots/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New name' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New name');
    expect(res.body.area.normalizedAcres).toBeCloseTo(1, 6);
  });

  it('recomputes normalizedAcres when area changes', async () => {
    const farmer = await createFarmer({ state: 'MH' });
    const token = farmerToken(farmer);
    const created = await request(app)
      .post('/api/plots')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Field', area: { value: 1, unit: 'acre' } });

    const res = await request(app)
      .patch(`/api/plots/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ area: { value: 40, unit: 'guntha' } });

    expect(res.status).toBe(200);
    expect(res.body.area.value).toBe(40);
    expect(res.body.area.unit).toBe('guntha');
    expect(res.body.area.normalizedAcres).toBeCloseTo(1, 6);
  });

  it('returns 404 (not 403) when patching another farmer\'s plot', async () => {
    const a = await createFarmer({ phone: '9000000011', state: 'MH' });
    const bFarmer = await createFarmer({ phone: '9000000012', state: 'MH' });
    const tokenA = farmerToken(a);
    const tokenB = farmerToken(bFarmer);

    const bPlot = await request(app)
      .post('/api/plots')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'B plot', area: { value: 1, unit: 'acre' } });

    const res = await request(app)
      .patch(`/api/plots/${bPlot.body._id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'hacked' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a well-formed but non-existent id', async () => {
    const farmer = await createFarmer({ state: 'MH' });
    const token = farmerToken(farmer);
    const missingId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .patch(`/api/plots/${missingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'x' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
```

- [ ] **Step 2: Run the test, expect PASS** (controller + route already exist from P-3). 

```
npm test -- tests/plots.test.js
```

Expected: PASS — rename, recompute, cross-farmer 404, and missing-id 404 all green. The 404-not-403 cases exercise the shared `ownership(Plot)` middleware.

- [ ] **Step 3: Commit.**

```
git add tests/plots.test.js
git commit -m "test(plots): lock PATCH /api/plots/:id ownership + normalizedAcres recompute"
```

---

### Task P-6: `DELETE /api/plots/:id` — deactivate (never delete) with ownership

**Files:** modify `tests/plots.test.js` (uses the `deletePlot` controller + route already created in P-3)

- [ ] **Step 1: Write the failing test.** Append to `tests/plots.test.js`:

```js
describe('DELETE /api/plots/:id', () => {
  beforeEach(async () => { await seedAppConfig(); });

  it('deactivates the plot (isActive=false) and keeps the document', async () => {
    const farmer = await createFarmer({ state: 'MH' });
    const token = farmerToken(farmer);
    const created = await request(app)
      .post('/api/plots')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'To deactivate', area: { value: 1, unit: 'acre' } });

    const res = await request(app)
      .delete(`/api/plots/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);

    // the document still exists in the DB (soft delete, not hard delete)
    const stillThere = await Plot.findById(created.body._id);
    expect(stillThere).not.toBeNull();
    expect(stillThere.isActive).toBe(false);
  });

  it('returns 404 (not 403) when deleting another farmer\'s plot', async () => {
    const a = await createFarmer({ phone: '9000000021', state: 'MH' });
    const bFarmer = await createFarmer({ phone: '9000000022', state: 'MH' });
    const tokenA = farmerToken(a);
    const tokenB = farmerToken(bFarmer);

    const bPlot = await request(app)
      .post('/api/plots')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'B plot', area: { value: 1, unit: 'acre' } });

    const res = await request(app)
      .delete(`/api/plots/${bPlot.body._id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('a deactivated plot no longer appears in GET /api/plots', async () => {
    const farmer = await createFarmer({ state: 'MH' });
    const token = farmerToken(farmer);
    const created = await request(app)
      .post('/api/plots')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Gone soon', area: { value: 1, unit: 'acre' } });

    await request(app)
      .delete(`/api/plots/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get('/api/plots')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test, expect PASS** (controller + route already exist from P-3).

```
npm test -- tests/plots.test.js
```

Expected: PASS — soft-delete sets `isActive=false` and keeps the row, cross-farmer delete is 404, and the deactivated plot drops out of the list.

- [ ] **Step 3: Commit.**

```
git add tests/plots.test.js
git commit -m "test(plots): lock DELETE /api/plots/:id soft-delete + ownership"
```

---

### Task P-7: Full-module green + guard against unit-conversion regressions

**Files:** run both test files together; no new source files.

- [ ] **Step 1: Run the whole module.**

```
npm test -- tests/costEngine.normalize.test.js tests/plots.test.js
```

Expected: PASS — the `normalizeToAcres` unit suite (10 tests) and the full `plots` suite (model, POST, GET, PATCH, DELETE) all green.

- [ ] **Step 2: Run the complete suite to confirm no cross-module breakage.**

```
npm test
```

Expected: PASS — this module adds `Plot`, `normalizeToAcres`, and the `/api/plots` endpoints without touching other modules' behavior. The shared `ownership(Plot)` middleware is now also exercised by `tests/security.idor.test.js` once the transactions/crop-cycles modules land.

- [ ] **Step 3: Commit a checkpoint (if anything changed).**

```
git add -A
git commit -m "test(plots): module P green — normalizeToAcres + plots CRUD with ownership"
```

---

**Module P notes for the integrator:**
- `normalizeToAcres` lives in `src/services/costEngine.service.js`; later modules (cost & profit engine) ADD `cashProfit`, `trueProfit`, `perAcre`, `suggestFamilyLabour`, `suggestOwnLandRental` to the SAME file — do not recreate it.
- `POST`/`PATCH` resolve the land-unit `state` as **request-body `state` first, then the farmer's `state`**, then feed `AppConfig.landUnitConversions` to `normalizeToAcres`. Bigha requires a matching state entry or it is a `400 UNKNOWN_UNIT`.
- All list/read queries filter `isActive:true`; `DELETE` is a soft delete (`isActive=false`), consistent with the deactivate-only lifecycle.
- Ownership on `PATCH`/`DELETE` uses the shared `ownership(Plot)` middleware and MUST return **404 (never 403)** for another farmer's or a missing id — this is the IDOR contract enforced by `tests/security.idor.test.js`.

---

## Module CC — Crop cycles

This module builds the crop-cycle feature: the Mongoose model, the farmer-facing CRUD endpoints, ownership enforcement on `:id` routes, `areaUsed.normalizedAcres` computed on write, `cropName` denormalized from the crop catalog, PATCH-to-close, and DELETE-as-deactivate. Lists exclude deactivated cycles.

**Assumed pre-existing scaffolding (built by earlier modules — do not re-create):** `src/app.js`, `src/config/env.js`, `src/models/Farmer.model.js`, `src/models/Plot.model.js`, `src/models/CropCatalog.model.js`, `src/models/AppConfig.model.js`, `src/middleware/authenticate.js`, `src/middleware/requireRole.js`, `src/middleware/ownership.js`, `src/middleware/validate.js`, `src/middleware/error.js`, `src/utils/AppError.js`, `src/services/costEngine.service.js` (exports `normalizeToAcres`), and the test helpers `tests/helpers/db.js`, `tests/helpers/factories.js`, `tests/helpers/auth.js`. This module consumes them.

**Files:**
- **create** `src/models/CropCycle.model.js`
- **create** `src/services/cropCycle.service.js`
- **create** `src/controllers/cropCycle.controller.js`
- **create** `src/routes/cropCycle.routes.js`
- **modify** `src/app.js` (mount `/api/crop-cycles`)
- **modify** `tests/helpers/factories.js` (add `createCropCycle` factory)
- **create (test)** `tests/cropCycle.model.test.js`
- **create (test)** `tests/cropCycle.create.test.js`
- **create (test)** `tests/cropCycle.read.test.js`
- **create (test)** `tests/cropCycle.update.test.js`
- **create (test)** `tests/cropCycle.delete.test.js`

Reference of what the helpers already give you (used verbatim in test code below):
- `tests/helpers/db.js` — `connect()` in `beforeAll`, `clearCollections()` in `afterEach`, `disconnect()` in `afterAll`.
- `tests/helpers/factories.js` — `createFarmer({ state })` returns a saved `Farmer` doc; `createPlot({ farmerId, ... })` returns a saved `Plot` doc; `createCrop({ name })` returns a saved `CropCatalog` doc; `createAppConfig({ landUnitConversions })` upserts the single `AppConfig` doc.
- `tests/helpers/auth.js` — `tokenFor(farmer)` returns a valid farmer access JWT string.

---

### Task CC-1: CropCycle Mongoose model

**Files:** create `src/models/CropCycle.model.js`, create `tests/cropCycle.model.test.js`

- [ ] **Step 1: Write the failing model test.** Create `tests/cropCycle.model.test.js` with COMPLETE code:

```js
import mongoose from 'mongoose';
import { connect, clearCollections, disconnect } from './helpers/db.js';
import CropCycle from '../src/models/CropCycle.model.js';

beforeAll(async () => { await connect(); });
afterEach(async () => { await clearCollections(); });
afterAll(async () => { await disconnect(); });

describe('CropCycle model', () => {
  const base = () => ({
    farmerId: new mongoose.Types.ObjectId(),
    plotId: new mongoose.Types.ObjectId(),
    cropId: new mongoose.Types.ObjectId(),
    cropName: 'Wheat',
    season: 'rabi',
    year: '2025-26',
    areaUsed: { value: 80, unit: 'guntha', normalizedAcres: 2.0 },
  });

  it('saves a valid crop cycle and defaults status to active', async () => {
    const doc = await CropCycle.create(base());
    expect(doc.status).toBe('active');
    expect(doc.cropName).toBe('Wheat');
    expect(doc.areaUsed.normalizedAcres).toBe(2.0);
    expect(doc.year).toBe('2025-26');
  });

  it('requires farmerId, plotId, cropId, cropName, season, year and areaUsed fields', async () => {
    const err = await CropCycle.create({}).catch((e) => e);
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.farmerId).toBeDefined();
    expect(err.errors.plotId).toBeDefined();
    expect(err.errors.cropId).toBeDefined();
    expect(err.errors.cropName).toBeDefined();
    expect(err.errors.season).toBeDefined();
    expect(err.errors.year).toBeDefined();
    expect(err.errors['areaUsed.value']).toBeDefined();
    expect(err.errors['areaUsed.unit']).toBeDefined();
    expect(err.errors['areaUsed.normalizedAcres']).toBeDefined();
  });

  it('rejects an invalid season', async () => {
    const err = await CropCycle.create({ ...base(), season: 'summer' }).catch((e) => e);
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.season).toBeDefined();
  });

  it('rejects an invalid status', async () => {
    const err = await CropCycle.create({ ...base(), status: 'archived' }).catch((e) => e);
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.status).toBeDefined();
  });

  it('accepts all valid seasons', async () => {
    for (const season of ['kharif', 'rabi', 'zaid', 'perennial']) {
      const doc = await CropCycle.create({ ...base(), season });
      expect(doc.season).toBe(season);
    }
  });
});
```

- [ ] **Step 2: Run the test, expect FAIL.**
  - Command: `npm test -- tests/cropCycle.model.test.js`
  - Expected: FAIL — `Cannot find module '../src/models/CropCycle.model.js'` (the model file does not exist yet).

- [ ] **Step 3: Write the model (minimal implementation).** Create `src/models/CropCycle.model.js` with COMPLETE code:

```js
import mongoose from 'mongoose';

const areaUsedSchema = new mongoose.Schema(
  {
    value: { type: Number, required: true },
    unit: { type: String, required: true },
    normalizedAcres: { type: Number, required: true },
  },
  { _id: false }
);

const cropCycleSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
  plotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plot', required: true },
  cropId: { type: mongoose.Schema.Types.ObjectId, ref: 'CropCatalog', required: true },
  cropName: { type: String, required: true },
  season: {
    type: String,
    enum: ['kharif', 'rabi', 'zaid', 'perennial'],
    required: true,
  },
  year: { type: String, required: true },
  areaUsed: { type: areaUsedSchema, required: true },
  sowingDate: { type: Date },
  harvestDate: { type: Date },
  status: {
    type: String,
    enum: ['active', 'closed', 'deactivated'],
    default: 'active',
  },
  createdAt: { type: Date, default: Date.now },
});

cropCycleSchema.index({ farmerId: 1, season: 1, year: 1 });
cropCycleSchema.index({ farmerId: 1, status: 1 });

export default mongoose.model('CropCycle', cropCycleSchema);
```

- [ ] **Step 4: Run the test, expect PASS.**
  - Command: `npm test -- tests/cropCycle.model.test.js`
  - Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit.**
  - Command: `git add src/models/CropCycle.model.js tests/cropCycle.model.test.js && git commit -m "feat(crop-cycles): add CropCycle model with season/status enums and indexes"`

---

### Task CC-2: `createCropCycle` factory helper

**Files:** modify `tests/helpers/factories.js`

This factory is used by every remaining CC task (and by the required IDOR test in the security module). Add it now so later tests can create cycles without repeating setup.

- [ ] **Step 1: Add the factory.** Add this export to `tests/helpers/factories.js` (add the `CropCycle` import at the top with the other model imports; append the function). COMPLETE code for the addition:

```js
// at the top of tests/helpers/factories.js, alongside the other model imports:
import CropCycle from '../../src/models/CropCycle.model.js';

// append this function (and add it to whatever the file already exports):
export async function createCropCycle(overrides = {}) {
  const doc = {
    farmerId: overrides.farmerId,
    plotId: overrides.plotId,
    cropId: overrides.cropId ?? new (await import('mongoose')).default.Types.ObjectId(),
    cropName: overrides.cropName ?? 'Wheat',
    season: overrides.season ?? 'rabi',
    year: overrides.year ?? '2025-26',
    areaUsed: overrides.areaUsed ?? { value: 80, unit: 'guntha', normalizedAcres: 2.0 },
    sowingDate: overrides.sowingDate,
    harvestDate: overrides.harvestDate,
    status: overrides.status ?? 'active',
  };
  return CropCycle.create(doc);
}
```

- [ ] **Step 2: Sanity-check the helper compiles by running the model test again** (it imports nothing new, but this confirms the factories file still parses cleanly for downstream tests).
  - Command: `npm test -- tests/cropCycle.model.test.js`
  - Expected: PASS — still 5 tests green (no regression from editing the helper).

- [ ] **Step 3: Commit.**
  - Command: `git add tests/helpers/factories.js && git commit -m "test(crop-cycles): add createCropCycle factory helper"`

---

### Task CC-3: POST /api/crop-cycles — create with validation, plot-ownership check, normalizedAcres compute, cropName denormalize

**Files:** create `src/services/cropCycle.service.js`, create `src/controllers/cropCycle.controller.js`, create `src/routes/cropCycle.routes.js`, modify `src/app.js`, create `tests/cropCycle.create.test.js`

- [ ] **Step 1: Write the failing create test.** Create `tests/cropCycle.create.test.js` with COMPLETE code:

```js
import request from 'supertest';
import app from '../src/app.js';
import { connect, clearCollections, disconnect } from './helpers/db.js';
import { createFarmer, createPlot, createCrop, createAppConfig } from './helpers/factories.js';
import { tokenFor } from './helpers/auth.js';
import CropCycle from '../src/models/CropCycle.model.js';

beforeAll(async () => { await connect(); });
afterEach(async () => { await clearCollections(); });
afterAll(async () => { await disconnect(); });

// guntha = 1089 sqft, acre = 43560 sqft => 80 guntha = 87120 sqft = 2.0 acres
async function setup() {
  await createAppConfig({ landUnitConversions: {} });
  const farmer = await createFarmer({ state: 'MH' });
  const plot = await createPlot({ farmerId: farmer._id, state: 'MH' });
  const crop = await createCrop({ name: 'Wheat' });
  return { farmer, plot, crop, token: tokenFor(farmer) };
}

describe('POST /api/crop-cycles', () => {
  it('creates a crop cycle, computes normalizedAcres and denormalizes cropName', async () => {
    const { plot, crop, token } = await setup();
    const res = await request(app)
      .post('/api/crop-cycles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plotId: plot._id.toString(),
        cropId: crop._id.toString(),
        season: 'rabi',
        year: '2025-26',
        areaUsed: { value: 80, unit: 'guntha' },
        sowingDate: '2025-11-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.cropName).toBe('Wheat');
    expect(res.body.season).toBe('rabi');
    expect(res.body.status).toBe('active');
    expect(res.body.areaUsed.value).toBe(80);
    expect(res.body.areaUsed.unit).toBe('guntha');
    expect(res.body.areaUsed.normalizedAcres).toBeCloseTo(2.0, 5);

    const inDb = await CropCycle.findById(res.body._id);
    expect(inDb.farmerId.toString()).toBe(plot.farmerId.toString());
    expect(inDb.cropId.toString()).toBe(crop._id.toString());
  });

  it('rejects an invalid season with 400', async () => {
    const { plot, crop, token } = await setup();
    const res = await request(app)
      .post('/api/crop-cycles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plotId: plot._id.toString(),
        cropId: crop._id.toString(),
        season: 'summer',
        year: '2025-26',
        areaUsed: { value: 80, unit: 'guntha' },
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a missing year with 400', async () => {
    const { plot, crop, token } = await setup();
    const res = await request(app)
      .post('/api/crop-cycles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plotId: plot._id.toString(),
        cropId: crop._id.toString(),
        season: 'rabi',
        areaUsed: { value: 80, unit: 'guntha' },
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it("returns 404 when the plot belongs to another farmer (no IDOR)", async () => {
    const { crop, token } = await setup();
    const otherFarmer = await createFarmer({ phone: '9990001111', state: 'MH' });
    const otherPlot = await createPlot({ farmerId: otherFarmer._id, state: 'MH' });
    const res = await request(app)
      .post('/api/crop-cycles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plotId: otherPlot._id.toString(),
        cropId: crop._id.toString(),
        season: 'rabi',
        year: '2025-26',
        areaUsed: { value: 80, unit: 'guntha' },
      });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it("returns 404 when the crop does not exist", async () => {
    const { plot, token } = await setup();
    const missingCropId = '507f1f77bcf86cd799439011';
    const res = await request(app)
      .post('/api/crop-cycles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plotId: plot._id.toString(),
        cropId: missingCropId,
        season: 'rabi',
        year: '2025-26',
        areaUsed: { value: 80, unit: 'guntha' },
      });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects an unauthenticated request with 401', async () => {
    const { plot, crop } = await setup();
    const res = await request(app)
      .post('/api/crop-cycles')
      .send({
        plotId: plot._id.toString(),
        cropId: crop._id.toString(),
        season: 'rabi',
        year: '2025-26',
        areaUsed: { value: 80, unit: 'guntha' },
      });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the test, expect FAIL.**
  - Command: `npm test -- tests/cropCycle.create.test.js`
  - Expected: FAIL — the route is not mounted (`Cannot find module '../src/routes/cropCycle.routes.js'` when `app.js` is edited, or 404 on the POST before mounting). Do not proceed until you see the failure.

- [ ] **Step 3: Write the service.** Create `src/services/cropCycle.service.js` with COMPLETE code. It loads the plot with an ownership guard (404, never 403 — matches the IDOR contract), loads the crop for denormalization, reads `AppConfig` for conversions, computes `normalizedAcres` via the shared cost engine, and persists.

```js
import CropCycle from '../models/CropCycle.model.js';
import Plot from '../models/Plot.model.js';
import CropCatalog from '../models/CropCatalog.model.js';
import Farmer from '../models/Farmer.model.js';
import AppConfig from '../models/AppConfig.model.js';
import { normalizeToAcres } from './costEngine.service.js';
import AppError from '../utils/AppError.js';

async function loadOwnedPlot(plotId, farmerId) {
  const plot = await Plot.findById(plotId);
  if (!plot || String(plot.farmerId) !== String(farmerId)) {
    throw new AppError(404, 'NOT_FOUND', 'Not found');
  }
  return plot;
}

async function loadCrop(cropId) {
  const crop = await CropCatalog.findById(cropId);
  if (!crop) {
    throw new AppError(404, 'NOT_FOUND', 'Not found');
  }
  return crop;
}

export async function createCropCycle(farmerId, input) {
  const plot = await loadOwnedPlot(input.plotId, farmerId);
  const crop = await loadCrop(input.cropId);

  const farmer = await Farmer.findById(farmerId);
  if (!farmer) throw new AppError(404, 'NOT_FOUND', 'Not found');

  const config = await AppConfig.findOne();
  const conversions = config?.landUnitConversions ?? {};

  const normalizedAcres = normalizeToAcres(
    { value: input.areaUsed.value, unit: input.areaUsed.unit, state: plot.state ?? farmer.state },
    conversions
  );

  const cycle = await CropCycle.create({
    farmerId,
    plotId: plot._id,
    cropId: crop._id,
    cropName: crop.name,
    season: input.season,
    year: input.year,
    areaUsed: {
      value: input.areaUsed.value,
      unit: input.areaUsed.unit,
      normalizedAcres,
    },
    sowingDate: input.sowingDate,
    harvestDate: input.harvestDate,
  });

  return cycle;
}
```

- [ ] **Step 4: Write the validation schema + controller.** Create `src/controllers/cropCycle.controller.js` with COMPLETE code. The zod schema is exported so the route can wrap it with the shared `validate` middleware.

```js
import { z } from 'zod';
import * as service from '../services/cropCycle.service.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createCropCycleSchema = z.object({
  plotId: objectId,
  cropId: objectId,
  season: z.enum(['kharif', 'rabi', 'zaid', 'perennial']),
  year: z.string().min(1),
  areaUsed: z.object({
    value: z.number().positive(),
    unit: z.string().min(1),
  }),
  sowingDate: z.coerce.date().optional(),
  harvestDate: z.coerce.date().optional(),
});

export async function create(req, res, next) {
  try {
    const cycle = await service.createCropCycle(req.user.id, req.body);
    res.status(201).json(cycle);
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 5: Write the router.** Create `src/routes/cropCycle.routes.js` with COMPLETE code. (GET/PATCH/DELETE handlers are added in later tasks; only POST is wired now.)

```js
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import requireRole from '../middleware/requireRole.js';
import validate from '../middleware/validate.js';
import * as controller from '../controllers/cropCycle.controller.js';
import { createCropCycleSchema } from '../controllers/cropCycle.controller.js';

const router = Router();

router.use(authenticate, requireRole('farmer'));

router.post('/', validate(createCropCycleSchema), controller.create);

export default router;
```

- [ ] **Step 6: Mount the router in `src/app.js`.** Add the import near the other route imports and the mount near the other `app.use('/api/...', ...)` lines:

```js
// with the other route imports:
import cropCycleRoutes from './routes/cropCycle.routes.js';

// with the other mounts, before the error middleware:
app.use('/api/crop-cycles', cropCycleRoutes);
```

- [ ] **Step 7: Run the test, expect PASS.**
  - Command: `npm test -- tests/cropCycle.create.test.js`
  - Expected: PASS — all 6 tests green (create + normalize + denormalize, bad season 400, missing year 400, foreign plot 404, missing crop 404, unauth 401).

- [ ] **Step 8: Commit.**
  - Command: `git add src/services/cropCycle.service.js src/controllers/cropCycle.controller.js src/routes/cropCycle.routes.js src/app.js tests/cropCycle.create.test.js && git commit -m "feat(crop-cycles): POST /crop-cycles with validation, plot-ownership, normalizedAcres and cropName denormalization"`

---

### Task CC-4: GET /api/crop-cycles — list own cycles, excluding deactivated

**Files:** modify `src/services/cropCycle.service.js`, modify `src/controllers/cropCycle.controller.js`, modify `src/routes/cropCycle.routes.js`, create `tests/cropCycle.read.test.js`

- [ ] **Step 1: Write the failing list test.** Create `tests/cropCycle.read.test.js` with COMPLETE code (this file also covers GET `:id`, added in Task CC-5 — the `:id` describe block is included now and will fail until CC-5, so run only the list block with `-t` in Step 2):

```js
import request from 'supertest';
import app from '../src/app.js';
import { connect, clearCollections, disconnect } from './helpers/db.js';
import { createFarmer, createPlot, createCrop, createCropCycle } from './helpers/factories.js';
import { tokenFor } from './helpers/auth.js';

beforeAll(async () => { await connect(); });
afterEach(async () => { await clearCollections(); });
afterAll(async () => { await disconnect(); });

async function setup() {
  const farmer = await createFarmer({ state: 'MH' });
  const plot = await createPlot({ farmerId: farmer._id, state: 'MH' });
  const crop = await createCrop({ name: 'Wheat' });
  return { farmer, plot, crop, token: tokenFor(farmer) };
}

describe('GET /api/crop-cycles (list)', () => {
  it('returns only the farmer own active/closed cycles, excluding deactivated', async () => {
    const { farmer, plot, crop, token } = await setup();
    await createCropCycle({ farmerId: farmer._id, plotId: plot._id, cropId: crop._id, status: 'active' });
    await createCropCycle({ farmerId: farmer._id, plotId: plot._id, cropId: crop._id, status: 'closed' });
    await createCropCycle({ farmerId: farmer._id, plotId: plot._id, cropId: crop._id, status: 'deactivated' });

    const res = await request(app)
      .get('/api/crop-cycles')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    const statuses = res.body.data.map((c) => c.status).sort();
    expect(statuses).toEqual(['active', 'closed']);
  });

  it("does not return another farmer's cycles", async () => {
    const { token } = await setup();
    const other = await createFarmer({ phone: '9995556666', state: 'MH' });
    const otherPlot = await createPlot({ farmerId: other._id, state: 'MH' });
    const otherCrop = await createCrop({ name: 'Rice' });
    await createCropCycle({ farmerId: other._id, plotId: otherPlot._id, cropId: otherCrop._id });

    const res = await request(app)
      .get('/api/crop-cycles')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('rejects unauthenticated with 401', async () => {
    const res = await request(app).get('/api/crop-cycles');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the list test, expect FAIL.**
  - Command: `npm test -- tests/cropCycle.read.test.js -t "list"`
  - Expected: FAIL — GET route not defined yet, returns 404 instead of 200 / list shape mismatch.

- [ ] **Step 3: Add the list service function.** Append to `src/services/cropCycle.service.js`:

```js
export async function listCropCycles(farmerId) {
  return CropCycle.find({ farmerId, status: { $ne: 'deactivated' } }).sort({ createdAt: -1 });
}
```

- [ ] **Step 4: Add the list controller handler.** Append to `src/controllers/cropCycle.controller.js`:

```js
export async function list(req, res, next) {
  try {
    const cycles = await service.listCropCycles(req.user.id);
    res.status(200).json({ data: cycles });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 5: Wire the GET list route.** In `src/routes/cropCycle.routes.js`, add the list route (above or below the POST — order does not matter for `/`):

```js
router.get('/', controller.list);
```

- [ ] **Step 6: Run the list test, expect PASS.**
  - Command: `npm test -- tests/cropCycle.read.test.js -t "list"`
  - Expected: PASS — 3 list tests green (excludes deactivated, isolates by farmer, 401 unauth).

- [ ] **Step 7: Commit.**
  - Command: `git add src/services/cropCycle.service.js src/controllers/cropCycle.controller.js src/routes/cropCycle.routes.js tests/cropCycle.read.test.js && git commit -m "feat(crop-cycles): GET /crop-cycles list excluding deactivated, scoped to owner"`

---

### Task CC-5: GET /api/crop-cycles/:id — read one with ownership

**Files:** modify `src/controllers/cropCycle.controller.js`, modify `src/routes/cropCycle.routes.js`, modify `tests/cropCycle.read.test.js`

Uses the shared `ownership(Model, paramName)` middleware, which loads the doc, 404s if missing or not owned, and attaches `req.doc`.

- [ ] **Step 1: Add the failing GET-:id block.** Append this describe block to `tests/cropCycle.read.test.js`:

```js
describe('GET /api/crop-cycles/:id', () => {
  it("returns the farmer's own cycle", async () => {
    const { farmer, plot, crop, token } = await setup();
    const cycle = await createCropCycle({ farmerId: farmer._id, plotId: plot._id, cropId: crop._id });

    const res = await request(app)
      .get(`/api/crop-cycles/${cycle._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(cycle._id.toString());
    expect(res.body.cropName).toBe('Wheat');
  });

  it("returns 404 for another farmer's cycle (no IDOR)", async () => {
    const { token } = await setup();
    const other = await createFarmer({ phone: '9994443333', state: 'MH' });
    const otherPlot = await createPlot({ farmerId: other._id, state: 'MH' });
    const otherCrop = await createCrop({ name: 'Rice' });
    const otherCycle = await createCropCycle({ farmerId: other._id, plotId: otherPlot._id, cropId: otherCrop._id });

    const res = await request(app)
      .get(`/api/crop-cycles/${otherCycle._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a non-existent id', async () => {
    const { token } = await setup();
    const res = await request(app)
      .get('/api/crop-cycles/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
```

- [ ] **Step 2: Run the GET-:id block, expect FAIL.**
  - Command: `npm test -- tests/cropCycle.read.test.js -t "GET /api/crop-cycles/:id"`
  - Expected: FAIL — route not defined; the own-cycle case returns 404/not-found routing instead of 200.

- [ ] **Step 3: Add the get-one controller handler.** Because `ownership` middleware already loaded and validated the doc onto `req.doc`, the handler just returns it. Append to `src/controllers/cropCycle.controller.js`:

```js
export async function getOne(req, res) {
  res.status(200).json(req.doc);
}
```

- [ ] **Step 4: Wire the GET-:id route with ownership.** In `src/routes/cropCycle.routes.js`, add the `CropCycle` model import at the top and the route:

```js
// add at top with other imports:
import CropCycle from '../models/CropCycle.model.js';
import ownership from '../middleware/ownership.js';

// add with the other routes:
router.get('/:id', ownership(CropCycle, 'id'), controller.getOne);
```

- [ ] **Step 5: Run the GET-:id block, expect PASS.**
  - Command: `npm test -- tests/cropCycle.read.test.js -t "GET /api/crop-cycles/:id"`
  - Expected: PASS — 3 tests green (own cycle 200, foreign 404, missing 404).

- [ ] **Step 6: Run the whole read file to confirm no regression.**
  - Command: `npm test -- tests/cropCycle.read.test.js`
  - Expected: PASS — all 6 tests (3 list + 3 get-one) green.

- [ ] **Step 7: Commit.**
  - Command: `git add src/controllers/cropCycle.controller.js src/routes/cropCycle.routes.js tests/cropCycle.read.test.js && git commit -m "feat(crop-cycles): GET /crop-cycles/:id with ownership guard"`

---

### Task CC-6: PATCH /api/crop-cycles/:id — edit fields, close a cycle

**Files:** modify `src/services/cropCycle.service.js`, modify `src/controllers/cropCycle.controller.js`, modify `src/routes/cropCycle.routes.js`, create `tests/cropCycle.update.test.js`

PATCH allows editing `season`, `year`, `sowingDate`, `harvestDate`, and setting `status` to `closed` (close the cycle) or back to `active`. It cannot set `status: 'deactivated'` (that is DELETE's job). Editing `areaUsed` recomputes `normalizedAcres`. Ownership is enforced by the shared middleware.

- [ ] **Step 1: Write the failing PATCH test.** Create `tests/cropCycle.update.test.js` with COMPLETE code:

```js
import request from 'supertest';
import app from '../src/app.js';
import { connect, clearCollections, disconnect } from './helpers/db.js';
import { createFarmer, createPlot, createCrop, createCropCycle, createAppConfig } from './helpers/factories.js';
import { tokenFor } from './helpers/auth.js';
import CropCycle from '../src/models/CropCycle.model.js';

beforeAll(async () => { await connect(); });
afterEach(async () => { await clearCollections(); });
afterAll(async () => { await disconnect(); });

async function setup() {
  await createAppConfig({ landUnitConversions: {} });
  const farmer = await createFarmer({ state: 'MH' });
  const plot = await createPlot({ farmerId: farmer._id, state: 'MH' });
  const crop = await createCrop({ name: 'Wheat' });
  const cycle = await createCropCycle({ farmerId: farmer._id, plotId: plot._id, cropId: crop._id });
  return { farmer, plot, crop, cycle, token: tokenFor(farmer) };
}

describe('PATCH /api/crop-cycles/:id', () => {
  it('closes a cycle by setting status to closed', async () => {
    const { cycle, token } = await setup();
    const res = await request(app)
      .patch(`/api/crop-cycles/${cycle._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'closed', harvestDate: '2026-03-15' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('closed');
    expect(new Date(res.body.harvestDate).toISOString().slice(0, 10)).toBe('2026-03-15');
  });

  it('reopens a closed cycle back to active', async () => {
    const { cycle, token } = await setup();
    await CropCycle.findByIdAndUpdate(cycle._id, { status: 'closed' });
    const res = await request(app)
      .patch(`/api/crop-cycles/${cycle._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
  });

  it('edits season and recomputes normalizedAcres when areaUsed changes', async () => {
    const { cycle, token } = await setup();
    // 40 guntha = 40*1089 = 43560 sqft = 1.0 acre
    const res = await request(app)
      .patch(`/api/crop-cycles/${cycle._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ season: 'kharif', areaUsed: { value: 40, unit: 'guntha' } });

    expect(res.status).toBe(200);
    expect(res.body.season).toBe('kharif');
    expect(res.body.areaUsed.value).toBe(40);
    expect(res.body.areaUsed.normalizedAcres).toBeCloseTo(1.0, 5);
  });

  it('rejects setting status to deactivated with 400', async () => {
    const { cycle, token } = await setup();
    const res = await request(app)
      .patch(`/api/crop-cycles/${cycle._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'deactivated' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid season with 400', async () => {
    const { cycle, token } = await setup();
    const res = await request(app)
      .patch(`/api/crop-cycles/${cycle._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ season: 'monsoon' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it("returns 404 patching another farmer's cycle (no IDOR)", async () => {
    const { token } = await setup();
    const other = await createFarmer({ phone: '9992221111', state: 'MH' });
    const otherPlot = await createPlot({ farmerId: other._id, state: 'MH' });
    const otherCrop = await createCrop({ name: 'Rice' });
    const otherCycle = await createCropCycle({ farmerId: other._id, plotId: otherPlot._id, cropId: otherCrop._id });

    const res = await request(app)
      .patch(`/api/crop-cycles/${otherCycle._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'closed' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
```

- [ ] **Step 2: Run the PATCH test, expect FAIL.**
  - Command: `npm test -- tests/cropCycle.update.test.js`
  - Expected: FAIL — PATCH route not defined; returns 404 on the own-cycle cases.

- [ ] **Step 3: Add the update service function.** Append to `src/services/cropCycle.service.js`. It operates on the already-owned `req.doc` (passed in as `cycle`), recomputes `normalizedAcres` only when `areaUsed` is supplied:

```js
export async function updateCropCycle(cycle, farmerId, input) {
  if (input.season !== undefined) cycle.season = input.season;
  if (input.year !== undefined) cycle.year = input.year;
  if (input.sowingDate !== undefined) cycle.sowingDate = input.sowingDate;
  if (input.harvestDate !== undefined) cycle.harvestDate = input.harvestDate;
  if (input.status !== undefined) cycle.status = input.status;

  if (input.areaUsed !== undefined) {
    const plot = await Plot.findById(cycle.plotId);
    const farmer = await Farmer.findById(farmerId);
    const config = await AppConfig.findOne();
    const conversions = config?.landUnitConversions ?? {};
    const normalizedAcres = normalizeToAcres(
      { value: input.areaUsed.value, unit: input.areaUsed.unit, state: plot?.state ?? farmer?.state },
      conversions
    );
    cycle.areaUsed = {
      value: input.areaUsed.value,
      unit: input.areaUsed.unit,
      normalizedAcres,
    };
  }

  await cycle.save();
  return cycle;
}
```

- [ ] **Step 4: Add the PATCH schema + controller handler.** Append to `src/controllers/cropCycle.controller.js`. The schema deliberately restricts `status` to `active`/`closed` (not `deactivated`) and requires at least one field:

```js
export const updateCropCycleSchema = z
  .object({
    season: z.enum(['kharif', 'rabi', 'zaid', 'perennial']).optional(),
    year: z.string().min(1).optional(),
    sowingDate: z.coerce.date().optional(),
    harvestDate: z.coerce.date().optional(),
    status: z.enum(['active', 'closed']).optional(),
    areaUsed: z
      .object({
        value: z.number().positive(),
        unit: z.string().min(1),
      })
      .optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field is required',
  });

export async function update(req, res, next) {
  try {
    const cycle = await service.updateCropCycle(req.doc, req.user.id, req.body);
    res.status(200).json(cycle);
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 5: Wire the PATCH route.** In `src/routes/cropCycle.routes.js`, import `updateCropCycleSchema` and add the route (ownership runs before validate so a foreign id 404s before body validation):

```js
// extend the controller schema import:
import { createCropCycleSchema, updateCropCycleSchema } from '../controllers/cropCycle.controller.js';

// add the route:
router.patch('/:id', ownership(CropCycle, 'id'), validate(updateCropCycleSchema), controller.update);
```

- [ ] **Step 6: Run the PATCH test, expect PASS.**
  - Command: `npm test -- tests/cropCycle.update.test.js`
  - Expected: PASS — all 6 tests green (close, reopen, area recompute, reject deactivated 400, bad season 400, foreign 404).

- [ ] **Step 7: Commit.**
  - Command: `git add src/services/cropCycle.service.js src/controllers/cropCycle.controller.js src/routes/cropCycle.routes.js tests/cropCycle.update.test.js && git commit -m "feat(crop-cycles): PATCH /crop-cycles/:id to edit fields and close cycle, recompute normalizedAcres"`

---

### Task CC-7: DELETE /api/crop-cycles/:id — deactivate (soft delete)

**Files:** modify `src/services/cropCycle.service.js`, modify `src/controllers/cropCycle.controller.js`, modify `src/routes/cropCycle.routes.js`, create `tests/cropCycle.delete.test.js`

DELETE never removes the document — it sets `status: 'deactivated'` (deactivate-only contract). The now-deactivated cycle disappears from the list (Task CC-4) and from GET `:id` should still 404-behave like any other read on a deactivated record per lists-exclude-deactivated; here we assert it is excluded from the list and the DB doc is retained with `status: 'deactivated'`.

- [ ] **Step 1: Write the failing DELETE test.** Create `tests/cropCycle.delete.test.js` with COMPLETE code:

```js
import request from 'supertest';
import app from '../src/app.js';
import { connect, clearCollections, disconnect } from './helpers/db.js';
import { createFarmer, createPlot, createCrop, createCropCycle } from './helpers/factories.js';
import { tokenFor } from './helpers/auth.js';
import CropCycle from '../src/models/CropCycle.model.js';

beforeAll(async () => { await connect(); });
afterEach(async () => { await clearCollections(); });
afterAll(async () => { await disconnect(); });

async function setup() {
  const farmer = await createFarmer({ state: 'MH' });
  const plot = await createPlot({ farmerId: farmer._id, state: 'MH' });
  const crop = await createCrop({ name: 'Wheat' });
  const cycle = await createCropCycle({ farmerId: farmer._id, plotId: plot._id, cropId: crop._id });
  return { farmer, plot, crop, cycle, token: tokenFor(farmer) };
}

describe('DELETE /api/crop-cycles/:id', () => {
  it('deactivates the cycle instead of deleting it', async () => {
    const { cycle, token } = await setup();
    const res = await request(app)
      .delete(`/api/crop-cycles/${cycle._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('deactivated');

    const inDb = await CropCycle.findById(cycle._id);
    expect(inDb).not.toBeNull();
    expect(inDb.status).toBe('deactivated');
  });

  it('removes the cycle from the subsequent list', async () => {
    const { cycle, token } = await setup();
    await request(app)
      .delete(`/api/crop-cycles/${cycle._id}`)
      .set('Authorization', `Bearer ${token}`);

    const list = await request(app)
      .get('/api/crop-cycles')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(0);
  });

  it("returns 404 deleting another farmer's cycle (no IDOR)", async () => {
    const { token } = await setup();
    const other = await createFarmer({ phone: '9991110000', state: 'MH' });
    const otherPlot = await createPlot({ farmerId: other._id, state: 'MH' });
    const otherCrop = await createCrop({ name: 'Rice' });
    const otherCycle = await createCropCycle({ farmerId: other._id, plotId: otherPlot._id, cropId: otherCrop._id });

    const res = await request(app)
      .delete(`/api/crop-cycles/${otherCycle._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');

    const stillThere = await CropCycle.findById(otherCycle._id);
    expect(stillThere.status).toBe('active');
  });

  it('returns 404 for a non-existent id', async () => {
    const { token } = await setup();
    const res = await request(app)
      .delete('/api/crop-cycles/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
```

- [ ] **Step 2: Run the DELETE test, expect FAIL.**
  - Command: `npm test -- tests/cropCycle.delete.test.js`
  - Expected: FAIL — DELETE route not defined; own-cycle case returns 404 instead of 200.

- [ ] **Step 3: Add the deactivate service function.** Append to `src/services/cropCycle.service.js`:

```js
export async function deactivateCropCycle(cycle) {
  cycle.status = 'deactivated';
  await cycle.save();
  return cycle;
}
```

- [ ] **Step 4: Add the remove controller handler.** Append to `src/controllers/cropCycle.controller.js`:

```js
export async function remove(req, res, next) {
  try {
    const cycle = await service.deactivateCropCycle(req.doc);
    res.status(200).json(cycle);
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 5: Wire the DELETE route.** In `src/routes/cropCycle.routes.js`, add:

```js
router.delete('/:id', ownership(CropCycle, 'id'), controller.remove);
```

- [ ] **Step 6: Run the DELETE test, expect PASS.**
  - Command: `npm test -- tests/cropCycle.delete.test.js`
  - Expected: PASS — all 4 tests green (deactivate not delete, excluded from list, foreign 404 + doc untouched, missing 404).

- [ ] **Step 7: Run the full crop-cycle suite to confirm the whole module is green together.**
  - Command: `npm test -- tests/cropCycle.model.test.js tests/cropCycle.create.test.js tests/cropCycle.read.test.js tests/cropCycle.update.test.js tests/cropCycle.delete.test.js`
  - Expected: PASS — model (5) + create (6) + read (6) + update (6) + delete (4) all green.

- [ ] **Step 8: Commit.**
  - Command: `git add src/services/cropCycle.service.js src/controllers/cropCycle.controller.js src/routes/cropCycle.routes.js tests/cropCycle.delete.test.js && git commit -m "feat(crop-cycles): DELETE /crop-cycles/:id deactivates (soft delete), excluded from lists"`

---

**Module CC done.** After this module, `/api/crop-cycles` supports list (excluding deactivated), create (with plot-ownership check, season/year validation, `areaUsed.normalizedAcres` computed via the shared cost engine, `cropName` denormalized from the catalog), read-one, PATCH (edit + close/reopen, area recompute), and DELETE-as-deactivate — all farmer-only and IDOR-safe via the shared `ownership` middleware. The `CropCycle` model and `createCropCycle` factory are also consumed by the required `tests/security.idor.test.js` in the security module.

**Files delivered (absolute paths):**
- `D:/smart-farming/src/models/CropCycle.model.js`
- `D:/smart-farming/src/services/cropCycle.service.js`
- `D:/smart-farming/src/controllers/cropCycle.controller.js`
- `D:/smart-farming/src/routes/cropCycle.routes.js`
- `D:/smart-farming/src/app.js` (modified — mount `/api/crop-cycles`)
- `D:/smart-farming/tests/helpers/factories.js` (modified — `createCropCycle`)
- `D:/smart-farming/tests/cropCycle.model.test.js`
- `D:/smart-farming/tests/cropCycle.create.test.js`
- `D:/smart-farming/tests/cropCycle.read.test.js`
- `D:/smart-farming/tests/cropCycle.update.test.js`
- `D:/smart-farming/tests/cropCycle.delete.test.js`

---

## Module TX — Transactions & Cloudinary receipts

This module implements the core financial ledger: the `Transaction` model, the Cloudinary signed-upload service and its `POST /uploads/receipt-signature` endpoint, the full `/transactions` CRUD (list/create/edit/void) with category validation, name denormalization, optional crop-cycle ownership and optional receipt `photoPublicId`, and the imputed auto-suggest helpers (family labour, own-land rental) that create `isImputed` transaction rows. All list queries filter `isVoid: false`.

This module depends on names and helpers established by earlier modules: the Express app (`src/app.js`), `authenticate`/`requireRole`/`ownership`/`validate`/`error` middleware, `src/utils/AppError.js`, `src/config/env.js`, the `Farmer`, `CropCycle`, `ExpenseCategory`, `IncomeCategory`, `AppConfig` models, `src/services/costEngine.service.js` (for `suggestFamilyLabour`/`suggestOwnLandRental`), and the test helpers in `tests/helpers/`. Where a test needs one of those, it uses the exact factory/name from the shared contract.

**Files:**
- Create: `src/models/transaction.model.js`
- Create: `src/services/cloudinary.service.js`
- Create: `src/services/transaction.service.js`
- Create: `src/controllers/uploads.controller.js`
- Create: `src/controllers/transactions.controller.js`
- Create: `src/routes/uploads.routes.js`
- Create: `src/routes/transactions.routes.js`
- Modify: `src/app.js` (mount the two new routers under `/api`)
- Modify: `src/config/env.js` (add Cloudinary env vars — only if not already present)
- Create: `tests/transaction.model.test.js`
- Create: `tests/cloudinary.service.test.js`
- Create: `tests/uploads.test.js`
- Create: `tests/transactions.test.js`
- Create: `tests/transactions.imputed.test.js`

---

### Task TX-1: Transaction model (isVoid, isImputed, photoPublicId, indexes)

**Files:** `src/models/transaction.model.js`, `tests/transaction.model.test.js`

- [ ] **Step 1: Write the failing test.** Create `tests/transaction.model.test.js` with the COMPLETE code below. It asserts the schema defaults (`isImputed:false`, `isVoid:false`, `photoPublicId:null`), enum enforcement on `type`, required `farmerId`/`categoryId`/`categoryName`/`amount`/`date`, and that `cropCycleId` is optional (nullable).

```js
import mongoose from 'mongoose';
import { connect, clear, disconnect } from './helpers/db.js';
import Transaction from '../src/models/transaction.model.js';

beforeAll(connect);
afterEach(clear);
afterAll(disconnect);

describe('Transaction model', () => {
  const base = () => ({
    farmerId: new mongoose.Types.ObjectId(),
    type: 'expense',
    categoryId: new mongoose.Types.ObjectId(),
    categoryName: 'Fertilizer',
    amount: 2700,
    date: new Date('2025-11-18T00:00:00.000Z'),
  });

  it('applies defaults for isImputed, isVoid, photoPublicId and cropCycleId', async () => {
    const tx = await Transaction.create(base());
    expect(tx.isImputed).toBe(false);
    expect(tx.isVoid).toBe(false);
    expect(tx.photoPublicId).toBeNull();
    expect(tx.cropCycleId).toBeNull();
    expect(tx.voidedAt).toBeUndefined();
    expect(tx.createdAt).toBeInstanceOf(Date);
  });

  it('requires farmerId, type, categoryId, categoryName, amount and date', async () => {
    await expect(Transaction.create({})).rejects.toThrow();
  });

  it('rejects a type outside the enum', async () => {
    const doc = base();
    doc.type = 'transfer';
    await expect(Transaction.create(doc)).rejects.toThrow(/type/);
  });

  it('accepts an income transaction with a cropCycleId and optional fields', async () => {
    const cycleId = new mongoose.Types.ObjectId();
    const tx = await Transaction.create({
      ...base(),
      type: 'income',
      categoryName: 'Main crop sale',
      cropCycleId: cycleId,
      quantity: 16,
      unit: 'quintal',
      rate: 3000,
      note: 'Sold at local mandi',
    });
    expect(tx.type).toBe('income');
    expect(String(tx.cropCycleId)).toBe(String(cycleId));
    expect(tx.quantity).toBe(16);
    expect(tx.unit).toBe('quintal');
    expect(tx.rate).toBe(3000);
  });

  it('stores an imputed row with a photoPublicId', async () => {
    const tx = await Transaction.create({
      ...base(),
      isImputed: true,
      photoPublicId: 'receipts/abc/9f3b7c2e1a8d4f60',
    });
    expect(tx.isImputed).toBe(true);
    expect(tx.photoPublicId).toBe('receipts/abc/9f3b7c2e1a8d4f60');
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.** Command: `npm test -- tests/transaction.model.test.js`. Expected: fails with `Cannot find module '../src/models/transaction.model.js'` (the model does not exist yet).

- [ ] **Step 3: Implement the model.** Create `src/models/transaction.model.js` with the COMPLETE code below. Field names and index specs are taken verbatim from the contract.

```js
import mongoose from 'mongoose';

const { Schema } = mongoose;

const transactionSchema = new Schema({
  farmerId: { type: Schema.Types.ObjectId, ref: 'Farmer', required: true },
  cropCycleId: { type: Schema.Types.ObjectId, ref: 'CropCycle', default: null },
  type: { type: String, enum: ['expense', 'income'], required: true },
  categoryId: { type: Schema.Types.ObjectId, required: true },
  categoryName: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  quantity: { type: Number },
  unit: { type: String },
  rate: { type: Number },
  note: { type: String },
  photoPublicId: { type: String, default: null },
  isImputed: { type: Boolean, default: false },
  isVoid: { type: Boolean, default: false },
  voidedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

transactionSchema.index({ farmerId: 1, date: -1 });
transactionSchema.index({ cropCycleId: 1 });
transactionSchema.index({ farmerId: 1, type: 1, categoryId: 1 });

export default mongoose.model('Transaction', transactionSchema);
```

- [ ] **Step 4: Run the test — expect PASS.** Command: `npm test -- tests/transaction.model.test.js`. Expected: all 5 tests pass.

- [ ] **Step 5: Commit.** `git add src/models/transaction.model.js tests/transaction.model.test.js && git commit -m "feat(tx): add Transaction model with isVoid, isImputed, photoPublicId and indexes"`

---

### Task TX-2: Cloudinary signed-upload service

**Files:** `src/services/cloudinary.service.js`, `src/config/env.js` (modify), `tests/cloudinary.service.test.js`

- [ ] **Step 1: Write the failing test.** Create `tests/cloudinary.service.test.js` with the COMPLETE code below. It calls `signReceiptUpload({ farmerId })` and asserts the returned params shape: image-only `resource_type`, pinned `allowed_formats`, `max_bytes` (5 MB), a per-farmer `folder`, an unguessable `public_id` scoped to that folder, `type: 'authenticated'`, a numeric `timestamp`, a hex `signature`, and the public `api_key` — and critically that the API **secret is never returned**.

```js
import { jest } from '@jest/globals';
import crypto from 'crypto';
import { signReceiptUpload, MAX_RECEIPT_BYTES } from '../src/services/cloudinary.service.js';

const FARMER_ID = '6650a1f2c3d4e5f601000001';

describe('cloudinary.service signReceiptUpload', () => {
  const OLD = process.env;
  beforeEach(() => {
    process.env = {
      ...OLD,
      CLOUDINARY_CLOUD_NAME: 'demo-cloud',
      CLOUDINARY_API_KEY: '123456789012345',
      CLOUDINARY_API_SECRET: 'super-secret-value',
    };
  });
  afterEach(() => {
    process.env = OLD;
  });

  it('returns signed image-only params scoped to the farmer, never the secret', () => {
    const p = signReceiptUpload({ farmerId: FARMER_ID });

    expect(p.resource_type).toBe('image');
    expect(p.type).toBe('authenticated');
    expect(p.allowed_formats).toBe('jpg,jpeg,png,webp');
    expect(p.max_bytes).toBe(MAX_RECEIPT_BYTES);
    expect(MAX_RECEIPT_BYTES).toBe(5 * 1024 * 1024);

    expect(p.folder).toBe(`receipts/${FARMER_ID}`);
    expect(p.public_id.startsWith(`receipts/${FARMER_ID}/`)).toBe(true);
    // unguessable: at least 24 hex chars after the folder prefix
    const leaf = p.public_id.split('/').pop();
    expect(leaf).toMatch(/^[0-9a-f]{24,}$/);

    expect(typeof p.timestamp).toBe('number');
    expect(p.api_key).toBe('123456789012345');
    expect(p.cloud_name).toBe('demo-cloud');
    expect(typeof p.signature).toBe('string');
    expect(p.signature).toMatch(/^[0-9a-f]{40}$/); // sha1 hex

    // The secret must NEVER leak into the returned params
    const serialized = JSON.stringify(p);
    expect(serialized).not.toContain('super-secret-value');
    expect(p.api_secret).toBeUndefined();
  });

  it('produces a signature that matches Cloudinary\'s sha1 scheme over the signed params', () => {
    const p = signReceiptUpload({ farmerId: FARMER_ID });

    // Cloudinary signs the sorted, &-joined signable params + api_secret, sha1 hex.
    const signable = {
      allowed_formats: p.allowed_formats,
      folder: p.folder,
      max_bytes: p.max_bytes,
      public_id: p.public_id,
      timestamp: p.timestamp,
      type: p.type,
    };
    const toSign = Object.keys(signable)
      .sort()
      .map((k) => `${k}=${signable[k]}`)
      .join('&');
    const expected = crypto
      .createHash('sha1')
      .update(toSign + 'super-secret-value')
      .digest('hex');

    expect(p.signature).toBe(expected);
  });

  it('generates a distinct unguessable public_id on each call', () => {
    const a = signReceiptUpload({ farmerId: FARMER_ID });
    const b = signReceiptUpload({ farmerId: FARMER_ID });
    expect(a.public_id).not.toBe(b.public_id);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.** Command: `npm test -- tests/cloudinary.service.test.js`. Expected: fails with `Cannot find module '../src/services/cloudinary.service.js'`.

- [ ] **Step 3: Add Cloudinary env vars.** Edit `src/config/env.js` to read and validate the three Cloudinary variables (append them to the existing zod env schema — do not remove existing keys). Add these lines inside the schema object and export object exactly as the surrounding style dictates; the relevant additions are:

```js
// inside the zod schema object in src/config/env.js:
CLOUDINARY_CLOUD_NAME: z.string().min(1),
CLOUDINARY_API_KEY: z.string().min(1),
CLOUDINARY_API_SECRET: z.string().min(1),
```

If your `env.js` exports a parsed `env` object, ensure these three fields are included in that export. The service below reads `process.env` directly so it stays testable in isolation, but validating them here fails fast at boot if they are missing.

- [ ] **Step 4: Implement the service.** Create `src/services/cloudinary.service.js` with the COMPLETE code below. It builds the signed params by hand with `crypto` (sha1) so no network call and no SDK are needed, and it returns only public-safe params — the secret is used only to compute the signature and is never placed in the result.

```js
import crypto from 'crypto';

// 5 MB cap, pinned into the signed params so Cloudinary rejects larger files.
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_FORMATS = 'jpg,jpeg,png,webp';

/**
 * Build short-lived signed Cloudinary upload params for a receipt image.
 * - image-only, size-capped, per-farmer folder, unguessable public_id
 * - type=authenticated (private asset; not world-readable)
 * - NEVER returns the API secret.
 */
export function signReceiptUpload({ farmerId }) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `receipts/${farmerId}`;
  const leaf = crypto.randomBytes(16).toString('hex'); // 32 hex chars, unguessable
  const publicId = `${folder}/${leaf}`;

  // Only these params are signed and pinned. Keep this list in sync with what
  // the client is allowed to send to Cloudinary.
  const signable = {
    allowed_formats: ALLOWED_FORMATS,
    folder,
    max_bytes: MAX_RECEIPT_BYTES,
    public_id: publicId,
    timestamp,
    type: 'authenticated',
  };

  const toSign = Object.keys(signable)
    .sort()
    .map((key) => `${key}=${signable[key]}`)
    .join('&');

  const signature = crypto
    .createHash('sha1')
    .update(toSign + apiSecret)
    .digest('hex');

  // Public-safe payload for the client. No secret here.
  return {
    ...signable,
    resource_type: 'image',
    signature,
    api_key: apiKey,
    cloud_name: cloudName,
  };
}
```

- [ ] **Step 5: Run the test — expect PASS.** Command: `npm test -- tests/cloudinary.service.test.js`. Expected: all 3 tests pass.

- [ ] **Step 6: Commit.** `git add src/services/cloudinary.service.js src/config/env.js tests/cloudinary.service.test.js && git commit -m "feat(tx): add Cloudinary signed receipt-upload service (image-only, size-capped, authenticated, no secret leak)"`

---

### Task TX-3: POST /uploads/receipt-signature endpoint (Farmer)

**Files:** `src/controllers/uploads.controller.js`, `src/routes/uploads.routes.js`, `src/app.js` (modify), `tests/uploads.test.js`

- [ ] **Step 1: Write the failing test.** Create `tests/uploads.test.js` with the COMPLETE code below. It uses the shared auth factory to mint a farmer token, hits `POST /api/uploads/receipt-signature`, and asserts the signed params come back scoped to the caller's own farmerId and that the secret never appears. It also asserts that an unauthenticated request is rejected `401`.

```js
import request from 'supertest';
import app from '../src/app.js';
import { connect, clear, disconnect } from './helpers/db.js';
import { createFarmer, farmerToken } from './helpers/auth.js';

beforeAll(async () => {
  process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud';
  process.env.CLOUDINARY_API_KEY = '123456789012345';
  process.env.CLOUDINARY_API_SECRET = 'super-secret-value';
  await connect();
});
afterEach(clear);
afterAll(disconnect);

describe('POST /api/uploads/receipt-signature', () => {
  it('returns signed image-only params scoped to the caller, never the secret', async () => {
    const farmer = await createFarmer();
    const token = farmerToken(farmer);

    const res = await request(app)
      .post('/api/uploads/receipt-signature')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.resource_type).toBe('image');
    expect(res.body.type).toBe('authenticated');
    expect(res.body.allowed_formats).toBe('jpg,jpeg,png,webp');
    expect(res.body.max_bytes).toBe(5 * 1024 * 1024);
    expect(res.body.folder).toBe(`receipts/${farmer._id}`);
    expect(res.body.public_id.startsWith(`receipts/${farmer._id}/`)).toBe(true);
    expect(res.body.api_key).toBe('123456789012345');
    expect(typeof res.body.signature).toBe('string');

    expect(res.body.api_secret).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('super-secret-value');
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app)
      .post('/api/uploads/receipt-signature')
      .send({});
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.** Command: `npm test -- tests/uploads.test.js`. Expected: fails — the route is not mounted (404 on the endpoint, so the `200` assertion fails; and the controller/router modules do not exist).

- [ ] **Step 3: Implement the controller.** Create `src/controllers/uploads.controller.js` with the COMPLETE code below. It reads the authenticated farmer id from `req.user.id` (set by `authenticate`) so the folder/public_id are always scoped to the caller — the client cannot inject another farmer's id.

```js
import { signReceiptUpload } from '../services/cloudinary.service.js';

export function receiptSignature(req, res) {
  const params = signReceiptUpload({ farmerId: req.user.id });
  res.status(200).json(params);
}
```

- [ ] **Step 4: Implement the router.** Create `src/routes/uploads.routes.js` with the COMPLETE code below. The route requires an authenticated farmer.

```js
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import requireRole from '../middleware/requireRole.js';
import { receiptSignature } from '../controllers/uploads.controller.js';

const router = Router();

router.post(
  '/receipt-signature',
  authenticate,
  requireRole('farmer'),
  receiptSignature,
);

export default router;
```

- [ ] **Step 5: Mount the router in `src/app.js`.** Add the import and `app.use` line (place alongside the other `/api` mounts, before the central error middleware). The exact additions:

```js
import uploadsRoutes from './routes/uploads.routes.js';
// ...
app.use('/api/uploads', uploadsRoutes);
```

- [ ] **Step 6: Run the test — expect PASS.** Command: `npm test -- tests/uploads.test.js`. Expected: both tests pass.

- [ ] **Step 7: Commit.** `git add src/controllers/uploads.controller.js src/routes/uploads.routes.js src/app.js tests/uploads.test.js && git commit -m "feat(tx): add POST /uploads/receipt-signature endpoint (farmer-scoped signed params)"`

---

### Task TX-4: Transaction service — create with category validation, denormalized categoryName, optional cropCycle ownership

**Files:** `src/services/transaction.service.js`, `tests/transactions.test.js` (create — service-level cases first)

- [ ] **Step 1: Write the failing test.** Create `tests/transactions.test.js` with the COMPLETE code below. This first batch exercises the service directly: creating a transaction validates the category exists (per `type`), denormalizes `categoryName` from the category, verifies an optional `cropCycleId` belongs to the same farmer, and rejects unknown categories / foreign crop cycles.

```js
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import { connect, clear, disconnect } from './helpers/db.js';
import { createFarmer, farmerToken } from './helpers/auth.js';
import Transaction from '../src/models/transaction.model.js';
import CropCycle from '../src/models/cropCycle.model.js';
import ExpenseCategory from '../src/models/expenseCategory.model.js';
import IncomeCategory from '../src/models/incomeCategory.model.js';
import { createTransaction } from '../src/services/transaction.service.js';

beforeAll(connect);
afterEach(clear);
afterAll(disconnect);

async function seedExpenseCategory(over = {}) {
  return ExpenseCategory.create({
    name: 'Fertilizer',
    isPaidOut: true,
    isImputed: false,
    cacpTag: 'A2',
    isActive: true,
    ...over,
  });
}
async function seedIncomeCategory(over = {}) {
  return IncomeCategory.create({ name: 'Main crop sale', type: 'sale', isActive: true, ...over });
}

describe('transaction.service createTransaction', () => {
  it('validates an expense category exists and denormalizes categoryName', async () => {
    const farmer = await createFarmer();
    const cat = await seedExpenseCategory();

    const tx = await createTransaction({
      farmerId: String(farmer._id),
      body: {
        type: 'expense',
        categoryId: String(cat._id),
        amount: 2700,
        date: '2025-11-18T00:00:00.000Z',
        quantity: 2,
        unit: 'bag',
        rate: 1350,
      },
    });

    expect(tx.categoryName).toBe('Fertilizer');
    expect(String(tx.farmerId)).toBe(String(farmer._id));
    expect(tx.isImputed).toBe(false);
    expect(tx.isVoid).toBe(false);
    expect(tx.cropCycleId).toBeNull();
  });

  it('validates an income category from the income collection', async () => {
    const farmer = await createFarmer();
    const cat = await seedIncomeCategory();

    const tx = await createTransaction({
      farmerId: String(farmer._id),
      body: { type: 'income', categoryId: String(cat._id), amount: 48000, date: '2026-03-25T00:00:00.000Z' },
    });
    expect(tx.categoryName).toBe('Main crop sale');
    expect(tx.type).toBe('income');
  });

  it('rejects an unknown category with 400 CATEGORY_NOT_FOUND', async () => {
    const farmer = await createFarmer();
    await expect(
      createTransaction({
        farmerId: String(farmer._id),
        body: { type: 'expense', categoryId: String(new mongoose.Types.ObjectId()), amount: 100, date: '2025-11-18T00:00:00.000Z' },
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'CATEGORY_NOT_FOUND' });
  });

  it('links a cropCycleId that belongs to the same farmer', async () => {
    const farmer = await createFarmer();
    const cat = await seedExpenseCategory();
    const cycle = await CropCycle.create({
      farmerId: farmer._id,
      plotId: new mongoose.Types.ObjectId(),
      cropId: new mongoose.Types.ObjectId(),
      cropName: 'Wheat',
      season: 'rabi',
      year: '2025-26',
      areaUsed: { value: 2, unit: 'acre', normalizedAcres: 2 },
      status: 'active',
    });

    const tx = await createTransaction({
      farmerId: String(farmer._id),
      body: { type: 'expense', categoryId: String(cat._id), cropCycleId: String(cycle._id), amount: 500, date: '2025-11-18T00:00:00.000Z' },
    });
    expect(String(tx.cropCycleId)).toBe(String(cycle._id));
  });

  it('rejects a cropCycleId owned by another farmer with 404 NOT_FOUND', async () => {
    const farmer = await createFarmer();
    const other = await createFarmer({ phone: '9000000002' });
    const cat = await seedExpenseCategory();
    const foreignCycle = await CropCycle.create({
      farmerId: other._id,
      plotId: new mongoose.Types.ObjectId(),
      cropId: new mongoose.Types.ObjectId(),
      cropName: 'Cotton',
      season: 'kharif',
      year: '2025-26',
      areaUsed: { value: 1, unit: 'acre', normalizedAcres: 1 },
      status: 'active',
    });

    await expect(
      createTransaction({
        farmerId: String(farmer._id),
        body: { type: 'expense', categoryId: String(cat._id), cropCycleId: String(foreignCycle._id), amount: 500, date: '2025-11-18T00:00:00.000Z' },
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.** Command: `npm test -- tests/transactions.test.js`. Expected: fails with `Cannot find module '../src/services/transaction.service.js'`.

- [ ] **Step 3: Implement the service.** Create `src/services/transaction.service.js` with the COMPLETE code below. It resolves the category from the correct collection based on `type`, denormalizes `categoryName`, ownership-checks any `cropCycleId` (404 on missing/foreign so it does not leak existence), and creates the row. `isImputed` defaults to `false` here; the imputed helpers in TX-7 set it `true`.

```js
import Transaction from '../models/transaction.model.js';
import CropCycle from '../models/cropCycle.model.js';
import ExpenseCategory from '../models/expenseCategory.model.js';
import IncomeCategory from '../models/incomeCategory.model.js';
import AppError from '../utils/AppError.js';

async function resolveCategory(type, categoryId) {
  const Model = type === 'income' ? IncomeCategory : ExpenseCategory;
  const cat = await Model.findById(categoryId);
  if (!cat) {
    throw new AppError(400, 'CATEGORY_NOT_FOUND', 'Category not found');
  }
  return cat;
}

async function assertCropCycleOwned(cropCycleId, farmerId) {
  const cycle = await CropCycle.findById(cropCycleId);
  if (!cycle || String(cycle.farmerId) !== String(farmerId)) {
    throw new AppError(404, 'NOT_FOUND', 'Not found');
  }
  return cycle;
}

/**
 * Create a transaction row. Validates the category exists (by type),
 * denormalizes categoryName, and ownership-checks an optional cropCycleId.
 * Pass isImputed:true (via body) for imputed rows created by the auto-suggest helpers.
 */
export async function createTransaction({ farmerId, body }) {
  const cat = await resolveCategory(body.type, body.categoryId);

  if (body.cropCycleId) {
    await assertCropCycleOwned(body.cropCycleId, farmerId);
  }

  const tx = await Transaction.create({
    farmerId,
    cropCycleId: body.cropCycleId ?? null,
    type: body.type,
    categoryId: cat._id,
    categoryName: cat.name,
    amount: body.amount,
    date: body.date,
    quantity: body.quantity,
    unit: body.unit,
    rate: body.rate,
    note: body.note,
    photoPublicId: body.photoPublicId ?? null,
    isImputed: body.isImputed === true,
  });

  return tx;
}
```

- [ ] **Step 4: Run the test — expect PASS.** Command: `npm test -- tests/transactions.test.js`. Expected: all 5 service tests pass.

- [ ] **Step 5: Commit.** `git add src/services/transaction.service.js tests/transactions.test.js && git commit -m "feat(tx): add transaction.service createTransaction (category validation, denormalized name, cropCycle ownership)"`

---

### Task TX-5: POST & GET /transactions endpoints (Farmer) with zod validation and isVoid:false list filter

**Files:** `src/controllers/transactions.controller.js`, `src/routes/transactions.routes.js`, `src/app.js` (modify), `tests/transactions.test.js` (append endpoint cases)

- [ ] **Step 1: Write the failing test.** Append the COMPLETE `describe` block below to `tests/transactions.test.js`. It tests the HTTP layer: `POST /api/transactions` creates and returns the resource with a denormalized `categoryName` and optional `photoPublicId`; zod rejects a bad body `400`; `GET /api/transactions` returns `{ data: [...] }` excluding voided rows; and the `cropCycleId`/`type` list filters work.

```js
describe('POST/GET /api/transactions (HTTP)', () => {
  async function seedExpenseCategory(over = {}) {
    return ExpenseCategory.create({
      name: 'Fertilizer', isPaidOut: true, isImputed: false, cacpTag: 'A2', isActive: true, ...over,
    });
  }

  it('POST creates a transaction and returns the resource JSON with categoryName + photoPublicId', async () => {
    const farmer = await createFarmer();
    const token = farmerToken(farmer);
    const cat = await seedExpenseCategory();

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'expense',
        categoryId: String(cat._id),
        amount: 2700,
        date: '2025-11-18T00:00:00.000Z',
        quantity: 2,
        unit: 'bag',
        rate: 1350,
        photoPublicId: 'receipts/x/9f3b7c2e1a8d4f60',
      });

    expect(res.status).toBe(201);
    expect(res.body.categoryName).toBe('Fertilizer');
    expect(res.body.photoPublicId).toBe('receipts/x/9f3b7c2e1a8d4f60');
    expect(res.body.isVoid).toBe(false);
    expect(String(res.body.farmerId)).toBe(String(farmer._id));
  });

  it('POST rejects an invalid body with 400', async () => {
    const farmer = await createFarmer();
    const token = farmerToken(farmer);
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'donation', amount: -5 }); // bad enum, missing fields, negative amount
    expect(res.status).toBe(400);
  });

  it('GET lists only the caller\'s non-void transactions as { data: [...] }', async () => {
    const farmer = await createFarmer();
    const token = farmerToken(farmer);
    const cat = await seedExpenseCategory();

    const live = await Transaction.create({
      farmerId: farmer._id, type: 'expense', categoryId: cat._id, categoryName: 'Fertilizer',
      amount: 100, date: new Date('2025-11-18'),
    });
    await Transaction.create({
      farmerId: farmer._id, type: 'expense', categoryId: cat._id, categoryName: 'Fertilizer',
      amount: 999, date: new Date('2025-11-19'), isVoid: true, voidedAt: new Date(),
    });
    // another farmer's row must not appear
    const other = await createFarmer({ phone: '9000000003' });
    await Transaction.create({
      farmerId: other._id, type: 'expense', categoryId: cat._id, categoryName: 'Fertilizer',
      amount: 500, date: new Date('2025-11-18'),
    });

    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0]._id)).toBe(String(live._id));
  });

  it('GET filters by type and cropCycleId', async () => {
    const farmer = await createFarmer();
    const token = farmerToken(farmer);
    const cat = await seedExpenseCategory();
    const cycle = await CropCycle.create({
      farmerId: farmer._id, plotId: new mongoose.Types.ObjectId(), cropId: new mongoose.Types.ObjectId(),
      cropName: 'Wheat', season: 'rabi', year: '2025-26',
      areaUsed: { value: 2, unit: 'acre', normalizedAcres: 2 }, status: 'active',
    });
    await Transaction.create({ farmerId: farmer._id, type: 'expense', categoryId: cat._id, categoryName: 'Fertilizer', amount: 100, date: new Date('2025-11-18'), cropCycleId: cycle._id });
    await Transaction.create({ farmerId: farmer._id, type: 'expense', categoryId: cat._id, categoryName: 'Fertilizer', amount: 200, date: new Date('2025-11-18') });

    const res = await request(app)
      .get(`/api/transactions?cropCycleId=${cycle._id}&type=expense`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].cropCycleId)).toBe(String(cycle._id));
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.** Command: `npm test -- tests/transactions.test.js`. Expected: the new HTTP cases fail (route not mounted → 404, so `201`/`200` assertions fail; controller/router modules missing).

- [ ] **Step 3: Implement the controller.** Create `src/controllers/transactions.controller.js` with the COMPLETE code below. It defines the zod body schema for create, a list handler that always filters `isVoid: false` and scopes to `req.user.id`, and delegates creation to the service. (PATCH/DELETE handlers are added in TX-6.)

```js
import { z } from 'zod';
import Transaction from '../models/transaction.model.js';
import { createTransaction } from '../services/transaction.service.js';

export const createTransactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid categoryId'),
  cropCycleId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  amount: z.number().positive(),
  date: z.coerce.date(),
  quantity: z.number().positive().optional(),
  unit: z.string().min(1).optional(),
  rate: z.number().positive().optional(),
  note: z.string().max(500).optional(),
  photoPublicId: z.string().min(1).optional(),
  isImputed: z.boolean().optional(),
});

export async function postTransaction(req, res) {
  const tx = await createTransaction({ farmerId: req.user.id, body: req.body });
  res.status(201).json(tx);
}

export async function listTransactions(req, res) {
  const filter = { farmerId: req.user.id, isVoid: false };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.cropCycleId) filter.cropCycleId = req.query.cropCycleId;
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }
  const data = await Transaction.find(filter).sort({ date: -1 });
  res.status(200).json({ data });
}
```

- [ ] **Step 4: Implement the router.** Create `src/routes/transactions.routes.js` with the COMPLETE code below. It wires `authenticate` + `requireRole('farmer')` for all routes, and `validate(createTransactionSchema)` on the create route. The PATCH/DELETE `:id` routes with `ownership(Transaction)` are added in TX-6 (this file is edited there).

```js
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import requireRole from '../middleware/requireRole.js';
import validate from '../middleware/validate.js';
import {
  createTransactionSchema,
  postTransaction,
  listTransactions,
} from '../controllers/transactions.controller.js';

const router = Router();

router.use(authenticate, requireRole('farmer'));

router.get('/', listTransactions);
router.post('/', validate(createTransactionSchema), postTransaction);

export default router;
```

- [ ] **Step 5: Mount the router in `src/app.js`.** Add the import and `app.use` line alongside the other `/api` mounts (before the error middleware):

```js
import transactionsRoutes from './routes/transactions.routes.js';
// ...
app.use('/api/transactions', transactionsRoutes);
```

- [ ] **Step 6: Run the test — expect PASS.** Command: `npm test -- tests/transactions.test.js`. Expected: all service + HTTP tests pass.

- [ ] **Step 7: Commit.** `git add src/controllers/transactions.controller.js src/routes/transactions.routes.js src/app.js tests/transactions.test.js && git commit -m "feat(tx): add POST/GET /transactions (zod validation, farmer-scoped list, isVoid:false filter)"`

---

### Task TX-6: PATCH (edit) & DELETE (void) /transactions/:id with ownership

**Files:** `src/controllers/transactions.controller.js` (modify), `src/routes/transactions.routes.js` (modify), `tests/transactions.test.js` (append)

- [ ] **Step 1: Write the failing test.** Append the COMPLETE `describe` block below to `tests/transactions.test.js`. It tests that PATCH edits an owned transaction, DELETE voids it (sets `isVoid:true` + `voidedAt`, retains the row), a voided row disappears from the list, and that both PATCH and DELETE on another farmer's transaction return `404` (ownership via the shared `ownership(Transaction)` middleware).

```js
describe('PATCH/DELETE /api/transactions/:id (ownership + void)', () => {
  async function seedTx(farmer, over = {}) {
    return Transaction.create({
      farmerId: farmer._id, type: 'expense',
      categoryId: new mongoose.Types.ObjectId(), categoryName: 'Fertilizer',
      amount: 100, date: new Date('2025-11-18'), ...over,
    });
  }

  it('PATCH edits an owned transaction', async () => {
    const farmer = await createFarmer();
    const token = farmerToken(farmer);
    const tx = await seedTx(farmer);

    const res = await request(app)
      .patch(`/api/transactions/${tx._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 250, note: 'corrected' });

    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(250);
    expect(res.body.note).toBe('corrected');
  });

  it('DELETE voids the transaction (isVoid true + voidedAt) but retains it', async () => {
    const farmer = await createFarmer();
    const token = farmerToken(farmer);
    const tx = await seedTx(farmer);

    const res = await request(app)
      .delete(`/api/transactions/${tx._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.isVoid).toBe(true);
    expect(res.body.voidedAt).toBeTruthy();

    // still physically present in the DB
    const stillThere = await Transaction.findById(tx._id);
    expect(stillThere).not.toBeNull();
    expect(stillThere.isVoid).toBe(true);

    // excluded from the list
    const list = await request(app).get('/api/transactions').set('Authorization', `Bearer ${token}`);
    expect(list.body.data).toHaveLength(0);
  });

  it('PATCH on another farmer\'s transaction returns 404', async () => {
    const owner = await createFarmer();
    const attacker = await createFarmer({ phone: '9000000004' });
    const attackerToken = farmerToken(attacker);
    const tx = await seedTx(owner);

    const res = await request(app)
      .patch(`/api/transactions/${tx._id}`)
      .set('Authorization', `Bearer ${attackerToken}`)
      .send({ amount: 1 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE on another farmer\'s transaction returns 404 and does not void it', async () => {
    const owner = await createFarmer();
    const attacker = await createFarmer({ phone: '9000000005' });
    const attackerToken = farmerToken(attacker);
    const tx = await seedTx(owner);

    const res = await request(app)
      .delete(`/api/transactions/${tx._id}`)
      .set('Authorization', `Bearer ${attackerToken}`);

    expect(res.status).toBe(404);
    const untouched = await Transaction.findById(tx._id);
    expect(untouched.isVoid).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.** Command: `npm test -- tests/transactions.test.js`. Expected: the new cases fail (PATCH/DELETE routes not mounted → 404 for the owner cases too; the edit/void assertions fail).

- [ ] **Step 3: Add PATCH/DELETE handlers to the controller.** Append the COMPLETE code below to `src/controllers/transactions.controller.js`. Both handlers use `req.doc` attached by the `ownership(Transaction)` middleware, so the ownership/404 logic is not duplicated here. The patch schema forbids changing immutable identity fields (`farmerId`, `type`, `isVoid`).

```js
export const patchTransactionSchema = z
  .object({
    categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    categoryName: z.string().min(1).optional(),
    cropCycleId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
    amount: z.number().positive().optional(),
    date: z.coerce.date().optional(),
    quantity: z.number().positive().optional(),
    unit: z.string().min(1).optional(),
    rate: z.number().positive().optional(),
    note: z.string().max(500).optional(),
    photoPublicId: z.string().min(1).nullable().optional(),
  })
  .strict();

const PATCHABLE = ['categoryId', 'categoryName', 'cropCycleId', 'amount', 'date', 'quantity', 'unit', 'rate', 'note', 'photoPublicId'];

export async function patchTransaction(req, res) {
  const tx = req.doc; // attached by ownership(Transaction)
  for (const key of PATCHABLE) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      tx[key] = req.body[key];
    }
  }
  await tx.save();
  res.status(200).json(tx);
}

export async function deleteTransaction(req, res) {
  const tx = req.doc; // attached by ownership(Transaction)
  tx.isVoid = true;
  tx.voidedAt = new Date();
  await tx.save();
  res.status(200).json(tx);
}
```

- [ ] **Step 4: Wire the `:id` routes with ownership.** Edit `src/routes/transactions.routes.js` to import the new pieces and add the two routes. The updated COMPLETE file:

```js
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import requireRole from '../middleware/requireRole.js';
import validate from '../middleware/validate.js';
import ownership from '../middleware/ownership.js';
import Transaction from '../models/transaction.model.js';
import {
  createTransactionSchema,
  patchTransactionSchema,
  postTransaction,
  listTransactions,
  patchTransaction,
  deleteTransaction,
} from '../controllers/transactions.controller.js';

const router = Router();

router.use(authenticate, requireRole('farmer'));

router.get('/', listTransactions);
router.post('/', validate(createTransactionSchema), postTransaction);

router.patch(
  '/:id',
  ownership(Transaction),
  validate(patchTransactionSchema),
  patchTransaction,
);
router.delete('/:id', ownership(Transaction), deleteTransaction);

export default router;
```

- [ ] **Step 5: Run the test — expect PASS.** Command: `npm test -- tests/transactions.test.js`. Expected: all cases pass, including the two 404 ownership cases.

- [ ] **Step 6: Commit.** `git add src/controllers/transactions.controller.js src/routes/transactions.routes.js tests/transactions.test.js && git commit -m "feat(tx): add PATCH (edit) and DELETE (void) /transactions/:id with ownership"`

---

### Task TX-7: Imputed auto-suggest helpers (family labour, own-land rental) creating isImputed transactions

**Files:** `src/services/transaction.service.js` (modify), `tests/transactions.imputed.test.js`

This task adds two thin service functions that use the cost-engine helpers `suggestFamilyLabour(days, cfg)` and `suggestOwnLandRental(normalizedAcres, cfg)` from `src/services/costEngine.service.js`, read the wage/rental rates from the single `AppConfig` doc, and write `isImputed:true` transaction rows with the correct FL / C2 basis (days go into `quantity`/`unit`/`rate` per the cost-engine doc). Both require the target crop cycle to belong to the caller.

- [ ] **Step 1: Write the failing test.** Create `tests/transactions.imputed.test.js` with the COMPLETE code below.

```js
import mongoose from 'mongoose';
import { connect, clear, disconnect } from './helpers/db.js';
import { createFarmer } from './helpers/auth.js';
import Transaction from '../src/models/transaction.model.js';
import CropCycle from '../src/models/cropCycle.model.js';
import ExpenseCategory from '../src/models/expenseCategory.model.js';
import AppConfig from '../src/models/appConfig.model.js';
import {
  createImputedFamilyLabour,
  createImputedOwnLandRental,
} from '../src/services/transaction.service.js';

beforeAll(connect);
afterEach(clear);
afterAll(disconnect);

async function seedConfig() {
  return AppConfig.create({ dailyWageINR: 350, ownLandRentalPerAcreINR: 4000 });
}
async function seedFlCategory() {
  return ExpenseCategory.create({ name: 'Family labour', isPaidOut: false, isImputed: true, cacpTag: 'FL', isActive: true });
}
async function seedC2Category() {
  return ExpenseCategory.create({ name: 'Own land rental value', isPaidOut: false, isImputed: true, cacpTag: 'C2', isActive: true });
}
async function seedCycle(farmer, over = {}) {
  return CropCycle.create({
    farmerId: farmer._id, plotId: new mongoose.Types.ObjectId(), cropId: new mongoose.Types.ObjectId(),
    cropName: 'Wheat', season: 'rabi', year: '2025-26',
    areaUsed: { value: 2, unit: 'acre', normalizedAcres: 2 }, status: 'active', ...over,
  });
}

describe('imputed family labour helper', () => {
  it('creates an isImputed FL transaction of days * dailyWageINR with basis in quantity/unit/rate', async () => {
    const farmer = await createFarmer();
    await seedConfig();
    const cat = await seedFlCategory();
    const cycle = await seedCycle(farmer);

    const tx = await createImputedFamilyLabour({
      farmerId: String(farmer._id),
      cropCycleId: String(cycle._id),
      categoryId: String(cat._id),
      days: 20,
      date: '2026-03-20T00:00:00.000Z',
    });

    expect(tx.isImputed).toBe(true);
    expect(tx.type).toBe('expense');
    expect(tx.categoryName).toBe('Family labour');
    expect(tx.amount).toBe(20 * 350); // 7000
    expect(tx.quantity).toBe(20);
    expect(tx.unit).toBe('day');
    expect(tx.rate).toBe(350);
    expect(String(tx.cropCycleId)).toBe(String(cycle._id));
  });

  it('rejects a crop cycle owned by another farmer with 404', async () => {
    const farmer = await createFarmer();
    const other = await createFarmer({ phone: '9000000006' });
    await seedConfig();
    const cat = await seedFlCategory();
    const foreign = await seedCycle(other);

    await expect(
      createImputedFamilyLabour({
        farmerId: String(farmer._id), cropCycleId: String(foreign._id),
        categoryId: String(cat._id), days: 5, date: '2026-03-20T00:00:00.000Z',
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});

describe('imputed own-land rental helper', () => {
  it('creates an isImputed C2 transaction of ownLandRentalPerAcreINR * normalizedAcres', async () => {
    const farmer = await createFarmer();
    await seedConfig();
    const cat = await seedC2Category();
    const cycle = await seedCycle(farmer); // 2 normalized acres

    const tx = await createImputedOwnLandRental({
      farmerId: String(farmer._id),
      cropCycleId: String(cycle._id),
      categoryId: String(cat._id),
      date: '2026-03-20T00:00:00.000Z',
    });

    expect(tx.isImputed).toBe(true);
    expect(tx.categoryName).toBe('Own land rental value');
    expect(tx.amount).toBe(4000 * 2); // 8000
    expect(String(tx.cropCycleId)).toBe(String(cycle._id));
  });

  it('supports an override amount instead of the suggested value', async () => {
    const farmer = await createFarmer();
    await seedConfig();
    const cat = await seedC2Category();
    const cycle = await seedCycle(farmer);

    const tx = await createImputedOwnLandRental({
      farmerId: String(farmer._id), cropCycleId: String(cycle._id),
      categoryId: String(cat._id), date: '2026-03-20T00:00:00.000Z', amountOverride: 3500,
    });
    expect(tx.amount).toBe(3500);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.** Command: `npm test -- tests/transactions.imputed.test.js`. Expected: fails with `createImputedFamilyLabour is not a function` / `createImputedOwnLandRental is not a function` (not yet exported).

- [ ] **Step 3: Extend the service.** Append the COMPLETE code below to `src/services/transaction.service.js`. It reuses `assertCropCycleOwned` and the category resolver already in the file, reads rates from the single `AppConfig` doc, and delegates the math to the cost-engine helpers so there is one source of truth for the formulas.

```js
import AppConfig from '../models/appConfig.model.js';
import {
  suggestFamilyLabour,
  suggestOwnLandRental,
} from './costEngine.service.js';

async function loadConfig() {
  const cfg = await AppConfig.findOne();
  if (!cfg) {
    throw new AppError(500, 'CONFIG_MISSING', 'App config is not initialised');
  }
  return cfg;
}

/**
 * Family labour (CACP FL): amount = days * dailyWageINR.
 * The basis stays visible/editable in quantity (days) / unit ("day") / rate (wage).
 */
export async function createImputedFamilyLabour({
  farmerId,
  cropCycleId,
  categoryId,
  days,
  date,
  amountOverride,
}) {
  await assertCropCycleOwned(cropCycleId, farmerId);
  const cat = await resolveCategory('expense', categoryId);
  const cfg = await loadConfig();

  const suggested = suggestFamilyLabour(days, cfg);
  const amount = amountOverride != null ? amountOverride : suggested;

  return Transaction.create({
    farmerId,
    cropCycleId,
    type: 'expense',
    categoryId: cat._id,
    categoryName: cat.name,
    amount,
    date,
    quantity: days,
    unit: 'day',
    rate: cfg.dailyWageINR,
    isImputed: true,
  });
}

/**
 * Own-land rental value (CACP C2): amount = ownLandRentalPerAcreINR * normalizedAcres,
 * taken from the crop cycle's areaUsed.normalizedAcres.
 */
export async function createImputedOwnLandRental({
  farmerId,
  cropCycleId,
  categoryId,
  date,
  amountOverride,
}) {
  const cycle = await assertCropCycleOwned(cropCycleId, farmerId);
  const cat = await resolveCategory('expense', categoryId);
  const cfg = await loadConfig();

  const acres = cycle.areaUsed?.normalizedAcres ?? 0;
  const suggested = suggestOwnLandRental(acres, cfg);
  const amount = amountOverride != null ? amountOverride : suggested;

  return Transaction.create({
    farmerId,
    cropCycleId,
    type: 'expense',
    categoryId: cat._id,
    categoryName: cat.name,
    amount,
    date,
    quantity: acres,
    unit: 'acre',
    rate: cfg.ownLandRentalPerAcreINR,
    isImputed: true,
  });
}
```

- [ ] **Step 4: Run the test — expect PASS.** Command: `npm test -- tests/transactions.imputed.test.js`. Expected: all 4 tests pass.

- [ ] **Step 5: Commit.** `git add src/services/transaction.service.js tests/transactions.imputed.test.js && git commit -m "feat(tx): add imputed family-labour and own-land-rental helpers creating isImputed rows"`

---

### Task TX-8: Full module regression run

**Files:** (none created; verification only)

- [ ] **Step 1: Run the whole TX suite together.** Command: `npm test -- tests/transaction.model.test.js tests/cloudinary.service.test.js tests/uploads.test.js tests/transactions.test.js tests/transactions.imputed.test.js`. Expected: every test in the five files passes with no cross-file interference (the shared `tests/helpers/db.js` clears collections `afterEach`).

- [ ] **Step 2: Run the entire project test suite.** Command: `npm test`. Expected: all modules' tests still pass, including the mandatory `tests/security.idor.test.js` (owned by the security module) which exercises the `/transactions/:id` ownership 404 path this module wired via `ownership(Transaction)`. If the IDOR test file already asserts against `/api/transactions/:id`, confirm it is green; do not modify it here.

- [ ] **Step 3: Commit (only if any incidental fix was needed).** If Steps 1–2 required no changes, skip this commit. Otherwise: `git add -A && git commit -m "test(tx): regression pass for transactions and receipt-upload module"`

---

**Module notes for the implementing engineer**
- The Cloudinary service intentionally computes the signature with Node's `crypto` (sha1) rather than the SDK, so the endpoint has no network dependency and the returned params are fully testable. If the team later prefers the `cloudinary` SDK's `utils.api_sign_request`, keep the same returned shape and the "never return the secret" guarantee — the tests in TX-2 pin that contract.
- The `ownership(Transaction)` middleware (from the shared middleware module) is the single place that enforces the 404-not-403 IDOR rule for `/transactions/:id`; TX-6 relies on `req.doc` it attaches. Do not re-implement ownership inside the controller.
- Every list/read path filters `isVoid: false` (TX-5 `listTransactions`). Report modules must do the same when they query transactions.
- The imputed helpers (TX-7) are the only writers that set `isImputed:true`; the generic `POST /transactions` accepts an `isImputed` flag too (used by the app when the farmer manually confirms), but the auto-suggest math lives solely in the cost-engine helpers to avoid drift.

---

## Module R — Cost/profit engine & reports

This module builds the heart of the product: the pure cost/profit functions (`cashProfit`, `trueProfit`, `perAcre`) and the six farmer-facing report endpoints that roll transaction rows up into numbers. Every function is pure and unit-tested; every endpoint is farmer-scoped, filters `isVoid: false`, and the crop-cycle report is ownership-checked. The full worked wheat example from the spec (2 acres, Rabi 2025-26) is encoded as an assertion so the "aha" numbers (Rs 26,000 cash / Rs 6,000 true; Rs 13,000 vs Rs 3,000 per acre) are locked in.

This module depends on prior modules having produced: `src/app.js` (Express app), `src/middleware/authenticate.js`, `src/middleware/requireRole.js`, `src/middleware/ownership.js`, `src/utils/AppError.js`, `src/config/env.js`, all `src/models/*.model.js`, and the test helpers `tests/helpers/db.js`, `tests/helpers/factories.js`, `tests/helpers/auth.js`. It uses the EXACT model/field names from the contract.

**Files:**

- Create `src/services/costEngine.service.js` — pure profit functions.
- Create `tests/costEngine.test.js` — unit tests incl. worked wheat example.
- Create `src/services/reports.service.js` — DB roll-up functions used by controllers.
- Create `src/controllers/reports.controller.js` — request handlers for the six reports.
- Create `src/routes/reports.routes.js` — router for `/reports/*`.
- Create `tests/reports.test.js` — integration tests seeding transactions and asserting numbers.
- Modify `src/app.js` — mount the reports router under `/api`.

Assumed test-helper API (from earlier modules), used verbatim below:
- `tests/helpers/db.js` exports `connect()`, `clear()`, `close()` and wires `beforeAll/afterEach/afterAll` when imported, OR exposes those hooks — this module calls them explicitly to be safe.
- `tests/helpers/factories.js` exports `createFarmer({...})`, `createExpenseCategory({...})`, `createIncomeCategory({...})`, `createCropCycle({ farmerId, ... })`, `createTransaction({ farmerId, ... })` returning saved Mongoose docs.
- `tests/helpers/auth.js` exports `farmerToken(farmer)` returning a signed access-token string.

---

### Task R-1: Pure cost engine — `cashProfit`, `trueProfit`, `perAcre` (unit tested)

Build the three pure functions first, with a full unit-test suite that includes the worked wheat example. These functions take a plain array of transaction-like objects (each already joined to whether its category is paid-out / imputed) and return numbers. No DB, no async.

The input shape each function expects per transaction: `{ type: 'expense'|'income', amount: Number, isImputed: Boolean, isPaidOut: Boolean, isVoid: Boolean }`. `isPaidOut` reflects the expense category's `isPaidOut` flag; `isImputed` reflects the row's own `isImputed` flag. Void rows are ignored.

**Files:** `tests/costEngine.test.js` (create), `src/services/costEngine.service.js` (create)

- [ ] **Step 1: Write the failing unit test with COMPLETE code.**

Create `tests/costEngine.test.js`:

```js
import { describe, it, expect } from '@jest/globals';
import { cashProfit, trueProfit, perAcre } from '../src/services/costEngine.service.js';

describe('costEngine.cashProfit', () => {
  it('sums income minus only paid-out expenses, ignoring imputed rows', () => {
    const txns = [
      { type: 'income', amount: 50000, isImputed: false, isPaidOut: false, isVoid: false },
      { type: 'expense', amount: 24000, isImputed: false, isPaidOut: true, isVoid: false },
      { type: 'expense', amount: 10500, isImputed: true, isPaidOut: false, isVoid: false }, // family labour, ignored
    ];
    expect(cashProfit(txns)).toBe(26000);
  });

  it('ignores void rows entirely', () => {
    const txns = [
      { type: 'income', amount: 50000, isImputed: false, isPaidOut: false, isVoid: false },
      { type: 'income', amount: 99999, isImputed: false, isPaidOut: false, isVoid: true }, // voided
      { type: 'expense', amount: 24000, isImputed: false, isPaidOut: true, isVoid: false },
      { type: 'expense', amount: 5000, isImputed: false, isPaidOut: true, isVoid: true }, // voided
    ];
    expect(cashProfit(txns)).toBe(26000);
  });

  it('does not subtract an expense whose category is not paid-out', () => {
    const txns = [
      { type: 'income', amount: 1000, isImputed: false, isPaidOut: false, isVoid: false },
      { type: 'expense', amount: 400, isImputed: false, isPaidOut: false, isVoid: false }, // non-paid-out, non-imputed
    ];
    expect(cashProfit(txns)).toBe(1000);
  });

  it('returns 0 for an empty ledger', () => {
    expect(cashProfit([])).toBe(0);
  });
});

describe('costEngine.trueProfit', () => {
  it('subtracts paid-out plus all imputed expenses', () => {
    const txns = [
      { type: 'income', amount: 50000, isImputed: false, isPaidOut: false, isVoid: false },
      { type: 'expense', amount: 24000, isImputed: false, isPaidOut: true, isVoid: false }, // paid-out
      { type: 'expense', amount: 10500, isImputed: true, isPaidOut: false, isVoid: false }, // FL imputed
      { type: 'expense', amount: 8000, isImputed: true, isPaidOut: false, isVoid: false }, // own-land C2
      { type: 'expense', amount: 1500, isImputed: true, isPaidOut: false, isVoid: false }, // owned-capital interest C2
    ];
    expect(trueProfit(txns)).toBe(6000);
  });

  it('ignores void rows', () => {
    const txns = [
      { type: 'income', amount: 50000, isImputed: false, isPaidOut: false, isVoid: false },
      { type: 'expense', amount: 24000, isImputed: false, isPaidOut: true, isVoid: false },
      { type: 'expense', amount: 10500, isImputed: true, isPaidOut: false, isVoid: true }, // voided imputed
    ];
    // only 50000 - 24000 = 26000 because the imputed row is void
    expect(trueProfit(txns)).toBe(26000);
  });
});

describe('costEngine.perAcre', () => {
  it('divides profit by normalizedAcres', () => {
    expect(perAcre(26000, 2)).toBe(13000);
    expect(perAcre(6000, 2)).toBe(3000);
  });

  it('returns null when normalizedAcres is 0 or missing', () => {
    expect(perAcre(26000, 0)).toBeNull();
    expect(perAcre(26000, null)).toBeNull();
    expect(perAcre(26000, undefined)).toBeNull();
  });
});

describe('costEngine — full worked example: Wheat, 2 acres, Rabi 2025-26', () => {
  // Straight from docs/06-cost-and-profit-engine.md
  const normalizedAcres = 2;
  const ledger = [
    // Paid-out expenses (A2) — total 24,000
    { type: 'expense', amount: 3000, isImputed: false, isPaidOut: true, isVoid: false }, // Seeds
    { type: 'expense', amount: 6500, isImputed: false, isPaidOut: true, isVoid: false }, // Fertilizer
    { type: 'expense', amount: 2500, isImputed: false, isPaidOut: true, isVoid: false }, // Irrigation
    { type: 'expense', amount: 8000, isImputed: false, isPaidOut: true, isVoid: false }, // Hired labour
    { type: 'expense', amount: 4000, isImputed: false, isPaidOut: true, isVoid: false }, // Hired machinery
    // Imputed expenses — total 20,000
    { type: 'expense', amount: 10500, isImputed: true, isPaidOut: false, isVoid: false }, // Family labour (FL): 30 x 350
    { type: 'expense', amount: 8000, isImputed: true, isPaidOut: false, isVoid: false }, // Own-land rental (C2): 4000 x 2
    { type: 'expense', amount: 1500, isImputed: true, isPaidOut: false, isVoid: false }, // Owned-capital interest (C2): 6% x 24000
    // Income — total 50,000
    { type: 'income', amount: 46000, isImputed: false, isPaidOut: false, isVoid: false }, // Main crop sale
    { type: 'income', amount: 4000, isImputed: false, isPaidOut: false, isVoid: false }, // By-product (straw)
  ];

  it('cash profit is 26,000', () => {
    expect(cashProfit(ledger)).toBe(26000);
  });

  it('true profit is 6,000', () => {
    expect(trueProfit(ledger)).toBe(6000);
  });

  it('cash profit per acre is 13,000', () => {
    expect(perAcre(cashProfit(ledger), normalizedAcres)).toBe(13000);
  });

  it('true profit per acre is 3,000', () => {
    expect(perAcre(trueProfit(ledger), normalizedAcres)).toBe(3000);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/costEngine.test.js
```

Expected: FAIL. Jest cannot resolve the import (`Cannot find module '../src/services/costEngine.service.js'`) / `cashProfit is not a function`. All suites red.

- [ ] **Step 3: Write the minimal implementation with COMPLETE code.**

Create `src/services/costEngine.service.js`:

```js
// Pure cost/profit functions. No DB, no async, no side effects.
// Each transaction is a plain object:
//   { type: 'expense'|'income', amount: Number,
//     isImputed: Boolean, isPaidOut: Boolean, isVoid: Boolean }
// isPaidOut mirrors the expense category's isPaidOut flag.
// All money is whole INR. Void rows are always ignored.

const live = (txns) => txns.filter((t) => !t.isVoid);

const totalIncome = (txns) =>
  live(txns)
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

const totalPaidOut = (txns) =>
  live(txns)
    .filter((t) => t.type === 'expense' && t.isPaidOut === true)
    .reduce((sum, t) => sum + t.amount, 0);

const totalImputed = (txns) =>
  live(txns)
    .filter((t) => t.type === 'expense' && t.isImputed === true)
    .reduce((sum, t) => sum + t.amount, 0);

// Cash Profit = income - paid-out expenses (CACP A2). Imputed rows ignored.
export function cashProfit(txns) {
  return totalIncome(txns) - totalPaidOut(txns);
}

// True Profit = income - (paid-out + all imputed expenses) (adds CACP FL + C2).
export function trueProfit(txns) {
  return totalIncome(txns) - (totalPaidOut(txns) + totalImputed(txns));
}

// Per-acre = profit / normalizedAcres; null when acres is missing or 0
// (division by zero is meaningless — report layer shows "—").
export function perAcre(profit, normalizedAcres) {
  return normalizedAcres > 0 ? profit / normalizedAcres : null;
}
```

- [ ] **Step 4: Run the test — expect PASS.**

```
npm test -- tests/costEngine.test.js
```

Expected: PASS. All suites green, including the four worked-example assertions (26000, 6000, 13000, 3000).

- [ ] **Step 5: Commit.**

```
git add src/services/costEngine.service.js tests/costEngine.test.js
git commit -m "feat(reports): pure cost engine cashProfit/trueProfit/perAcre with worked wheat example"
```

---

### Task R-2: Reports service — crop-cycle P/L roll-up

Add the first roll-up function to a reports service. `cropCycleReport(farmerId, cropCycleId)` loads the crop cycle (already ownership-verified by the caller/middleware, but re-scoped by `farmerId` defensively), loads its non-void transactions, joins each expense to its `expenseCategories` doc to get `isPaidOut`, then returns cash + true profit and per-acre for both. This is the roll-up behind `GET /reports/crop-cycle/:id`.

The join to `isPaidOut`: a transaction stores `categoryId`. Income rows have `isPaidOut=false` by definition. For expense rows we look up the expense category. We fetch all needed categories in one `find({ _id: { $in } })` to avoid N queries.

**Files:** `tests/reports.test.js` (create), `src/services/reports.service.js` (create)

- [ ] **Step 1: Write the failing integration test with COMPLETE code.**

Create `tests/reports.test.js`:

```js
import { describe, it, expect, beforeAll, afterEach, afterAll } from '@jest/globals';
import { connect, clear, close } from './helpers/db.js';
import { createFarmer, createExpenseCategory, createIncomeCategory, createCropCycle, createTransaction } from './helpers/factories.js';
import { cropCycleReport } from '../src/services/reports.service.js';

beforeAll(async () => { await connect(); });
afterEach(async () => { await clear(); });
afterAll(async () => { await close(); });

// Seed the exact worked example from the spec and return { farmer, cycle }.
async function seedWheatCycle() {
  const farmer = await createFarmer({ state: 'Maharashtra' });

  // Expense categories with correct CACP flags.
  const seeds = await createExpenseCategory({ name: 'Seeds', cacpTag: 'A2', isPaidOut: true, isImputed: false });
  const fert = await createExpenseCategory({ name: 'Fertilizer', cacpTag: 'A2', isPaidOut: true, isImputed: false });
  const irrig = await createExpenseCategory({ name: 'Irrigation / water charges', cacpTag: 'A2', isPaidOut: true, isImputed: false });
  const hiredLab = await createExpenseCategory({ name: 'Hired labour', cacpTag: 'A2', isPaidOut: true, isImputed: false });
  const hiredMach = await createExpenseCategory({ name: 'Hired machinery / tractor / fuel', cacpTag: 'A2', isPaidOut: true, isImputed: false });
  const familyLab = await createExpenseCategory({ name: 'Family labour', cacpTag: 'FL', isPaidOut: false, isImputed: true });
  const ownLand = await createExpenseCategory({ name: 'Own-land rental value', cacpTag: 'C2', isPaidOut: false, isImputed: true });
  const ownCapital = await createExpenseCategory({ name: 'Interest on owned capital', cacpTag: 'C2', isPaidOut: false, isImputed: true });

  const mainSale = await createIncomeCategory({ name: 'Main crop sale', type: 'main' });
  const byProduct = await createIncomeCategory({ name: 'By-product sale', type: 'byproduct' });

  const cycle = await createCropCycle({
    farmerId: farmer._id,
    cropName: 'Wheat',
    season: 'rabi',
    year: '2025-26',
    areaUsed: { value: 2, unit: 'acre', normalizedAcres: 2 },
    status: 'closed',
  });

  const ex = (cat, amount, extra = {}) => createTransaction({
    farmerId: farmer._id,
    cropCycleId: cycle._id,
    type: 'expense',
    categoryId: cat._id,
    categoryName: cat.name,
    amount,
    date: new Date('2026-02-01T00:00:00.000Z'),
    isImputed: cat.isImputed,
    isVoid: false,
    ...extra,
  });
  const inc = (cat, amount) => createTransaction({
    farmerId: farmer._id,
    cropCycleId: cycle._id,
    type: 'income',
    categoryId: cat._id,
    categoryName: cat.name,
    amount,
    date: new Date('2026-03-25T00:00:00.000Z'),
    isImputed: false,
    isVoid: false,
  });

  // Paid-out (24,000)
  await ex(seeds, 3000);
  await ex(fert, 6500);
  await ex(irrig, 2500);
  await ex(hiredLab, 8000);
  await ex(hiredMach, 4000);
  // Imputed (20,000)
  await ex(familyLab, 10500);
  await ex(ownLand, 8000);
  await ex(ownCapital, 1500);
  // A voided expense that must NOT count
  await ex(seeds, 99999, { isVoid: true, voidedAt: new Date() });
  // Income (50,000)
  await inc(mainSale, 46000);
  await inc(byProduct, 4000);

  return { farmer, cycle };
}

describe('reports.service.cropCycleReport', () => {
  it('computes cash + true profit and per-acre for the worked wheat example', async () => {
    const { farmer, cycle } = await seedWheatCycle();
    const report = await cropCycleReport(String(farmer._id), String(cycle._id));

    expect(report.cropName).toBe('Wheat');
    expect(report.season).toBe('rabi');
    expect(report.year).toBe('2025-26');
    expect(report.normalizedAcres).toBe(2);

    expect(report.totalIncome).toBe(50000);
    expect(report.totalPaidOut).toBe(24000);
    expect(report.totalImputed).toBe(20000);

    expect(report.cashProfit).toBe(26000);
    expect(report.trueProfit).toBe(6000);
    expect(report.cashProfitPerAcre).toBe(13000);
    expect(report.trueProfitPerAcre).toBe(3000);
  });

  it('excludes void transactions from all totals', async () => {
    const { farmer, cycle } = await seedWheatCycle();
    const report = await cropCycleReport(String(farmer._id), String(cycle._id));
    // If the 99999 void row leaked in, cashProfit would be negative.
    expect(report.cashProfit).toBe(26000);
  });

  it('returns null per-acre when the cycle has 0 normalized acres', async () => {
    const farmer = await createFarmer({ state: 'Maharashtra' });
    const inc = await createIncomeCategory({ name: 'Main crop sale', type: 'main' });
    const cycle = await createCropCycle({
      farmerId: farmer._id,
      cropName: 'Test',
      season: 'kharif',
      year: '2025-26',
      areaUsed: { value: 0, unit: 'acre', normalizedAcres: 0 },
      status: 'active',
    });
    await createTransaction({
      farmerId: farmer._id, cropCycleId: cycle._id, type: 'income',
      categoryId: inc._id, categoryName: inc.name, amount: 1000,
      date: new Date(), isImputed: false, isVoid: false,
    });
    const report = await cropCycleReport(String(farmer._id), String(cycle._id));
    expect(report.cashProfit).toBe(1000);
    expect(report.cashProfitPerAcre).toBeNull();
    expect(report.trueProfitPerAcre).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/reports.test.js
```

Expected: FAIL — `Cannot find module '../src/services/reports.service.js'` / `cropCycleReport is not a function`.

- [ ] **Step 3: Write the minimal implementation with COMPLETE code.**

Create `src/services/reports.service.js`:

```js
import mongoose from 'mongoose';
import Transaction from '../models/transaction.model.js';
import CropCycle from '../models/cropCycle.model.js';
import ExpenseCategory from '../models/expenseCategory.model.js';
import { cashProfit, trueProfit, perAcre } from './costEngine.service.js';

// Attach isPaidOut/isImputed to each transaction by joining expense categories.
// Income rows are never paid-out expenses. Returns the same rows enriched with
// the boolean flags the cost engine expects.
async function enrich(txns) {
  const expenseCatIds = [
    ...new Set(
      txns
        .filter((t) => t.type === 'expense')
        .map((t) => String(t.categoryId))
    ),
  ];
  const cats = expenseCatIds.length
    ? await ExpenseCategory.find({ _id: { $in: expenseCatIds } }).lean()
    : [];
  const byId = new Map(cats.map((c) => [String(c._id), c]));

  return txns.map((t) => {
    if (t.type === 'income') {
      return { type: 'income', amount: t.amount, isImputed: false, isPaidOut: false, isVoid: t.isVoid };
    }
    const cat = byId.get(String(t.categoryId));
    return {
      type: 'expense',
      amount: t.amount,
      // Row's own isImputed is authoritative; category confirms paid-out.
      isImputed: Boolean(t.isImputed),
      isPaidOut: Boolean(cat && cat.isPaidOut),
      isVoid: t.isVoid,
    };
  });
}

function summarize(enriched) {
  const totalIncome = enriched
    .filter((t) => !t.isVoid && t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const totalPaidOut = enriched
    .filter((t) => !t.isVoid && t.type === 'expense' && t.isPaidOut)
    .reduce((s, t) => s + t.amount, 0);
  const totalImputed = enriched
    .filter((t) => !t.isVoid && t.type === 'expense' && t.isImputed)
    .reduce((s, t) => s + t.amount, 0);
  return { totalIncome, totalPaidOut, totalImputed };
}

// Per-crop-cycle P/L. Farmer-scoped and isVoid:false enforced.
// Caller should already have run ownership middleware, but we re-scope by
// farmerId defensively. Returns null cycle-not-found handling to the caller.
export async function cropCycleReport(farmerId, cropCycleId) {
  const cycle = await CropCycle.findOne({ _id: cropCycleId, farmerId }).lean();
  if (!cycle) return null;

  const txns = await Transaction.find({
    farmerId,
    cropCycleId: new mongoose.Types.ObjectId(cropCycleId),
    isVoid: false,
  }).lean();

  const enriched = await enrich(txns);
  const { totalIncome, totalPaidOut, totalImputed } = summarize(enriched);

  const cash = cashProfit(enriched);
  const trueP = trueProfit(enriched);
  const acres = cycle.areaUsed ? cycle.areaUsed.normalizedAcres : null;

  return {
    cropCycleId: String(cycle._id),
    cropName: cycle.cropName,
    season: cycle.season,
    year: cycle.year,
    status: cycle.status,
    normalizedAcres: acres,
    totalIncome,
    totalPaidOut,
    totalImputed,
    cashProfit: cash,
    trueProfit: trueP,
    cashProfitPerAcre: perAcre(cash, acres),
    trueProfitPerAcre: perAcre(trueP, acres),
  };
}
```

- [ ] **Step 4: Run the test — expect PASS.**

```
npm test -- tests/reports.test.js
```

Expected: PASS. Cash 26000 / true 6000 / per-acre 13000 & 3000; void row excluded; null per-acre when acres 0.

- [ ] **Step 5: Commit.**

```
git add src/services/reports.service.js tests/reports.test.js
git commit -m "feat(reports): cropCycleReport roll-up (cash/true/per-acre) with isVoid filtering"
```

---

### Task R-3: Reports service — monthly & yearly summaries

Add `monthlyReport(farmerId, { year, month })` and `yearlyReport(farmerId, { year })`. Per the spec, monthly/yearly summaries show income, paid-out expense, and Cash Profit (True Profit is per-cycle, not per-month, because imputed items are seasonal). Both filter `isVoid: false` and are farmer-scoped. `month` is 1–12 (calendar); `year` for monthly is a calendar year Number; yearly groups by the crop-year `year` string on… no — the yearly summary here groups transactions by calendar year of `date` (the crop-year string lives on cycles, used by season-comparison in R-5). We keep yearly as a calendar-year transaction roll-up for the "Yearly summary" report and clearly document it.

**Files:** `tests/reports.test.js` (modify — add suites), `src/services/reports.service.js` (modify — add functions)

- [ ] **Step 1: Add failing tests with COMPLETE code.**

Append to `tests/reports.test.js`:

```js
import { monthlyReport, yearlyReport } from '../src/services/reports.service.js';

describe('reports.service.monthlyReport', () => {
  it('sums income, paid-out, and cash profit for one calendar month, ignoring imputed and void', async () => {
    const farmer = await createFarmer({ state: 'Maharashtra' });
    const fert = await createExpenseCategory({ name: 'Fertilizer', cacpTag: 'A2', isPaidOut: true, isImputed: false });
    const familyLab = await createExpenseCategory({ name: 'Family labour', cacpTag: 'FL', isPaidOut: false, isImputed: true });
    const sale = await createIncomeCategory({ name: 'Main crop sale', type: 'main' });

    const mk = (type, cat, amount, dateISO, extra = {}) => createTransaction({
      farmerId: farmer._id, cropCycleId: null, type,
      categoryId: cat._id, categoryName: cat.name, amount,
      date: new Date(dateISO), isImputed: cat.isImputed || false, isVoid: false, ...extra,
    });

    // March 2026
    await mk('income', sale, 20000, '2026-03-05T00:00:00.000Z');
    await mk('expense', fert, 6000, '2026-03-10T00:00:00.000Z');
    await mk('expense', familyLab, 5000, '2026-03-12T00:00:00.000Z'); // imputed -> not in cash
    await mk('expense', fert, 9999, '2026-03-15T00:00:00.000Z', { isVoid: true, voidedAt: new Date() });
    // April 2026 (must be excluded from March)
    await mk('income', sale, 100000, '2026-04-01T00:00:00.000Z');

    const r = await monthlyReport(String(farmer._id), { year: 2026, month: 3 });
    expect(r.year).toBe(2026);
    expect(r.month).toBe(3);
    expect(r.totalIncome).toBe(20000);
    expect(r.totalPaidOut).toBe(6000);
    expect(r.cashProfit).toBe(14000);
  });
});

describe('reports.service.yearlyReport', () => {
  it('sums income, paid-out, and cash profit across a calendar year', async () => {
    const farmer = await createFarmer({ state: 'Maharashtra' });
    const fert = await createExpenseCategory({ name: 'Fertilizer', cacpTag: 'A2', isPaidOut: true, isImputed: false });
    const sale = await createIncomeCategory({ name: 'Main crop sale', type: 'main' });
    const mk = (type, cat, amount, dateISO, extra = {}) => createTransaction({
      farmerId: farmer._id, cropCycleId: null, type,
      categoryId: cat._id, categoryName: cat.name, amount,
      date: new Date(dateISO), isImputed: false, isVoid: false, ...extra,
    });

    await mk('income', sale, 20000, '2026-03-05T00:00:00.000Z');
    await mk('income', sale, 30000, '2026-08-05T00:00:00.000Z');
    await mk('expense', fert, 12000, '2026-04-10T00:00:00.000Z');
    await mk('income', sale, 500000, '2025-12-31T23:00:00.000Z'); // different year, excluded
    await mk('expense', fert, 7777, '2026-05-01T00:00:00.000Z', { isVoid: true, voidedAt: new Date() });

    const r = await yearlyReport(String(farmer._id), { year: 2026 });
    expect(r.year).toBe(2026);
    expect(r.totalIncome).toBe(50000);
    expect(r.totalPaidOut).toBe(12000);
    expect(r.cashProfit).toBe(38000);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/reports.test.js
```

Expected: FAIL — `monthlyReport is not a function` / `yearlyReport is not a function`.

- [ ] **Step 3: Add the implementation with COMPLETE code.**

Append to `src/services/reports.service.js`:

```js
// Build a UTC [start, end) range for a whole calendar month or whole year.
function monthRange(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)); // first of next month
  return { start, end };
}
function yearRange(year) {
  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));
  return { start, end };
}

// Shared roll-up for a date window: income, paid-out, cash profit.
// True Profit is intentionally NOT reported here — imputed items are seasonal,
// so True Profit lives at the crop-cycle level (see docs/06).
async function windowSummary(farmerId, start, end) {
  const txns = await Transaction.find({
    farmerId,
    isVoid: false,
    date: { $gte: start, $lt: end },
  }).lean();
  const enriched = await enrich(txns);
  const { totalIncome, totalPaidOut } = summarize(enriched);
  return { totalIncome, totalPaidOut, cashProfit: cashProfit(enriched) };
}

// Monthly summary for a calendar month (month = 1..12).
export async function monthlyReport(farmerId, { year, month }) {
  const { start, end } = monthRange(year, month);
  const s = await windowSummary(farmerId, start, end);
  return { year, month, ...s };
}

// Yearly summary for a calendar year.
export async function yearlyReport(farmerId, { year }) {
  const { start, end } = yearRange(year);
  const s = await windowSummary(farmerId, start, end);
  return { year, ...s };
}
```

- [ ] **Step 4: Run the test — expect PASS.**

```
npm test -- tests/reports.test.js
```

Expected: PASS. March cash profit 14000; year-2026 cash profit 38000; other periods and void rows excluded.

- [ ] **Step 5: Commit.**

```
git add src/services/reports.service.js tests/reports.test.js
git commit -m "feat(reports): monthly and yearly cash-profit summaries (isVoid-filtered, UTC windows)"
```

---

### Task R-4: Reports service — per-acre list & crop ranking

Add `perAcreReport(farmerId)` and `cropRankingReport(farmerId)`. Both iterate a farmer's crop cycles (excluding `deactivated`), reuse `cropCycleReport` to get each cycle's cash/true profit and per-acre, and shape a list. `perAcreReport` returns every non-deactivated cycle with its per-acre numbers. `cropRankingReport` returns cycles sorted by **cash profit per acre descending** (the "which crop earned most per acre" report), skipping cycles with null per-acre (0 acres) so ranking stays meaningful, and setting `topCrop` to the best.

**Files:** `tests/reports.test.js` (modify — add suites), `src/services/reports.service.js` (modify — add functions)

- [ ] **Step 1: Add failing tests with COMPLETE code.**

Append to `tests/reports.test.js`:

```js
import { perAcreReport, cropRankingReport } from '../src/services/reports.service.js';

// Seed two cycles with different per-acre economics for the same farmer.
async function seedTwoCycles() {
  const farmer = await createFarmer({ state: 'Maharashtra' });
  const paidCat = await createExpenseCategory({ name: 'Seeds', cacpTag: 'A2', isPaidOut: true, isImputed: false });
  const sale = await createIncomeCategory({ name: 'Main crop sale', type: 'main' });

  // Wheat: 2 acres, income 50000, paid-out 10000 -> cash 40000 -> 20000/acre
  const wheat = await createCropCycle({
    farmerId: farmer._id, cropName: 'Wheat', season: 'rabi', year: '2025-26',
    areaUsed: { value: 2, unit: 'acre', normalizedAcres: 2 }, status: 'closed',
  });
  // Onion: 1 acre, income 40000, paid-out 5000 -> cash 35000 -> 35000/acre (higher per acre)
  const onion = await createCropCycle({
    farmerId: farmer._id, cropName: 'Onion', season: 'rabi', year: '2025-26',
    areaUsed: { value: 1, unit: 'acre', normalizedAcres: 1 }, status: 'closed',
  });

  const tx = (cycle, type, cat, amount) => createTransaction({
    farmerId: farmer._id, cropCycleId: cycle._id, type,
    categoryId: cat._id, categoryName: cat.name, amount,
    date: new Date('2026-03-01T00:00:00.000Z'), isImputed: false, isVoid: false,
  });

  await tx(wheat, 'income', sale, 50000);
  await tx(wheat, 'expense', paidCat, 10000);
  await tx(onion, 'income', sale, 40000);
  await tx(onion, 'expense', paidCat, 5000);

  return { farmer, wheat, onion };
}

describe('reports.service.perAcreReport', () => {
  it('lists each non-deactivated cycle with cash/true per-acre', async () => {
    const { farmer } = await seedTwoCycles();
    const r = await perAcreReport(String(farmer._id));
    expect(r.data).toHaveLength(2);
    const wheat = r.data.find((c) => c.cropName === 'Wheat');
    const onion = r.data.find((c) => c.cropName === 'Onion');
    expect(wheat.cashProfitPerAcre).toBe(20000);
    expect(onion.cashProfitPerAcre).toBe(35000);
  });

  it('omits deactivated cycles', async () => {
    const { farmer } = await seedTwoCycles();
    await createCropCycle({
      farmerId: farmer._id, cropName: 'Ghost', season: 'kharif', year: '2025-26',
      areaUsed: { value: 1, unit: 'acre', normalizedAcres: 1 }, status: 'deactivated',
    });
    const r = await perAcreReport(String(farmer._id));
    expect(r.data.map((c) => c.cropName)).not.toContain('Ghost');
  });
});

describe('reports.service.cropRankingReport', () => {
  it('ranks cycles by cash profit per acre, descending, with the top crop first', async () => {
    const { farmer } = await seedTwoCycles();
    const r = await cropRankingReport(String(farmer._id));
    expect(r.data[0].cropName).toBe('Onion'); // 35000/acre beats 20000/acre
    expect(r.data[1].cropName).toBe('Wheat');
    expect(r.topCrop.cropName).toBe('Onion');
    expect(r.topCrop.cashProfitPerAcre).toBe(35000);
  });

  it('excludes cycles with null per-acre (0 acres) from the ranking', async () => {
    const { farmer } = await seedTwoCycles();
    const sale = await createIncomeCategory({ name: 'Main crop sale', type: 'main' });
    const zeroCycle = await createCropCycle({
      farmerId: farmer._id, cropName: 'ZeroAcre', season: 'zaid', year: '2025-26',
      areaUsed: { value: 0, unit: 'acre', normalizedAcres: 0 }, status: 'closed',
    });
    await createTransaction({
      farmerId: farmer._id, cropCycleId: zeroCycle._id, type: 'income',
      categoryId: sale._id, categoryName: sale.name, amount: 9999,
      date: new Date('2026-03-01T00:00:00.000Z'), isImputed: false, isVoid: false,
    });
    const r = await cropRankingReport(String(farmer._id));
    expect(r.data.map((c) => c.cropName)).not.toContain('ZeroAcre');
    expect(r.data).toHaveLength(2);
  });

  it('returns empty data and null topCrop when the farmer has no rankable cycles', async () => {
    const farmer = await createFarmer({ state: 'Maharashtra' });
    const r = await cropRankingReport(String(farmer._id));
    expect(r.data).toEqual([]);
    expect(r.topCrop).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/reports.test.js
```

Expected: FAIL — `perAcreReport is not a function` / `cropRankingReport is not a function`.

- [ ] **Step 3: Add the implementation with COMPLETE code.**

Append to `src/services/reports.service.js`:

```js
// Load all non-deactivated cycles for a farmer and run cropCycleReport on each.
async function activeCycleReports(farmerId) {
  const cycles = await CropCycle.find({
    farmerId,
    status: { $ne: 'deactivated' },
  }).select('_id').lean();

  const reports = await Promise.all(
    cycles.map((c) => cropCycleReport(farmerId, String(c._id)))
  );
  return reports.filter(Boolean);
}

// Per-acre profit for every non-deactivated cycle (cash + true per acre).
export async function perAcreReport(farmerId) {
  const reports = await activeCycleReports(farmerId);
  return { data: reports };
}

// "Which crop earned most per acre" — rank by cash profit per acre, desc.
// Cycles with null per-acre (0 normalized acres) are not rankable and dropped.
export async function cropRankingReport(farmerId) {
  const reports = await activeCycleReports(farmerId);
  const rankable = reports
    .filter((r) => r.cashProfitPerAcre !== null)
    .sort((a, b) => b.cashProfitPerAcre - a.cashProfitPerAcre);
  return {
    data: rankable,
    topCrop: rankable.length ? rankable[0] : null,
  };
}
```

- [ ] **Step 4: Run the test — expect PASS.**

```
npm test -- tests/reports.test.js
```

Expected: PASS. Onion ranks first (35000 > 20000/acre); deactivated and 0-acre cycles excluded; empty farmer returns `[]` and `null`.

- [ ] **Step 5: Commit.**

```
git add src/services/reports.service.js tests/reports.test.js
git commit -m "feat(reports): per-acre list and crop-ranking (most profit per acre) roll-ups"
```

---

### Task R-5: Reports service — season comparison

Add `seasonComparisonReport(farmerId, { season })`. Groups non-deactivated cycles by `season` + crop-year `year` string and returns their cash/true profit and per-acre, sorted by year descending — this powers "compare Wheat Rabi 2025-26 vs 2024-25". If a `season` filter is passed (one of `kharif`/`rabi`/`zaid`/`perennial`), only that season's cycles are returned; otherwise all seasons are grouped. Each group entry carries `season`, `year`, and the list of cycle reports plus a group `cashProfit` total.

**Files:** `tests/reports.test.js` (modify — add suite), `src/services/reports.service.js` (modify — add function)

- [ ] **Step 1: Add failing tests with COMPLETE code.**

Append to `tests/reports.test.js`:

```js
import { seasonComparisonReport } from '../src/services/reports.service.js';

describe('reports.service.seasonComparisonReport', () => {
  async function seedSeasons() {
    const farmer = await createFarmer({ state: 'Maharashtra' });
    const paidCat = await createExpenseCategory({ name: 'Seeds', cacpTag: 'A2', isPaidOut: true, isImputed: false });
    const sale = await createIncomeCategory({ name: 'Main crop sale', type: 'main' });

    const mkCycle = (crop, season, year, acres) => createCropCycle({
      farmerId: farmer._id, cropName: crop, season, year,
      areaUsed: { value: acres, unit: 'acre', normalizedAcres: acres }, status: 'closed',
    });
    const tx = (cycle, type, cat, amount) => createTransaction({
      farmerId: farmer._id, cropCycleId: cycle._id, type,
      categoryId: cat._id, categoryName: cat.name, amount,
      date: new Date('2026-03-01T00:00:00.000Z'), isImputed: false, isVoid: false,
    });

    // Rabi 2025-26 wheat: income 50000, paid 10000 -> cash 40000
    const rabiNew = await mkCycle('Wheat', 'rabi', '2025-26', 2);
    await tx(rabiNew, 'income', sale, 50000);
    await tx(rabiNew, 'expense', paidCat, 10000);
    // Rabi 2024-25 wheat: income 30000, paid 8000 -> cash 22000
    const rabiOld = await mkCycle('Wheat', 'rabi', '2024-25', 2);
    await tx(rabiOld, 'income', sale, 30000);
    await tx(rabiOld, 'expense', paidCat, 8000);
    // Kharif 2025-26 paddy: income 20000, paid 5000 -> cash 15000
    const kharif = await mkCycle('Paddy', 'kharif', '2025-26', 1);
    await tx(kharif, 'income', sale, 20000);
    await tx(kharif, 'expense', paidCat, 5000);

    return { farmer };
  }

  it('filters to one season and sorts groups by year descending', async () => {
    const { farmer } = await seedSeasons();
    const r = await seasonComparisonReport(String(farmer._id), { season: 'rabi' });
    expect(r.season).toBe('rabi');
    expect(r.groups).toHaveLength(2);
    expect(r.groups[0].year).toBe('2025-26'); // newest first
    expect(r.groups[1].year).toBe('2024-25');
    expect(r.groups[0].cashProfit).toBe(40000);
    expect(r.groups[1].cashProfit).toBe(22000);
    // no kharif leaked in
    expect(r.groups.every((g) => g.season === 'rabi')).toBe(true);
  });

  it('groups all seasons when no season filter is given', async () => {
    const { farmer } = await seedSeasons();
    const r = await seasonComparisonReport(String(farmer._id), {});
    expect(r.season).toBeNull();
    // rabi 2025-26, rabi 2024-25, kharif 2025-26 => 3 groups
    expect(r.groups).toHaveLength(3);
    const seasons = r.groups.map((g) => g.season);
    expect(seasons).toContain('kharif');
    expect(seasons).toContain('rabi');
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/reports.test.js
```

Expected: FAIL — `seasonComparisonReport is not a function`.

- [ ] **Step 3: Add the implementation with COMPLETE code.**

Append to `src/services/reports.service.js`:

```js
// Season comparison: group non-deactivated cycles by season+year, each group
// carrying its cycle reports and a group-level cash profit total. Sorted by
// year descending (newest crop-year first) so "this year vs last year" reads
// top-to-bottom. Pass { season } to restrict to one season.
export async function seasonComparisonReport(farmerId, { season } = {}) {
  const query = { farmerId, status: { $ne: 'deactivated' } };
  if (season) query.season = season;

  const cycles = await CropCycle.find(query).select('_id season year').lean();

  // key = season + '|' + year
  const groupsMap = new Map();
  for (const c of cycles) {
    const report = await cropCycleReport(farmerId, String(c._id));
    if (!report) continue;
    const key = `${c.season}|${c.year}`;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        season: c.season,
        year: c.year,
        cashProfit: 0,
        trueProfit: 0,
        cycles: [],
      });
    }
    const g = groupsMap.get(key);
    g.cashProfit += report.cashProfit;
    g.trueProfit += report.trueProfit;
    g.cycles.push(report);
  }

  const groups = [...groupsMap.values()].sort((a, b) => {
    // year strings like "2025-26" sort lexicographically newest-first with desc
    if (a.year !== b.year) return b.year.localeCompare(a.year);
    return a.season.localeCompare(b.season);
  });

  return { season: season || null, groups };
}
```

- [ ] **Step 4: Run the test — expect PASS.**

```
npm test -- tests/reports.test.js
```

Expected: PASS. Rabi filter yields 2 groups newest-first (40000 then 22000); no filter yields 3 groups across seasons.

- [ ] **Step 5: Commit.**

```
git add src/services/reports.service.js tests/reports.test.js
git commit -m "feat(reports): season-comparison roll-up grouped by season+crop-year"
```

---

### Task R-6: Reports controller, routes, and app wiring (with zod query validation)

Expose the six report endpoints. All are `authenticate` + `requireRole('farmer')`. Monthly/yearly/per-acre/season-comparison/crop-ranking read `req.user.id`. The crop-cycle report additionally runs `ownership(CropCycle, 'id')`, which loads B's doc and 404s for a non-owner (satisfying the mandatory IDOR test — see Task R-7). Query params are validated with zod via the shared `validate` middleware in query mode; on bad input the central error handler returns `{ error: { code, message } }`.

The `validate` middleware from earlier modules is assumed to accept `validate(schema, 'query')` (or `validate({ query: schema })`). To avoid coupling to an exact signature, this task validates inside each controller with zod and throws `AppError(400, 'VALIDATION_ERROR', msg)` — self-contained and testable.

**Files:** `tests/reports.test.js` (modify — add HTTP suite), `src/controllers/reports.controller.js` (create), `src/routes/reports.routes.js` (create), `src/app.js` (modify)

- [ ] **Step 1: Add failing HTTP tests with COMPLETE code.**

Append to `tests/reports.test.js`:

```js
import request from 'supertest';
import app from '../src/app.js';
import { farmerToken } from './helpers/auth.js';

describe('GET /api/reports/* endpoints', () => {
  it('GET /reports/crop-cycle/:id returns the P/L for the owner', async () => {
    const { farmer, cycle } = await seedWheatCycle();
    const token = farmerToken(farmer);
    const res = await request(app)
      .get(`/api/reports/crop-cycle/${cycle._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.cashProfit).toBe(26000);
    expect(res.body.trueProfit).toBe(6000);
    expect(res.body.cashProfitPerAcre).toBe(13000);
    expect(res.body.trueProfitPerAcre).toBe(3000);
  });

  it('GET /reports/monthly?year=2026&month=3 returns the month summary', async () => {
    const farmer = await createFarmer({ state: 'Maharashtra' });
    const sale = await createIncomeCategory({ name: 'Main crop sale', type: 'main' });
    await createTransaction({
      farmerId: farmer._id, cropCycleId: null, type: 'income',
      categoryId: sale._id, categoryName: sale.name, amount: 20000,
      date: new Date('2026-03-05T00:00:00.000Z'), isImputed: false, isVoid: false,
    });
    const token = farmerToken(farmer);
    const res = await request(app)
      .get('/api/reports/monthly?year=2026&month=3')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.totalIncome).toBe(20000);
    expect(res.body.cashProfit).toBe(20000);
  });

  it('GET /reports/monthly rejects a bad month with 400 VALIDATION_ERROR', async () => {
    const farmer = await createFarmer({ state: 'Maharashtra' });
    const token = farmerToken(farmer);
    const res = await request(app)
      .get('/api/reports/monthly?year=2026&month=13')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /reports/yearly?year=2026 returns the year summary', async () => {
    const farmer = await createFarmer({ state: 'Maharashtra' });
    const sale = await createIncomeCategory({ name: 'Main crop sale', type: 'main' });
    await createTransaction({
      farmerId: farmer._id, cropCycleId: null, type: 'income',
      categoryId: sale._id, categoryName: sale.name, amount: 50000,
      date: new Date('2026-06-05T00:00:00.000Z'), isImputed: false, isVoid: false,
    });
    const token = farmerToken(farmer);
    const res = await request(app)
      .get('/api/reports/yearly?year=2026')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.totalIncome).toBe(50000);
  });

  it('GET /reports/per-acre returns a data array', async () => {
    const { farmer } = await seedTwoCycles();
    const token = farmerToken(farmer);
    const res = await request(app)
      .get('/api/reports/per-acre')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  it('GET /reports/crop-ranking ranks by per-acre and names the top crop', async () => {
    const { farmer } = await seedTwoCycles();
    const token = farmerToken(farmer);
    const res = await request(app)
      .get('/api/reports/crop-ranking')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].cropName).toBe('Onion');
    expect(res.body.topCrop.cropName).toBe('Onion');
  });

  it('GET /reports/season-comparison?season=rabi returns rabi groups only', async () => {
    const farmer = await createFarmer({ state: 'Maharashtra' });
    const paidCat = await createExpenseCategory({ name: 'Seeds', cacpTag: 'A2', isPaidOut: true, isImputed: false });
    const sale = await createIncomeCategory({ name: 'Main crop sale', type: 'main' });
    const cycle = await createCropCycle({
      farmerId: farmer._id, cropName: 'Wheat', season: 'rabi', year: '2025-26',
      areaUsed: { value: 2, unit: 'acre', normalizedAcres: 2 }, status: 'closed',
    });
    await createTransaction({
      farmerId: farmer._id, cropCycleId: cycle._id, type: 'income',
      categoryId: sale._id, categoryName: sale.name, amount: 50000,
      date: new Date('2026-03-01T00:00:00.000Z'), isImputed: false, isVoid: false,
    });
    await createTransaction({
      farmerId: farmer._id, cropCycleId: cycle._id, type: 'expense',
      categoryId: paidCat._id, categoryName: paidCat.name, amount: 10000,
      date: new Date('2026-03-01T00:00:00.000Z'), isImputed: false, isVoid: false,
    });
    const token = farmerToken(farmer);
    const res = await request(app)
      .get('/api/reports/season-comparison?season=rabi')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.season).toBe('rabi');
    expect(res.body.groups[0].cashProfit).toBe(40000);
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/reports/per-acre');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/reports.test.js
```

Expected: FAIL — routes not mounted (404 for all `/api/reports/*`), and `src/controllers/reports.controller.js` / `src/routes/reports.routes.js` do not exist.

- [ ] **Step 3: Write the controller, router, and app wiring with COMPLETE code.**

Create `src/controllers/reports.controller.js`:

```js
import { z } from 'zod';
import AppError from '../utils/AppError.js';
import {
  cropCycleReport,
  monthlyReport,
  yearlyReport,
  perAcreReport,
  cropRankingReport,
  seasonComparisonReport,
} from '../services/reports.service.js';

// Parse a zod schema over req.query; throw AppError(400) on failure.
function parseQuery(schema, req) {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const msg = result.error.issues.map((i) => i.message).join('; ');
    throw new AppError(400, 'VALIDATION_ERROR', msg || 'Invalid query parameters');
  }
  return result.data;
}

const monthlySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});
const yearlySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});
const seasonSchema = z.object({
  season: z.enum(['kharif', 'rabi', 'zaid', 'perennial']).optional(),
});

// GET /reports/crop-cycle/:id  — ownership middleware has already run and put
// the doc on req.doc, but we call the service by farmerId+id (defensive + reuse).
export async function getCropCycleReport(req, res, next) {
  try {
    const report = await cropCycleReport(req.user.id, req.params.id);
    if (!report) throw new AppError(404, 'NOT_FOUND', 'Not found');
    res.json(report);
  } catch (err) {
    next(err);
  }
}

// GET /reports/monthly?year=&month=
export async function getMonthlyReport(req, res, next) {
  try {
    const { year, month } = parseQuery(monthlySchema, req);
    res.json(await monthlyReport(req.user.id, { year, month }));
  } catch (err) {
    next(err);
  }
}

// GET /reports/yearly?year=
export async function getYearlyReport(req, res, next) {
  try {
    const { year } = parseQuery(yearlySchema, req);
    res.json(await yearlyReport(req.user.id, { year }));
  } catch (err) {
    next(err);
  }
}

// GET /reports/per-acre
export async function getPerAcreReport(req, res, next) {
  try {
    res.json(await perAcreReport(req.user.id));
  } catch (err) {
    next(err);
  }
}

// GET /reports/season-comparison?season=
export async function getSeasonComparisonReport(req, res, next) {
  try {
    const { season } = parseQuery(seasonSchema, req);
    res.json(await seasonComparisonReport(req.user.id, { season }));
  } catch (err) {
    next(err);
  }
}

// GET /reports/crop-ranking
export async function getCropRankingReport(req, res, next) {
  try {
    res.json(await cropRankingReport(req.user.id));
  } catch (err) {
    next(err);
  }
}
```

Create `src/routes/reports.routes.js`:

```js
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import requireRole from '../middleware/requireRole.js';
import ownership from '../middleware/ownership.js';
import CropCycle from '../models/cropCycle.model.js';
import {
  getCropCycleReport,
  getMonthlyReport,
  getYearlyReport,
  getPerAcreReport,
  getSeasonComparisonReport,
  getCropRankingReport,
} from '../controllers/reports.controller.js';

const router = Router();

// All report endpoints are farmer-only.
router.use(authenticate, requireRole('farmer'));

router.get('/monthly', getMonthlyReport);
router.get('/yearly', getYearlyReport);
router.get('/per-acre', getPerAcreReport);
router.get('/season-comparison', getSeasonComparisonReport);
router.get('/crop-ranking', getCropRankingReport);

// Ownership-checked: loads the cycle by :id and 404s if it is not this farmer's.
router.get('/crop-cycle/:id', ownership(CropCycle, 'id'), getCropCycleReport);

export default router;
```

Modify `src/app.js` to mount the router. Add the import near the other route imports and mount it with the other `/api` mounts:

```js
import reportsRoutes from './routes/reports.routes.js';
// ...
app.use('/api/reports', reportsRoutes);
```

(Place the `app.use('/api/reports', ...)` line alongside the other `app.use('/api/...', ...)` mounts, before the central error middleware `app.use(errorMiddleware)`.)

- [ ] **Step 4: Run the test — expect PASS.**

```
npm test -- tests/reports.test.js
```

Expected: PASS. Owner gets the wheat P/L; monthly/yearly/per-acre/crop-ranking/season-comparison return correct numbers; bad `month=13` gives 400 `VALIDATION_ERROR`; unauthenticated gives 401.

- [ ] **Step 5: Commit.**

```
git add src/controllers/reports.controller.js src/routes/reports.routes.js src/app.js tests/reports.test.js
git commit -m "feat(reports): six /api/reports endpoints (farmer-scoped, zod query validation, ownership on crop-cycle)"
```

---

### Task R-7: Extend the mandatory IDOR test to cover `/reports/crop-cycle/:id`

The shared contract requires `tests/security.idor.test.js` to assert that farmer A's token gets **404** (not 200, not 403) on farmer B's `/reports/crop-cycle/:id`. That file is created by the security module, but this module must guarantee its own endpoint is covered. This task adds a focused, self-contained IDOR test for the crop-cycle report so this module is provably safe even before the shared security test lands. If the shared file already contains this case, this file is complementary and both must pass.

**Files:** `tests/reports.idor.test.js` (create)

- [ ] **Step 1: Write the failing IDOR test with COMPLETE code.**

Create `tests/reports.idor.test.js`:

```js
import { describe, it, expect, beforeAll, afterEach, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connect, clear, close } from './helpers/db.js';
import { createFarmer, createIncomeCategory, createCropCycle, createTransaction } from './helpers/factories.js';
import { farmerToken } from './helpers/auth.js';

beforeAll(async () => { await connect(); });
afterEach(async () => { await clear(); });
afterAll(async () => { await close(); });

describe('IDOR: GET /api/reports/crop-cycle/:id is farmer-scoped (must 404 for a non-owner)', () => {
  async function seedFarmerWithCycle(state = 'Maharashtra') {
    const farmer = await createFarmer({ state });
    const sale = await createIncomeCategory({ name: 'Main crop sale', type: 'main' });
    const cycle = await createCropCycle({
      farmerId: farmer._id, cropName: 'Wheat', season: 'rabi', year: '2025-26',
      areaUsed: { value: 2, unit: 'acre', normalizedAcres: 2 }, status: 'closed',
    });
    await createTransaction({
      farmerId: farmer._id, cropCycleId: cycle._id, type: 'income',
      categoryId: sale._id, categoryName: sale.name, amount: 50000,
      date: new Date('2026-03-01T00:00:00.000Z'), isImputed: false, isVoid: false,
    });
    return { farmer, cycle };
  }

  it("returns 404 (not 200, not 403) when farmer A requests farmer B's crop-cycle report", async () => {
    const { farmer: farmerA } = await seedFarmerWithCycle();
    const { cycle: cycleB } = await seedFarmerWithCycle();

    const tokenA = farmerToken(farmerA);
    const res = await request(app)
      .get(`/api/reports/crop-cycle/${cycleB._id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(403);
    expect(res.body.error.code).toBe('NOT_FOUND');
    // Response must not leak B's numbers.
    expect(res.body.cashProfit).toBeUndefined();
  });

  it('returns 404 for a syntactically valid but nonexistent ObjectId', async () => {
    const { farmer: farmerA } = await seedFarmerWithCycle();
    const tokenA = farmerToken(farmerA);
    const res = await request(app)
      .get('/api/reports/crop-cycle/6650a1f2c3d4e5f601099999')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it("lets the owner read their own crop-cycle report (200)", async () => {
    const { farmer, cycle } = await seedFarmerWithCycle();
    const token = farmerToken(farmer);
    const res = await request(app)
      .get(`/api/reports/crop-cycle/${cycle._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.cashProfit).toBe(50000);
  });
});
```

- [ ] **Step 2: Run the test — expect PASS (the guard already exists via the `ownership` middleware wired in R-6).**

```
npm test -- tests/reports.idor.test.js
```

Expected: PASS. Because R-6 mounted `ownership(CropCycle, 'id')` on the crop-cycle report route, A's token already 404s on B's cycle. (If this test had been written before R-6, it would have FAILED with 200 — this task documents and locks that behavior. If it fails now, the fix is to confirm `ownership` is applied on the route in `src/routes/reports.routes.js`, then re-run.)

- [ ] **Step 3: Commit.**

```
git add tests/reports.idor.test.js
git commit -m "test(reports): IDOR guard — /reports/crop-cycle/:id returns 404 for non-owner"
```

---

### Task R-8: Full-module regression run

Run the whole module's suites together to confirm the pure engine, the DB roll-ups, the HTTP endpoints, and the IDOR guard all pass as one unit before handing off.

**Files:** none (verification only)

- [ ] **Step 1: Run all module tests together.**

```
npm test -- tests/costEngine.test.js tests/reports.test.js tests/reports.idor.test.js
```

Expected: PASS — all suites green. Key locked-in numbers: cash 26000 / true 6000 / per-acre 13000 & 3000 (worked wheat example); monthly 14000; yearly 38000; Onion ranks above Wheat; rabi season groups 40000 then 22000; non-owner crop-cycle report 404.

- [ ] **Step 2: Run the full test suite to confirm no cross-module breakage.**

```
npm test
```

Expected: PASS — this module adds files only and mounts one router; no existing suite should regress. In particular the shared `tests/security.idor.test.js` (from the security module) that also covers `/reports/crop-cycle/:id` must be green.

- [ ] **Step 3: Commit (empty allowed to mark the checkpoint, or skip if nothing changed).**

```
git commit --allow-empty -m "chore(reports): module R green — cost engine + six reports + IDOR guard verified"
```

---

**Notes for the implementer:**

- The cost engine (`src/services/costEngine.service.js`) is deliberately DB-free. The join to `isPaidOut` happens in `reports.service.js`'s `enrich()`, keeping the engine unit-testable in isolation and matching the contract's "pure, unit-tested functions" requirement.
- Every DB read in `reports.service.js` filters `isVoid: false` and is scoped by `farmerId` — the two rules the data model mandates for all report queries.
- True Profit is only surfaced at the crop-cycle / per-acre / ranking / season levels, never in monthly/yearly summaries, per docs/06 ("imputed items are seasonal, not monthly").
- The `year` string sort in season comparison uses `localeCompare` on the crop-year form (`"2025-26"`), which sorts newest-first correctly for the `"YYYY-YY"` convention.
- If your earlier `validate.js` middleware supports query validation, you may refactor the inline zod parsing in `reports.controller.js` to use it; the behavior (400 `VALIDATION_ERROR`) and tests remain unchanged.

---

## Module SUB — Subscription lifecycle & payments

This module owns the `Subscription` and `Payment` models, the on-request lifecycle engine (`subscription.service.js`), the access-gate middleware that evaluates + persists status on every farmer request and blocks writes in `grace`/no-access states, and the admin endpoints that approve trials and record payments. It assumes the shared foundation from earlier modules already exists: `src/app.js`, `src/config/env.js`, `src/utils/AppError.js`, `src/middleware/(authenticate.js, requireRole.js, validate.js, error.js)`, the `Farmer`/`Admin`/`AppConfig` models, and the test helpers in `tests/helpers/(db.js, factories.js, auth.js)`.

**Files:**

- Create `src/models/subscription.model.js`
- Create `src/models/payment.model.js`
- Create `src/services/subscription.service.js`
- Create `src/middleware/subscriptionGate.js`
- Create `src/routes/subscription.routes.js` (admin approve/activate/patch + payments)
- Modify `src/app.js` (mount the new admin routes + apply the gate to farmer write routes)
- Modify `tests/helpers/factories.js` (add a `createSubscription` factory)
- Create `tests/subscription.service.test.js`
- Create `tests/subscription.gate.test.js`
- Create `tests/subscription.admin.test.js`

Assumptions about existing helpers this module relies on (already built in the AUTH/foundation modules): `tests/helpers/db.js` exports `connect`, `clearCollections`, `disconnect`; `tests/helpers/factories.js` exports `createFarmer`, `createAdmin`, and `createAppConfig`; `tests/helpers/auth.js` exports `farmerToken(farmer)` and `adminToken(admin)`.

---

### Task SUB-1: Subscription model

**Files:** create `src/models/subscription.model.js`; create `tests/subscription.model.test.js`

- [ ] **Step 1: Write the failing test.** Create `tests/subscription.model.test.js` with the COMPLETE code below. It asserts the schema shape, defaults, the `status` enum, and the unique index on `farmerId`.

```js
// tests/subscription.model.test.js
import mongoose from 'mongoose';
import { connect, clearCollections, disconnect } from './helpers/db.js';
import Subscription from '../src/models/subscription.model.js';

beforeAll(async () => { await connect(); });
afterEach(async () => { await clearCollections(); });
afterAll(async () => { await disconnect(); });

describe('Subscription model', () => {
  test('creates a subscription with defaults', async () => {
    const farmerId = new mongoose.Types.ObjectId();
    const sub = await Subscription.create({ farmerId, status: 'pending_approval' });

    expect(String(sub.farmerId)).toBe(String(farmerId));
    expect(sub.status).toBe('pending_approval');
    expect(sub.plan).toBe('monthly');
    expect(sub.trialStartedAt).toBeUndefined();
    expect(sub.currentPeriodEnd).toBeUndefined();
  });

  test('rejects an invalid status', async () => {
    const farmerId = new mongoose.Types.ObjectId();
    await expect(
      Subscription.create({ farmerId, status: 'not_a_status' })
    ).rejects.toThrow(/validation/i);
  });

  test('enforces one subscription per farmer (unique farmerId)', async () => {
    const farmerId = new mongoose.Types.ObjectId();
    await Subscription.create({ farmerId, status: 'trial' });
    await Subscription.syncIndexes();
    await expect(
      Subscription.create({ farmerId, status: 'trial' })
    ).rejects.toThrow(/duplicate key/i);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/subscription.model.test.js
```

Expected: FAIL — `Cannot find module '../src/models/subscription.model.js'`.

- [ ] **Step 3: Write the implementation.** Create `src/models/subscription.model.js` with the COMPLETE code below. Field names and enum are exactly per the contract.

```js
// src/models/subscription.model.js
import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true, unique: true },
  status: {
    type: String,
    enum: ['pending_approval', 'trial', 'active', 'grace', 'expired', 'suspended'],
    required: true,
  },
  plan: { type: String, default: 'monthly' },
  trialStartedAt: { type: Date },
  trialEndsAt: { type: Date },
  currentPeriodStart: { type: Date },
  currentPeriodEnd: { type: Date },
  approvedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  approvedAt: { type: Date },
  activatedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  notes: { type: String },
});

subscriptionSchema.index({ status: 1, trialEndsAt: 1 });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

export default mongoose.model('Subscription', subscriptionSchema);
```

- [ ] **Step 4: Run the test — expect PASS.**

```
npm test -- tests/subscription.model.test.js
```

Expected: PASS — 3 passing tests.

- [ ] **Step 5: Commit.**

```
git add src/models/subscription.model.js tests/subscription.model.test.js
git commit -m "feat(sub): add Subscription model with status enum and indexes"
```

---

### Task SUB-2: Payment model

**Files:** create `src/models/payment.model.js`; create `tests/payment.model.test.js`

- [ ] **Step 1: Write the failing test.** Create `tests/payment.model.test.js` with the COMPLETE code below.

```js
// tests/payment.model.test.js
import mongoose from 'mongoose';
import { connect, clearCollections, disconnect } from './helpers/db.js';
import Payment from '../src/models/payment.model.js';

beforeAll(async () => { await connect(); });
afterEach(async () => { await clearCollections(); });
afterAll(async () => { await disconnect(); });

describe('Payment model', () => {
  test('creates a payment with currency default INR', async () => {
    const payment = await Payment.create({
      farmerId: new mongoose.Types.ObjectId(),
      amount: 99,
      method: 'cash',
      receivedAt: new Date('2026-07-04'),
      recordedByAdminId: new mongoose.Types.ObjectId(),
      periodStart: new Date('2026-07-04'),
      periodEnd: new Date('2026-08-04'),
    });

    expect(payment.amount).toBe(99);
    expect(payment.currency).toBe('INR');
    expect(payment.method).toBe('cash');
  });

  test('rejects an invalid method', async () => {
    await expect(
      Payment.create({
        farmerId: new mongoose.Types.ObjectId(),
        amount: 99,
        method: 'card',
        recordedByAdminId: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow(/validation/i);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/payment.model.test.js
```

Expected: FAIL — `Cannot find module '../src/models/payment.model.js'`.

- [ ] **Step 3: Write the implementation.** Create `src/models/payment.model.js` with the COMPLETE code below.

```js
// src/models/payment.model.js
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  method: { type: String, enum: ['cash', 'upi', 'other'], required: true },
  receivedAt: { type: Date },
  recordedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  periodStart: { type: Date },
  periodEnd: { type: Date },
  note: { type: String },
});

export default mongoose.model('Payment', paymentSchema);
```

- [ ] **Step 4: Run the test — expect PASS.**

```
npm test -- tests/payment.model.test.js
```

Expected: PASS — 2 passing tests.

- [ ] **Step 5: Commit.**

```
git add src/models/payment.model.js tests/payment.model.test.js
git commit -m "feat(sub): add Payment model"
```

---

### Task SUB-3: Subscription service — `evaluateStatus`, `approve`, `recordPayment` (pure functions)

These are pure, side-effect-free functions: they take a plain subscription object and a `now`/`cfg` and return the mutated values. The caller (middleware / controller) persists. `evaluateStatus` implements the on-request state machine — NO cron.

**Files:** create `src/services/subscription.service.js`; create `tests/subscription.service.test.js`

- [ ] **Step 1: Write the failing test.** Create `tests/subscription.service.test.js` with the COMPLETE code below. It exercises the whole time-based state machine plus `approve` and `recordPayment` for monthly and yearly.

```js
// tests/subscription.service.test.js
import {
  evaluateStatus,
  approve,
  recordPayment,
} from '../src/services/subscription.service.js';

const cfg = { trialDays: 14, graceDays: 30 };

const day = (iso) => new Date(iso);

describe('evaluateStatus (on-request state machine)', () => {
  test('trial still within trialEndsAt stays trial', () => {
    const sub = { status: 'trial', trialEndsAt: day('2026-07-20') };
    expect(evaluateStatus(sub, day('2026-07-10'))).toBe('trial');
  });

  test('trial past trialEndsAt becomes grace', () => {
    const sub = { status: 'trial', trialEndsAt: day('2026-07-01') };
    expect(evaluateStatus(sub, day('2026-07-10'))).toBe('grace');
  });

  test('active within currentPeriodEnd stays active', () => {
    const sub = { status: 'active', currentPeriodEnd: day('2026-08-01') };
    expect(evaluateStatus(sub, day('2026-07-10'))).toBe('active');
  });

  test('active past currentPeriodEnd becomes grace', () => {
    const sub = { status: 'active', currentPeriodEnd: day('2026-07-01') };
    expect(evaluateStatus(sub, day('2026-07-10'))).toBe('grace');
  });

  test('grace within graceDays after trialEndsAt stays grace', () => {
    // trial lapsed 2026-07-01; grace window ends 2026-07-31 (+30 days)
    const sub = { status: 'grace', trialEndsAt: day('2026-07-01') };
    expect(evaluateStatus(sub, day('2026-07-20'))).toBe('grace');
  });

  test('grace after graceDays past trialEndsAt becomes expired', () => {
    const sub = { status: 'grace', trialEndsAt: day('2026-07-01') };
    expect(evaluateStatus(sub, day('2026-08-15'))).toBe('expired');
  });

  test('grace after graceDays past currentPeriodEnd becomes expired', () => {
    const sub = { status: 'grace', currentPeriodEnd: day('2026-07-01') };
    expect(evaluateStatus(sub, day('2026-08-15'))).toBe('expired');
  });

  test('grace uses currentPeriodEnd when both dates exist (renewed then lapsed)', () => {
    const sub = {
      status: 'grace',
      trialEndsAt: day('2026-01-01'),
      currentPeriodEnd: day('2026-07-01'),
    };
    // 2026-07-20 is inside currentPeriodEnd+30 (2026-07-31), so still grace
    expect(evaluateStatus(sub, day('2026-07-20'))).toBe('grace');
  });

  test('terminal / manual statuses are never auto-changed', () => {
    for (const status of ['pending_approval', 'expired', 'suspended']) {
      const sub = { status, trialEndsAt: day('2020-01-01'), currentPeriodEnd: day('2020-01-01') };
      expect(evaluateStatus(sub, day('2026-07-10'))).toBe(status);
    }
  });
});

describe('approve', () => {
  test('moves pending_approval to trial and sets trial dates', () => {
    const sub = { status: 'pending_approval' };
    const adminId = 'admin123';
    const now = day('2026-07-04');
    approve(sub, adminId, now, cfg);

    expect(sub.status).toBe('trial');
    expect(sub.trialStartedAt).toEqual(now);
    // 2026-07-04 + 14 days = 2026-07-18
    expect(sub.trialEndsAt).toEqual(day('2026-07-18'));
    expect(sub.approvedByAdminId).toBe(adminId);
    expect(sub.approvedAt).toEqual(now);
  });

  test('throws if the subscription is not pending_approval', () => {
    const sub = { status: 'trial' };
    expect(() => approve(sub, 'admin123', day('2026-07-04'), cfg)).toThrow(/pending approval/i);
  });
});

describe('recordPayment', () => {
  test('monthly plan sets a one-month active period', () => {
    const sub = { status: 'grace' };
    const now = day('2026-07-04');
    recordPayment(sub, { adminId: 'admin123', now, plan: 'monthly' });

    expect(sub.status).toBe('active');
    expect(sub.plan).toBe('monthly');
    expect(sub.currentPeriodStart).toEqual(now);
    expect(sub.currentPeriodEnd).toEqual(day('2026-08-04'));
    expect(sub.activatedByAdminId).toBe('admin123');
  });

  test('yearly plan sets a one-year active period', () => {
    const sub = { status: 'expired' };
    const now = day('2026-07-04');
    recordPayment(sub, { adminId: 'admin123', now, plan: 'yearly' });

    expect(sub.status).toBe('active');
    expect(sub.plan).toBe('yearly');
    expect(sub.currentPeriodEnd).toEqual(day('2027-07-04'));
  });

  test('defaults to monthly when no plan is given', () => {
    const sub = { status: 'trial' };
    const now = day('2026-07-04');
    recordPayment(sub, { adminId: 'admin123', now });

    expect(sub.plan).toBe('monthly');
    expect(sub.currentPeriodEnd).toEqual(day('2026-08-04'));
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/subscription.service.test.js
```

Expected: FAIL — `Cannot find module '../src/services/subscription.service.js'`.

- [ ] **Step 3: Write the implementation.** Create `src/services/subscription.service.js` with the COMPLETE code below.

```js
// src/services/subscription.service.js
import AppError from '../utils/AppError.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function addMonths(date, months) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYears(date, years) {
  const d = new Date(date.getTime());
  d.setFullYear(d.getFullYear() + years);
  return d;
}

// The reference end date for a lapse: the current paid period end if the
// farmer ever paid, otherwise the trial end.
function lapseAnchor(sub) {
  return sub.currentPeriodEnd || sub.trialEndsAt || null;
}

/**
 * Pure, on-request evaluation of the time-based state machine. Returns the
 * (possibly new) status string; the caller persists if it changed.
 *   trial  & now > trialEndsAt                     -> grace
 *   active & now > currentPeriodEnd                -> grace
 *   grace  & now > (anchor end + graceDays)        -> expired
 * pending_approval / expired / suspended are never auto-changed here.
 */
export function evaluateStatus(sub, now) {
  const graceDays = 30; // overridden below via closure if a cfg is passed
  return evaluateStatusWithCfg(sub, now, { graceDays });
}

// Explicit-cfg variant used by the middleware (which reads AppConfig).
export function evaluateStatusWithCfg(sub, now, cfg) {
  const graceDays = cfg && typeof cfg.graceDays === 'number' ? cfg.graceDays : 30;

  if (sub.status === 'trial') {
    if (sub.trialEndsAt && now > sub.trialEndsAt) return 'grace';
    return 'trial';
  }

  if (sub.status === 'active') {
    if (sub.currentPeriodEnd && now > sub.currentPeriodEnd) return 'grace';
    return 'active';
  }

  if (sub.status === 'grace') {
    const anchor = lapseAnchor(sub);
    if (anchor && now > addDays(anchor, graceDays)) return 'expired';
    return 'grace';
  }

  // pending_approval, expired, suspended: no time-based change.
  return sub.status;
}

/** pending_approval -> trial, setting trial dates and the approving admin. */
export function approve(sub, adminId, now, cfg) {
  if (sub.status !== 'pending_approval') {
    throw new AppError(409, 'INVALID_STATE', 'Subscription is not pending approval');
  }
  const trialDays = cfg && typeof cfg.trialDays === 'number' ? cfg.trialDays : 14;
  sub.status = 'trial';
  sub.trialStartedAt = now;
  sub.trialEndsAt = addDays(now, trialDays);
  sub.approvedByAdminId = adminId;
  sub.approvedAt = now;
  return sub;
}

/**
 * Record a paid period -> active. Sets currentPeriodStart/End (monthly or
 * yearly) and the activating admin. Caller writes the Payment row separately.
 */
export function recordPayment(sub, { adminId, now, plan = 'monthly' }) {
  sub.status = 'active';
  sub.plan = plan;
  sub.currentPeriodStart = now;
  sub.currentPeriodEnd = plan === 'yearly' ? addYears(now, 1) : addMonths(now, 1);
  sub.activatedByAdminId = adminId;
  return sub;
}
```

Note: `evaluateStatus(sub, now)` keeps the exact 2-arg signature named in the contract (defaulting `graceDays` to 30). The middleware in SUB-4 calls `evaluateStatusWithCfg` so the admin-configurable `graceDays` from `AppConfig` is honoured. The service test above only exercises the default path and the explicit `approve`/`recordPayment` `cfg`.

- [ ] **Step 4: Run the test — expect PASS.**

```
npm test -- tests/subscription.service.test.js
```

Expected: PASS — all `evaluateStatus`, `approve`, and `recordPayment` tests pass.

- [ ] **Step 5: Commit.**

```
git add src/services/subscription.service.js tests/subscription.service.test.js
git commit -m "feat(sub): add subscription lifecycle service (evaluateStatus, approve, recordPayment)"
```

---

### Task SUB-4: Access-gate middleware — evaluate + persist status, block writes in grace, block all in no-access states

This middleware runs after `authenticate` on farmer routes. It loads the farmer's subscription, evaluates the time-based status, **persists it if it changed**, then enforces access: full access (`trial`/`active`) passes; `grace` allows reads but blocks writes with `403 GRACE_READONLY`; `pending_approval`/`expired`/`suspended`/`deactivated` block everything with `403 NO_ACCESS`. It exposes two exports: `attachSubscription` (evaluate + persist + attach, no gate) and `requireWriteAccess` (the write gate). Read-only farmer routes use only `attachSubscription`; write routes use both.

**Files:** modify `tests/helpers/factories.js`; create `src/middleware/subscriptionGate.js`; create `tests/subscription.gate.test.js`

- [ ] **Step 1: Add the `createSubscription` factory.** In `tests/helpers/factories.js`, add the COMPLETE export below (keep the existing exports). It creates a subscription for a farmer with sensible defaults you can override.

```js
// tests/helpers/factories.js  (add this export alongside the existing ones)
import Subscription from '../../src/models/subscription.model.js';

export async function createSubscription(farmerId, overrides = {}) {
  return Subscription.create({
    farmerId,
    status: 'active',
    plan: 'monthly',
    ...overrides,
  });
}
```

- [ ] **Step 2: Write the failing test.** Create `tests/subscription.gate.test.js` with the COMPLETE code below. It mounts a tiny router protected by the gate onto the real app is unnecessary — instead we test the gate against representative real farmer endpoints. To keep this test self-contained and independent of other modules, it builds a minimal app inline using the real middleware. Replace the import of `authenticate` with the real one from the AUTH module.

```js
// tests/subscription.gate.test.js
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { connect, clearCollections, disconnect } from './helpers/db.js';
import { createFarmer, createSubscription, createAppConfig } from './helpers/factories.js';
import { farmerToken } from './helpers/auth.js';
import authenticate from '../src/middleware/authenticate.js';
import errorHandler from '../src/middleware/error.js';
import { attachSubscription, requireWriteAccess } from '../src/middleware/subscriptionGate.js';
import Subscription from '../src/models/subscription.model.js';

// Minimal app exercising the gate on a read route and a write route.
function buildApp() {
  const app = express();
  app.use(express.json());
  app.get('/probe/read', authenticate, attachSubscription, (req, res) =>
    res.json({ status: req.subscription.status })
  );
  app.post('/probe/write', authenticate, attachSubscription, requireWriteAccess, (req, res) =>
    res.json({ ok: true })
  );
  app.use(errorHandler);
  return app;
}

let app;
beforeAll(async () => { await connect(); app = buildApp(); });
afterEach(async () => { await clearCollections(); });
afterAll(async () => { await disconnect(); });

const NOW = new Date('2026-07-04');
const daysAgo = (n) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

async function setup(subOverrides) {
  await createAppConfig({ trialDays: 14, graceDays: 30 });
  const farmer = await createFarmer();
  await createSubscription(farmer._id, subOverrides);
  const token = farmerToken(farmer);
  return { farmer, token };
}

describe('subscription gate — full access (trial/active)', () => {
  test('trial: read and write both allowed', async () => {
    const { token } = await setup({ status: 'trial', trialEndsAt: daysAgo(-10) });
    await request(app).get('/probe/read').set('Authorization', `Bearer ${token}`).expect(200);
    await request(app).post('/probe/write').set('Authorization', `Bearer ${token}`).expect(200);
  });

  test('active: read and write both allowed', async () => {
    const { token } = await setup({ status: 'active', currentPeriodEnd: daysAgo(-20) });
    await request(app).get('/probe/read').set('Authorization', `Bearer ${token}`).expect(200);
    await request(app).post('/probe/write').set('Authorization', `Bearer ${token}`).expect(200);
  });
});

describe('subscription gate — grace is read-only', () => {
  test('grace: read allowed, write blocked with 403 GRACE_READONLY', async () => {
    const { token } = await setup({ status: 'grace', currentPeriodEnd: daysAgo(5) });
    await request(app).get('/probe/read').set('Authorization', `Bearer ${token}`).expect(200);
    const res = await request(app)
      .post('/probe/write')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    expect(res.body.error.code).toBe('GRACE_READONLY');
  });
});

describe('subscription gate — no access states', () => {
  test.each(['expired', 'suspended', 'pending_approval'])(
    '%s: read and write both blocked with 403 NO_ACCESS',
    async (status) => {
      const { token } = await setup({ status });
      const r = await request(app).get('/probe/read').set('Authorization', `Bearer ${token}`).expect(403);
      expect(r.body.error.code).toBe('NO_ACCESS');
      const w = await request(app).post('/probe/write').set('Authorization', `Bearer ${token}`).expect(403);
      expect(w.body.error.code).toBe('NO_ACCESS');
    }
  );
});

describe('subscription gate — on-request evaluation is persisted', () => {
  test('trial past trialEndsAt is flipped to grace and saved', async () => {
    const { farmer, token } = await setup({ status: 'trial', trialEndsAt: daysAgo(2) });
    // A read is allowed in grace, so this returns 200 with the new status...
    const res = await request(app).get('/probe/read').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.status).toBe('grace');
    // ...and the change was persisted.
    const stored = await Subscription.findOne({ farmerId: farmer._id });
    expect(stored.status).toBe('grace');
  });

  test('grace past graceDays is flipped to expired and saved', async () => {
    const { farmer, token } = await setup({ status: 'grace', currentPeriodEnd: daysAgo(40) });
    const res = await request(app).get('/probe/read').set('Authorization', `Bearer ${token}`).expect(403);
    expect(res.body.error.code).toBe('NO_ACCESS');
    const stored = await Subscription.findOne({ farmerId: farmer._id });
    expect(stored.status).toBe('expired');
  });

  test('missing subscription is treated as no access (404)', async () => {
    await createAppConfig({ trialDays: 14, graceDays: 30 });
    const farmer = await createFarmer();
    const token = farmerToken(farmer);
    const res = await request(app).get('/probe/read').set('Authorization', `Bearer ${token}`).expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
```

- [ ] **Step 3: Run the test — expect FAIL.**

```
npm test -- tests/subscription.gate.test.js
```

Expected: FAIL — `Cannot find module '../src/middleware/subscriptionGate.js'` (and, if `createAppConfig` is not yet in factories, add it there per your AppConfig/foundation module — the gate reads config through it).

- [ ] **Step 4: Write the implementation.** Create `src/middleware/subscriptionGate.js` with the COMPLETE code below.

```js
// src/middleware/subscriptionGate.js
import Subscription from '../models/subscription.model.js';
import AppConfig from '../models/appConfig.model.js';
import { evaluateStatusWithCfg } from '../services/subscription.service.js';
import AppError from '../utils/AppError.js';

// Statuses that grant full read+write access.
const FULL_ACCESS = new Set(['trial', 'active']);

async function loadConfig() {
  const cfg = await AppConfig.findOne();
  return {
    trialDays: cfg?.trialDays ?? 14,
    graceDays: cfg?.graceDays ?? 30,
  };
}

/**
 * Loads the farmer's subscription, evaluates the on-request time-based state
 * machine, PERSISTS the status if it changed, and attaches req.subscription.
 * Throws 404 if the farmer has no subscription (should never happen for a
 * valid farmer, but we do not confirm existence with a 403).
 * Does NOT gate writes — that is requireWriteAccess.
 */
export async function attachSubscription(req, res, next) {
  try {
    const sub = await Subscription.findOne({ farmerId: req.user.id });
    if (!sub) {
      throw new AppError(404, 'NOT_FOUND', 'Not found');
    }

    const cfg = await loadConfig();
    const now = new Date();
    const nextStatus = evaluateStatusWithCfg(sub, now, cfg);
    if (nextStatus !== sub.status) {
      sub.status = nextStatus;
      await sub.save();
    }

    req.subscription = sub;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Write gate. Must run after attachSubscription.
 *   full access (trial/active) -> pass
 *   grace                      -> 403 GRACE_READONLY (reads elsewhere still work)
 *   anything else              -> 403 NO_ACCESS
 * Note: attachSubscription already lets grace reads through, and this gate is
 * only mounted on write routes, so here grace and no-access are the cases.
 */
export function requireWriteAccess(req, res, next) {
  const status = req.subscription.status;
  if (FULL_ACCESS.has(status)) return next();
  if (status === 'grace') {
    return next(new AppError(403, 'GRACE_READONLY', 'Renew to add new entries'));
  }
  return next(new AppError(403, 'NO_ACCESS', 'Your subscription does not allow access'));
}

/**
 * Read gate for the no-access states. attachSubscription attaches the
 * subscription for every state; this blocks reads for the states that must
 * not even read (expired/suspended/pending_approval). grace and full access
 * pass through so reports stay viewable in grace.
 */
export function requireReadAccess(req, res, next) {
  const status = req.subscription.status;
  if (FULL_ACCESS.has(status) || status === 'grace') return next();
  return next(new AppError(403, 'NO_ACCESS', 'Your subscription does not allow access'));
}
```

The test's read route uses only `attachSubscription`, but its "no access" cases expect `/probe/read` to return `403 NO_ACCESS`. Wire `requireReadAccess` into the probe read route so the gate is exercised end-to-end.

- [ ] **Step 5: Update the probe app in the test to include `requireReadAccess`.** Edit the read route in `tests/subscription.gate.test.js` so reads are also gated (grace still passes):

```js
  const { attachSubscription, requireWriteAccess, requireReadAccess } =
    // (adjust the import line at the top to include requireReadAccess)
```

Change the import line and the read route:

```js
// top of file
import { attachSubscription, requireWriteAccess, requireReadAccess } from '../src/middleware/subscriptionGate.js';

// inside buildApp()
app.get('/probe/read', authenticate, attachSubscription, requireReadAccess, (req, res) =>
  res.json({ status: req.subscription.status })
);
```

- [ ] **Step 6: Run the test — expect PASS.**

```
npm test -- tests/subscription.gate.test.js
```

Expected: PASS — full-access, grace read-only, no-access, and on-request-persist cases all pass.

- [ ] **Step 7: Commit.**

```
git add src/middleware/subscriptionGate.js tests/subscription.gate.test.js tests/helpers/factories.js
git commit -m "feat(sub): add subscription gate (evaluate+persist, grace read-only, no-access block)"
```

---

### Task SUB-5: Admin approve endpoint — `POST /admin/farmers/:id/approve`

Moves a farmer's subscription from `pending_approval` to `trial`, sets trial dates and the approving admin. Admin-only.

**Files:** create `src/routes/subscription.routes.js`; modify `src/app.js`; create `tests/subscription.admin.test.js`

- [ ] **Step 1: Write the failing test.** Create `tests/subscription.admin.test.js` with the COMPLETE code below (this file grows across SUB-5/6/7).

```js
// tests/subscription.admin.test.js
import request from 'supertest';
import app from '../src/app.js';
import { connect, clearCollections, disconnect } from './helpers/db.js';
import { createFarmer, createAdmin, createSubscription, createAppConfig } from './helpers/factories.js';
import { adminToken, farmerToken } from './helpers/auth.js';
import Subscription from '../src/models/subscription.model.js';
import Payment from '../src/models/payment.model.js';

beforeAll(async () => { await connect(); });
afterEach(async () => { await clearCollections(); });
afterAll(async () => { await disconnect(); });

describe('POST /api/admin/farmers/:id/approve', () => {
  test('approves a pending farmer -> trial with dates + approving admin', async () => {
    await createAppConfig({ trialDays: 14, graceDays: 30 });
    const admin = await createAdmin({ role: 'admin' });
    const farmer = await createFarmer();
    await createSubscription(farmer._id, { status: 'pending_approval' });

    const res = await request(app)
      .post(`/api/admin/farmers/${farmer._id}/approve`)
      .set('Authorization', `Bearer ${adminToken(admin)}`)
      .expect(200);

    expect(res.body.status).toBe('trial');
    expect(res.body.trialStartedAt).toBeTruthy();
    expect(res.body.trialEndsAt).toBeTruthy();
    expect(String(res.body.approvedByAdminId)).toBe(String(admin._id));

    const stored = await Subscription.findOne({ farmerId: farmer._id });
    expect(stored.status).toBe('trial');
    // trialEndsAt is 14 days after trialStartedAt
    const diffDays = Math.round(
      (stored.trialEndsAt - stored.trialStartedAt) / (24 * 60 * 60 * 1000)
    );
    expect(diffDays).toBe(14);
  });

  test('returns 409 INVALID_STATE if farmer is not pending_approval', async () => {
    await createAppConfig({ trialDays: 14, graceDays: 30 });
    const admin = await createAdmin({ role: 'admin' });
    const farmer = await createFarmer();
    await createSubscription(farmer._id, { status: 'trial' });

    const res = await request(app)
      .post(`/api/admin/farmers/${farmer._id}/approve`)
      .set('Authorization', `Bearer ${adminToken(admin)}`)
      .expect(409);
    expect(res.body.error.code).toBe('INVALID_STATE');
  });

  test('returns 404 NOT_FOUND if the farmer has no subscription', async () => {
    const admin = await createAdmin({ role: 'admin' });
    const farmer = await createFarmer();

    const res = await request(app)
      .post(`/api/admin/farmers/${farmer._id}/approve`)
      .set('Authorization', `Bearer ${adminToken(admin)}`)
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('rejects a farmer token with 403', async () => {
    const farmer = await createFarmer();
    await createSubscription(farmer._id, { status: 'pending_approval' });
    await request(app)
      .post(`/api/admin/farmers/${farmer._id}/approve`)
      .set('Authorization', `Bearer ${farmerToken(farmer)}`)
      .expect(403);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/subscription.admin.test.js
```

Expected: FAIL — `404` for the approve route (route not mounted) or a module-not-found for `subscription.routes.js`.

- [ ] **Step 3: Write the route + controller logic.** Create `src/routes/subscription.routes.js` with the COMPLETE code below. To keep this module self-contained, controllers are inline in the router; if your codebase splits controllers out, move the handlers to `src/controllers/subscription.controller.js` unchanged.

```js
// src/routes/subscription.routes.js
import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Subscription from '../models/subscription.model.js';
import Payment from '../models/payment.model.js';
import AppConfig from '../models/appConfig.model.js';
import { approve, recordPayment } from '../services/subscription.service.js';
import authenticate from '../middleware/authenticate.js';
import requireRole from '../middleware/requireRole.js';
import validate from '../middleware/validate.js';
import AppError from '../utils/AppError.js';

const router = Router();

async function loadConfig() {
  const cfg = await AppConfig.findOne();
  return {
    trialDays: cfg?.trialDays ?? 14,
    graceDays: cfg?.graceDays ?? 30,
  };
}

// POST /api/admin/farmers/:id/approve  (A) pending_approval -> trial
router.post(
  '/admin/farmers/:id/approve',
  authenticate,
  requireRole('admin', 'superadmin'),
  async (req, res, next) => {
    try {
      const sub = await Subscription.findOne({ farmerId: req.params.id });
      if (!sub) throw new AppError(404, 'NOT_FOUND', 'Not found');

      const cfg = await loadConfig();
      approve(sub, req.user.id, new Date(), cfg); // throws 409 if not pending
      await sub.save();
      res.json(sub.toJSON());
    } catch (err) {
      next(err);
    }
  }
);

export default router;
```

- [ ] **Step 4: Mount the router in `src/app.js`.** Add the import near the other route imports and mount it under `/api` (all routes in the file already carry their own `/admin/...` path, so they mount at the `/api` root).

```js
// src/app.js  (add with the other route imports)
import subscriptionRoutes from './routes/subscription.routes.js';

// ...where routes are mounted, alongside the others:
app.use('/api', subscriptionRoutes);
```

- [ ] **Step 5: Run the test — expect PASS.**

```
npm test -- tests/subscription.admin.test.js
```

Expected: PASS — the approve suite (4 tests) passes.

- [ ] **Step 6: Commit.**

```
git add src/routes/subscription.routes.js src/app.js tests/subscription.admin.test.js
git commit -m "feat(sub): add admin approve endpoint (pending_approval -> trial)"
```

---

### Task SUB-6: Record payment — `POST /admin/subscriptions/:farmerId/activate` and `POST /admin/payments`

Both endpoints record a paid period and flip the subscription to `active`. `POST /admin/subscriptions/:farmerId/activate` is the subscription-centric route; `POST /admin/payments` is the payment-centric route (used by the payments dashboard). Both write a `Payment` row and update the `Subscription`, keeping payments and subscriptions as separate collections per the contract.

**Files:** modify `src/routes/subscription.routes.js`; modify `tests/subscription.admin.test.js`

- [ ] **Step 1: Add failing tests.** Append the COMPLETE `describe` blocks below to `tests/subscription.admin.test.js`.

```js
// tests/subscription.admin.test.js  (append)

describe('POST /api/admin/subscriptions/:farmerId/activate', () => {
  test('activates a monthly period, writes Payment + updates Subscription', async () => {
    const admin = await createAdmin({ role: 'admin' });
    const farmer = await createFarmer();
    await createSubscription(farmer._id, { status: 'grace', currentPeriodEnd: new Date('2026-06-01') });

    const res = await request(app)
      .post(`/api/admin/subscriptions/${farmer._id}/activate`)
      .set('Authorization', `Bearer ${adminToken(admin)}`)
      .send({ amount: 99, method: 'upi', plan: 'monthly' })
      .expect(200);

    expect(res.body.status).toBe('active');
    expect(res.body.plan).toBe('monthly');
    expect(res.body.currentPeriodStart).toBeTruthy();
    expect(res.body.currentPeriodEnd).toBeTruthy();
    expect(String(res.body.activatedByAdminId)).toBe(String(admin._id));

    const payments = await Payment.find({ farmerId: farmer._id });
    expect(payments).toHaveLength(1);
    expect(payments[0].amount).toBe(99);
    expect(payments[0].method).toBe('upi');
    expect(String(payments[0].recordedByAdminId)).toBe(String(admin._id));
    // Payment period matches the subscription period.
    const stored = await Subscription.findOne({ farmerId: farmer._id });
    expect(payments[0].periodStart.getTime()).toBe(stored.currentPeriodStart.getTime());
    expect(payments[0].periodEnd.getTime()).toBe(stored.currentPeriodEnd.getTime());
  });

  test('yearly plan sets a one-year period', async () => {
    const admin = await createAdmin({ role: 'admin' });
    const farmer = await createFarmer();
    await createSubscription(farmer._id, { status: 'expired' });

    const res = await request(app)
      .post(`/api/admin/subscriptions/${farmer._id}/activate`)
      .set('Authorization', `Bearer ${adminToken(admin)}`)
      .send({ amount: 799, method: 'cash', plan: 'yearly' })
      .expect(200);

    expect(res.body.plan).toBe('yearly');
    const diffDays = Math.round(
      (new Date(res.body.currentPeriodEnd) - new Date(res.body.currentPeriodStart)) /
        (24 * 60 * 60 * 1000)
    );
    expect(diffDays).toBeGreaterThanOrEqual(365);
    expect(diffDays).toBeLessThanOrEqual(366);
  });

  test('returns 404 NOT_FOUND if the farmer has no subscription', async () => {
    const admin = await createAdmin({ role: 'admin' });
    const farmer = await createFarmer();
    const res = await request(app)
      .post(`/api/admin/subscriptions/${farmer._id}/activate`)
      .set('Authorization', `Bearer ${adminToken(admin)}`)
      .send({ amount: 99, method: 'cash' })
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('returns 400 on an invalid method', async () => {
    const admin = await createAdmin({ role: 'admin' });
    const farmer = await createFarmer();
    await createSubscription(farmer._id, { status: 'grace' });
    await request(app)
      .post(`/api/admin/subscriptions/${farmer._id}/activate`)
      .set('Authorization', `Bearer ${adminToken(admin)}`)
      .send({ amount: 99, method: 'card' })
      .expect(400);
  });
});

describe('POST /api/admin/payments', () => {
  test('records a payment by farmerId and activates the subscription', async () => {
    const admin = await createAdmin({ role: 'admin' });
    const farmer = await createFarmer();
    await createSubscription(farmer._id, { status: 'grace' });

    const res = await request(app)
      .post('/api/admin/payments')
      .set('Authorization', `Bearer ${adminToken(admin)}`)
      .send({ farmerId: String(farmer._id), amount: 99, method: 'cash', plan: 'monthly' })
      .expect(201);

    expect(res.body.amount).toBe(99);
    expect(String(res.body.recordedByAdminId)).toBe(String(admin._id));

    const stored = await Subscription.findOne({ farmerId: farmer._id });
    expect(stored.status).toBe('active');
    expect(stored.currentPeriodEnd).toBeTruthy();
  });

  test('returns 404 NOT_FOUND if the farmer has no subscription', async () => {
    const admin = await createAdmin({ role: 'admin' });
    const farmer = await createFarmer();
    const res = await request(app)
      .post('/api/admin/payments')
      .set('Authorization', `Bearer ${adminToken(admin)}`)
      .send({ farmerId: String(farmer._id), amount: 99, method: 'cash' })
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('GET /api/admin/payments', () => {
  test('lists payments, most recent first, filterable by farmerId', async () => {
    const admin = await createAdmin({ role: 'admin' });
    const farmerA = await createFarmer({ phone: '9000000001' });
    const farmerB = await createFarmer({ phone: '9000000002' });
    await createSubscription(farmerA._id, { status: 'grace' });
    await createSubscription(farmerB._id, { status: 'grace' });

    await request(app).post('/api/admin/payments').set('Authorization', `Bearer ${adminToken(admin)}`)
      .send({ farmerId: String(farmerA._id), amount: 99, method: 'cash' }).expect(201);
    await request(app).post('/api/admin/payments').set('Authorization', `Bearer ${adminToken(admin)}`)
      .send({ farmerId: String(farmerB._id), amount: 799, method: 'upi', plan: 'yearly' }).expect(201);

    const all = await request(app).get('/api/admin/payments')
      .set('Authorization', `Bearer ${adminToken(admin)}`).expect(200);
    expect(all.body.data).toHaveLength(2);

    const filtered = await request(app).get(`/api/admin/payments?farmerId=${farmerA._id}`)
      .set('Authorization', `Bearer ${adminToken(admin)}`).expect(200);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].amount).toBe(99);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/subscription.admin.test.js
```

Expected: FAIL — the activate/payments routes return 404 (not mounted yet).

- [ ] **Step 3: Add the routes.** Append the COMPLETE code below to `src/routes/subscription.routes.js`, before `export default router;`. A shared `activateFromPayment` helper writes both rows so the two endpoints stay identical.

```js
// src/routes/subscription.routes.js  (append before `export default router;`)

const paymentBodySchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['cash', 'upi', 'other']),
  plan: z.enum(['monthly', 'yearly']).optional(),
  note: z.string().optional(),
});

const paymentWithFarmerSchema = paymentBodySchema.extend({
  farmerId: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), 'Invalid farmerId'),
});

// Shared: record a paid period -> active, and write the Payment audit row.
async function activateFromPayment({ sub, adminId, body }) {
  const now = new Date();
  const plan = body.plan || 'monthly';
  recordPayment(sub, { adminId, now, plan });
  await sub.save();

  const payment = await Payment.create({
    farmerId: sub.farmerId,
    amount: body.amount,
    method: body.method,
    receivedAt: now,
    recordedByAdminId: adminId,
    periodStart: sub.currentPeriodStart,
    periodEnd: sub.currentPeriodEnd,
    note: body.note,
  });

  return { sub, payment };
}

// POST /api/admin/subscriptions/:farmerId/activate  (A) -> active (subscription JSON)
router.post(
  '/admin/subscriptions/:farmerId/activate',
  authenticate,
  requireRole('admin', 'superadmin'),
  validate({ body: paymentBodySchema }),
  async (req, res, next) => {
    try {
      const sub = await Subscription.findOne({ farmerId: req.params.farmerId });
      if (!sub) throw new AppError(404, 'NOT_FOUND', 'Not found');
      await activateFromPayment({ sub, adminId: req.user.id, body: req.body });
      res.json(sub.toJSON());
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/payments  (A) -> active (payment JSON, 201)
router.post(
  '/admin/payments',
  authenticate,
  requireRole('admin', 'superadmin'),
  validate({ body: paymentWithFarmerSchema }),
  async (req, res, next) => {
    try {
      const sub = await Subscription.findOne({ farmerId: req.body.farmerId });
      if (!sub) throw new AppError(404, 'NOT_FOUND', 'Not found');
      const { payment } = await activateFromPayment({ sub, adminId: req.user.id, body: req.body });
      res.status(201).json(payment.toJSON());
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/admin/payments  (A) -> { data: [...] } most recent first, optional ?farmerId=
router.get(
  '/admin/payments',
  authenticate,
  requireRole('admin', 'superadmin'),
  async (req, res, next) => {
    try {
      const filter = {};
      if (req.query.farmerId) {
        if (!mongoose.Types.ObjectId.isValid(req.query.farmerId)) {
          throw new AppError(400, 'VALIDATION', 'Invalid farmerId');
        }
        filter.farmerId = req.query.farmerId;
      }
      const payments = await Payment.find(filter).sort({ receivedAt: -1 });
      res.json({ data: payments.map((p) => p.toJSON()) });
    } catch (err) {
      next(err);
    }
  }
);
```

Note on `validate`: this assumes the shared `validate({ body })` middleware from the foundation module parses `req.body` with the given zod schema and throws `AppError(400,'VALIDATION',...)` on failure. If your `validate` signature differs (e.g. `validate(schema)`), adapt the two call sites to match — the schema objects above are unchanged.

- [ ] **Step 4: Run the test — expect PASS.**

```
npm test -- tests/subscription.admin.test.js
```

Expected: PASS — approve (SUB-5) plus activate, `POST /admin/payments`, and `GET /admin/payments` all pass.

- [ ] **Step 5: Commit.**

```
git add src/routes/subscription.routes.js tests/subscription.admin.test.js
git commit -m "feat(sub): add activate + record/list payment endpoints (-> active period)"
```

---

### Task SUB-7: Admin subscription patch — `PATCH /admin/subscriptions/:farmerId`

Lets an admin adjust a subscription directly: suspend, un-suspend (reactivate), edit `notes`, or correct `plan`/period dates. This covers the `any -> suspended` and `suspended -> active/trial` manual transitions in the state machine. Validated and admin-only.

**Files:** modify `src/routes/subscription.routes.js`; modify `tests/subscription.admin.test.js`

- [ ] **Step 1: Add failing tests.** Append the COMPLETE `describe` block below to `tests/subscription.admin.test.js`.

```js
// tests/subscription.admin.test.js  (append)

describe('PATCH /api/admin/subscriptions/:farmerId', () => {
  test('suspends an active subscription', async () => {
    const admin = await createAdmin({ role: 'admin' });
    const farmer = await createFarmer();
    await createSubscription(farmer._id, { status: 'active', currentPeriodEnd: new Date('2026-12-01') });

    const res = await request(app)
      .patch(`/api/admin/subscriptions/${farmer._id}`)
      .set('Authorization', `Bearer ${adminToken(admin)}`)
      .send({ status: 'suspended', notes: 'reported for abuse' })
      .expect(200);

    expect(res.body.status).toBe('suspended');
    expect(res.body.notes).toBe('reported for abuse');
    const stored = await Subscription.findOne({ farmerId: farmer._id });
    expect(stored.status).toBe('suspended');
  });

  test('reactivates a suspended subscription back to trial', async () => {
    const admin = await createAdmin({ role: 'admin' });
    const farmer = await createFarmer();
    await createSubscription(farmer._id, { status: 'suspended' });

    const res = await request(app)
      .patch(`/api/admin/subscriptions/${farmer._id}`)
      .set('Authorization', `Bearer ${adminToken(admin)}`)
      .send({ status: 'trial' })
      .expect(200);

    expect(res.body.status).toBe('trial');
  });

  test('rejects an invalid status value with 400', async () => {
    const admin = await createAdmin({ role: 'admin' });
    const farmer = await createFarmer();
    await createSubscription(farmer._id, { status: 'active' });

    await request(app)
      .patch(`/api/admin/subscriptions/${farmer._id}`)
      .set('Authorization', `Bearer ${adminToken(admin)}`)
      .send({ status: 'gold_tier' })
      .expect(400);
  });

  test('returns 404 NOT_FOUND if the farmer has no subscription', async () => {
    const admin = await createAdmin({ role: 'admin' });
    const farmer = await createFarmer();
    const res = await request(app)
      .patch(`/api/admin/subscriptions/${farmer._id}`)
      .set('Authorization', `Bearer ${adminToken(admin)}`)
      .send({ notes: 'x' })
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('rejects a farmer token with 403', async () => {
    const farmer = await createFarmer();
    await createSubscription(farmer._id, { status: 'active' });
    await request(app)
      .patch(`/api/admin/subscriptions/${farmer._id}`)
      .set('Authorization', `Bearer ${farmerToken(farmer)}`)
      .send({ status: 'suspended' })
      .expect(403);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/subscription.admin.test.js
```

Expected: FAIL — the PATCH route returns 404 (not mounted yet).

- [ ] **Step 3: Add the route.** Append the COMPLETE code below to `src/routes/subscription.routes.js`, before `export default router;`.

```js
// src/routes/subscription.routes.js  (append before `export default router;`)

const patchSubscriptionSchema = z
  .object({
    status: z.enum(['pending_approval', 'trial', 'active', 'grace', 'expired', 'suspended']).optional(),
    plan: z.enum(['monthly', 'yearly']).optional(),
    currentPeriodStart: z.coerce.date().optional(),
    currentPeriodEnd: z.coerce.date().optional(),
    notes: z.string().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required');

// PATCH /api/admin/subscriptions/:farmerId  (A) manual edit / suspend / reactivate
router.patch(
  '/admin/subscriptions/:farmerId',
  authenticate,
  requireRole('admin', 'superadmin'),
  validate({ body: patchSubscriptionSchema }),
  async (req, res, next) => {
    try {
      const sub = await Subscription.findOne({ farmerId: req.params.farmerId });
      if (!sub) throw new AppError(404, 'NOT_FOUND', 'Not found');

      const allowed = ['status', 'plan', 'currentPeriodStart', 'currentPeriodEnd', 'notes'];
      for (const key of allowed) {
        if (req.body[key] !== undefined) sub[key] = req.body[key];
      }
      await sub.save();
      res.json(sub.toJSON());
    } catch (err) {
      next(err);
    }
  }
);
```

- [ ] **Step 4: Run the test — expect PASS.**

```
npm test -- tests/subscription.admin.test.js
```

Expected: PASS — the PATCH suite (5 tests) plus all earlier admin suites pass.

- [ ] **Step 5: Commit.**

```
git add src/routes/subscription.routes.js tests/subscription.admin.test.js
git commit -m "feat(sub): add admin PATCH subscription (suspend/reactivate/edit)"
```

---

### Task SUB-8: Wire the gate onto farmer write routes and run the full module suite

The gate is now enforced on the farmer data endpoints so grace is truly read-only and no-access states are blocked. This task assumes the plots/crop-cycles/transactions routers from other modules exist; apply `attachSubscription` + `requireWriteAccess` to their write handlers and `attachSubscription` + `requireReadAccess` to their read handlers. Only the transactions router is shown in full as the pattern; apply the identical wiring to plots and crop-cycles.

**Files:** modify `src/routes/transaction.routes.js` (and, by the same pattern, `src/routes/plot.routes.js` and `src/routes/cropCycle.routes.js`); create `tests/subscription.integration.test.js`

- [ ] **Step 1: Write the failing integration test.** Create `tests/subscription.integration.test.js` with the COMPLETE code below. It hits the real transactions endpoints through the exported app: a farmer in grace can list transactions but cannot create one; after the admin records a payment, creating works again.

```js
// tests/subscription.integration.test.js
import request from 'supertest';
import app from '../src/app.js';
import { connect, clearCollections, disconnect } from './helpers/db.js';
import { createFarmer, createAdmin, createSubscription, createAppConfig } from './helpers/factories.js';
import { farmerToken, adminToken } from './helpers/auth.js';

beforeAll(async () => { await connect(); });
afterEach(async () => { await clearCollections(); });
afterAll(async () => { await disconnect(); });

const NOW = new Date();
const daysFromNow = (n) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

async function makeTxnBody() {
  return {
    type: 'expense',
    categoryId: '000000000000000000000001',
    categoryName: 'Seeds',
    amount: 500,
    date: new Date().toISOString(),
  };
}

describe('subscription gate on real transaction routes', () => {
  test('trial farmer can create and list transactions', async () => {
    await createAppConfig({ trialDays: 14, graceDays: 30 });
    const farmer = await createFarmer();
    await createSubscription(farmer._id, { status: 'trial', trialEndsAt: daysFromNow(10) });
    const token = farmerToken(farmer);

    await request(app).post('/api/transactions').set('Authorization', `Bearer ${token}`)
      .send(await makeTxnBody()).expect(201);
    const list = await request(app).get('/api/transactions').set('Authorization', `Bearer ${token}`).expect(200);
    expect(list.body.data).toHaveLength(1);
  });

  test('grace farmer can list but cannot create (403 GRACE_READONLY)', async () => {
    await createAppConfig({ trialDays: 14, graceDays: 30 });
    const farmer = await createFarmer();
    await createSubscription(farmer._id, { status: 'grace', currentPeriodEnd: daysFromNow(-5) });
    const token = farmerToken(farmer);

    await request(app).get('/api/transactions').set('Authorization', `Bearer ${token}`).expect(200);
    const res = await request(app).post('/api/transactions').set('Authorization', `Bearer ${token}`)
      .send(await makeTxnBody()).expect(403);
    expect(res.body.error.code).toBe('GRACE_READONLY');
  });

  test('after admin records payment, the grace farmer can create again', async () => {
    await createAppConfig({ trialDays: 14, graceDays: 30 });
    const admin = await createAdmin({ role: 'admin' });
    const farmer = await createFarmer();
    await createSubscription(farmer._id, { status: 'grace', currentPeriodEnd: daysFromNow(-5) });
    const token = farmerToken(farmer);

    // Blocked while in grace.
    await request(app).post('/api/transactions').set('Authorization', `Bearer ${token}`)
      .send(await makeTxnBody()).expect(403);

    // Admin records a payment -> active.
    await request(app).post('/api/admin/payments').set('Authorization', `Bearer ${adminToken(admin)}`)
      .send({ farmerId: String(farmer._id), amount: 99, method: 'cash' }).expect(201);

    // Now the write goes through.
    await request(app).post('/api/transactions').set('Authorization', `Bearer ${token}`)
      .send(await makeTxnBody()).expect(201);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.**

```
npm test -- tests/subscription.integration.test.js
```

Expected: FAIL — the grace `POST /api/transactions` returns `201` (gate not wired) instead of `403 GRACE_READONLY`.

- [ ] **Step 3: Wire the gate into the transactions router.** In `src/routes/transaction.routes.js`, import the gate and add it after `authenticate` on each handler. Reads get `attachSubscription, requireReadAccess`; writes get `attachSubscription, requireWriteAccess`. The COMPLETE relevant edits:

```js
// src/routes/transaction.routes.js  (imports)
import { attachSubscription, requireWriteAccess, requireReadAccess } from '../middleware/subscriptionGate.js';
```

```js
// GET (list) — read
router.get('/transactions', authenticate, attachSubscription, requireReadAccess, listTransactions);

// POST (create) — write
router.post('/transactions', authenticate, attachSubscription, requireWriteAccess, validate({ body: createTransactionSchema }), createTransaction);

// PATCH (edit) — write, ownership after the gate
router.patch('/transactions/:id', authenticate, attachSubscription, requireWriteAccess, ownership(Transaction), validate({ body: updateTransactionSchema }), updateTransaction);

// DELETE (void) — write
router.delete('/transactions/:id', authenticate, attachSubscription, requireWriteAccess, ownership(Transaction), voidTransaction);
```

Apply the identical pattern to `src/routes/plot.routes.js` (`GET/POST /plots`, `PATCH/DELETE /plots/:id`) and `src/routes/cropCycle.routes.js` (`GET/POST /crop-cycles`, `GET/PATCH/DELETE /crop-cycles/:id`), and add `attachSubscription, requireReadAccess` to the `GET /reports/*` routes so reports stay viewable in grace but are blocked for expired/suspended. Ordering rule: `authenticate` → `attachSubscription` → (`requireWriteAccess`|`requireReadAccess`) → `ownership` → `validate` → handler.

- [ ] **Step 4: Run the integration test — expect PASS.**

```
npm test -- tests/subscription.integration.test.js
```

Expected: PASS — trial can write, grace is read-only with `GRACE_READONLY`, and post-payment the write succeeds.

- [ ] **Step 5: Run the whole module suite — expect PASS.**

```
npm test -- tests/subscription.model.test.js tests/payment.model.test.js tests/subscription.service.test.js tests/subscription.gate.test.js tests/subscription.admin.test.js tests/subscription.integration.test.js
```

Expected: PASS — every SUB test file green.

- [ ] **Step 6: Commit.**

```
git add src/routes/transaction.routes.js src/routes/plot.routes.js src/routes/cropCycle.routes.js src/routes/report.routes.js tests/subscription.integration.test.js
git commit -m "feat(sub): enforce subscription gate on farmer write/read routes"
```

---

Notes for the implementing engineer:
- `src/models/appConfig.model.js` and `createAppConfig`/`createAdmin`/`createFarmer`/token helpers come from earlier modules; the SUB tests depend on them existing exactly as named.
- `evaluateStatus(sub, now)` keeps the contract's 2-arg signature (default `graceDays=30`); the middleware uses `evaluateStatusWithCfg(sub, now, cfg)` to honour the admin-configurable `graceDays` from `AppConfig`. Both live in `src/services/subscription.service.js`.
- The gate deliberately returns `404 NOT_FOUND` (not 403) when a farmer has no subscription row, consistent with the IDOR "never confirm existence" rule.
- Grace uses `currentPeriodEnd` as the lapse anchor when the farmer has ever paid, otherwise `trialEndsAt`, so the grace→expired cut-off is measured from the correct date.

---

## Module ADM — Admin management, announcements & dashboard

This module builds every `/api/admin/*` endpoint except auth (covered by AUTH) and payments/subscription lifecycle helpers (the `Subscription`/`Payment` models and `src/services/subscription.service.js` come from the SUB module). It assumes the shared scaffolding already exists from earlier modules:

- `src/app.js`, `src/config/env.js`, `src/config/db.js`
- Models: `src/models/farmer.model.js`, `admin.model.js`, `subscription.model.js`, `payment.model.js`, `plot.model.js`, `cropCycle.model.js`, `transaction.model.js`, `cropCatalog.model.js`, `expenseCategory.model.js`, `incomeCategory.model.js`, `appConfig.model.js`
- Middleware: `src/middleware/authenticate.js`, `requireRole.js`, `validate.js`, `error.js`
- Utils: `src/utils/AppError.js`
- Service: `src/services/subscription.service.js` (`evaluateStatus`)
- Test helpers: `tests/helpers/db.js`, `tests/helpers/factories.js`, `tests/helpers/auth.js`

If a helper you rely on (e.g. `factories.createAdmin`, `factories.createFarmer`, `auth.tokenFor`) is missing when you reach a task, add it to that helper file in the same commit — the code below shows the exact shape it must return.

**Files:**

- Create: `src/models/announcement.model.js`
- Create: `src/services/fcm.service.js`
- Create: `src/services/admin.service.js`
- Create: `src/controllers/admin.controller.js`
- Create: `src/routes/admin.routes.js`
- Modify: `src/app.js` (mount `adminRoutes` at `/api/admin`)
- Create test: `tests/admin.rbac.test.js`
- Create test: `tests/admin.farmers.test.js`
- Create test: `tests/admin.masterData.test.js`
- Create test: `tests/admin.config.test.js`
- Create test: `tests/admin.announcements.test.js`
- Create test: `tests/admin.dashboard.test.js`
- Modify (as needed): `tests/helpers/factories.js`, `tests/helpers/auth.js`

---

### Task ADM-1: Router skeleton + role enforcement (farmer token cannot reach /admin/*)

**Files:** `tests/admin.rbac.test.js`, `src/routes/admin.routes.js`, `src/controllers/admin.controller.js`, `src/app.js`

- [ ] **Step 1: Write the failing RBAC test.** This locks in that every `/admin/*` route is behind `authenticate` + `requireRole('admin','superadmin')`. Create `tests/admin.rbac.test.js`:

```js
import request from 'supertest';
import app from '../src/app.js';
import { connect, clear, close } from './helpers/db.js';
import { createFarmer, createAdmin } from './helpers/factories.js';
import { accessTokenFor } from './helpers/auth.js';

beforeAll(connect);
afterEach(clear);
afterAll(close);

// [method, path] pairs for representative admin endpoints.
const ADMIN_ROUTES = [
  ['get', '/api/admin/farmers'],
  ['get', '/api/admin/dashboard'],
  ['get', '/api/admin/crops'],
  ['get', '/api/admin/expense-categories'],
  ['get', '/api/admin/income-categories'],
  ['get', '/api/admin/announcements'],
];

describe('admin RBAC', () => {
  test('no token -> 401 on every admin route', async () => {
    for (const [method, path] of ADMIN_ROUTES) {
      const res = await request(app)[method](path);
      expect(res.status).toBe(401);
    }
  });

  test('farmer token -> 403 FORBIDDEN on every admin route', async () => {
    const { farmer } = await createFarmer();
    const token = accessTokenFor(farmer, 'farmer');
    for (const [method, path] of ADMIN_ROUTES) {
      const res = await request(app)[method](path).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  });

  test('admin token -> not 401/403 (route is reachable)', async () => {
    const admin = await createAdmin({ role: 'admin' });
    const token = accessTokenFor(admin, 'admin');
    const res = await request(app).get('/api/admin/farmers').set('Authorization', `Bearer ${token}`);
    expect([200]).toContain(res.status);
  });
});
```

If `createAdmin` / `accessTokenFor` are not yet in the helpers, add them now. `createAdmin` must persist an `admins` doc (default `role:'admin'`, `tokenVersion:0`) and return the Mongoose doc. `accessTokenFor(user, role)` must sign a JWT with payload `{ sub: String(user._id), role, tokenVersion: user.tokenVersion ?? 0 }` using `env.JWT_ACCESS_SECRET`, matching what `authenticate` verifies.

- [ ] **Step 2: Run it — expect FAIL.**

```
npm test -- tests/admin.rbac.test.js
```

Expected: FAIL — `Cannot find module '../src/routes/admin.routes.js'` (or, once mounted, 404s because no handlers exist).

- [ ] **Step 3: Create a minimal controller so the router has handlers.** Create `src/controllers/admin.controller.js`:

```js
// Handlers are filled in across ADM-2..ADM-7. For now, list/dashboard return empty
// so the RBAC test can confirm the route is reachable by an admin.
export async function listFarmers(req, res) {
  res.json({ data: [] });
}
```

- [ ] **Step 4: Create the router with full RBAC.** Create `src/routes/admin.routes.js`:

```js
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import * as ctrl from '../controllers/admin.controller.js';

const router = Router();

// Every admin route requires a valid token AND an admin/superadmin role.
router.use(authenticate);
router.use(requireRole('admin', 'superadmin'));

router.get('/farmers', ctrl.listFarmers);

export default router;
```

Confirm `requireRole` throws `AppError(403, 'FORBIDDEN', ...)` when the role is not allowed (that is the shared-contract behaviour the test asserts).

- [ ] **Step 5: Mount the router in `src/app.js`.** Add the import and mount alongside the other route mounts:

```js
import adminRoutes from './routes/admin.routes.js';
// ...
app.use('/api/admin', adminRoutes);
```

- [ ] **Step 6: Run it — expect PASS.**

```
npm test -- tests/admin.rbac.test.js
```

Expected: PASS (no-token → 401, farmer → 403 FORBIDDEN, admin → 200).

- [ ] **Step 7: Commit.**

```
git add src/routes/admin.routes.js src/controllers/admin.controller.js src/app.js tests/admin.rbac.test.js tests/helpers/
git commit -m "feat(admin): admin router skeleton with role enforcement"
```

---

### Task ADM-2: GET /admin/farmers — list/search with evaluated subscription status

**Files:** `tests/admin.farmers.test.js`, `src/services/admin.service.js`, `src/controllers/admin.controller.js`, `src/routes/admin.routes.js`

- [ ] **Step 1: Write the failing test.** Covers pagination, search by name/phone/village/district, and that each row carries the freshly evaluated subscription status. Create `tests/admin.farmers.test.js`:

```js
import request from 'supertest';
import app from '../src/app.js';
import { connect, clear, close } from './helpers/db.js';
import { createFarmer, createAdmin } from './helpers/factories.js';
import { accessTokenFor } from './helpers/auth.js';
import { Subscription } from '../src/models/subscription.model.js';

beforeAll(connect);
afterEach(clear);
afterAll(close);

async function adminToken() {
  const admin = await createAdmin({ role: 'admin' });
  return accessTokenFor(admin, 'admin');
}

describe('GET /api/admin/farmers', () => {
  test('lists farmers with evaluated subscription status and pagination', async () => {
    const token = await adminToken();
    await createFarmer({ farmer: { name: 'Aarti', phone: '9000000001', village: 'Shirur', district: 'Pune' } });
    await createFarmer({ farmer: { name: 'Bhau', phone: '9000000002', village: 'Baramati', district: 'Pune' } });

    const res = await request(app)
      .get('/api/admin/farmers?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
    // Each row exposes farmer fields + a subscriptionStatus, never passwordHash.
    const row = res.body.data.find((f) => f.phone === '9000000001');
    expect(row.name).toBe('Aarti');
    expect(row).not.toHaveProperty('passwordHash');
    expect(row.subscriptionStatus).toBeDefined();
  });

  test('search matches name, phone, village or district (case-insensitive)', async () => {
    const token = await adminToken();
    await createFarmer({ farmer: { name: 'Ramesh Patil', phone: '9111111111', village: 'Shirur', district: 'Pune' } });
    await createFarmer({ farmer: { name: 'Suresh Jadhav', phone: '9222222222', village: 'Wai', district: 'Satara' } });

    const byName = await request(app).get('/api/admin/farmers?q=ramesh').set('Authorization', `Bearer ${token}`);
    expect(byName.body.data.map((f) => f.phone)).toEqual(['9111111111']);

    const byDistrict = await request(app).get('/api/admin/farmers?q=satara').set('Authorization', `Bearer ${token}`);
    expect(byDistrict.body.data.map((f) => f.phone)).toEqual(['9222222222']);

    const byPhone = await request(app).get('/api/admin/farmers?q=9111').set('Authorization', `Bearer ${token}`);
    expect(byPhone.body.data.map((f) => f.phone)).toEqual(['9111111111']);
  });

  test('filter by status', async () => {
    const token = await adminToken();
    const { farmer: susp } = await createFarmer({ farmer: { phone: '9333333333', status: 'suspended' } });
    await createFarmer({ farmer: { phone: '9444444444', status: 'active' } });

    const res = await request(app).get('/api/admin/farmers?status=suspended').set('Authorization', `Bearer ${token}`);
    expect(res.body.data.map((f) => f.phone)).toEqual([String(susp.phone)]);
  });

  test('evaluated status persists when a trial has lapsed into grace', async () => {
    const token = await adminToken();
    const { farmer } = await createFarmer({ farmer: { phone: '9555555555' } });
    // Trial that ended yesterday -> evaluateStatus must move it to grace and persist.
    await Subscription.create({
      farmerId: farmer._id,
      status: 'trial',
      plan: 'monthly',
      trialStartedAt: new Date(Date.now() - 20 * 86400000),
      trialEndsAt: new Date(Date.now() - 86400000),
    });

    const res = await request(app).get('/api/admin/farmers').set('Authorization', `Bearer ${token}`);
    const row = res.body.data.find((f) => f.phone === '9555555555');
    expect(row.subscriptionStatus).toBe('grace');

    const persisted = await Subscription.findOne({ farmerId: farmer._id });
    expect(persisted.status).toBe('grace');
  });
});
```

`createFarmer` must accept `{ farmer }` overrides, persist a `farmers` doc AND a matching `subscriptions` doc (default `status:'trial'` with sane trial dates, or `pending_approval` — pick one default and keep it consistent), and return `{ farmer, subscription }`. Add/extend it now if needed.

- [ ] **Step 2: Run it — expect FAIL.**

```
npm test -- tests/admin.farmers.test.js
```

Expected: FAIL — the current `listFarmers` returns `{ data: [] }`, so length/search/status assertions fail.

- [ ] **Step 3: Create the admin service with the list function.** Create `src/services/admin.service.js`:

```js
import { Farmer } from '../models/farmer.model.js';
import { Subscription } from '../models/subscription.model.js';
import { evaluateStatus } from './subscription.service.js';

/**
 * List/search farmers with pagination and a freshly evaluated subscription status.
 * The evaluated status is persisted when it changed (on-request evaluation, no cron).
 */
export async function listFarmers({ q, status, page = 1, limit = 20 }) {
  const filter = {};
  if (status) filter.status = status;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { phone: rx }, { village: rx }, { district: rx }];
  }

  const skip = (page - 1) * limit;
  const [farmers, total] = await Promise.all([
    Farmer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Farmer.countDocuments(filter),
  ]);

  const now = new Date();
  const data = await Promise.all(
    farmers.map(async (f) => {
      const sub = await Subscription.findOne({ farmerId: f._id });
      let subscriptionStatus = null;
      if (sub) {
        const next = evaluateStatus(sub, now);
        if (next !== sub.status) {
          sub.status = next;
          await sub.save();
        }
        subscriptionStatus = next;
      }
      return { ...publicFarmer(f), subscriptionStatus };
    })
  );

  return { data, total, page, limit };
}

// Strip sensitive fields; passwordHash must never leave the API.
export function publicFarmer(f) {
  const { passwordHash, __v, ...rest } = f;
  return rest;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

- [ ] **Step 4: Wire the controller to the service.** Replace the stub `listFarmers` in `src/controllers/admin.controller.js`:

```js
import * as adminService from '../services/admin.service.js';

export async function listFarmers(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const result = await adminService.listFarmers({
    q: req.query.q,
    status: req.query.status,
    page,
    limit,
  });
  res.json(result);
}
```

Note: controllers wrap async handlers with the project's `asyncHandler` (or the routes use it) so thrown errors reach the central error middleware. Follow whatever pattern the AUTH module established; if the route file wraps handlers, keep doing that.

- [ ] **Step 5: Run it — expect PASS.**

```
npm test -- tests/admin.farmers.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit.**

```
git add src/services/admin.service.js src/controllers/admin.controller.js tests/admin.farmers.test.js tests/helpers/
git commit -m "feat(admin): list/search farmers with evaluated subscription status"
```

---

### Task ADM-3: GET /admin/farmers/:id + lifecycle actions (approve is SUB's; here: profile, suspend/reactivate, reset-password, deactivate)

**Files:** `tests/admin.farmers.test.js` (extend), `src/services/admin.service.js`, `src/controllers/admin.controller.js`, `src/routes/admin.routes.js`

> Note: `POST /admin/farmers/:id/approve` and `POST /admin/subscriptions/:farmerId/activate` are owned by the SUB module. This task owns the four remaining farmer actions: **get one**, **PATCH suspend/reactivate**, **reset-password**, **deactivate**.

- [ ] **Step 1: Extend the test file.** Append to `tests/admin.farmers.test.js`:

```js
import { Farmer } from '../src/models/farmer.model.js';
import { Plot } from '../src/models/plot.model.js';
import { CropCycle } from '../src/models/cropCycle.model.js';
import { Transaction } from '../src/models/transaction.model.js';
import { RefreshToken } from '../src/models/refreshToken.model.js';
import bcrypt from 'bcrypt';

describe('GET /api/admin/farmers/:id', () => {
  test('returns profile + records summary + subscription', async () => {
    const token = await adminToken();
    const { farmer } = await createFarmer({ farmer: { phone: '9600000001' } });
    await Plot.create({ farmerId: farmer._id, name: 'North', area: { value: 1, unit: 'acre', normalizedAcres: 1 }, state: 'Maharashtra' });
    await Transaction.create({ farmerId: farmer._id, type: 'income', categoryId: farmer._id, categoryName: 'Sale', amount: 500, date: new Date() });

    const res = await request(app).get(`/api/admin/farmers/${farmer._id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.farmer.phone).toBe('9600000001');
    expect(res.body.farmer).not.toHaveProperty('passwordHash');
    expect(res.body.subscription.status).toBeDefined();
    expect(res.body.counts.plots).toBe(1);
    expect(res.body.counts.transactions).toBe(1);
  });

  test('unknown id -> 404 NOT_FOUND', async () => {
    const token = await adminToken();
    const res = await request(app).get('/api/admin/farmers/6650a1f2c3d4e5f601000099').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('PATCH /api/admin/farmers/:id (suspend / reactivate)', () => {
  test('suspend bumps tokenVersion and revokes refresh tokens', async () => {
    const token = await adminToken();
    const { farmer } = await createFarmer({ farmer: { phone: '9600000002', status: 'active', tokenVersion: 0 } });
    await RefreshToken.create({ userId: farmer._id, userType: 'farmer', tokenHash: 'h1', issuedAt: new Date(), expiresAt: new Date(Date.now() + 86400000) });

    const res = await request(app)
      .patch(`/api/admin/farmers/${farmer._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'suspended' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('suspended');
    const updated = await Farmer.findById(farmer._id);
    expect(updated.status).toBe('suspended');
    expect(updated.tokenVersion).toBe(1);
    const rt = await RefreshToken.findOne({ userId: farmer._id });
    expect(rt.revokedAt).not.toBeNull();
  });

  test('reactivate sets status active', async () => {
    const token = await adminToken();
    const { farmer } = await createFarmer({ farmer: { phone: '9600000003', status: 'suspended' } });
    const res = await request(app)
      .patch(`/api/admin/farmers/${farmer._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
  });

  test('invalid status value -> 400 VALIDATION_ERROR', async () => {
    const token = await adminToken();
    const { farmer } = await createFarmer({ farmer: { phone: '9600000004' } });
    const res = await request(app)
      .patch(`/api/admin/farmers/${farmer._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'banana' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/admin/farmers/:id/reset-password', () => {
  test('issues a temp password, bumps tokenVersion, revokes refresh tokens', async () => {
    const token = await adminToken();
    const { farmer } = await createFarmer({ farmer: { phone: '9600000005', tokenVersion: 0 } });
    await RefreshToken.create({ userId: farmer._id, userType: 'farmer', tokenHash: 'h2', issuedAt: new Date(), expiresAt: new Date(Date.now() + 86400000) });

    const res = await request(app)
      .post(`/api/admin/farmers/${farmer._id}/reset-password`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.tempPassword).toBe('string');
    expect(res.body.tempPassword.length).toBeGreaterThanOrEqual(8);

    const updated = await Farmer.findById(farmer._id);
    // New hash must verify against the returned temp password.
    expect(await bcrypt.compare(res.body.tempPassword, updated.passwordHash)).toBe(true);
    expect(updated.tokenVersion).toBe(1);
    const rt = await RefreshToken.findOne({ userId: farmer._id });
    expect(rt.revokedAt).not.toBeNull();
  });
});

describe('POST /api/admin/farmers/:id/deactivate', () => {
  test('deactivates farmer and soft-removes their records; never deletes', async () => {
    const token = await adminToken();
    const { farmer } = await createFarmer({ farmer: { phone: '9600000006', status: 'active' } });
    const plot = await Plot.create({ farmerId: farmer._id, name: 'P', area: { value: 1, unit: 'acre', normalizedAcres: 1 }, state: 'Maharashtra', isActive: true });
    const cc = await CropCycle.create({ farmerId: farmer._id, plotId: plot._id, cropId: farmer._id, cropName: 'Wheat', season: 'rabi', year: '2025-26', areaUsed: { value: 1, unit: 'acre', normalizedAcres: 1 }, status: 'active' });
    const tx = await Transaction.create({ farmerId: farmer._id, type: 'expense', categoryId: farmer._id, categoryName: 'Seeds', amount: 100, date: new Date(), isVoid: false });

    const res = await request(app)
      .post(`/api/admin/farmers/${farmer._id}/deactivate`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('deactivated');

    const f = await Farmer.findById(farmer._id);
    expect(f.status).toBe('deactivated');
    expect(f.deactivatedAt).not.toBeNull();
    expect(await Plot.findById(plot._id)).toMatchObject({ isActive: false });
    expect((await CropCycle.findById(cc._id)).status).toBe('deactivated');
    const voided = await Transaction.findById(tx._id);
    expect(voided.isVoid).toBe(true);
    expect(voided.voidedAt).not.toBeNull();
    // Nothing was physically deleted.
    expect(await Transaction.countDocuments({ farmerId: farmer._id })).toBe(1);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL.**

```
npm test -- tests/admin.farmers.test.js
```

Expected: FAIL — routes `/farmers/:id`, PATCH, `/reset-password`, `/deactivate` are not defined (404s).

- [ ] **Step 3: Add service functions.** Append to `src/services/admin.service.js`:

```js
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { Plot } from '../models/plot.model.js';
import { CropCycle } from '../models/cropCycle.model.js';
import { Transaction } from '../models/transaction.model.js';
import { RefreshToken } from '../models/refreshToken.model.js';
import { AppError } from '../utils/AppError.js';

const BCRYPT_ROUNDS = 10;

async function loadFarmerOr404(id) {
  const farmer = await Farmer.findById(id).catch(() => null);
  if (!farmer) throw new AppError(404, 'NOT_FOUND', 'Not found');
  return farmer;
}

// Revoke every live refresh token for a farmer (suspend / reset / deactivate).
async function revokeAllRefreshTokens(farmerId) {
  await RefreshToken.updateMany(
    { userId: farmerId, userType: 'farmer', revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

export async function getFarmerDetail(id) {
  const farmer = await loadFarmerOr404(id);
  const sub = await Subscription.findOne({ farmerId: farmer._id });
  const now = new Date();
  if (sub) {
    const next = evaluateStatus(sub, now);
    if (next !== sub.status) {
      sub.status = next;
      await sub.save();
    }
  }
  const [plots, cropCycles, transactions] = await Promise.all([
    Plot.countDocuments({ farmerId: farmer._id, isActive: true }),
    CropCycle.countDocuments({ farmerId: farmer._id, status: { $ne: 'deactivated' } }),
    Transaction.countDocuments({ farmerId: farmer._id, isVoid: false }),
  ]);
  return {
    farmer: publicFarmer(farmer.toObject()),
    subscription: sub ? sub.toObject() : null,
    counts: { plots, cropCycles, transactions },
  };
}

export async function setFarmerStatus(id, status) {
  const farmer = await loadFarmerOr404(id);
  farmer.status = status;
  if (status === 'suspended' || status === 'deactivated') {
    // Kill outstanding access tokens (tokenVersion) + refresh tokens.
    farmer.tokenVersion += 1;
    await revokeAllRefreshTokens(farmer._id);
  }
  await farmer.save();
  return publicFarmer(farmer.toObject());
}

export async function resetFarmerPassword(id) {
  const farmer = await loadFarmerOr404(id);
  // 12 hex chars -> >= 8 char policy, easy to read out over the phone.
  const tempPassword = crypto.randomBytes(6).toString('hex');
  farmer.passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
  farmer.tokenVersion += 1; // force re-login everywhere
  await revokeAllRefreshTokens(farmer._id);
  await farmer.save();
  return { tempPassword };
}

export async function deactivateFarmer(id) {
  const farmer = await loadFarmerOr404(id);
  const now = new Date();
  farmer.status = 'deactivated';
  farmer.deactivatedAt = now;
  farmer.tokenVersion += 1;
  await Promise.all([
    revokeAllRefreshTokens(farmer._id),
    Plot.updateMany({ farmerId: farmer._id }, { $set: { isActive: false } }),
    CropCycle.updateMany({ farmerId: farmer._id }, { $set: { status: 'deactivated' } }),
    Transaction.updateMany(
      { farmerId: farmer._id, isVoid: false },
      { $set: { isVoid: true, voidedAt: now } }
    ),
  ]);
  await farmer.save();
  return publicFarmer(farmer.toObject());
}
```

- [ ] **Step 4: Add validation + controller handlers.** In `src/controllers/admin.controller.js` add the zod schema and handlers:

```js
import { z } from 'zod';

const farmerStatusSchema = z.object({
  // Admins may suspend or reactivate here; full deactivation has its own endpoint.
  status: z.enum(['active', 'suspended']),
});

export async function getFarmer(req, res) {
  const detail = await adminService.getFarmerDetail(req.params.id);
  res.json(detail);
}

export async function patchFarmer(req, res) {
  const parsed = farmerStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid farmer status');
  }
  const farmer = await adminService.setFarmerStatus(req.params.id, parsed.data.status);
  res.json(farmer);
}

export async function resetPassword(req, res) {
  const result = await adminService.resetFarmerPassword(req.params.id);
  res.json(result); // { tempPassword } — shared with the farmer offline
}

export async function deactivateFarmer(req, res) {
  const farmer = await adminService.deactivateFarmer(req.params.id);
  res.json(farmer);
}
```

Add `import { AppError } from '../utils/AppError.js';` at the top of the controller if it is not already imported.

- [ ] **Step 5: Register the routes.** In `src/routes/admin.routes.js` add (after the `/farmers` list route):

```js
router.get('/farmers/:id', ctrl.getFarmer);
router.patch('/farmers/:id', ctrl.patchFarmer);
router.post('/farmers/:id/reset-password', ctrl.resetPassword);
router.post('/farmers/:id/deactivate', ctrl.deactivateFarmer);
```

- [ ] **Step 6: Run it — expect PASS.**

```
npm test -- tests/admin.farmers.test.js
```

Expected: PASS (all describe blocks green).

- [ ] **Step 7: Commit.**

```
git add src/services/admin.service.js src/controllers/admin.controller.js src/routes/admin.routes.js tests/admin.farmers.test.js
git commit -m "feat(admin): farmer detail, suspend/reactivate, reset-password, deactivate"
```

---

### Task ADM-4: Master-data CRUD — /admin/crops, /admin/expense-categories, /admin/income-categories (deactivate, not delete)

**Files:** `tests/admin.masterData.test.js`, `src/services/admin.service.js`, `src/controllers/admin.controller.js`, `src/routes/admin.routes.js`

- [ ] **Step 1: Write the failing test.** Create `tests/admin.masterData.test.js`:

```js
import request from 'supertest';
import app from '../src/app.js';
import { connect, clear, close } from './helpers/db.js';
import { createAdmin } from './helpers/factories.js';
import { accessTokenFor } from './helpers/auth.js';
import { CropCatalog } from '../src/models/cropCatalog.model.js';
import { ExpenseCategory } from '../src/models/expenseCategory.model.js';
import { IncomeCategory } from '../src/models/incomeCategory.model.js';

beforeAll(connect);
afterEach(clear);
afterAll(close);

async function adminToken() {
  const admin = await createAdmin({ role: 'admin' });
  return accessTokenFor(admin, 'admin');
}

describe('/api/admin/crops', () => {
  test('POST creates a crop, GET lists it, PATCH updates, PATCH isActive=false deactivates (no delete)', async () => {
    const token = await adminToken();

    const created = await request(app)
      .post('/api/admin/crops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Wheat', defaultSeason: 'rabi', icon: 'wheat' });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe('Wheat');
    expect(created.body.isActive).toBe(true);
    const id = created.body._id;

    const list = await request(app).get('/api/admin/crops').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.map((c) => c.name)).toContain('Wheat');

    const patched = await request(app)
      .patch(`/api/admin/crops/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Wheat (Sharbati)' });
    expect(patched.status).toBe(200);
    expect(patched.body.name).toBe('Wheat (Sharbati)');

    const deactivated = await request(app)
      .patch(`/api/admin/crops/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: false });
    expect(deactivated.body.isActive).toBe(false);
    // Row still exists — deactivate, never delete.
    expect(await CropCatalog.countDocuments({})).toBe(1);
  });

  test('POST with missing name -> 400 VALIDATION_ERROR', async () => {
    const token = await adminToken();
    const res = await request(app).post('/api/admin/crops').set('Authorization', `Bearer ${token}`).send({ icon: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('PATCH unknown id -> 404 NOT_FOUND', async () => {
    const token = await adminToken();
    const res = await request(app)
      .patch('/api/admin/crops/6650a1f2c3d4e5f601000099')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('/api/admin/expense-categories', () => {
  test('POST validates cacpTag enum and creates; GET lists', async () => {
    const token = await adminToken();
    const bad = await request(app)
      .post('/api/admin/expense-categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Seeds', isPaidOut: true, isImputed: false, cacpTag: 'ZZ' });
    expect(bad.status).toBe(400);

    const ok = await request(app)
      .post('/api/admin/expense-categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Family labour', isPaidOut: false, isImputed: true, cacpTag: 'FL', icon: 'people' });
    expect(ok.status).toBe(201);
    expect(ok.body.cacpTag).toBe('FL');
    expect(ok.body.isImputed).toBe(true);

    const list = await request(app).get('/api/admin/expense-categories').set('Authorization', `Bearer ${token}`);
    expect(list.body.data.map((c) => c.name)).toContain('Family labour');
    expect(await ExpenseCategory.countDocuments({})).toBe(1);
  });
});

describe('/api/admin/income-categories', () => {
  test('POST creates; PATCH isActive=false deactivates', async () => {
    const token = await adminToken();
    const ok = await request(app)
      .post('/api/admin/income-categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Main crop sale', type: 'sale', icon: 'cash' });
    expect(ok.status).toBe(201);
    const id = ok.body._id;

    const off = await request(app)
      .patch(`/api/admin/income-categories/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: false });
    expect(off.body.isActive).toBe(false);
    expect(await IncomeCategory.countDocuments({})).toBe(1);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL.**

```
npm test -- tests/admin.masterData.test.js
```

Expected: FAIL — none of the master-data routes exist yet.

- [ ] **Step 3: Add generic master-data service helpers.** Append to `src/services/admin.service.js`:

```js
import { CropCatalog } from '../models/cropCatalog.model.js';
import { ExpenseCategory } from '../models/expenseCategory.model.js';
import { IncomeCategory } from '../models/incomeCategory.model.js';

const MASTER_MODELS = {
  crops: CropCatalog,
  'expense-categories': ExpenseCategory,
  'income-categories': IncomeCategory,
};

function masterModel(kind) {
  const Model = MASTER_MODELS[kind];
  if (!Model) throw new AppError(400, 'VALIDATION_ERROR', 'Unknown master-data type');
  return Model;
}

export async function listMasterData(kind) {
  const Model = masterModel(kind);
  const data = await Model.find({}).sort({ name: 1 }).lean();
  return { data };
}

export async function createMasterData(kind, doc) {
  const Model = masterModel(kind);
  const created = await Model.create(doc);
  return created.toObject();
}

export async function updateMasterData(kind, id, patch) {
  const Model = masterModel(kind);
  const doc = await Model.findById(id).catch(() => null);
  if (!doc) throw new AppError(404, 'NOT_FOUND', 'Not found');
  Object.assign(doc, patch); // patch already whitelisted by the zod schema
  await doc.save();
  return doc.toObject();
}
```

- [ ] **Step 4: Add zod schemas + handlers to the controller.** Append to `src/controllers/admin.controller.js`:

```js
const cropCreateSchema = z.object({
  name: z.string().min(1),
  defaultSeason: z.enum(['kharif', 'rabi', 'zaid', 'perennial']).optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
});
const cropPatchSchema = cropCreateSchema.partial();

const expenseCatCreateSchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  isPaidOut: z.boolean(),
  isImputed: z.boolean(),
  cacpTag: z.enum(['A1', 'A2', 'FL', 'C2']),
  isActive: z.boolean().optional(),
});
const expenseCatPatchSchema = expenseCatCreateSchema.partial();

const incomeCatCreateSchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  type: z.string().optional(),
  isActive: z.boolean().optional(),
});
const incomeCatPatchSchema = incomeCatCreateSchema.partial();

const MASTER_SCHEMAS = {
  crops: { create: cropCreateSchema, patch: cropPatchSchema },
  'expense-categories': { create: expenseCatCreateSchema, patch: expenseCatPatchSchema },
  'income-categories': { create: incomeCatCreateSchema, patch: incomeCatPatchSchema },
};

function makeMasterHandlers(kind) {
  return {
    list: async (req, res) => {
      const result = await adminService.listMasterData(kind);
      res.json(result);
    },
    create: async (req, res) => {
      const parsed = MASTER_SCHEMAS[kind].create.safeParse(req.body);
      if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid master-data payload');
      const created = await adminService.createMasterData(kind, parsed.data);
      res.status(201).json(created);
    },
    update: async (req, res) => {
      const parsed = MASTER_SCHEMAS[kind].patch.safeParse(req.body);
      if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid master-data payload');
      const updated = await adminService.updateMasterData(kind, req.params.id, parsed.data);
      res.json(updated);
    },
  };
}

export const crops = makeMasterHandlers('crops');
export const expenseCategories = makeMasterHandlers('expense-categories');
export const incomeCategories = makeMasterHandlers('income-categories');
```

- [ ] **Step 5: Register the routes.** In `src/routes/admin.routes.js` add:

```js
router.get('/crops', ctrl.crops.list);
router.post('/crops', ctrl.crops.create);
router.patch('/crops/:id', ctrl.crops.update);

router.get('/expense-categories', ctrl.expenseCategories.list);
router.post('/expense-categories', ctrl.expenseCategories.create);
router.patch('/expense-categories/:id', ctrl.expenseCategories.update);

router.get('/income-categories', ctrl.incomeCategories.list);
router.post('/income-categories', ctrl.incomeCategories.create);
router.patch('/income-categories/:id', ctrl.incomeCategories.update);
```

- [ ] **Step 6: Run it — expect PASS.**

```
npm test -- tests/admin.masterData.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit.**

```
git add src/services/admin.service.js src/controllers/admin.controller.js src/routes/admin.routes.js tests/admin.masterData.test.js
git commit -m "feat(admin): master-data CRUD for crops and categories (deactivate not delete)"
```

---

### Task ADM-5: GET/PATCH /admin/config (superadmin only)

**Files:** `tests/admin.config.test.js`, `src/services/admin.service.js`, `src/controllers/admin.controller.js`, `src/routes/admin.routes.js`

- [ ] **Step 1: Write the failing test.** Note the per-route role gate: `admin` is forbidden, only `superadmin` may read/write config. Create `tests/admin.config.test.js`:

```js
import request from 'supertest';
import app from '../src/app.js';
import { connect, clear, close } from './helpers/db.js';
import { createAdmin } from './helpers/factories.js';
import { accessTokenFor } from './helpers/auth.js';
import { AppConfig } from '../src/models/appConfig.model.js';

beforeAll(connect);
afterEach(clear);
afterAll(close);

describe('/api/admin/config', () => {
  test('GET returns config, creating defaults if none exist', async () => {
    const sa = await createAdmin({ role: 'superadmin' });
    const token = accessTokenFor(sa, 'superadmin');
    const res = await request(app).get('/api/admin/config').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.trialDays).toBe(14);
    expect(res.body.monthlyPriceINR).toBe(99);
    expect(await AppConfig.countDocuments({})).toBe(1);
  });

  test('PATCH updates allowed numeric fields', async () => {
    const sa = await createAdmin({ role: 'superadmin' });
    const token = accessTokenFor(sa, 'superadmin');
    const res = await request(app)
      .patch('/api/admin/config')
      .set('Authorization', `Bearer ${token}`)
      .send({ monthlyPriceINR: 149, trialDays: 21, dailyWageINR: 400 });
    expect(res.status).toBe(200);
    expect(res.body.monthlyPriceINR).toBe(149);
    expect(res.body.trialDays).toBe(21);
    expect(res.body.dailyWageINR).toBe(400);
    // Only one config doc ever exists.
    expect(await AppConfig.countDocuments({})).toBe(1);
  });

  test('PATCH with an invalid value -> 400 VALIDATION_ERROR', async () => {
    const sa = await createAdmin({ role: 'superadmin' });
    const token = accessTokenFor(sa, 'superadmin');
    const res = await request(app)
      .patch('/api/admin/config')
      .set('Authorization', `Bearer ${token}`)
      .send({ monthlyPriceINR: -5 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('admin (not superadmin) is forbidden -> 403 FORBIDDEN', async () => {
    const admin = await createAdmin({ role: 'admin' });
    const token = accessTokenFor(admin, 'admin');
    const get = await request(app).get('/api/admin/config').set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(403);
    expect(get.body.error.code).toBe('FORBIDDEN');
    const patch = await request(app).patch('/api/admin/config').set('Authorization', `Bearer ${token}`).send({ trialDays: 30 });
    expect(patch.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL.**

```
npm test -- tests/admin.config.test.js
```

Expected: FAIL — config routes not defined.

- [ ] **Step 3: Add config service functions.** Append to `src/services/admin.service.js`:

```js
import { AppConfig } from '../models/appConfig.model.js';

// The single config doc. Create it with schema defaults on first read.
export async function getConfig() {
  let cfg = await AppConfig.findOne({});
  if (!cfg) cfg = await AppConfig.create({});
  return cfg.toObject();
}

export async function updateConfig(patch) {
  let cfg = await AppConfig.findOne({});
  if (!cfg) cfg = await AppConfig.create({});
  Object.assign(cfg, patch); // patch already whitelisted + range-checked by zod
  await cfg.save();
  return cfg.toObject();
}
```

- [ ] **Step 4: Add schema + handlers.** Append to `src/controllers/admin.controller.js`:

```js
const configPatchSchema = z
  .object({
    trialDays: z.number().int().positive(),
    monthlyPriceINR: z.number().int().nonnegative(),
    yearlyPriceINR: z.number().int().nonnegative(),
    graceDays: z.number().int().nonnegative(),
    dailyWageINR: z.number().int().nonnegative(),
    ownLandRentalPerAcreINR: z.number().int().nonnegative(),
    ownedCapitalInterestRatePct: z.number().nonnegative(),
    landUnitConversions: z.record(z.any()),
    defaultCategories: z.record(z.any()),
  })
  .partial()
  .strict();

export async function getConfig(req, res) {
  const cfg = await adminService.getConfig();
  res.json(cfg);
}

export async function patchConfig(req, res) {
  const parsed = configPatchSchema.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid config payload');
  }
  const cfg = await adminService.updateConfig(parsed.data);
  res.json(cfg);
}
```

- [ ] **Step 5: Register the routes with a superadmin-only gate.** In `src/routes/admin.routes.js` add (the router already requires `admin|superadmin`; layer `requireRole('superadmin')` on just these two):

```js
router.get('/config', requireRole('superadmin'), ctrl.getConfig);
router.patch('/config', requireRole('superadmin'), ctrl.patchConfig);
```

- [ ] **Step 6: Run it — expect PASS.**

```
npm test -- tests/admin.config.test.js
```

Expected: PASS (admin → 403, superadmin → 200, invalid value → 400).

- [ ] **Step 7: Commit.**

```
git add src/services/admin.service.js src/controllers/admin.controller.js src/routes/admin.routes.js tests/admin.config.test.js
git commit -m "feat(admin): superadmin GET/PATCH app config"
```

---

### Task ADM-6: Announcement model + FCM service + POST/GET /admin/announcements

**Files:** `tests/admin.announcements.test.js`, `src/models/announcement.model.js`, `src/services/fcm.service.js`, `src/services/admin.service.js`, `src/controllers/admin.controller.js`, `src/routes/admin.routes.js`

- [ ] **Step 1: Write the failing test.** The FCM sender is mocked so tests never touch the network; the test asserts the announcement persists, `pushSent` is set from the send result, and `createdByAdminId` is the caller. Create `tests/admin.announcements.test.js`:

```js
import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connect, clear, close } from './helpers/db.js';
import { createAdmin, createFarmer } from './helpers/factories.js';
import { accessTokenFor } from './helpers/auth.js';
import { Announcement } from '../src/models/announcement.model.js';
import * as fcm from '../src/services/fcm.service.js';

beforeAll(connect);
afterEach(() => {
  jest.restoreAllMocks();
  return clear();
});
afterAll(close);

async function adminToken() {
  const admin = await createAdmin({ role: 'admin' });
  return { admin, token: accessTokenFor(admin, 'admin') };
}

describe('POST /api/admin/announcements', () => {
  test('persists announcement, sends FCM, sets pushSent=true', async () => {
    const { admin, token } = await adminToken();
    const spy = jest.spyOn(fcm, 'sendToAudience').mockResolvedValue({ sent: true, successCount: 3 });

    const res = await request(app)
      .post('/api/admin/announcements')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Renew now', body: 'Your trial ends soon', audience: 'all' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Renew now');
    expect(res.body.pushSent).toBe(true);
    expect(String(res.body.createdByAdminId)).toBe(String(admin._id));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Renew now', audience: 'all' }));

    const stored = await Announcement.findById(res.body._id);
    expect(stored).not.toBeNull();
    expect(stored.pushSent).toBe(true);
  });

  test('when FCM send fails, announcement is still saved with pushSent=false', async () => {
    const { token } = await adminToken();
    jest.spyOn(fcm, 'sendToAudience').mockResolvedValue({ sent: false, successCount: 0 });

    const res = await request(app)
      .post('/api/admin/announcements')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Notice', body: 'Body text', audience: 'all' });

    expect(res.status).toBe(201);
    expect(res.body.pushSent).toBe(false);
    const stored = await Announcement.findById(res.body._id);
    expect(stored.pushSent).toBe(false);
  });

  test('missing title -> 400 VALIDATION_ERROR and nothing persisted', async () => {
    const { token } = await adminToken();
    const spy = jest.spyOn(fcm, 'sendToAudience').mockResolvedValue({ sent: true, successCount: 0 });
    const res = await request(app)
      .post('/api/admin/announcements')
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'No title', audience: 'all' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(spy).not.toHaveBeenCalled();
    expect(await Announcement.countDocuments({})).toBe(0);
  });
});

describe('GET /api/admin/announcements', () => {
  test('lists announcements newest first', async () => {
    const { admin, token } = await adminToken();
    await Announcement.create({ title: 'Old', body: 'b', audience: 'all', createdByAdminId: admin._id, pushSent: true, createdAt: new Date('2026-01-01') });
    await Announcement.create({ title: 'New', body: 'b', audience: 'all', createdByAdminId: admin._id, pushSent: true, createdAt: new Date('2026-06-01') });

    const res = await request(app).get('/api/admin/announcements').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((a) => a.title)).toEqual(['New', 'Old']);
  });
});
```

Note: mocking a named ESM export with `jest.spyOn(fcm, 'sendToAudience')` requires the controller to call it via the namespace (`fcm.sendToAudience(...)`), not a destructured import. The implementation below does exactly that.

- [ ] **Step 2: Run it — expect FAIL.**

```
npm test -- tests/admin.announcements.test.js
```

Expected: FAIL — `Cannot find module '../src/models/announcement.model.js'`.

- [ ] **Step 3: Create the Announcement model.** Create `src/models/announcement.model.js`:

```js
import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  audience: { type: String, enum: ['all', 'segment'], required: true },
  createdByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  createdAt: { type: Date, default: Date.now },
  pushSent: { type: Boolean, default: false },
});

export const Announcement =
  mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema, 'announcements');
```

- [ ] **Step 4: Create the FCM service.** Create `src/services/fcm.service.js`. It initialises firebase-admin lazily and no-ops safely when credentials are absent (so tests and local dev never crash); real sends happen only when configured:

```js
import admin from 'firebase-admin';
import { env } from '../config/env.js';

let app = null;

// Initialise firebase-admin once, from a service-account JSON in env.
// Returns null when not configured (tests / local without FCM creds).
function getApp() {
  if (app) return app;
  if (!env.FIREBASE_SERVICE_ACCOUNT) return null;
  const credentials = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  app = admin.apps.length
    ? admin.app()
    : admin.initializeApp({ credential: admin.credential.cert(credentials) });
  return app;
}

/**
 * Send an announcement to an audience over FCM.
 * v1 pushes to a topic ("all"); segment targeting is a v2 concern.
 * Always resolves with { sent, successCount } — never throws — so a push
 * failure cannot lose the persisted announcement.
 */
export async function sendToAudience({ title, body, audience }) {
  const fbApp = getApp();
  if (!fbApp) return { sent: false, successCount: 0 };
  try {
    const topic = audience === 'all' ? 'all' : 'segment';
    const messaging = admin.messaging(fbApp);
    const messageId = await messaging.send({ topic, notification: { title, body } });
    return { sent: Boolean(messageId), successCount: messageId ? 1 : 0 };
  } catch {
    return { sent: false, successCount: 0 };
  }
}
```

Ensure `src/config/env.js` reads an optional `FIREBASE_SERVICE_ACCOUNT` (a JSON string). If that key is not yet in the env schema, add it as optional in the same commit.

- [ ] **Step 5: Add announcement service functions.** Append to `src/services/admin.service.js`:

```js
import { Announcement } from '../models/announcement.model.js';
import * as fcm from './fcm.service.js';

export async function createAnnouncement({ title, body, audience }, adminId) {
  // Send first, record the real outcome in pushSent; the send never throws.
  const result = await fcm.sendToAudience({ title, body, audience });
  const announcement = await Announcement.create({
    title,
    body,
    audience,
    createdByAdminId: adminId,
    pushSent: Boolean(result.sent),
  });
  return announcement.toObject();
}

export async function listAnnouncements() {
  const data = await Announcement.find({}).sort({ createdAt: -1 }).lean();
  return { data };
}
```

- [ ] **Step 6: Add controller handlers.** Append to `src/controllers/admin.controller.js`:

```js
const announcementSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: z.enum(['all', 'segment']),
});

export async function createAnnouncement(req, res) {
  const parsed = announcementSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid announcement payload');
  const created = await adminService.createAnnouncement(parsed.data, req.user.id);
  res.status(201).json(created);
}

export async function listAnnouncements(req, res) {
  const result = await adminService.listAnnouncements();
  res.json(result);
}
```

- [ ] **Step 7: Register the routes.** In `src/routes/admin.routes.js` add:

```js
router.post('/announcements', ctrl.createAnnouncement);
router.get('/announcements', ctrl.listAnnouncements);
```

- [ ] **Step 8: Run it — expect PASS.**

```
npm test -- tests/admin.announcements.test.js
```

Expected: PASS (persist + pushSent from send result, failure path saves with `pushSent:false`, validation 400 sends nothing, list newest-first).

- [ ] **Step 9: Commit.**

```
git add src/models/announcement.model.js src/services/fcm.service.js src/services/admin.service.js src/controllers/admin.controller.js src/routes/admin.routes.js src/config/env.js tests/admin.announcements.test.js
git commit -m "feat(admin): announcements model, FCM service, create+list endpoints"
```

---

### Task ADM-7: GET /admin/dashboard — farmers by status, active subs, revenue totals

**Files:** `tests/admin.dashboard.test.js`, `src/services/admin.service.js`, `src/controllers/admin.controller.js`, `src/routes/admin.routes.js`

- [ ] **Step 1: Write the failing test.** Create `tests/admin.dashboard.test.js`:

```js
import request from 'supertest';
import app from '../src/app.js';
import { connect, clear, close } from './helpers/db.js';
import { createAdmin, createFarmer } from './helpers/factories.js';
import { accessTokenFor } from './helpers/auth.js';
import { Subscription } from '../src/models/subscription.model.js';
import { Payment } from '../src/models/payment.model.js';

beforeAll(connect);
afterEach(clear);
afterAll(close);

async function adminToken(admin) {
  const a = admin || (await createAdmin({ role: 'admin' }));
  return accessTokenFor(a, 'admin');
}

describe('GET /api/admin/dashboard', () => {
  test('returns farmer counts by status, active subs, and revenue totals', async () => {
    const admin = await createAdmin({ role: 'admin' });
    const token = await adminToken(admin);

    const { farmer: fActive } = await createFarmer({ farmer: { phone: '9700000001', status: 'active' } });
    await createFarmer({ farmer: { phone: '9700000002', status: 'active' } });
    await createFarmer({ farmer: { phone: '9700000003', status: 'suspended' } });
    await createFarmer({ farmer: { phone: '9700000004', status: 'deactivated' } });

    // createFarmer already made subscriptions; force two into a known state.
    await Subscription.updateOne({ farmerId: fActive._id }, { $set: { status: 'active' } });

    await Payment.create({ farmerId: fActive._id, amount: 99, currency: 'INR', method: 'upi', receivedAt: new Date(), recordedByAdminId: admin._id, periodStart: new Date(), periodEnd: new Date() });
    await Payment.create({ farmerId: fActive._id, amount: 799, currency: 'INR', method: 'cash', receivedAt: new Date(), recordedByAdminId: admin._id, periodStart: new Date(), periodEnd: new Date() });

    const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.farmers.total).toBe(4);
    expect(res.body.farmers.byStatus.active).toBe(2);
    expect(res.body.farmers.byStatus.suspended).toBe(1);
    expect(res.body.farmers.byStatus.deactivated).toBe(1);
    expect(res.body.subscriptions.active).toBeGreaterThanOrEqual(1);
    expect(res.body.revenue.total).toBe(898);
    expect(res.body.revenue.paymentCount).toBe(2);
  });

  test('empty system returns zeroed metrics (no crash)', async () => {
    const token = await adminToken();
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.farmers.total).toBe(0);
    expect(res.body.farmers.byStatus.active).toBe(0);
    expect(res.body.revenue.total).toBe(0);
    expect(res.body.revenue.paymentCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL.**

```
npm test -- tests/admin.dashboard.test.js
```

Expected: FAIL — `/admin/dashboard` route not defined.

- [ ] **Step 3: Add the dashboard service function.** Append to `src/services/admin.service.js`:

```js
import { Payment } from '../models/payment.model.js';

// Aggregate the admin dashboard: farmer counts by status, active subs, revenue.
export async function getDashboard() {
  const [byStatusAgg, total, activeSubs, revenueAgg] = await Promise.all([
    Farmer.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Farmer.countDocuments({}),
    Subscription.countDocuments({ status: 'active' }),
    Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
  ]);

  const byStatus = { active: 0, suspended: 0, deactivated: 0 };
  for (const row of byStatusAgg) {
    if (row._id) byStatus[row._id] = row.count;
  }

  const revenue = revenueAgg[0] || { total: 0, count: 0 };

  return {
    farmers: { total, byStatus },
    subscriptions: { active: activeSubs },
    revenue: { total: revenue.total || 0, paymentCount: revenue.count || 0 },
  };
}
```

- [ ] **Step 4: Add the controller handler.** Append to `src/controllers/admin.controller.js`:

```js
export async function getDashboard(req, res) {
  const metrics = await adminService.getDashboard();
  res.json(metrics);
}
```

- [ ] **Step 5: Register the route.** In `src/routes/admin.routes.js` add:

```js
router.get('/dashboard', ctrl.getDashboard);
```

- [ ] **Step 6: Run it — expect PASS.**

```
npm test -- tests/admin.dashboard.test.js
```

Expected: PASS (counts by status, active subs, revenue total 898 over 2 payments; empty system all zeros).

- [ ] **Step 7: Run the whole admin suite together to confirm no cross-test leakage.**

```
npm test -- tests/admin.rbac.test.js tests/admin.farmers.test.js tests/admin.masterData.test.js tests/admin.config.test.js tests/admin.announcements.test.js tests/admin.dashboard.test.js
```

Expected: PASS — all six admin test files green.

- [ ] **Step 8: Commit.**

```
git add src/services/admin.service.js src/controllers/admin.controller.js src/routes/admin.routes.js tests/admin.dashboard.test.js
git commit -m "feat(admin): dashboard metrics (farmers by status, active subs, revenue)"
```

---

**Cross-module notes for the integrating engineer (not tasks):**

- `POST /admin/farmers/:id/approve`, `POST /admin/subscriptions/:farmerId/activate`, `PATCH /admin/subscriptions/:farmerId`, and `POST/GET /admin/payments` are owned by the **SUB** module. Those routes should be added to this same `src/routes/admin.routes.js` (they share the `authenticate` + `requireRole('admin','superadmin')` gate already at the top of the file). The RBAC test in ADM-1 lists only endpoints this module owns; SUB should extend that test with its own routes.
- `src/services/admin.service.js` grows across ADM-2, ADM-3, ADM-4, ADM-5, ADM-6, ADM-7. Keep the imports at the top consolidated (Mongoose 8 / Node ESM hoists `import` regardless, but grouping them keeps the file readable).
- Every controller handler here can throw (`AppError` or an unexpected error). Confirm the route layer or an `asyncHandler` wrapper forwards rejected promises to the central error middleware from `src/middleware/error.js`; otherwise wrap each handler. Follow the exact pattern the AUTH module established so all modules are consistent.

Module file (scratch copy, ignore — the authoritative output is this message): none written to the project. All source/test paths above are the real files to create under `D:/smart-farming/`.

---

## Module DEP — Deployment, backups & CI

This module wires up continuous integration, production deployment on Render, MongoDB Atlas, automated backups, and a first-deploy runbook. It writes **no application code** beyond the tiny `/api/health` route needed for Render's health check (and its test). Everything else is CI config, deployment config, backup automation, docs, and completeness checks for `.env.example`.

**Prerequisite:** This module assumes the earlier modules exist: `src/app.js` (exports the Express app, no `listen`), `src/server.js` (calls `listen`), `src/config/env.js` (reads + validates `process.env`), `src/config/db.js` (mongoose connect), `src/utils/AppError.js`, the central error middleware, and `tests/helpers/db.js`. The health route is mounted in `src/app.js` under `/api`.

**Files:**
- `src/routes/health.routes.js` (create) — the `/api/health` route.
- `src/controllers/health.controller.js` (create) — health check handler.
- `tests/health.test.js` (create) — test for `/api/health`.
- `src/app.js` (modify) — mount the health route.
- `.github/workflows/ci.yml` (create) — CI pipeline running the full test suite incl. the IDOR test.
- `.github/workflows/backup.yml` (create) — scheduled daily `mongodump` backup.
- `.env.example` (create/modify) — complete list of required env vars.
- `render.yaml` (create) — Render deployment blueprint (build/start/health-check/env).
- `scripts/backup.sh` (create) — mongodump + upload to object storage.
- `scripts/seed.js` (create) — idempotent seed of `AppConfig` + default catalogs.
- `tests/env.test.js` (create) — asserts `.env.example` lists every var `env.js` requires.
- `README.md` (modify) — first-deploy + seeding runbook.
- `docs/09-deployment-runbook.md` (create) — detailed runbook and restore-test note.

---

### Task DEP-1: Health check endpoint `/api/health`

Render needs a cheap, unauthenticated endpoint to poll. It returns `200` with uptime and a DB-connection flag. This is the only app code in the module.

**Files:** `tests/health.test.js` (create), `src/routes/health.routes.js` (create), `src/controllers/health.controller.js` (create), `src/app.js` (modify).

- [ ] **Step 1: Write the failing test.** Create `tests/health.test.js` with COMPLETE code:

```js
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connect, clear, close } from './helpers/db.js';

beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clear();
});

afterAll(async () => {
  await close();
});

describe('GET /api/health', () => {
  it('returns 200 with status ok and uptime', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('reports the mongoose connection state', async () => {
    const res = await request(app).get('/api/health');
    // mongoose readyState 1 === connected (memory server is up in tests)
    expect(res.body.db).toBe(mongoose.connection.readyState === 1);
  });

  it('does not require authentication', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.** Command:

```
npm test -- tests/health.test.js
```

Expected: FAIL. The route does not exist yet, so `GET /api/health` returns `404` and the first assertion `expect(res.status).toBe(200)` fails.

- [ ] **Step 3: Write the controller.** Create `src/controllers/health.controller.js` with COMPLETE code:

```js
import mongoose from 'mongoose';

// Cheap, unauthenticated liveness/readiness probe for Render.
// Never throws; always returns 200 so the platform treats the
// instance as live. `db` reflects mongoose connection state.
export function getHealth(req, res) {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString(),
  });
}
```

- [ ] **Step 4: Write the route.** Create `src/routes/health.routes.js` with COMPLETE code:

```js
import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();

// Public: no authenticate, no requireRole.
router.get('/health', getHealth);

export default router;
```

- [ ] **Step 5: Mount the route in `src/app.js`.** Add the import near the other route imports and mount it under `/api` **before** the central error middleware. The relevant edits to `src/app.js`:

```js
// ... with the other route imports at the top:
import healthRoutes from './routes/health.routes.js';

// ... with the other `app.use('/api', ...)` mounts, BEFORE the error middleware:
app.use('/api', healthRoutes);
```

After the edit, the health mount and error handler order in `src/app.js` looks like:

```js
// routes
app.use('/api', healthRoutes);
// ... other feature routers mounted here ...

// central error handler LAST
app.use(errorHandler);
```

- [ ] **Step 6: Run the test — expect PASS.** Command:

```
npm test -- tests/health.test.js
```

Expected: PASS. All three assertions pass — `200`, `status: 'ok'`, numeric `uptime`, `db` boolean matching `readyState`, and no auth required.

- [ ] **Step 7: Commit.**

```
git add src/routes/health.routes.js src/controllers/health.controller.js tests/health.test.js src/app.js
git commit -m "feat(health): add unauthenticated GET /api/health probe for Render"
```

---

### Task DEP-2: `.env.example` completeness + guard test

`env.js` validates `process.env` at boot. If a new required var is added but not documented in `.env.example`, a fresh deploy fails cryptically. This task adds a test that reads both files and asserts every var referenced in `env.js` appears in `.env.example`.

**Files:** `.env.example` (create/modify), `tests/env.test.js` (create).

- [ ] **Step 1: Write the failing test.** Create `tests/env.test.js` with COMPLETE code. It parses `src/config/env.js` for every `process.env.X` reference and asserts each key is present in `.env.example`:

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function readEnvJsKeys() {
  const src = readFileSync(join(root, 'src/config/env.js'), 'utf8');
  const keys = new Set();
  // match process.env.FOO and process.env['FOO']
  const re = /process\.env(?:\.([A-Z0-9_]+)|\[['"]([A-Z0-9_]+)['"]\])/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    keys.add(m[1] || m[2]);
  }
  return [...keys];
}

function readExampleKeys() {
  const src = readFileSync(join(root, '.env.example'), 'utf8');
  const keys = new Set();
  for (const rawLine of src.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    keys.add(line.slice(0, eq).trim());
  }
  return [...keys];
}

describe('.env.example completeness', () => {
  it('documents every process.env var referenced in src/config/env.js', () => {
    const needed = readEnvJsKeys();
    const documented = new Set(readExampleKeys());
    const missing = needed.filter((k) => !documented.has(k));
    expect(missing).toEqual([]);
  });

  it('has no blank values for keys (every key shows an example or placeholder)', () => {
    const src = readFileSync(join(root, '.env.example'), 'utf8');
    const offenders = [];
    for (const rawLine of src.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (val === '') offenders.push(key);
    }
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test — expect FAIL.** Command:

```
npm test -- tests/env.test.js
```

Expected: FAIL. `.env.example` does not exist yet (or is incomplete), so `readFileSync` throws `ENOENT` or the `missing` array is non-empty.

- [ ] **Step 3: Create `.env.example`.** Create `.env.example` at the repo root with COMPLETE contents. Every key `env.js` reads must appear with a non-blank placeholder. This is the canonical list of required env vars for the whole backend:

```dotenv
# ── Core ───────────────────────────────────────────────
NODE_ENV=development
PORT=3000

# ── Database (MongoDB Atlas in prod, local/memory in dev/test) ──
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/smartfarming?retryWrites=true&w=majority

# ── Auth / JWT ─────────────────────────────────────────
JWT_ACCESS_SECRET=replace-with-a-long-random-string
JWT_REFRESH_SECRET=replace-with-another-long-random-string
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

# ── Cloudinary (signed receipt uploads) ────────────────
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# ── Firebase Admin (FCM push for announcements) ────────
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nREPLACE\n-----END PRIVATE KEY-----\n"
```

> Note: The keys above MUST exactly match the `process.env.*` names read in `src/config/env.js`. If `env.js` reads additional vars, add them here with a placeholder value before this test will pass. If it reads fewer, the extra documented keys are harmless (the test only checks that referenced keys are documented).

- [ ] **Step 4: Run the test — expect PASS.** Command:

```
npm test -- tests/env.test.js
```

Expected: PASS. Every `process.env.X` referenced in `env.js` is present in `.env.example`, and no documented key has a blank value.

- [ ] **Step 5: Commit.**

```
git add .env.example tests/env.test.js
git commit -m "test(env): add .env.example completeness guard against env.js"
```

---

### Task DEP-3: GitHub Actions CI — full test suite incl. IDOR gate

CI must run the **entire** Jest suite (which includes `tests/security.idor.test.js`) on every push and pull request. A green run is the gate before any deploy. `mongodb-memory-server` needs no external services, so CI is self-contained.

**Files:** `.github/workflows/ci.yml` (create).

- [ ] **Step 1: Create the CI workflow.** Create `.github/workflows/ci.yml` with COMPLETE code:

```yaml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: ['**']

jobs:
  test:
    name: Test suite (incl. IDOR gate)
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run full test suite
        env:
          NODE_ENV: test
          # Dummy secrets so env.js validation passes in CI.
          # Real DB is mongodb-memory-server, started in tests/helpers/db.js.
          JWT_ACCESS_SECRET: ci-access-secret-ci-access-secret
          JWT_REFRESH_SECRET: ci-refresh-secret-ci-refresh-secret
          JWT_ACCESS_TTL: 15m
          JWT_REFRESH_TTL: 30d
          CLOUDINARY_CLOUD_NAME: ci
          CLOUDINARY_API_KEY: ci
          CLOUDINARY_API_SECRET: ci
          FIREBASE_PROJECT_ID: ci
          FIREBASE_CLIENT_EMAIL: ci@ci.iam.gserviceaccount.com
          FIREBASE_PRIVATE_KEY: ci
        run: npm test -- --ci --runInBand

      - name: Confirm IDOR security test ran
        env:
          NODE_ENV: test
          JWT_ACCESS_SECRET: ci-access-secret-ci-access-secret
          JWT_REFRESH_SECRET: ci-refresh-secret-ci-refresh-secret
          JWT_ACCESS_TTL: 15m
          JWT_REFRESH_TTL: 30d
          CLOUDINARY_CLOUD_NAME: ci
          CLOUDINARY_API_KEY: ci
          CLOUDINARY_API_SECRET: ci
          FIREBASE_PROJECT_ID: ci
          FIREBASE_CLIENT_EMAIL: ci@ci.iam.gserviceaccount.com
          FIREBASE_PRIVATE_KEY: ci
        run: npm test -- tests/security.idor.test.js --ci --runInBand
```

> The main `Run full test suite` step already executes `tests/security.idor.test.js` because Jest discovers all `tests/*.test.js`. The second step is an explicit, named gate so a green checkmark visibly proves the IDOR test ran and passed — reviewers and branch-protection rules can require the `Test suite (incl. IDOR gate)` job.

- [ ] **Step 2: Validate the workflow YAML locally.** Command (parses the YAML to catch indentation/syntax errors before pushing):

```
node -e "const fs=require('fs');const s=fs.readFileSync('.github/workflows/ci.yml','utf8');if(!/npm test/.test(s)||!/security\.idor\.test\.js/.test(s))throw new Error('CI workflow missing test or IDOR gate');console.log('ci.yml OK: runs full suite + IDOR gate');"
```

Expected: prints `ci.yml OK: runs full suite + IDOR gate`. If YAML is malformed or the IDOR gate is missing, it throws and exits non-zero.

- [ ] **Step 3: Commit.**

```
git add .github/workflows/ci.yml
git commit -m "ci: run full jest suite incl. IDOR security gate on push and PR"
```

- [ ] **Step 4: Enable branch protection (manual, documented — not code).** In GitHub → Settings → Branches → add a rule for `main`: require the status check **`Test suite (incl. IDOR gate)`** to pass before merging, and require branches to be up to date. This makes a green CI run mandatory before any deploy. Record this in the runbook (Task DEP-7).

---

### Task DEP-4: Render deployment blueprint (`render.yaml`)

Render deploys the API as a Node web service. The blueprint pins the build/start commands, the health-check path `/api/health`, and declares every env var (secrets set in the dashboard, non-secrets inline). It documents the free-tier cold-start caveat.

**Files:** `render.yaml` (create).

- [ ] **Step 1: Confirm the start script exists in `package.json`.** Command (checks `start` runs the server, not the app module):

```
node -e "const p=require('./package.json');if(!p.scripts||!p.scripts.start)throw new Error('package.json needs a \"start\" script running node src/server.js');console.log('start script:',p.scripts.start);"
```

Expected: prints the `start` script. It should be `node src/server.js` (from the SERVER module). If missing, add `"start": "node src/server.js"` to `package.json` `scripts` before continuing.

- [ ] **Step 2: Create the Render blueprint.** Create `render.yaml` at the repo root with COMPLETE code:

```yaml
# Render Blueprint — Smart Farming backend API
# Docs: https://render.com/docs/blueprint-spec
services:
  - type: web
    name: smart-farming-api
    runtime: node
    plan: free # Free tier: instance sleeps after ~15m idle; first request cold-starts (~30-60s).
    region: singapore # Closest region to India; change if needed.
    branch: main
    numInstances: 1

    # Install with a clean, reproducible lockfile install.
    buildCommand: npm ci

    # Start the HTTP server (src/server.js calls app.listen). NOT src/app.js.
    startCommand: node src/server.js

    # Render polls this path; must return 2xx. Defined in Task DEP-1.
    healthCheckPath: /api/health

    autoDeploy: true # Deploy on push to `branch` AFTER CI is green (branch protection enforces this).

    envVars:
      - key: NODE_ENV
        value: production
      # Render injects PORT; server.js must read process.env.PORT.
      - key: PORT
        value: 3000

      # Secrets — set these in the Render dashboard (sync:false = not stored in repo).
      - key: MONGODB_URI
        sync: false
      - key: JWT_ACCESS_SECRET
        sync: false
      - key: JWT_REFRESH_SECRET
        sync: false
      - key: CLOUDINARY_CLOUD_NAME
        sync: false
      - key: CLOUDINARY_API_KEY
        sync: false
      - key: CLOUDINARY_API_SECRET
        sync: false
      - key: FIREBASE_PROJECT_ID
        sync: false
      - key: FIREBASE_CLIENT_EMAIL
        sync: false
      - key: FIREBASE_PRIVATE_KEY
        sync: false

      # Non-secret tunables — safe to keep in the blueprint.
      - key: JWT_ACCESS_TTL
        value: 15m
      - key: JWT_REFRESH_TTL
        value: 30d
```

> **Free-tier cold start:** on Render's free plan the instance sleeps after ~15 minutes of inactivity; the next request wakes it and takes ~30–60s. The `/api/health` probe keeps Render's own checks happy but does not prevent sleeping. For a snappy demo, either upgrade to a paid instance or add an external uptime pinger (e.g. a cron that GETs `/api/health` every 10 min). This is a demo/v1 caveat — document it, don't fight it.

- [ ] **Step 3: Validate the blueprint locally.** Command (asserts the health path, start command, and Atlas secret are present and correct):

```
node -e "const fs=require('fs');const s=fs.readFileSync('render.yaml','utf8');['healthCheckPath: /api/health','startCommand: node src/server.js','key: MONGODB_URI'].forEach(t=>{if(!s.includes(t))throw new Error('render.yaml missing: '+t)});if(!/sync:\s*false/.test(s))throw new Error('render.yaml must mark secrets sync:false');console.log('render.yaml OK');"
```

Expected: prints `render.yaml OK`. Throws if the health path, start command, or the `MONGODB_URI` secret declaration is missing.

- [ ] **Step 4: Commit.**

```
git add render.yaml
git commit -m "chore(deploy): add Render blueprint with /api/health check and Atlas env"
```

---

### Task DEP-5: Idempotent seed script (`scripts/seed.js`)

A fresh Atlas database has no `AppConfig` and no catalogs, so the app can't compute costs or show categories. This script seeds the single `AppConfig` doc and the default `CropCatalog`, `ExpenseCategory`, and `IncomeCategory` rows. It is **idempotent** (safe to re-run) via upserts, and it reuses the exact model field names from the contract.

**Files:** `scripts/seed.js` (create).

- [ ] **Step 1: Create the seed script.** Create `scripts/seed.js` with COMPLETE code. It connects with `connectDB`, upserts `AppConfig` (only if absent, keeping admin-edited values), and upserts catalogs by `name`:

```js
// Idempotent seed: AppConfig singleton + default catalogs.
// Run: node scripts/seed.js   (reads MONGODB_URI from env)
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import AppConfig from '../src/models/appConfig.model.js';
import CropCatalog from '../src/models/cropCatalog.model.js';
import ExpenseCategory from '../src/models/expenseCategory.model.js';
import IncomeCategory from '../src/models/incomeCategory.model.js';

const CROPS = [
  { name: 'Wheat', defaultSeason: 'rabi', icon: 'wheat' },
  { name: 'Rice', defaultSeason: 'kharif', icon: 'rice' },
  { name: 'Cotton', defaultSeason: 'kharif', icon: 'cotton' },
  { name: 'Sugarcane', defaultSeason: 'perennial', icon: 'sugarcane' },
  { name: 'Soybean', defaultSeason: 'kharif', icon: 'soybean' },
  { name: 'Gram', defaultSeason: 'rabi', icon: 'gram' },
];

// cacpTag: A1/A2/FL/C2. isPaidOut = actual cash out; isImputed = notional.
const EXPENSE_CATEGORIES = [
  { name: 'Seeds', icon: 'seed', isPaidOut: true, isImputed: false, cacpTag: 'A1' },
  { name: 'Fertilizer', icon: 'fertilizer', isPaidOut: true, isImputed: false, cacpTag: 'A1' },
  { name: 'Pesticide', icon: 'pesticide', isPaidOut: true, isImputed: false, cacpTag: 'A1' },
  { name: 'Hired Labour', icon: 'labour', isPaidOut: true, isImputed: false, cacpTag: 'A1' },
  { name: 'Machinery / Fuel', icon: 'tractor', isPaidOut: true, isImputed: false, cacpTag: 'A1' },
  { name: 'Irrigation', icon: 'water', isPaidOut: true, isImputed: false, cacpTag: 'A1' },
  { name: 'Family Labour', icon: 'family', isPaidOut: false, isImputed: true, cacpTag: 'FL' },
  { name: 'Own Land Rental Value', icon: 'land', isPaidOut: false, isImputed: true, cacpTag: 'C2' },
];

const INCOME_CATEGORIES = [
  { name: 'Crop Sale', icon: 'sale', type: 'primary' },
  { name: 'By-product Sale', icon: 'byproduct', type: 'secondary' },
  { name: 'Subsidy', icon: 'subsidy', type: 'other' },
];

async function seed() {
  await connectDB();

  // AppConfig: create once with schema defaults; do NOT overwrite admin edits.
  const existingConfig = await AppConfig.findOne();
  if (!existingConfig) {
    await AppConfig.create({});
    console.log('AppConfig created with defaults.');
  } else {
    console.log('AppConfig already exists — left unchanged.');
  }

  for (const c of CROPS) {
    await CropCatalog.updateOne(
      { name: c.name },
      { $setOnInsert: { ...c, isActive: true } },
      { upsert: true }
    );
  }
  console.log(`Seeded ${CROPS.length} crops (upsert by name).`);

  for (const e of EXPENSE_CATEGORIES) {
    await ExpenseCategory.updateOne(
      { name: e.name },
      { $setOnInsert: { ...e, isActive: true } },
      { upsert: true }
    );
  }
  console.log(`Seeded ${EXPENSE_CATEGORIES.length} expense categories (upsert by name).`);

  for (const i of INCOME_CATEGORIES) {
    await IncomeCategory.updateOne(
      { name: i.name },
      { $setOnInsert: { ...i, isActive: true } },
      { upsert: true }
    );
  }
  console.log(`Seeded ${INCOME_CATEGORIES.length} income categories (upsert by name).`);

  await mongoose.connection.close();
  console.log('Seed complete. Connection closed.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Write the failing test.** Create `tests/seed.test.js` with COMPLETE code. It runs the seed logic against `mongodb-memory-server` and asserts idempotency (running twice yields the same counts and does not duplicate rows):

```js
import mongoose from 'mongoose';
import { connect, clear, close } from './helpers/db.js';
import AppConfig from '../src/models/appConfig.model.js';
import CropCatalog from '../src/models/cropCatalog.model.js';
import ExpenseCategory from '../src/models/expenseCategory.model.js';
import IncomeCategory from '../src/models/incomeCategory.model.js';

// Import the reusable seed routine (see Step 4 — seed.js must export `seedData`).
import { seedData } from '../scripts/seed.js';

beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clear();
});

afterAll(async () => {
  await close();
});

describe('scripts/seed.js seedData()', () => {
  it('creates AppConfig with schema defaults and the default catalogs', async () => {
    await seedData();

    const cfg = await AppConfig.findOne();
    expect(cfg).not.toBeNull();
    expect(cfg.trialDays).toBe(14);
    expect(cfg.monthlyPriceINR).toBe(99);
    expect(cfg.dailyWageINR).toBe(350);

    expect(await CropCatalog.countDocuments()).toBe(6);
    expect(await ExpenseCategory.countDocuments()).toBe(8);
    expect(await IncomeCategory.countDocuments()).toBe(3);

    // Imputed categories carry the correct CACP tags.
    const fl = await ExpenseCategory.findOne({ name: 'Family Labour' });
    expect(fl.isImputed).toBe(true);
    expect(fl.isPaidOut).toBe(false);
    expect(fl.cacpTag).toBe('FL');
  });

  it('is idempotent — running twice does not duplicate rows or clobber AppConfig', async () => {
    await seedData();
    // Simulate an admin editing config after first seed.
    await AppConfig.updateOne({}, { $set: { monthlyPriceINR: 149 } });

    await seedData(); // second run

    expect(await AppConfig.countDocuments()).toBe(1);
    expect(await CropCatalog.countDocuments()).toBe(6);
    expect(await ExpenseCategory.countDocuments()).toBe(8);
    expect(await IncomeCategory.countDocuments()).toBe(3);

    // Admin's edit survives — seed must not overwrite existing AppConfig.
    const cfg = await AppConfig.findOne();
    expect(cfg.monthlyPriceINR).toBe(149);
  });
});
```

- [ ] **Step 3: Run the test — expect FAIL.** Command:

```
npm test -- tests/seed.test.js
```

Expected: FAIL. `scripts/seed.js` currently only exports nothing importable (`seedData` is not exported); the import `{ seedData }` is `undefined`, so `await seedData()` throws `TypeError: seedData is not a function`.

- [ ] **Step 4: Refactor `scripts/seed.js` to export a testable `seedData` and keep the CLI runner.** Replace the file with COMPLETE code that separates the DB-agnostic data logic (`seedData`, no connect/close) from the CLI wrapper (`seed`, which connects + closes). This lets the test drive `seedData` against the in-memory DB while `node scripts/seed.js` still works in production:

```js
// Idempotent seed: AppConfig singleton + default catalogs.
// Library use:  import { seedData } from './scripts/seed.js'  (assumes an open connection)
// CLI use:      node scripts/seed.js                          (connects via MONGODB_URI, then closes)
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import AppConfig from '../src/models/appConfig.model.js';
import CropCatalog from '../src/models/cropCatalog.model.js';
import ExpenseCategory from '../src/models/expenseCategory.model.js';
import IncomeCategory from '../src/models/incomeCategory.model.js';

const CROPS = [
  { name: 'Wheat', defaultSeason: 'rabi', icon: 'wheat' },
  { name: 'Rice', defaultSeason: 'kharif', icon: 'rice' },
  { name: 'Cotton', defaultSeason: 'kharif', icon: 'cotton' },
  { name: 'Sugarcane', defaultSeason: 'perennial', icon: 'sugarcane' },
  { name: 'Soybean', defaultSeason: 'kharif', icon: 'soybean' },
  { name: 'Gram', defaultSeason: 'rabi', icon: 'gram' },
];

const EXPENSE_CATEGORIES = [
  { name: 'Seeds', icon: 'seed', isPaidOut: true, isImputed: false, cacpTag: 'A1' },
  { name: 'Fertilizer', icon: 'fertilizer', isPaidOut: true, isImputed: false, cacpTag: 'A1' },
  { name: 'Pesticide', icon: 'pesticide', isPaidOut: true, isImputed: false, cacpTag: 'A1' },
  { name: 'Hired Labour', icon: 'labour', isPaidOut: true, isImputed: false, cacpTag: 'A1' },
  { name: 'Machinery / Fuel', icon: 'tractor', isPaidOut: true, isImputed: false, cacpTag: 'A1' },
  { name: 'Irrigation', icon: 'water', isPaidOut: true, isImputed: false, cacpTag: 'A1' },
  { name: 'Family Labour', icon: 'family', isPaidOut: false, isImputed: true, cacpTag: 'FL' },
  { name: 'Own Land Rental Value', icon: 'land', isPaidOut: false, isImputed: true, cacpTag: 'C2' },
];

const INCOME_CATEGORIES = [
  { name: 'Crop Sale', icon: 'sale', type: 'primary' },
  { name: 'By-product Sale', icon: 'byproduct', type: 'secondary' },
  { name: 'Subsidy', icon: 'subsidy', type: 'other' },
];

// Pure data seeding — assumes mongoose is already connected. Idempotent.
export async function seedData() {
  const existingConfig = await AppConfig.findOne();
  if (!existingConfig) {
    await AppConfig.create({}); // schema defaults: trialDays 14, monthlyPriceINR 99, etc.
  }

  for (const c of CROPS) {
    await CropCatalog.updateOne(
      { name: c.name },
      { $setOnInsert: { ...c, isActive: true } },
      { upsert: true }
    );
  }
  for (const e of EXPENSE_CATEGORIES) {
    await ExpenseCategory.updateOne(
      { name: e.name },
      { $setOnInsert: { ...e, isActive: true } },
      { upsert: true }
    );
  }
  for (const i of INCOME_CATEGORIES) {
    await IncomeCategory.updateOne(
      { name: i.name },
      { $setOnInsert: { ...i, isActive: true } },
      { upsert: true }
    );
  }

  return {
    crops: CROPS.length,
    expenseCategories: EXPENSE_CATEGORIES.length,
    incomeCategories: INCOME_CATEGORIES.length,
  };
}

// CLI wrapper: connect, seed, close. Only runs when executed directly.
async function runCli() {
  await connectDB();
  const counts = await seedData();
  console.log('Seed complete:', counts);
  await mongoose.connection.close();
}

// ESM "run only if invoked directly" guard.
const invokedDirectly =
  process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (invokedDirectly) {
  runCli().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
```

> The direct-invocation guard uses `file://` + `process.argv[1]`. On Windows paths this can mismatch; if you deploy from Windows, prefer running the seed on the Linux server (Render shell) where the guard is reliable. The library export `seedData` is what the test and any programmatic caller use.

- [ ] **Step 5: Run the test — expect PASS.** Command:

```
npm test -- tests/seed.test.js
```

Expected: PASS. `seedData()` creates the config + 6 crops + 8 expense categories + 3 income categories; the second run keeps counts identical and preserves the admin-edited `monthlyPriceINR: 149`.

- [ ] **Step 6: Add an npm script for seeding.** Add to `package.json` `scripts` (edit, do not clobber existing scripts):

```json
"seed": "node scripts/seed.js"
```

- [ ] **Step 7: Commit.**

```
git add scripts/seed.js tests/seed.test.js package.json
git commit -m "feat(seed): idempotent AppConfig + catalog seed with tested seedData()"
```

---

### Task DEP-6: Scheduled daily backup Action (`mongodump` → object storage)

A daily GitHub Action dumps the Atlas database with `mongodump` and uploads the gzipped archive to S3-compatible object storage. It runs on a cron schedule and can be triggered manually. Credentials come from GitHub repository secrets. Includes a restore-test note.

**Files:** `scripts/backup.sh` (create), `.github/workflows/backup.yml` (create).

- [ ] **Step 1: Create the backup script.** Create `scripts/backup.sh` with COMPLETE code. It dumps to a timestamped gzip archive and uploads via the AWS CLI to an S3-compatible bucket (works with AWS S3, Backblaze B2, Cloudflare R2, etc. via `--endpoint-url`):

```bash
#!/usr/bin/env bash
# Daily MongoDB backup: mongodump -> gzip archive -> S3-compatible object storage.
# Required env:
#   MONGODB_URI            full Atlas connection string
#   BACKUP_BUCKET          bucket name, e.g. smart-farming-backups
#   AWS_ACCESS_KEY_ID      object-storage access key
#   AWS_SECRET_ACCESS_KEY  object-storage secret
# Optional env:
#   AWS_DEFAULT_REGION     default us-east-1
#   S3_ENDPOINT_URL        set for non-AWS providers (R2/B2/MinIO)
set -euo pipefail

: "${MONGODB_URI:?MONGODB_URI is required}"
: "${BACKUP_BUCKET:?BACKUP_BUCKET is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"

STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
ARCHIVE="smartfarming-${STAMP}.archive.gz"

echo "==> Dumping database to ${ARCHIVE}"
mongodump --uri="${MONGODB_URI}" --archive="${ARCHIVE}" --gzip

ENDPOINT_ARG=()
if [[ -n "${S3_ENDPOINT_URL:-}" ]]; then
  ENDPOINT_ARG=(--endpoint-url "${S3_ENDPOINT_URL}")
fi

echo "==> Uploading to s3://${BACKUP_BUCKET}/daily/${ARCHIVE}"
aws s3 cp "${ARCHIVE}" "s3://${BACKUP_BUCKET}/daily/${ARCHIVE}" "${ENDPOINT_ARG[@]}"

echo "==> Cleaning up local archive"
rm -f "${ARCHIVE}"

echo "==> Backup complete: ${ARCHIVE}"
```

- [ ] **Step 2: Create the scheduled workflow.** Create `.github/workflows/backup.yml` with COMPLETE code. It installs the MongoDB Database Tools + AWS CLI, then runs the script on a daily cron and on manual dispatch:

```yaml
name: Daily DB Backup

on:
  schedule:
    # 19:30 UTC == 01:00 IST daily (low-traffic window for India).
    - cron: '30 19 * * *'
  workflow_dispatch: {} # allow manual runs from the Actions tab

jobs:
  backup:
    name: mongodump -> object storage
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install MongoDB Database Tools
        run: |
          set -euo pipefail
          wget -qO- https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
          echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
          sudo apt-get update
          sudo apt-get install -y mongodb-database-tools
          mongodump --version

      - name: Install AWS CLI
        run: |
          set -euo pipefail
          if ! command -v aws >/dev/null 2>&1; then
            sudo apt-get install -y awscli
          fi
          aws --version

      - name: Run backup
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          BACKUP_BUCKET: ${{ secrets.BACKUP_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.BACKUP_AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.BACKUP_AWS_SECRET_ACCESS_KEY }}
          AWS_DEFAULT_REGION: ${{ secrets.BACKUP_AWS_REGION }}
          S3_ENDPOINT_URL: ${{ secrets.BACKUP_S3_ENDPOINT_URL }}
        run: |
          chmod +x scripts/backup.sh
          ./scripts/backup.sh
```

- [ ] **Step 3: Validate both files locally.** Command (checks the script has the required guards and the workflow has the cron + secret wiring):

```
node -e "const fs=require('fs');const sh=fs.readFileSync('scripts/backup.sh','utf8');const wf=fs.readFileSync('.github/workflows/backup.yml','utf8');if(!/mongodump --uri/.test(sh))throw new Error('backup.sh missing mongodump');if(!/aws s3 cp/.test(sh))throw new Error('backup.sh missing upload');if(!/cron: '30 19 \* \* \*'/.test(wf))throw new Error('backup.yml missing daily cron');if(!/secrets\.MONGODB_URI/.test(wf))throw new Error('backup.yml missing MONGODB_URI secret');console.log('backup script + workflow OK');"
```

Expected: prints `backup script + workflow OK`. Throws if the dump command, the upload, the cron, or the secret wiring is missing.

- [ ] **Step 4: Document the required repository secrets (manual — not code).** In GitHub → Settings → Secrets and variables → Actions, add: `MONGODB_URI`, `BACKUP_BUCKET`, `BACKUP_AWS_ACCESS_KEY_ID`, `BACKUP_AWS_SECRET_ACCESS_KEY`, `BACKUP_AWS_REGION`, and (only for non-AWS providers) `BACKUP_S3_ENDPOINT_URL`. Use a **read-only** Atlas DB user for `MONGODB_URI` in the backup context. Record these in the runbook (Task DEP-7).

- [ ] **Step 5: Restore-test note (manual — documented in the runbook).** A backup you have never restored is not a backup. At least once before release and quarterly thereafter, verify a restore into a throwaway database:

```
# Download the latest archive from object storage, then restore into a scratch DB:
aws s3 cp "s3://$BACKUP_BUCKET/daily/<latest-archive>.archive.gz" ./restore-test.archive.gz
mongorestore --uri="$SCRATCH_MONGODB_URI" --archive=./restore-test.archive.gz --gzip --nsFrom='smartfarming.*' --nsTo='smartfarming_restore_test.*'
# Then spot-check counts (farmers, transactions) match the source, and DROP the scratch DB afterwards.
```

This full restore procedure is written up in `docs/09-deployment-runbook.md` in Task DEP-7.

- [ ] **Step 6: Commit.**

```
git add scripts/backup.sh .github/workflows/backup.yml
git commit -m "ci(backup): daily mongodump to object storage with restore-test note"
```

---

### Task DEP-7: First-deploy + seeding runbook (`docs/09-deployment-runbook.md` + `README.md`)

A single, followable runbook so any engineer can take the repo from zero to a live, seeded, backed-up deploy. Covers Atlas setup, Render setup, env vars, seeding, CI gate, backups, restore test, and the cold-start caveat. `README.md` gets a short quick-start pointing to the full doc.

**Files:** `docs/09-deployment-runbook.md` (create), `README.md` (modify).

- [ ] **Step 1: Create the runbook.** Create `docs/09-deployment-runbook.md` with COMPLETE content:

```markdown
# 09 — Deployment Runbook (Smart Farming backend)

This is the zero-to-live runbook for the Node/Express/MongoDB API. Follow top to bottom for a first deploy.

## 0. Prerequisites
- GitHub repo with CI green (see §5).
- Accounts: MongoDB Atlas, Render, an S3-compatible object store (AWS S3 / Cloudflare R2 / Backblaze B2), Cloudinary, Firebase.
- Local: Node 20 LTS, `mongodump`/`mongorestore` (MongoDB Database Tools), AWS CLI.

## 1. MongoDB Atlas
1. Create a free/shared cluster (region close to India, e.g. Mumbai `ap-south-1`).
2. Database user: create an **app** user (readWrite on `smartfarming`) and a separate **read-only** user for backups.
3. Network access: allow Render's outbound IPs, or `0.0.0.0/0` for a demo (tighten later).
4. Copy the connection string → this is `MONGODB_URI` (append `/smartfarming`).

## 2. Third-party services
- **Cloudinary:** copy `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- **Firebase:** create a service account; copy `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and the `FIREBASE_PRIVATE_KEY` (keep the literal `\n` escapes).

## 3. Configure env vars
Use `.env.example` as the canonical list. Locally, copy it to `.env` and fill real values. In Render, set every `sync:false` var in the dashboard (see §4). The `tests/env.test.js` guard fails CI if `env.js` needs a var that `.env.example` does not document.

## 4. Deploy on Render
1. New → Blueprint → point at this repo. Render reads `render.yaml`.
2. It provisions a web service: build `npm ci`, start `node src/server.js`, health check `/api/health`.
3. Fill the `sync:false` secrets in the dashboard: `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, all `CLOUDINARY_*`, all `FIREBASE_*`.
4. Deploy. Watch logs until the health check at `/api/health` goes green.

### Free-tier cold start
The free instance sleeps after ~15 min idle; the next request cold-starts in ~30–60s. For demos, upgrade the instance or ping `/api/health` every ~10 min from an external uptime monitor. Do not rely on the health check to prevent sleeping — it doesn't.

## 5. CI gate (must be green before deploy)
- `.github/workflows/ci.yml` runs the full Jest suite on every push/PR, including `tests/security.idor.test.js` (the IDOR/ownership gate).
- Enable branch protection on `main`: require the **`Test suite (incl. IDOR gate)`** check and up-to-date branches before merge.
- `autoDeploy: true` in `render.yaml` deploys on push to `main` — branch protection ensures that push already passed CI.

## 6. Seed master data
The app needs `AppConfig` + catalogs to function. The seed is idempotent (safe to re-run).

```
# With MONGODB_URI set in the environment (or in .env):
npm run seed
# Expected: "Seed complete: { crops: 6, expenseCategories: 8, incomeCategories: 3 }"
```

On Render, run it once from the service **Shell** tab: `npm run seed`. Re-running never duplicates rows and never overwrites an admin-edited `AppConfig`.

## 7. Backups
- `.github/workflows/backup.yml` runs `scripts/backup.sh` daily at 19:30 UTC (01:00 IST) and on manual dispatch.
- Repo secrets required: `MONGODB_URI` (use the **read-only** Atlas user), `BACKUP_BUCKET`, `BACKUP_AWS_ACCESS_KEY_ID`, `BACKUP_AWS_SECRET_ACCESS_KEY`, `BACKUP_AWS_REGION`, and `BACKUP_S3_ENDPOINT_URL` (only for non-AWS providers).
- Archives land at `s3://<bucket>/daily/smartfarming-<timestamp>.archive.gz`.

### Restore test (do before release, then quarterly)
A backup you have never restored is not a backup. Verify into a throwaway DB:

```
aws s3 cp "s3://$BACKUP_BUCKET/daily/<latest>.archive.gz" ./restore-test.archive.gz
mongorestore --uri="$SCRATCH_MONGODB_URI" --archive=./restore-test.archive.gz --gzip \
  --nsFrom='smartfarming.*' --nsTo='smartfarming_restore_test.*'
```

Then spot-check that key counts match the source:

```
# In mongosh against the scratch DB:
use smartfarming_restore_test
db.farmers.countDocuments()
db.transactions.countDocuments({ isVoid: false })
```

Drop the scratch DB when done. Record the date + result of each restore test below.

| Date | Archive tested | Result | By |
|------|----------------|--------|----|
|      |                |        |    |

## 8. Rollback
- Render keeps previous deploys: **Deploys** tab → pick a prior successful deploy → **Rollback**.
- Data rollback: restore the latest good archive (§7) into a new DB, then repoint `MONGODB_URI`.
```

- [ ] **Step 2: Add a Deployment quick-start to `README.md`.** Append this section to `README.md` (edit — keep existing content above it):

```markdown
## Deployment

Full runbook: [`docs/09-deployment-runbook.md`](docs/09-deployment-runbook.md).

Quick start:
1. Copy `.env.example` → `.env` and fill real values (MongoDB Atlas, JWT, Cloudinary, Firebase).
2. Push to a branch → GitHub Actions CI (`.github/workflows/ci.yml`) runs the full test suite, including the IDOR security gate. It must be green.
3. On Render, create a Blueprint from `render.yaml` (build `npm ci`, start `node src/server.js`, health check `/api/health`) and set the `sync:false` secrets in the dashboard.
4. Seed master data once: `npm run seed` (idempotent — safe to re-run).
5. Backups run daily via `.github/workflows/backup.yml` (`mongodump` → object storage). Do a restore test before release (see the runbook).

**Free-tier note:** the Render free instance sleeps after ~15 min idle; the first request afterward cold-starts in ~30–60s.
```

- [ ] **Step 3: Verify the docs reference the real, load-bearing names.** Command (guards against doc drift — asserts the runbook names the health path, the seed script, the IDOR gate, and the backup workflow):

```
node -e "const fs=require('fs');const d=fs.readFileSync('docs/09-deployment-runbook.md','utf8');const r=fs.readFileSync('README.md','utf8');['/api/health','npm run seed','security.idor.test.js','backup.yml','render.yaml'].forEach(t=>{if(!d.includes(t))throw new Error('runbook missing: '+t)});['/api/health','render.yaml','npm run seed'].forEach(t=>{if(!r.includes(t))throw new Error('README missing: '+t)});console.log('docs reference all load-bearing names');"
```

Expected: prints `docs reference all load-bearing names`. Throws if the runbook or README lost a reference to a real file/path/command.

- [ ] **Step 4: Commit.**

```
git add docs/09-deployment-runbook.md README.md
git commit -m "docs(deploy): first-deploy + seeding runbook with restore-test procedure"
```

---

**Module DEP done.** CI runs the full suite incl. the IDOR gate on every push (the deploy gate); Render deploys via `render.yaml` with the `/api/health` check and Atlas over env; daily `mongodump` backups land in object storage with a documented restore test; `.env.example` is completeness-guarded by a test; the seed is idempotent and tested; and the runbook takes any engineer from zero to a live, seeded, backed-up deploy.