# Subscription, Monetization & Roadmap

*Part of the Smart Farming product specification - see [README](README.md) for the full index.*

## Subscription Model & Lifecycle

The product uses a **free trial, then manual monthly subscription** model. There is **no payment gateway in v1** — the product owner (admin) records offline payments (cash / UPI) by hand from the web panel. Everyone who is subscribed gets **all features**, including true-cost profit. There are **no premium feature tiers** in v1.

### Subscription states

The `subscriptions` collection tracks each farmer's state:

| Status | Meaning | Can add entries? | Can view reports? |
|--------|---------|:---:|:---:|
| `trial` | Free trial active (default ~14 days) | Yes | Yes |
| `active` | A paid month is active | Yes | Yes |
| `grace` | Paid month lapsed, awaiting renewal | **No (read-only)** | Yes |
| `expired` | Trial ended, never paid / long-lapsed | No | Yes (read-only) |
| `suspended` | Blocked by admin | No | No |

### Recommended lifecycle (locked)

```
Register -> pending approval -> admin approves -> 14-day free trial (login enabled)
   -> trial ends
   -> farmer pays offline (cash / UPI) to the owner
   -> ADMIN records payment + activates the paid month from web
   -> ACTIVE (paid access)
   -> paid month lapses -> READ-ONLY GRACE MODE (view past data, no new entries)
   -> farmer renews -> ACTIVE again
```

**Grace mode** is important: a farmer who forgets to renew must never lose access to their own past records. They can still open every report and share it, but the "add entry" buttons are disabled with a clear message ("Renew to add new entries") until the admin records the next payment.

### Manual admin workflow

1. Farmer registers -> `subscriptions.status = pending_approval` (login blocked). An admin approves from the web -> status becomes `trial`, `trialStartedAt`/`trialEndsAt` (= approval + `appConfig.trialDays`) are set and login is enabled.
2. Near / after trial end, the farmer pays the owner offline.
3. Admin opens the farmer in the web panel and clicks **Record Payment**: enters `amount`, `method` (cash / upi / other), and the covered period.
4. This writes a `payments` row (`recordedByAdminId`, `periodStart`, `periodEnd`) **and** updates the `subscriptions` row: `status = active`, `currentPeriodStart/End` set, `activatedByAdminId` recorded.
5. When `currentPeriodEnd` passes without a new payment, the next request from the farmer flips them (on-request, time-based; no always-on scheduler is needed on the free tier) to `grace` (read-only). A later cut-off can flip `grace` -> `expired`.

The payment record and the subscription activation are the **audit trail** — every activation is tied to a named admin and a rupee amount, feeding the payments & revenue dashboard.

## Pricing Recommendation (to be validated)

The suggested pricing is a **starting point for validation, not a final decision**:

| Plan | Launch price (DECIDED, admin-adjustable) | Notes |
|------|-----------------|-------|
| Free trial | 14 days | Starts when the admin approves the account; full features |
| Monthly | **Rs 99 / month** | Low enough to feel like "one small purchase" |
| Yearly | **Rs 799 / year** | ~Rs 67/month effective — rewards commitment, improves retention |

**Rationale.** Rs 99/month sits near common Indian digital subscription anchors (recharge packs, OTT-lite plans) and keeps the mental cost low for a smallholder. The yearly plan at Rs 799 (about 8 months' price for 12 months) pulls forward cash and reduces monthly-renewal churn — which matters a lot when renewals are collected by hand. A 14-day trial is long enough to log a few real expenses and see a first report, but short enough to prompt a paying decision.

> **Important caveat — thin pricing research.** There is **no strong, validated data** on what an Indian smallholder will actually pay for a farm-accounting app. Willingness-to-pay is uncertain and likely price-sensitive. Before locking any number, the owner should test these prices with **real farmers** (10-20 interviews / a small paid pilot) and be ready to adjust the amount, the trial length, or the monthly-vs-yearly split.

## Future Automation

The manual workflow is deliberate for v1 (low volume, high trust, no gateway cost). As the farmer base grows and digital-payment habits deepen, the natural next step is **UPI auto-collection** — UPI AutoPay / mandate-based recurring debit, or a payment-gateway checkout (Razorpay / Cashfree) that activates the subscription automatically on success. This removes the admin's manual step and reduces renewal churn. It is **out of scope for v1** but the data model already supports it: `payments` and `subscriptions` are separate, so an automated collector can write the same rows an admin writes today, with no schema change.

## Roadmap

| Phase | Focus | Key items |
|-------|-------|-----------|
| **v1** (this spec) | Core ledger + reports, online-first, English | Expense/income entry, cash + true profit, per-crop & per-acre reports, receipt photos, WhatsApp/PDF share, web admin, manual subscriptions, FCM announcements |
| **v2** | Reach + retention | **Offline mode** (local queue + sync endpoint); **Hindi + 1-2 regional languages** (i18n already wired); **voice input** for amounts/notes; **reminders** (log-your-expense nudges, renewal reminders via push); **multi-plot analytics** (compare plots, whole-farm view) |
| **v3** | Ecosystem + monetization | **Mandi / market prices**; **weather** forecasts & alerts; **crop advisory**; **loan / khata** (informal credit tracking); **cooperative / FPO group accounts** (an FPO manages many farmers); **payment gateway / UPI auto-collect** |

The v1 architecture deliberately leaves the **offline seam** open (a local write queue plus a sync endpoint) so v2 offline support can be added **without a rewrite**. Likewise, all UI strings live in a resource file from day 1, so adding Hindi and regional languages in v2 is a translation task, not a re-engineering task.

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Adoption / trust** — farmers slow to trust a new app with money data | High | Extreme simplicity (2-3 taps, icon-first, big number-pad); English v1 but layout ready for regional languages; onboard via known channels (WhatsApp), local-language support in v2 |
| **Churn** — farmers stop renewing after trial or a season | High | Read-only grace mode keeps data hostage-free but visible; renewal reminders (v2); yearly plan to lock in commitment; show real value early (first profit report during trial) |
| **Free-tier limits** — Render cold start (~30-50s), Atlas 512 MB, Cloudinary bandwidth | Medium | Accept cold start for v1 (show a "waking up" loader); store only Cloudinary **URLs**, not image bytes; monitor DB size and prune/upgrade before the cap; paid upgrade path is a known, cheap step |
| **Data loss when offline** | Medium | v1 is online-first (server is source of truth, so nothing is lost if the phone dies); v2 offline uses a durable local queue that retries the sync endpoint, with conflict handling designed in |
| **Competitor — Khet Hisab** (existing farm-expense app) | Medium | Differentiate on **CACP-grounded true-cost profit** (family labour + own-land value), per-acre crop ranking, and clean owner-managed subscription; validate our unique angle in pilot interviews |
| **Low willingness-to-pay** | High | Keep price low (Rs 99/mo); validate before locking; yearly discount; if needed, revisit model (e.g. FPO-paid group accounts in v3 where an institution pays, not the individual) |

## Open Questions / Decisions

These are **deliberately unresolved** and should be settled with the owner (and ideally a farmer pilot) before or during build:

1. **Onboarding (DECIDED).** Admin approves the account **before first login**; the 14-day trial starts on approval. The owner chose control over friction — so approvals should be handled promptly.
2. **Pricing (DECIDED for launch).** Rs 99/month, Rs 799/year, 14-day trial — admin-adjustable in config. Still worth validating with farmers, but this is the launch price.
3. **Offline timing.** v1 is online-first; offline sync is planned for v2. Confirm whether early pilot regions have connectivity good enough to defer offline, or whether it must be pulled earlier.
4. **Land-unit override UX.** Bigha varies by state, so area is stored as `{value, unit, normalizedAcres}` with a state-keyed conversion table. Open: how much should the farmer **see and confirm/override** the computed `normalizedAcres` — silent conversion, a confirmation step, or a full manual editor? This affects per-acre report accuracy.
5. **Login method (DECIDED).** v1 uses **phone + password**, no OTP/SMS — owner decision (avoids SMS cost and provider dependency). Password recovery is admin-assisted. This item is settled, not open.