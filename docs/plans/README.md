# Smart Farming — Implementation Roadmap

This folder holds the detailed, step-by-step implementation plans for building the v1 product described in [`../README.md`](../README.md). The work is split into **three sequenced plans**, because the product is three independent subsystems that each ship as working software.

> **Build order is dependency-driven:** the **backend API** is the foundation both clients call, so it is built first. The **web admin** and **farmer app** can then be built against a live, tested API.

## Plans

| Order | Plan | Builds | Depends on |
|---|---|---|---|
| 1 | [`01-backend-plan.md`](01-backend-plan.md) | Node.js + Express + MongoDB REST API (auth, farmers, plots, crop cycles, transactions, cost/profit engine, reports, subscriptions & lifecycle, admin, announcements, Cloudinary, FCM), deployed to Render | — |
| 2 | `02-web-admin-plan.md` | React + Vite admin panel (approve farmers, activate payments, view data, master data, announcements, revenue dashboard), deployed to Vercel | Backend admin + auth endpoints |
| 3 | `03-farmer-app-plan.md` | Bare React Native (CLI) Android + iOS app (auth + waiting-for-approval, home, add expense/income + photo, plots & crop cycles, reports + WhatsApp/PDF share, subscription, notifications) | Backend farmer endpoints |

*(Plans 2 and 3 build against [`API-CONTRACT.md`](API-CONTRACT.md) — the pinned source of truth for the API surface — so client and server shapes never drift. This was added after review caught the first web-admin draft inventing mismatched shapes.)*

## Phase overview (across all three plans)

| Phase | Focus | Milestone (working, testable) |
|---|---|---|
| **P0** | Infra & accounts | Repos, env, CI green, MongoDB Atlas + Cloudinary + FCM + Render + Vercel provisioned |
| **P1** | Backend core | Auth (register→`pending_approval`, login, JWT + refresh + `tokenVersion`, bcrypt), role + **ownership/IDOR** middleware, validation, error handling, test harness. **IDOR CI test green.** |
| **P2** | Backend domain | Master data, plots + land-unit normalization, crop cycles, transactions + signed Cloudinary upload, cost/profit engine (cash + true, per-acre), reports |
| **P3** | Backend lifecycle | `pending_approval → approve → trial → active → grace → expired` (on-request eval), payments, admin approve/activate, **deactivate-only** |
| **P4** | Backend admin + deploy | Admin farmers list/detail, dashboard metrics, announcements + FCM; deploy to Render; daily backup job |
| **P5** | Web admin | Full admin panel against the live API; deploy to Vercel |
| **P6** | Farmer app | Full RN app against the live API; Android + iOS builds |
| **P7** | Hardening & launch | Security pass, DPDP consent/deactivate flows, performance on low-end devices, store submission |

## Cross-cutting conventions (all plans)

- **TDD:** every task writes a failing test first, then the minimal code to pass, then commits. Frequent small commits.
- **No hard deletes:** deactivate/void only (`farmers.status=deactivated`, `plots.isActive=false`, `cropCycles.status=deactivated`, `transactions.isVoid=true`). Reports/lists exclude these.
- **Ownership on every `:id` route:** load the document and assert `doc.farmerId === token.sub`, else **404**. Enforced by a required CI test.
- **English-only v1, i18n-ready:** all UI strings in resource files, no hardcoded text.
- **Online-first:** the offline sync seam (local queue + `/sync`) is designed for but not built in v1.

## Execution

Each plan is written for task-by-task execution (checkbox steps). Recommended: **subagent-driven development** — a fresh subagent per task with review between tasks. Alternatively, inline batch execution with checkpoints.
