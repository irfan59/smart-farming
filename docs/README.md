# Smart Farming — Product Specification

A phone-first product that lets an **individual smallholder farmer in India** log crop expenses and income in a few taps and instantly see **per-crop, per-acre profit** — including the *real* cost of family labour and own land that most farmers forget. A **web admin panel** lets the product owner approve/activate subscriptions, view farmer data, manage master data, and send announcements.

> **Status (2026-07-04):** Discovery, research, first visuals, and this v1 specification are complete and awaiting owner review. The detailed implementation **plan has not started yet** — it begins once these docs are approved.

## Locked decisions (v1)

| Area | Decision |
|---|---|
| Market | India (INR, Kharif/Rabi/Zaid seasons, state-varying land units) |
| Mobile | React Native (bare CLI, no Expo) — Android + iOS |
| Auth | Phone + password, **no OTP**; admin-assisted password reset |
| Target user | Individual smallholder farmer (1–5 acres) |
| Language | English only in v1, built i18n-ready |
| Connectivity | Online-first (offline sync designed-in but built later) |
| Money model | Free trial → manual monthly subscription; admin activates payment from web; lapse → read-only grace |
| Onboarding | Farmer registers → **admin approves before login** → 14-day trial → paid |
| Price | **₹99/month or ₹799/year** (14-day trial), admin-adjustable |
| Data policy | **Deactivate-only** — records are never hard-deleted; legal erasure is a manual exception |
| Profit | Progressive **true-cost** — cash profit by default, optional CACP-based real profit |
| v1 extras | Receipt photo on entries; share reports to WhatsApp / PDF |
| Backend | Node.js + Express, MongoDB Atlas |
| Hosting | Free tier — Render (API), Atlas (DB), Cloudinary (photos), Vercel (admin), FCM (push) |

## Document index

| # | Document | What it covers |
|---|---|---|
| 01 | [Product Overview](01-product-overview.md) | Vision, problem, persona, goals, success metrics, competitors, differentiators |
| 02 | [Features & Scope](02-features-and-scope.md) | Full v1 feature list (farmer + admin) with acceptance criteria; out-of-scope |
| 03 | [User Flows & Account Lifecycle](03-user-flows-and-lifecycle.md) | Step-by-step flows + the subscription state machine |
| 04 | [Screens & UI](04-screens-and-ui.md) | Screen-by-screen spec with low-literacy UX notes |
| 05 | [Data Model (MongoDB)](05-data-model.md) | Collections, fields, indexes, sample documents |
| 06 | [Cost & Profit Engine](06-cost-and-profit-engine.md) | Cash vs true profit, CACP mapping, land-unit math, worked example |
| 07 | [Architecture, API & Security](07-architecture-api-and-security.md) | System design, API endpoints, auth, security, DPDP privacy |
| 08 | [Subscription, Monetization & Roadmap](08-subscription-monetization-and-roadmap.md) | Lifecycle, pricing, v1→v3 roadmap, risks, open questions |

## Key open decisions (need the owner's input)

These were surfaced during design/review and have now all been **resolved with the owner** (2026-07-04):

1. ~~First-login model~~ **DECIDED:** admin approves the account **before first login**; the trial starts on approval.
2. ~~How farmers enter "true cost"~~ **DECIDED:** v1 auto-suggests family-labour (days × wage) and own-land value from config; the farmer confirms in one tap.
3. **English-only v1** — login is **phone + password, no OTP** (owner decision). English-only is a friction risk for the persona; consider prioritising Hindi in v2.
4. ~~Data deletion vs financial retention~~ **DECIDED:** **deactivate-only** (no hard deletes); a formal DPDP legal-erasure request is a manual admin exception.
5. ~~Subscription price~~ **DECIDED:** launch at **₹99/month or ₹799/year** (14-day trial), admin-adjustable. Still worth validating with farmers.

## Glossary

- **Crop cycle** — one crop grown on one plot in one season+year (e.g. "Wheat, Rabi 2025-26"); the unit of profit analysis.
- **Cash profit** — income minus money actually paid out.
- **True profit** — cash profit minus imputed costs (family labour, own-land rental value, interest on owned capital).
- **CACP cost ladder** — India's official cost concepts: **A2** (paid-out), **A2+FL** (adds family labour), **C2** (adds owned land + capital).
- **Kharif / Rabi / Zaid** — monsoon / winter / summer crop seasons.
- **Bigha / Guntha / Acre** — land units; bigha varies by state, so all areas are normalised to acres for per-acre reporting.
- **MSP** — Minimum Support Price (government crop price).
- **Grace mode** — read-only state after a paid month lapses.
- **DPDP** — India's Digital Personal Data Protection Act, 2023.
- **FCM** — Firebase Cloud Messaging (push notifications).

---

*How these docs were produced: a fact-checked deep-research pass (competitors, farmer behaviour, CACP cost methodology, low-literacy UX), then a parallel drafting pass, then an adversarial multi-lens critique (product, technical, India-fit, security/privacy) with automatic revision of high-severity findings.*
