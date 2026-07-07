# Deployment Guide

## Backend API — Render (free web service)

1. Push the repo to GitHub. In Render: **New → Web Service → connect the repo**, root directory `.` (the backend lives at the repo root, Node ESM).
2. Settings:
   - **Build command:** `npm ci`
   - **Start command:** `npm start`
   - **Node version:** 20 (set `NODE_VERSION=20` env var or an `.nvmrc`) — required for native ESM
   - **Health check path:** `/api/health`
3. **Environment variables** (Render dashboard → Environment — never commit real values):
   - `NODE_ENV=production`
   - `MONGODB_URI` — MongoDB Atlas connection string
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — long random strings
   - `ACCESS_TTL=15m`, `REFRESH_TTL=30d`
   - `CORS_ORIGINS` — the deployed web-admin origin (e.g. `https://admin.yourdomain.com`)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` — path to the service-account file (or mount it as a secret file)
4. **Cold start:** the free instance sleeps after ~15 min idle → the first request takes ~30–50s. The app handles this gracefully; upgrade to a paid instance (~$7/mo) to remove it.

### First-run seed (creates master data + the first admin)

Run once against production (locally with the prod `MONGODB_URI`, or a Render one-off job):

```bash
SEED_ADMIN_EMAIL=owner@yourco.com SEED_ADMIN_PASSWORD='a-strong-password' npm run seed
```

This inserts `appConfig` (trial 14 days, ₹99/mo, ₹799/yr, land-unit table), the CACP expense/income categories, a starter crop list, and one superadmin.

## Web Admin — Vercel (free)

1. Vercel → import the repo, **root directory `web-admin`**.
2. Env: `VITE_API_URL=https://<your-render-app>.onrender.com/api`.
3. SPA rewrite is handled by `web-admin/vercel.json` (all routes → `/index.html`).
4. Add the Vercel domain to the backend `CORS_ORIGINS`.

## Mobile app

See the farmer-app plan's build section: React Native CLI release builds (Android AAB via `./gradlew bundleRelease`, iOS archive in Xcode), Firebase config files added, production API base URL set.

## Backups (launch blocker)

`.github/workflows/backup.yml` runs a daily `mongodump` to S3-compatible storage. Set repo secrets: `MONGODB_URI`, `BACKUP_S3_KEY`, `BACKUP_S3_SECRET`, `BACKUP_S3_REGION`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ENDPOINT`. **Run a restore test monthly** — a backup that has never been restored is not a backup.
