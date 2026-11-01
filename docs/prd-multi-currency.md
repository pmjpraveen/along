# along — PRD: Multi-currency Expenses

Status: draft for review · Owner: pmjpraveen · Proposed sprint: 8 (post-Sprint 7)

## 0. Scope check (read first)

- The main PRD lists **automatic currency conversion** as MLP-excluded. This PRD keeps the rate that settles money **manual and stored** (what the group paid). A *suggested* market rate that pre-fills the field is a separate, optional phase (§9, Phase B) and needs an explicit go-ahead because it touches that exclusion.
- No multi-currency balances, no per-currency settle-up, no FX gain/loss. Balances stay in **one currency: the trip currency** (`trips.primary_currency`).
- Existing columns to check before building: `expenses.currency` and `expenses.amount_minor` exist (migration 0012). Confirm whether a rule today forces `expenses.currency = trips.primary_currency`; if so, this PRD relaxes it.
- Reference: TripMojo's currency chip, original-amount rows and "≈" totals (UI pattern only). We do **not** copy its live-rate balances.

## 1. Problem and goal

Trips cross borders. A group in Thailand pays in ฿ but the trip is tracked in ₹. Today an expense can only be recorded in one currency, so people convert in their head and type the converted amount, losing the original and the rate.

Goal: record an expense in any currency, keep **original amount + rate + converted amount** on the record, and keep every balance exact and stable.

Non-goals: live-rate balances, multi-currency settlements, historical rate lookup, crypto, rounding in the group's favour.

## 2. Principles

1. Balances come only from `ledger_entries`, in trip-currency integer minor units.
2. The converted amount is **fixed at save time**. A rate change later never moves a settled or open balance.
3. The group's rate beats the market rate. The stored rate is the one the user confirmed.
4. Same-currency expenses cost **zero extra taps**. The currency control is a chip, not a form section.
5. Original amounts are always visible; converted amounts are secondary and plainly labelled.

## 3. Data model

On `expenses` (new nullable columns, all-or-none by constraint):

| Column | Type | Meaning |
| --- | --- | --- |
| `currency` | char(3) FK currencies | Currency actually paid (existing) |
| `amount_minor` | bigint | Original amount in `currency` minor units (existing) |
| `rate_num` | bigint | Rate numerator (trip-currency minor units) |
| `rate_den` | bigint | Rate denominator (original-currency minor units) |
| `converted_minor` | bigint | Amount in trip currency minor units, **what the ledger uses** |
| `rate_source` | text | `manual` \| `suggested_edited` \| `suggested` (Phase B) |

- Rate is stored as an **integer ratio**, never a float. `¥1 = ₹0.55` with exponents (JPY 0, INR 2) is stored as `rate_num = 55`, `rate_den = 1`. Entry `0.55` is parsed by string maths to a ratio.
- `converted_minor = round_half_even(amount_minor * rate_num / rate_den)` computed **in the RPC** (single source of truth), not on the client. The client shows a preview using the same pure function in `src/domain/`.
- Constraint: `currency = trip currency` ⇒ `converted_minor = amount_minor` and rate columns null; otherwise all of `rate_num`, `rate_den`, `converted_minor`, `rate_source` are required and positive.
- Splits (`expense_participants.owed_amount_minor`) are in **trip currency** and must sum to `converted_minor`. Largest-remainder rounding, ties by `trip_member_id`, runs on `converted_minor`.
- `ledger_entries` are written in trip currency only. Add a pgTAP drift check: ledger total per expense equals `converted_minor`.
- Edits check `version`. Changing amount, currency or rate re-runs the conversion and re-splits. Settlements stay immutable; edits that would change an already-settled balance follow the existing reversal rule.

## 4. User stories and acceptance criteria

IDs are provisional (`MC-nn`); map into the sprint doc once approved.

**MC-01 Pick a currency on an expense**
- Add-expense shows a currency chip beside the amount, default = trip currency.
- Tapping opens a bottom sheet: search field, recent currencies first, then A–Z, each row = symbol badge, name, code.
- Amount input respects the chosen currency's exponent (JPY none, KWD three).
- Changing currency keeps the typed digits and re-formats; never silently converts them.

**MC-02 Set the rate when the currency differs**
- When currency ≠ trip currency, one line appears under the amount: `1 ¥ = ₹ [0.55]` with the rate editable inline, plus `= ₹1,376 (converted)`.
- Rate entry is decimal text; stored as an integer ratio. Zero, negative and non-numeric are rejected inline with a specific message.
- Rate and converted amount update live as either changes. Editing the converted amount instead back-solves the rate (rounded and shown) so people can type what their bank charged.
- Required to save; no default of 1.

**MC-03 Remember the group's rate**
- The last rate used for the same currency pair in this trip pre-fills the field, labelled "Last used in this trip".
- Per-trip only; never shared across trips.

**MC-04 Original and converted amounts in lists and detail**
- Expense rows show the **original** amount (`JP¥2,501`) as the primary figure.
- A second, calmer line shows `≈ ₹1,376` for foreign-currency rows only.
- Detail screen shows original, rate, converted, and who set the rate.

**MC-05 Splitting uses the converted amount**
- Participant shares display in trip currency (and optionally the original currency as `≈`).
- All four split methods sum exactly to `converted_minor`. Payer-only and zero-participant rules unchanged.

**MC-06 Trip summary totals**
- Total spend is in trip currency (sum of `converted_minor`), with a per-currency breakdown beneath: `JP¥8,059 · $56 · ฿2,000`.
- Totals use the stored rates, so they never drift. No `*` "current rates" footnote is needed in Phase A.

**MC-07 Balances and settle-up**
- Balances and suggested payments are in trip currency only, in plain words ("You owe Rahul ₹800").
- Settlement is recorded in trip currency; unchanged.

**MC-08 Edit and delete**
- Editing currency, amount or rate follows the existing version check; stale versions are rejected.
- A rate change on an expense that touched a settled balance requires the existing reversal flow.
- Delete is soft, as today.

**MC-09 Offline and idempotency**
- Foreign-currency creates carry the same idempotency key and queue offline; duplicate submit yields one row.
- Conversion is computed server-side on sync; the client preview may differ by rounding only if the rate text was edited offline after a rate change elsewhere (not possible, rate is per-expense).

**MC-10 Export and recap**
- CSV export gains `original_amount`, `original_currency`, `rate`, `converted_amount`. PDF shows original and converted.
- Recap card totals use trip currency.

## 5. UX notes (DESIGN.md governs visuals)

- Currency chip uses the existing pill-chip component; no new colour. Alarm Red only for the rate-validation error.
- The rate line is progressively disclosed: hidden for same-currency, one line for foreign-currency. Adding a foreign expense is still three taps plus the amount and the rate confirmation.
- Never convey meaning by colour alone: the converted line is labelled with `≈` and the word "converted" for screen readers.
- Tabular numerals, minor-unit formatting from `currencies.minor_unit_exponent`.
- Currency sheet: native search behaviour, 44/48 targets, accessibility label per row ("Japanese Yen, JPY").
- Animation: none beyond the bottom-sheet default. Amounts never tween.

## 6. Domain and API

- `src/domain/money.ts`: add `parseRate(text, ...) → {num, den}`, `convert(amountMinor, rate) → minor` (round half even), `rateFromAmounts(original, converted) → {num, den}`. Pure, no floats.
- `src/api/expenses.ts`: `create_expense` / `update_expense` RPCs gain `p_rate_num`, `p_rate_den`, `p_rate_source`; RPC computes and returns `converted_minor`.
- RLS unchanged. Rate columns are readable by trip members only, like the rest of the expense.
- Migration: new numbered migration + pgTAP test.

## 7. Tests (each story gets at least one)

Domain (Jest, exhaustive, loops over ranges):
- `convert` for exponents 0, 2, 3 on all pairs; half-even rounding; large values within safe integer range.
- `parseRate` accepts `0.55`, `1,234.5`, rejects `0`, `-1`, `abc`, more decimals than allowed.
- `rateFromAmounts` round-trips: convert(original, derived rate) equals the typed converted amount.
- Splits over `converted_minor` sum exactly for all four methods, ranges of amounts and participant counts.
- Balances sum to zero with mixed-currency expenses.

pgTAP:
- Foreign expense requires rate columns; same-currency forbids them.
- `converted_minor` equals RPC computation; client cannot supply it.
- Split must sum to `converted_minor`.
- Cross-trip isolation, stale version rejected, duplicate idempotency key yields one row, settlements immutable, ledger drift query returns no rows.

Component (logic-bearing only): amount input with currency exponent; rate field validation and back-solve.

## 8. Edge cases

- Zero-decimal and three-decimal currencies on either side of the rate.
- Rate precision: allow up to 6 decimal places; store as an exact integer ratio.
- Currency removed from the list later: stored code still renders.
- Trip currency changes after expenses exist: blocked once any expense exists (confirm this is current behaviour).
- Very small amounts that convert to zero: reject with "This converts to less than the smallest unit."
- Edited rate on an expense already shared in a settlement: reversal flow, not overwrite.
- Two expenses same day, same pair, different rates: allowed; each keeps its own.

## 9. Phasing

**Phase A (this PRD, MVP of the feature):** MC-01 to MC-10, manual rate only.

**Phase B (needs explicit approval — overrides the MLP exclusion):** Suggested market rate.
- Supabase Edge Function fetches a daily rates feed into a `fx_rates` table (RLS: authenticated read, no client write).
- The rate field pre-fills with the suggestion, labelled "Market rate · edit to match what you paid". `rate_source = suggested` only if untouched, `suggested_edited` if changed.
- Stale-rate fallback: if no rate within 3 days, leave the field empty and ask for a manual one.
- Does not change balances logic: the stored, confirmed rate still fixes `converted_minor`.

**Phase C (not planned):** per-expense "just track" without a split (TripMojo pattern). Needs a PRD decision on how it interacts with expense participation rules; do not build with this feature.

## 10. Success measures

- Foreign-currency expense added in ≤ 4 taps plus typing.
- Zero balance drift in CI; every split sums to `converted_minor`.
- Support questions about "where did this number come from" answerable from the detail screen alone.

## 11. Open questions

1. Is a rate-less default of "last used" acceptable, or should it always start empty?
2. Should the summary also show the per-currency breakdown by person, or only per trip?
3. Is the suggested rate (Phase B) in the MLP, or after launch?
4. Does the current schema already restrict `expenses.currency` to the trip currency (to be removed)?
5. Should the converted amount be editable directly (back-solves the rate), or only the rate?
