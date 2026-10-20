# along — PRD: Trip Recap Card & Expense Export

Status: draft for review · Owner: pmjpraveen · Proposed sprint: 8 (post-Sprint 7)

## 0. Scope check (read first)

- The main PRD lists "trip recap" and "expense analytics" under **Phase 2** and "AI trip recap" as MLP-excluded. This feature is **deterministic and not AI**: it only restates numbers the app already holds (`trip_summary`, `ledger_entries`, `passport_stamps`). It is a deliberate pull-forward of the Phase-2 recap, justified by launch (§1). Confirm before building.
- It adds **no analytics, charts, or insights**. Total, per-person share, stamps. Nothing else.
- Bundle ID, package name and domain are not chosen, so the card carries the wordmark only (no URL, no QR). Add a link once the domain exists (§12).

## 1. Problem and goal

**Problem.** When a trip ends, the group's best moment is also the app's last touchpoint. Nothing is worth posting, and the finances can't leave the app (only a balances PDF exists, `src/exportBalances.ts`).

**Goal.** Give every member (a) one good-looking card to post when the trip ends, and (b) a file of the trip's expenses for their own records or a spreadsheet.

**Why it matters for growth.** Each shared card shows the along wordmark to people who have not installed the app, in the same visual language as the launch assets (`docs/launch/`). It is organic, free, and happens at the moment of peak satisfaction.

**Success measures** (no new analytics SDK; read from existing data and store/web referral reports):
- Share of completed trips where at least one member shares a card (needs one `recap_shared` row — see §9; skip if you don't want it).
- Qualitative: launch-post mentions and installs from shared cards.
- Export: support questions about "getting my expenses out" drop to zero.

**Non-goals.** AI-written summaries, photo collages, video recaps, public trip pages, social feed, leaderboards, currency conversion, tax/accounting formats (QBO, OFX, XLSX), scheduled exports, importing CSV back.

## 2. Users and permissions

| Who | Recap card | Export |
| --- | --- | --- |
| Owner, members (incl. non-owner) | Create and share | Export all expenses |
| Guests (no account) | Appear on the card; cannot use the app | n/a |
| Non-members | No access (RLS) | No access |

Any current member may generate. Completed/archived trips work; an **active trip also works** (card is labelled "so far", no stamp — see §5.4), because export is useful mid-trip. All data comes through existing RLS reads; no new write paths.

## 3. User stories

IDs are provisional (`RC-`); renumber to match the sprint doc when created.

| ID | Story |
| --- | --- |
| RC-01 | As a member, I can open a recap of my trip showing total spend, each person's share, and the trip's stamps. |
| RC-02 | As a member, I can share the recap as an image to any app via the share sheet. |
| RC-03 | As a member, I can choose what the card reveals (per-person amounts on/off) before sharing. |
| RC-04 | As a member, I am nudged to share the recap right after a trip is completed, and can skip it. |
| RC-05 | As a member, I can export the trip's expenses as a CSV. |
| RC-06 | As a member, I can export the trip's expenses as a PDF. |
| RC-08 | As a member, the recap looks like a collectible playing card, and tilting my phone tilts the card in 3D, with a light sheen that moves across it. |
| RC-07 | As a member, exports and the card still work for guests, multiple currencies' exponents (0/2/3 decimals), and trips with zero expenses (with clear messaging). |

## 4. Entry points

1. **Complete-trip confirmation** (`app/trip/[id]/complete.tsx`): after "Trip completed", a secondary Outlined button "Share recap". Primary action stays "Done" (one Brand Black primary per screen).
2. **Trip summary** (`app/trip/[id]/summary.tsx`): a "Recap" row (List Row) beneath the existing links, opens the recap screen.
3. **Expenses tab / trip settings**: an "Export expenses" row, opening a bottom sheet with CSV / PDF choice.
4. **Passport stamp detail**: "Share" is out of scope (a stamp already opens the summary, which has the Recap row).

## 5. Recap card

### 5.0 Playing-card design
The recap is a **playing card**, in the same collectible spirit as the passport stamps (not a generic badge).
- **Proportions**: poker card 5:7 portrait. Exported image 1080×1512. Rounded corners (large radius from tokens), a thin inset border line in Brand Black, trip card colour as the card face.
- **Corner indexes**: top-left and bottom-right (rotated 180°), each a stacked pair: the **rank** and a small **suit mark**. Rank = trip length in days (`1`–`30`, `30+` shown as `★`); suit mark = one of four simple glyphs picked deterministically from `trip_id` (same seeding approach as `shapeFor` in `stampShape.ts`), so a trip always keeps its card. Suits are abstract travel-themed marks (compass, sun, wave, peak), not hearts/spades, to avoid gambling connotations.
- **Face**: trip name in blocky display type, total spend as the hero number, the trip's stamps as the "face art" in the centre, then the people row (below).
- **Foil edge**: no gradients. A 1px lighter inner keyline only.
- Back of card, flip, and a deck/collection view are **out of scope** (§15).

### 5.1 Content (top to bottom)
1. Trip name, destination, date range (`formatRange`), in blocky display type.
2. **Total spend** (hero), large, with currency symbol; label "Total spent". Source: `trip_summary.total_spend_minor`.
3. **Each person's share**: avatar (initials if none; guest = dashed Slate ring + Guest tag) + first name + amount. "Share" = what that person's expense participation costs them (`costMinor` in `balanceReport.ts`), **not** what they paid and **not** their net balance. Sorted by amount descending, ties by `trip_member_id`. A one-line footer reads "Share = each person's part of every expense".
4. **Passport stamps**: the trip's arrival and departure impressions, rendered with the existing `Stamp` component and `impressions()` seeds so the card matches the passport exactly.
5. Footer: "Made with along" wordmark, set between the bottom corner index and the border. Nothing else.

### 5.2 Variants and limits
- **Aspect**: 5:7 portrait (1080×1512). The launch reel is 4:5; a 4:5 crop is deferred. Square and 9:16 variants are deferred.
- **Colour**: the trip's card colour as background (one of six); Brand Black text; no gradients.
- **Many people**: up to 6 people listed; beyond that, show the top 5 plus "+N others" (amount omitted for the overflow row). A row never wraps names — truncate to the first name, then initials.
- **Privacy toggle** (RC-03): "Show what each person spent" (default **on**). When off, the card shows only total, headcount and stamps. A one-line hint explains that names and amounts are visible to anyone who sees the image. Last choice is remembered per device (local, convenience only).
- **Active trip**: heading "So far", no stamps row (stamps are awarded on completion).
- **Zero expenses**: card still renders with ₹0 total and no people rows; share is allowed but the empty hint "No expenses recorded" shows in the preview.
- **Outstanding balances**: not shown on the card (it is a celebration, not a bill). A completed trip with unsettled money still shares normally.

### 5.3 Image generation
- Render the card as a native view at a fixed logical size and rasterise it to a **flat, un-tilted PNG** (tilt, sheen and shadow are screen-only; the capture view is a separate untransformed copy of the same component) with Skia's `makeImageFromView` (already installed for the passport stamps; **no new dependency**). Share with the already-installed `expo-sharing` (`mimeType image/png`). If the module is missing in an older binary, fail with the same graceful `{ ok: false, message }` pattern as `exportBalancesPdf`.
- Fonts: Geist Sans per-weight family names; wait for fonts and stamp assets to load before capture (avoid blank first capture).
- Dynamic Type must not change the exported image: the card uses fixed font sizes inside the capture view only; the preview around it respects Dynamic Type.
- File name: `<Trip name> - recap.png` (same sanitising as the balances PDF).
- Share sheet title: "<Trip name> on along". No caption text is pre-filled.

### 5.5 Tilt (3D) behaviour — RC-08
- **Input**: device rotation. Use Reanimated's `useAnimatedSensor(SensorType.ROTATION)`; Reanimated is already installed, so **no new dependency** and the sensor runs on the UI thread.
- **Output**: the card's `rotateX` / `rotateY` (with `perspective`) follow pitch / roll, clamped to **±12°**, relative to the angle when the screen opened (so holding the phone at any posture starts flat). Light parallax: the stamps layer shifts up to ±6pt opposite the tilt; a soft shadow under the card shifts the other way.
- **Sheen**: a translucent white diagonal highlight band moves across the card with tilt (`translateX` + `opacity`). Solid colour band, no gradient library.
- **Feel**: gentle spring smoothing on the sensor value; returns to flat when the phone is flat or the screen loses focus. Sensor stops on blur/unmount.
- **Motion rules (CLAUDE.md)**: transform and opacity only, UI thread, never blocks input, interruptible. This is **user-driven (not looping)**, and I propose adding it to the list of allowed delight moments ("recap card tilt"); needs your OK (§16).
- **Reduced motion** (`useReducedMotion`) or no sensor available (simulator, some tablets, permission denied on iOS web-views): the card is flat and static. A drag-to-tilt fallback is **not** built.
- **Perf guard**: card + two layers only; no re-render on sensor ticks (shared values). Target 60fps on a mid-range Android.
- **The shared image is flat.** Sharing a 3D tilt would need video; a short tilt-sweep MP4/GIF for posting is a possible v2 (§15).

### 5.4 Behaviour
- Preview screen `app/trip/[id]/recap.tsx`: card preview, privacy toggle (switch), one Primary "Share" button, a Text button "Save to Photos" is **out of scope** (needs a permission; the share sheet already offers Save Image).
- Loading skeleton, error + retry, and offline indicator per the standing rules. Offline: card builds from cached TanStack data if present; otherwise the error state.
- Reduced motion: card is static (no tilt, no sheen), appears with a crossfade.

## 6. Expense export

### 6.1 CSV (RC-05)
One row per expense, ordered by `expense_date`, then creation time.

| Column | Notes |
| --- | --- |
| `date` | ISO `YYYY-MM-DD` |
| `title` | text |
| `category` | stored value |
| `amount` | decimal string by currency exponent (e.g. `1250.50`; `1250` for exponent 0; `12.345` for exponent 3). Built from integer minor units with string maths — **never a float** |
| `amount_minor` | integer minor units (lossless, for programmatic use) |
| `currency` | ISO code |
| `paid_by` | member display name |
| `added_by` | member display name (kept separate from `paid_by`) |
| `split_method` | equal / custom / percentage / shares |
| `participants` | `Name: amount; Name: amount` — each participant's owed amount, same formatting as `amount` |

A second block below a blank row is **not** used; settlements go in a **second file** option (`<Trip> - payments.csv`: `date, from, to, amount, amount_minor, currency`), offered as a toggle "Include payments between people" which then shares both files in one sheet. Default off.

Rules:
- UTF-8 **with BOM** so Excel reads ₹, é, emoji correctly. CRLF line endings. RFC-4180 quoting for commas, quotes and newlines.
- **CSV-injection guard**: any text cell starting with `=`, `+`, `-`, `@`, tab or CR is prefixed with `'`. Applies to `title`, names and participants. (Amount columns are generated, so they are safe — but negative amounts never occur.)
- Soft-deleted/reversed expenses are **excluded**. Expenses edited keep their current values; version history is not exported.
- Guests exported by their name; guests are never merged by name (two guests with the same name appear as given, in separate rows).
- Zero expenses → the Export action shows "No expenses to export yet" instead of producing an empty file.

### 6.2 PDF (RC-06)
Reuse the `expo-print` + `expo-sharing` pattern and styles from `domain/balanceReport.ts` / `src/exportBalances.ts`. Contents: trip name, dates, generated-on date, total, per-person share table, then the expense list (date, title, paid by, amount). **Not** the per-expense participant breakdown (the CSV has it); long lists paginate naturally via print CSS (`thead` repeat). File name `<Trip> - expenses.pdf`. All HTML is built from escaped strings (reuse the existing escaper in `balanceReport.ts`; extend it if absent).

### 6.3 UX
Bottom Sheet "Export expenses": two List Rows — "Spreadsheet (CSV)", "PDF" — plus the payments toggle (CSV only). Choosing one builds the file and opens the share sheet. Inline progress text "Preparing…" (no indefinite spinner; the build is local and fast). Errors keep the sheet open with a retry.

## 7. Domain logic (pure, `src/domain/`)

New pure modules, unit-tested exhaustively, no React or Supabase:
- `recap.ts`: `recapCard(input) → { title, range, totalMinor, people: {id, name, guest, shareMinor}[], overflow, stamps }`. Applies the sort, the 6-person cap, and the privacy toggle.
- `csv.ts`: `expensesCsv(rows, currency)`, `paymentsCsv(...)`, `csvCell(text)` (quoting + injection guard), `minorToDecimal(minor, exponent)` (string maths). Reuse `formatMinor`/`money.ts` conventions; do not duplicate.
- Extend `balanceReport.ts` (or a sibling `expenseReport.ts`) for the PDF HTML.

Shares come from the same query as the balances report (`ledger_entries`); the card must never recompute balances in the UI.

## 8. Data and API

- **No new tables.** Reads only, through RLS.
- Possible new read: a `trip_expense_export(p_trip uuid)` **security-invoker view/RPC** returning expenses joined with payer, adder and participant owed amounts, so the client makes one request instead of N. If the existing `expenses` + `expense_participants` select (see `src/api/expenses.ts`) already returns everything with one query, **skip the RPC** and add `loadExpensesForExport(tripId)` in `src/api/expenses.ts` instead. Default: skip the RPC.
- `src/api/` stays the only Supabase caller; screens use a hook (`useTripRecap`, `useExpenseExport`).
- Idempotency/versioning: n/a (read-only).

## 9. Optional: share tracking

Not required for v1. If you want the success metric, add one `trip_events`-style insert (`recap_shared`, trip, member) via a tiny RPC with an idempotency key. **Default: skip.** Measure growth from store-referrer reports instead.

## 10. Edge cases

| Case | Behaviour |
| --- | --- |
| Zero expenses | Card renders with 0 total; CSV/PDF blocked with message |
| One-person trip | Card shows 1 person; fine |
| 10+ members | Top 5 + "+N others" |
| Very long trip/person names | Truncate with ellipsis; never overflow the card |
| Guest with same name as member | Listed separately; Guest tag disambiguates |
| Zero- and three-decimal currencies | Amounts honour `exponent` everywhere (card, CSV, PDF) |
| Trip not completed | "So far" card, no stamps |
| Member removed after trip | Their historical share still appears (ledger rows persist) |
| Offline | Use cached data, else error state |
| Older app binary without `view-shot` | Friendly failure, no crash |
| Name contains `=cmd` etc. | Prefixed with `'` in CSV |
| RTL/emoji names | Render; CSV is UTF-8 + BOM |
| Sum of shares ≠ total | Must not happen (largest-remainder splits sum to the total); recap test asserts it, and the card never "fixes" it |

## 11. Accessibility and design

- All colours, type, spacing from `src/theme/tokens.ts`; components reused (Primary/Outlined/Text buttons, List Row, Bottom Sheet, Avatar).
- One Brand Black primary action per screen. Alarm Red unused.
- The card image is not itself accessible (it's an image artefact); the **preview** exposes the same facts as text for VoiceOver/TalkBack ("Goa trip. Total spent ₹48,200. Asha ₹16,100…"). Switch and buttons ≥ 44pt / 48dp, with labels and roles.
- Colour never carries meaning alone: the guest status uses the Guest tag plus the dashed ring.
- Share = "owes/paid" language elsewhere is unchanged; the card uses "share" only with its footnote.
- Animation: only the tilt in §5.5; reduced motion disables it. Text and numbers are never tweened or distorted by tilt beyond the rigid 3D rotation (amounts stay readable; ±12° keeps contrast and legibility). The preview text alternative is unchanged.

## 12. Acceptance criteria

**RC-01** Recap shows trip name, dates, total, per-person shares and stamps, matching `trip_summary` and the balances report. Shares sum to the total. An active trip shows "So far" and no stamps.
**RC-02** Tapping Share produces a 1080×1350 PNG of the preview, opens the system share sheet, and the file name is the sanitised trip name. Failure shows a retryable message and loses nothing.
**RC-03** Toggling "Show what each person spent" off removes names and amounts from both preview and exported image. The choice is remembered on the device.
**RC-04** After completing a trip the confirmation shows "Share recap" (Outlined) and "Done" (Primary). Skipping has no consequence.
**RC-05** CSV opens in Excel/Numbers/Sheets with correct characters, one row per active expense, correct decimals for exponents 0/2/3, separate `paid_by` and `added_by`, injection-safe cells.
**RC-06** PDF opens via the share sheet, lists every active expense, totals match the app, long lists paginate.
**RC-08** The card renders at 5:7 with corner indexes (rank = trip days, deterministic suit mark) and the centre stamps. Tilting the phone rotates the card up to ±12° with parallax and a moving sheen; it returns flat when the phone is flat; with reduced motion or no sensor it is static. The exported PNG is flat and identical regardless of tilt.
**RC-07** Zero-expense trips, guest members, and an older binary all produce a clear message instead of an empty file or a crash.

## 13. Test plan

Per the repo rules (story id in test name; domain = exhaustive Jest; mock only `src/api/`; inject clock and ids).

- **Domain (`recap.test.ts`, `csv.test.ts`)**: loop amounts × participant counts asserting card shares sum to the total; person cap and "+N others"; sort and tie-break by `trip_member_id`; privacy toggle strips names/amounts; `minorToDecimal` for exponents 0/2/3 including `0`, `1`, `999`, large values (no float); `csvCell` quoting, newline, quote doubling, injection prefixes; BOM and CRLF present; guests with duplicate names stay separate; deleted expenses excluded.
- **API**: `loadExpensesForExport` returns payer and adder separately; RLS failure (non-member) returns the "isn't available" message.
- **Screens (logic-bearing only)**: recap screen privacy toggle changes the preview text; export sheet disables with zero expenses; share failure keeps the screen state. `view-shot`, `expo-sharing`, `expo-print` mocked at the edge, like the balances export.
- **Domain** (`recap.test.ts`): rank = days (incl. 1 and 30+), suit mark is deterministic per trip id and stable across calls; tilt maths (`clampTilt`, relative-to-initial angle, ±12° bound) as a pure function in `src/domain/` .
- **Component**: with reduced motion on (the default in tests), the card renders no tilt layer. Do not test animation timing or sensor output.
- **No** snapshot tests of the card image, no animation tests. Pixel review is done manually on iOS and Android against the launch assets.
- Full suite once before done; CI unchanged (no DB changes, so no pgTAP unless the optional RPC is added, in which case: non-member cannot read, cross-trip isolation).

## 14. Delivery plan (one story at a time)

1. Domain: `csv.ts`, `recap.ts` + tests. (RC-05/01 foundations)
2. API/hook: `loadExpensesForExport`, `useTripRecap`.
3. CSV export sheet + share (RC-05, RC-07).
4. PDF export (RC-06).
5. Recap card component (playing-card face) + preview screen + `view-shot` share (RC-01, 02, 03).
5b. Tilt: pure `clampTilt` + sensor wiring, reduced-motion fallback (RC-08).
6. Entry points: complete-trip button, summary row (RC-04).
7. Device pass on iOS and Android; update store screenshots / launch assets if the card should be advertised.

## 15. Decisions taken by default (change if wrong)

- Card shows **shares per person**, default **on**, with a toggle. (Alternative: default off for privacy.)
- 5:7 playing-card portrait only; flat PNG export; tilt is screen-only, via Reanimated (no new dependency).
- PNG via `react-native-view-shot` (one new dependency).
- CSV: one row per expense, payments as an optional second file; PDF: summary + list, no participant breakdown.
- Active trips can export and see a "so far" card.
- No share tracking, no new tables, no RPC.

## 16. Open questions

0. OK to add "recap card tilt" to the allowed delight moments in CLAUDE.md's animation rules?
1. Pull-forward of Phase-2 "trip recap" approved (§0)?
2. Add a link or QR to the card once the domain is chosen — which destination (store page vs. site)?
3. Should the card default to showing per-person amounts, given it names real people publicly?

## 17. Update: two-sided card (RC-09)

- **Front** (the one to post): "THIS WAS …" tagline named after the category the trip spent most on (foodie, comfort, road trip…; "A trip to remember" with no expenses), days / people / activities, and up to four facts: top spend, biggest splurge, priciest day, and who picked up the most (or the per-person per-day average when people are hidden). Both stamps sit faintly in the corners. No total spent and no per-person shares, so it is the safer side to post.
- **Back**: total spent and each person's share (hidden by the privacy switch).
- **Flip**: tap the card; rotateY, 400 ms; crossfade with Reduce Motion. The Share button shares the side showing (`… - recap.png` or `… - recap (total).png`). Tilt, the holographic edge and the texture apply to both sides.
- Facts are pure functions of the recorded expenses (`tripFacts` in `src/domain/recap.ts`), with ties broken by name. Nothing is stored.

## 18. Update: travel postcard (replaces the playing-card look)

- The card is a **travel postcard**, still 5:7 portrait, two sides, tap to flip, tilt, paper texture and a flat shared image. Red and blue **airmail border** on cream paper tinted with the trip colour; "POST CARD" heading; an "AIR MAIL" label.
- **Front:** a perforated **postage stamp** (country name, a picture of the place, trip length as the "price") with a **postmark** (ring, town, date, wavy lines) across it; "Greetings from {town}!" in marker-style handwriting (`handwritingFont`, Caveat Bold); the tagline, days / people / activities, and the highlights on ruled lines; the departure passport stamp, faint, off the bottom-left corner.
- **Back ("THE SPLIT"):** postmark, total spent and each person's share on ruled lines.
- Removed: rank and suit corners, the holographic edge and the arrival passport stamp on the card.
