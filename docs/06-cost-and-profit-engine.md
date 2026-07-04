# Cost & Profit Engine

*Part of the Smart Farming product specification - see [README](README.md) for the full index.*

## Why this engine exists

Most farmers in India think they made a profit when they only counted the cash they spent. They forget the value of their own family's labour and the value of their own land. This engine makes that hidden cost visible. It is the core differentiator of the product.

We do this in two steps, from easy to honest:

1. **Cash Profit** — the simple number, shown first.
2. **True Profit** — the honest number, shown when the farmer taps "see my real profit".

This maps directly to India's official CACP (Commission for Agricultural Costs and Prices) cost ladder, so our numbers rest on a recognised government method, not our own invention.

## Cash Profit vs True Profit

### Cash Profit (default)

Cash Profit is income minus only the money (or kind) the farmer actually paid out. It ignores anything imputed. This is what the farmer already understands, so it is the default view.

```
cashProfit = totalIncome − sum(paidOut expenses)
```

"Paid-out" is the CACP **A2** basis: cash or kind actually spent — seeds, fertiliser, manure, pesticides, irrigation, hired labour, hired machinery/fuel, owned-machinery running fuel, leased-in land rent, interest on loans, transport, land revenue, and miscellaneous.

### True Profit (optional toggle)

True Profit adds the costs the farmer really bears but never pays in cash:

```
trueProfit = totalIncome − ( paidOut
                           + imputedFamilyLabour
                           + ownLandRentalValue
                           + ownedMachineryDepreciation
                           + ownedCapitalInterest )
```

- **imputedFamilyLabour** = family labour days × local daily wage (CACP **FL**).
- **ownLandRentalValue** = rental value of the farmer's own land for that season (part of CACP **C2**).
- **ownedMachineryDepreciation** = wear-and-tear value used up on the farmer's own machinery (part of CACP **C2**).
- **ownedCapitalInterest** = interest on the farmer's own money tied up in the crop (part of CACP **C2**).

If the farmer skips any imputed item, that item counts as zero and True Profit stays valid — nothing breaks. But the whole value of the product depends on these numbers actually being there, so we do **not** leave them to blank manual typing. See "How imputed items are captured" below.

**The key insight to surface:** ignoring family labour and own-land value makes farmers massively overestimate profit. Official CACP data shows soybean cost around Rs 1,770/quintal on a cash basis, but the real (C2) cost is about Rs 4,242/quintal. That gap is the whole point of this feature.

## How imputed items are captured

**One capture path only.** Every imputed cost is stored as a normal row in the `transactions` ledger, exactly like any expense: `type = expense`, `isImputed = true`, `cacpTag` copied from its category (FL or C2), and a rupee `amount`. There is no second storage mechanism and no special table. Cash Profit ignores these rows; True Profit includes them. This keeps the report roll-ups (see below) trivial.

**The amount is what gets stored — but v1 auto-computes a suggested amount so the farmer almost never does the math.** The worked-example bases (days × wage, Rs/acre × acres) are **not** just illustration; v1 computes them for the farmer from config defaults and pre-fills the amount. The farmer confirms with one tap, or overrides. This is what keeps the differentiator alive for a 2-acre smallholder who dislikes typing.

To support this, `appConfig` carries these default rates (all admin-editable master data, so no app release is needed to tune them):

| appConfig field | Meaning | Example |
|---|---|---|
| `dailyWageINR` | Default local daily wage for family labour, ideally per state/district | Rs 350/day |
| `ownLandRentalPerAcreINR` | Default own-land rental value per acre per season, per state/district | Rs 4,000/acre/season |
| `ownedCapitalInterestRatePct` | Annual % rate applied to the paid-out total to estimate owned-capital interest | 6% |

The near-zero-effort default path:

1. **Own-land rental value (C2).** When a plot is set up we capture whether the land is **owned or leased-in**. For owned land, the app auto-suggests `ownLandRentalPerAcreINR × normalizedAcres` for the crop cycle and pre-fills it as an imputed C2 transaction — the farmer only confirms. Leased-in land instead uses the actual paid rent (A2, paid-out).
2. **Family labour (FL).** The farmer answers one simple question — "About how many days did you and your family work on this crop?" — using the big number-pad. The app multiplies days × `dailyWageINR` and stores the result as an imputed FL transaction. The days go in the transaction's `quantity`/`unit`/`rate` fields (`quantity` = days, `unit` = "day", `rate` = wage) so the basis stays visible and editable.
3. **Owned-machinery depreciation (C2)** and **owned-capital interest (C2).** Owned-capital interest is auto-suggested as `ownedCapitalInterestRatePct × paid-out total` for the cycle, pre-filled for one-tap confirm. Owned-machinery depreciation is a farmer-entered (or later, catalogued) amount; if left blank it is simply zero.

In all cases the farmer can override the suggested amount, and the stored value is always a rupee `amount` on a `transactions` row. The UI for these prompts belongs in the Add-Expense / plot-setup screens (file 04); this file defines the numbers and the config that feed them.

## Mapping expense categories to CACP tags

Every expense category carries a `cacpTag` flag. This flag decides which formula the amount feeds into. The `isPaidOut` and `isImputed` booleans are derived from the tag.

| Category | cacpTag | isPaidOut | isImputed | In Cash Profit? | In True Profit? |
|---|---|---|---|---|---|
| Seeds | A2 | yes | no | yes | yes |
| Fertilizer | A2 | yes | no | yes | yes |
| Manure | A2 | yes | no | yes | yes |
| Pesticides & insecticides | A2 | yes | no | yes | yes |
| Irrigation / water charges | A2 | yes | no | yes | yes |
| Hired labour | A2 | yes | no | yes | yes |
| Hired machinery / tractor / fuel | A2 | yes | no | yes | yes |
| Owned machinery fuel / running | A2 | yes | no | yes | yes |
| Bullock labour | A2 | yes | no | yes | yes |
| Land rent (leased-in, paid) | A2 | yes | no | yes | yes |
| Interest on loan / working capital | A2 | yes | no | yes | yes |
| Transport | A2 | yes | no | yes | yes |
| Land revenue / cess / taxes | A2 | yes | no | yes | yes |
| Miscellaneous | A2 | yes | no | yes | yes |
| **Family labour** | **FL** | no | yes | **no** | yes |
| **Own-land rental value** | **C2** | no | yes | **no** | yes |
| **Owned machinery depreciation** | **C2** | no | yes | **no** | yes |
| **Interest on owned capital** | **C2** | no | yes | **no** | yes |

Note on owned machinery: **fuel and running cost is real cash out (A2)**, but **depreciation is not** — it is capital being used up, so it belongs to the C2 (imputed) rung, not to Cash Profit. Putting depreciation into paid-out would understate the very cash-vs-true gap this product exists to reveal, so the two are kept as separate categories.

Rule for the engine: **Cash Profit sums only `isPaidOut = true` rows. True Profit sums paid-out rows plus all `isImputed = true` rows.** The tag makes both totals trivial to compute from the same `transactions` ledger.

## Per-acre metrics and land-unit conversion

Per-acre is where farmers compare crops fairly. The formula is simple:

```
perAcreProfit = profit / normalizedAcres
```

`profit` can be either Cash or True Profit; `normalizedAcres` is the crop cycle's area converted to acres.

The hard part is the unit. **Acre and hectare are fixed nationwide** (1 acre = 43,560 sq ft; 1 hectare = 2.471 acres). But **bigha varies dramatically by state** — roughly 14,400 sq ft in West Bengal, 27,000 sq ft in West UP, and 9,070 sq ft in Punjab/Haryana. We must never hardcode one bigha value.

**Design rule:** store area as `{ value, unit, normalizedAcres }`. At entry time we look up a conversion table keyed by `(unit, state)` — the plot's state comes from the farmer profile — compute `normalizedAcres`, and then **let the farmer confirm or override** the acre figure. The conversion table lives in `appConfig.landUnitConversions`, so the admin can correct any regional value without an app release.

Example: a farmer in West Bengal enters "2 bigha". Table says 1 WB bigha = 14,400 sq ft, so 2 bigha = 28,800 sq ft = 0.661 acre. We show "= 0.66 acre — is this right?" and let them adjust.

## Season and year tagging

Every crop cycle is tagged to a **season** and a **year string**, because Indian farming runs on seasons, not calendar months.

- **Kharif** (monsoon, ~Jun–Oct)
- **Rabi** (winter, ~Oct/Nov–Mar/Apr)
- **Zaid** (summer, ~Mar–Jun)
- **Perennial / Annual** (e.g. sugarcane)

The year uses the crop-year form, e.g. `"2025-26"`. So a cycle reads "Wheat, Rabi 2025-26". This lets us group transactions correctly (a Rabi crop spans two calendar years) and power the "season comparison" report.

## Full worked example — Wheat, 2 acres, Rabi 2025-26

Plot area = 2 acres (`normalizedAcres = 2`), land is **owned**. All figures in INR. The imputed amounts below are exactly what the app auto-suggests from `appConfig` defaults; the farmer confirmed each with one tap.

**Paid-out expenses (A2):**

| Expense | Amount (Rs) |
|---|---|
| Seeds | 3,000 |
| Fertilizer | 6,500 |
| Irrigation / water charges | 2,500 |
| Hired labour | 8,000 |
| Hired machinery / tractor / fuel | 4,000 |
| **Total paid-out** | **24,000** |

**Imputed expenses (added for True Profit; auto-computed from config, farmer-confirmed):**

| Imputed item | Basis (auto-computed) | Amount (Rs) |
|---|---|---|
| Family labour (FL) | 30 days × Rs 350/day (`dailyWageINR`) | 10,500 |
| Own-land rental value (C2) | Rs 4,000/acre × 2 acres (`ownLandRentalPerAcreINR`) | 8,000 |
| Interest on owned capital (C2) | 6% (`ownedCapitalInterestRatePct`) × Rs 24,000 paid-out ≈ | 1,500 |
| **Total imputed** | | **20,000** |

(Owned-machinery depreciation is zero here — this farmer has no owned machinery to depreciate.)

**Income:**

| Income | Amount (Rs) |
|---|---|
| Main crop sale (wheat produce) | 46,000 |
| By-product sale (straw / fodder) | 4,000 |
| **Total income** | **50,000** |

**Now compute:**

```
cashProfit  = 50,000 − 24,000 = 26,000
trueProfit  = 50,000 − (24,000 + 20,000) = 50,000 − 44,000 = 6,000

cashProfit per acre  = 26,000 / 2 = 13,000
trueProfit per acre  =  6,000 / 2 =  3,000
```

The farmer thought they earned Rs 26,000. Once family labour and own-land value are counted, the real profit is only Rs 6,000. That single comparison — Rs 13,000/acre vs Rs 3,000/acre — is the "aha" moment the app is built to deliver. And because every imputed number was pre-filled from config and confirmed with a tap, the farmer reached it without doing any costing math.

## How this rolls up into reports

The same `transactions` rows, tagged by `cropCycleId`, date, `type`, and `cacpTag`, feed every report with no separate storage:

- **Monthly summary** — filter transactions by month; sum income, paid-out expense, and Cash Profit. (True Profit is usually shown per crop cycle, not per month, since imputed items belong to a season.)
- **Yearly summary** — same, grouped by crop-year.
- **Per-crop-cycle P/L** — the example above, shown as Cash Profit with the optional True Profit toggle.
- **Per-acre profit** — divide either profit by `normalizedAcres`.
- **Expense breakdown** — group by `categoryName` for a pie/bar chart.
- **Season comparison** — group cycles by `season` + `year` (e.g. compare Wheat Rabi 2025-26 vs 2024-25).
- **"Which crop earned most per acre"** — rank all closed cycles by per-acre profit.

All reports are read-only in grace mode, and each is shareable as PDF and via WhatsApp.

## Open questions

- **True Profit in monthly rollups:** imputed items are seasonal, not monthly. We currently keep True Profit at the crop-cycle level only. If owners want a monthly True Profit line, we need a rule to spread imputed costs across the season's months.
- **Default rate accuracy:** `dailyWageINR`, `ownLandRentalPerAcreINR`, and `ownedCapitalInterestRatePct` are auto-suggest defaults. How finely should they be keyed — one national value, per-state, or per-district? Finer keys are more honest but need more master data to maintain.
- **Owned-machinery depreciation:** v1 treats it as a farmer-entered amount (zero if skipped). A future version could derive it from a machinery catalogue (purchase cost, expected life, share used on this crop) instead of manual entry.