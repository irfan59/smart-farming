# Product Overview

*Part of the Smart Farming product specification - see [README](README.md) for the full index.*

## Product Overview

### Vision & pitch

**Vision:** Give every smallholder farmer in India a phone-first way to know, in plain numbers, whether each crop actually made money — and how much per acre — so they can plan the next season with facts instead of guesses.

**One-line pitch:** *A dead-simple mobile app that lets an Indian farmer log crop expenses and income in a few taps and instantly see per-crop, per-acre profit — including the real cost of family labour and own land that most farmers forget.*

### The problem

A smallholder grows wheat on one plot and paddy on another. At the end of the season they have a rough idea of total money in and money out, but they cannot answer the one question that decides next year's sowing:

> **"Which crop actually made me money per acre?"**

Why they cannot answer it today:

- Records live in memory, a diary, or scattered notes — never added up per crop.
- Costs are mixed across crops and plots, so profit is never isolated.
- Land is measured in local units (bigha, guntha) that differ by state, so "per acre" is never computed.
- The biggest costs — the farmer's own family labour and the rental value of their own land — are invisible. Official CACP data shows this gap is huge: for soybean, cash cost was about **Rs 1,770/quintal** while the real economic cost (C2) was about **Rs 4,242/quintal**. A farmer feeling "profitable" on cash may actually be losing money.

The result: crop choices are made on habit and gut feel, not on which crop truly pays.

### Target user + persona

**Primary user:** an individual smallholder farmer in India with 1–5 acres, growing 1–3 crops across Kharif and Rabi seasons. Comfortable with WhatsApp and YouTube, comfortable with numbers, but not with complex apps or heavy typing. English is not their first language.

**Persona — Ramesh, 38, Wardha district, Maharashtra**

| Attribute | Detail |
|---|---|
| Land | 2 acres owned; grows paddy (Kharif), wheat (Rabi) |
| Phone | Entry-level Android, uses WhatsApp daily |
| Money habits | Pays for seed, fertiliser, hired labour in cash/UPI; keeps receipts loosely |
| Pain | "I sold my wheat for a good rate but I don't know if paddy or wheat gave me more profit per acre." |
| What he wants | Log a fertiliser bill in 10 seconds; at season end, see one clear profit number per crop; share it with his son on WhatsApp |

### Goals and non-goals (v1)

**Goals**

- Let a farmer log an expense or income in **2–3 taps** with minimal typing.
- Track money **per crop cycle** (e.g. "Wheat, Rabi 2025-26") and **per plot**.
- Show **cash profit** by default and **true profit** (including family labour + own-land value) on an optional toggle.
- Report **profit per acre** using normalised area (handles bigha/guntha correctly).
- Make every report **shareable as PDF and via WhatsApp**.
- Give the product owner a web panel to activate subscriptions, record payments, and manage master data.

**Non-goals (explicitly out of scope for v1)**

- No payment gateway — payments are recorded manually by the admin (cash/UPI offline).
- No offline mode — the app is online-first (the sync seam is designed in, but not built).
- No regional languages in v1 — English only, but built i18n-ready.
- No premium feature tiers — every subscribed farmer gets all features, including true-cost profit.
- No advisory/agronomy content, mandi prices, weather, or marketplace.
- No multi-user farms, FPOs, or cooperatives (single farmer account only).

### Success metrics

| Metric | What it measures | v1 target (to validate) |
|---|---|---|
| **Activation** | % of registered farmers who log ≥3 entries in week 1 | ≥ 50% |
| **Weekly active logging** | % of active farmers who log ≥1 entry per week | ≥ 40% |
| **Trial-to-paid conversion** | % of farmers who pay after the 14-day trial | ≥ 20% |
| **Retention (month 3)** | % of paid farmers still logging in month 3 | ≥ 60% |
| **Report usage** | % of farmers who open or share a profit report per season | ≥ 50% |

These are validation targets for a first cohort, not contractual commitments. They should be reviewed after the first Kharif + Rabi cycle.

### Competitor & market summary

The farm-management software market is crowded at the top but thin at the bottom (the smallholder, India-first, dead-simple segment).

| Product | Focus | Pricing (approx.) | Fit for our user |
|---|---|---|---|
| **Farmbrite** | Full farm/livestock management (US/West) | Paid tiers (USD) | Too broad, too complex, not India-first |
| **Bushel Farm** (formerly FarmLogs) | Field/agronomy + financials (US) | ~$75 / $199 / $599 tiers | Priced and designed for large commercial farms |
| **Agrivi** | Enterprise farm management | Enterprise (USD) | Built for agribusiness, not a 2-acre farmer |
| **Vyapar** | Generic Indian invoicing/accounting | ~Rs 499/year | Not crop-aware; no per-acre or true-cost profit |
| **Khet Hisab / Farmizo Khata** | India farm-expense apps (Play Store) | Low / free | Direct-ish competitors — **unverified signal** that demand exists; feature depth and traction not confirmed |

*Note:* Play-Store competitors like Khet Hisab and Farmizo Khata are treated as an **unverified market signal** — they suggest Indian farmers do want expense tracking, but we have not verified their profit logic, per-acre handling, or true-cost approach.

### The market gap

- Global tools (Farmbrite, Bushel, Agrivi) are **too complex and too costly** for a smallholder, and are not built around Indian seasons, crops, land units, or costing norms.
- Generic Indian accounting apps (Vyapar) are **not crop-aware** — no crop cycle, no per-acre profit, no true-cost view.
- The India-first expense apps that exist show demand but (as far as we can verify) **stop at cash bookkeeping** — they do not compute the CACP-grounded *real* profit that changes a farmer's decision.

**The gap:** a simple, India-first app that answers *"which crop made me money per acre — really?"*

### Positioning & differentiators

**Positioning:** the simplest way for an Indian smallholder to see real, per-crop, per-acre profit — priced for a farmer (free trial, then ~Rs 99/month or ~Rs 799/year, to validate).

**Core differentiators (2–3):**

1. **Per-crop, per-acre TRUE profit.** Grounded in India's official CACP cost ladder. Cash profit by default; one toggle reveals real profit after family labour and own-land value — the numbers other apps ignore.
2. **Dead-simple, India-first UX.** Icon-first categories, big number-pad, 2–3 taps per entry, flat navigation, low-end-device friendly. Built around Kharif/Rabi/Zaid seasons and state-varying land units (bigha, guntha) — not retrofitted from a Western tool.
3. **Sharing farmers already trust.** Every report exports to **PDF and WhatsApp** through the OS share sheet — meeting farmers where they already are.

### Guiding product principles

- **Simplicity beats features.** If a screen needs a manual, it fails. Target 2–3 taps to log an entry.
- **Numbers over words.** Farmers are comfortable with numbers, less with dense text — lead with icons and figures.
- **Trust is the real barrier.** Adoption is gated by trust and digital confidence, not literacy. Clear confirmations, easy undo, no surprises.
- **India-first, not India-adapted.** Seasons, crops, land units, currency, and costing built in from the start.
- **Honest profit.** Show cash profit plainly, and make the real (true-cost) profit one tap away — never hide the number that matters.
- **Build for the next step.** English-only but i18n-ready; online-first but with a clean sync seam; no premium tiers, but a clean subscription model the owner controls.

### Open questions

- **First-login model (DECIDED):** admin approval is **required before first login**; the trial starts when the admin approves.
- **Price point (DECIDED for launch):** Rs 99/month or Rs 799/year (admin-adjustable); still worth validating with the first cohort.