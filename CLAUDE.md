# along

Mobile app (iOS + Android) for groups on a trip: shared itinerary, who paid what, exact-participant expense splits, settle-up, memories. Stack: Expo + React Native + TypeScript, Supabase (Postgres, Auth, Realtime, Storage, Edge Functions), TanStack Query, Zustand, Zod.

## Read first: the four source documents

Do not load a document whole. Search for the heading or table you need and read only that.

| Document | Use it for |
| --- | --- |
| along — Product Requirements Document | Behavior and business rules: §5 roles, §7 expenses, §10 business rules, §17 screen acceptance criteria, §20 edge cases, §21 states, §22 definition of done and critical test scenarios |
| along — Technical Architecture & API Specification | RPC and API signatures §4–9, realtime and offline §10, security §11, build order §12 |
| along — Database Schema Design | Tables §4–7, balances §8, triggers §9, RLS and storage §10, indexes §11, migrations §12 |
| along — Sprint N: \<epic name\> (7 docs, one per sprint) | Stories, acceptance and success criteria, user flow, and journey map for the sprint you are on |
| DESIGN.md | Every visual and interaction detail: tokens, type scale, components, states, motion cues. The single source for anything a screen renders |

Precedence: schema doc for the database, API doc for RPC shapes, PRD for behavior, DESIGN.md for anything visual. If two documents disagree, stop and ask one short question.

## Working mode: minimal tokens

- One sprint at a time. Open only that sprint's doc; do not read or build against Sprint N+1 until Sprint N is done.
- One story at a time, from the current sprint's epic. Do not plan or build ahead.
- A sprint is done when every story in its doc meets its acceptance criteria and its own tests pass. Only then move to the next sprint's doc.
- Read narrowly: Grep or Glob first, then Read with offset and limit. Never re-read a file you just wrote or edited.
- Code first, then at most three short lines (what was skipped, when to add it). No recaps, no feature tours, no design essays.
- Do not paste long command output or file contents back. Report a failure in one line.
- Blocked only by a decision you cannot default: ask one short question. Otherwise take the proposed default and note it in one line.
- New dependency: only with a one-line reason. Prefer DB constraint over app code, native over library.

## Do

- Follow the sprint order in the API doc §12. Build the data model and RLS before screens.
- Business rules go in `security definer` RPCs; reads go through RLS; split and balance math is pure functions in `src/domain/`.
- Money is integer minor units. Splits round by largest remainder, ties by `trip_member_id`.
- Retryable creates take an idempotency key. Updates check `version`.
- Reuse the shared components and hooks before writing new ones.

## Avoid

- Storing, hand-editing, or UI-computing balances. They come only from `ledger_entries`.
- Floats or decimals for money.
- Merging `paid_by` and `added_by`, implying expense participation from trip membership, or merging guests by name.
- Client writes to RPC-only tables, skipping RLS, or trusting the client for authorization.
- Editing or deleting settlements, hard-deleting financial rows, or silently overwriting a concurrent edit.
- Rejecting a location because a Maps link will not resolve, or blocking itinerary items outside the trip dates. Keep the raw text; flag out-of-range items.
- MLP-excluded features: booking, AI planning, OCR, route optimization, social feed, public profiles, recommendations, loyalty, advanced analytics, automatic currency conversion.
- Unrequested abstractions, config, scaffolding, dependencies, files, or docs.

## Testing rules

- Every story's acceptance criteria get at least one test. Put the story id in the test name (`US-06 records payer and added-by separately`).
- Money and domain logic (`src/domain/`): plain Jest unit tests, exhaustive. Cover all four split methods, payer-only split, zero participants rejected, zero-decimal and three-decimal currencies, balances summing to zero, simplified debts. Rounding is tested by looping over ranges of amounts and participant counts and asserting every split sums to the total. No property-testing library.
- Database: a pgTAP test ships with every migration (`supabase test db`). Cover cross-trip isolation, split must sum, one active owner, settlements immutable, reversal must mirror, idempotent creates, one stamp per trip.
- Trust boundaries always get failure tests: unauthorized edit rejected, invalid split rejected, duplicate submit yields one row, stale version rejected, offline queue syncs exactly once.
- Critical end-to-end flows are listed in the PRD §22. Do not restate or extend them without being asked.
- Component tests only for logic-bearing components (split control, participant picker, amount input). Query by role, label, or text, assert behavior, never implementation.
- No snapshot tests, no coverage targets, no tests for trivial getters or pure layout.
- Mock only the network edge in `src/api/`. Never mock `src/domain/`. Inject the clock and ids; no real time, randomness, or network in tests.
- A bug fix starts with a failing test that reproduces it.
- While working, run only the affected tests. Run the full suite once before calling a story done, and report only failures.
- CI must pass: balance drift query returns no rows; every `public` table has RLS on.

## Design rules

DESIGN.md is the single source for tokens, type scale, components, and states. Read it narrowly (the token table or component you need), never load it whole.

- All colors, type, spacing, and radii come from `src/theme/tokens.ts`, generated from DESIGN.md's token tables. No hard-coded values in screens.
- Feel: personal, lightweight, calm, playful, premium, travel-oriented — deep Forest Ink green with a single Bright Green accent, pill buttons, blocky Black display type at the moments that matter. Never a corporate dashboard, accounting-software look, dense table, or complex form.
- Bright Green is a fill only, never text, icon, or thin stroke on light surfaces; always pair it with Forest Ink content. One Bright Green primary action per screen.
- The common case is fastest. Adding an expense takes three taps or fewer using defaults (payer is me, equal split among selected, date today). Advanced split, category, and receipt are progressively disclosed.
- Reuse the components DESIGN.md defines (Primary/Outlined/Text buttons, List Row, Participant Avatar Item, Amount Input, Bottom Sheet, Trip Summary Card, etc.) before inventing new ones.
- Guests are visually distinguishable (dashed Slate ring, Guest tag) but never second-class in size or spacing. Use initials when there is no avatar.
- Show net balance in plain words ("You owe Rahul ₹800"), not a list of transactions. Say "owes" and "paid", never debit, liability, or ledger. Format amounts by the currency's minor-unit exponent with tabular numerals.
- Never convey meaning by color alone — pair every color state with text or an icon. Alarm Red is for errors and destructive actions only, never decorative and never a money-sign color.
- Every data screen has a loading skeleton, a contextual empty state with one clear action, an error state with retry, and an offline indicator. Forms keep their data on error. Validation is inline, specific, and actionable.
- Accessibility: touch targets at least 44pt on iOS and 48dp on Android, Dynamic Type support with no fixed-height text containers (`minHeight` only), AA contrast, an accessibility label and role on every interactive element.
- Text is Geist Sans only. Register each weight as its own family name; never combine a custom `fontFamily` with `fontWeight`.
- Prefer native components and behavior (date picker, share sheet, safe areas, back gesture). iOS and Android have the same features and flows, each with its own platform conventions.
- Passport stamps feel collectible and travel-themed (Forest Ink double-ring stamp, Black caps, Bright Green dot), not like generic achievement badges.
- Produce mockups only when asked.

## Animation rules

- Default is no animation. Animate only to explain a change, confirm an action, or keep spatial context: a new expense settling into the list, a balance updating, a member joining, a stamp being awarded. No decorative or looping motion.
- Prefer built-in transitions (Expo Router screen transitions, layout animations) before custom ones. Use Reanimated only if it is already installed; otherwise React Native `Animated` with `useNativeDriver`. Add no animation library.
- Animate only `transform` and `opacity`. Never animate width, height, or position through the JS thread.
- Timing: micro feedback 100–150 ms, enter and exit 200–300 ms, nothing over 400 ms except the passport stamp moment. Ease-out to enter, ease-in to exit, a gentle spring for gestures and direct manipulation.
- Never block or delay input. State changes apply immediately (optimistic UI); animation is cosmetic and interruptible.
- Honor reduced motion (`AccessibilityInfo.isReduceMotionEnabled` or Reanimated's `useReducedMotion`): replace movement with an instant change or a crossfade.
- Never tween money. Amounts and balances show their exact final value at once; a brief highlight or crossfade is allowed.
- Lists animate a single insert or remove only. No staggered animation across long lists and no entrance animation on first load beyond the skeleton fade.
- Sync and offline states use a quiet indicator, never a spinner that spins indefinitely.
- Keep durations and easings in one shared motion constants module. No magic numbers inline.
- Allowed delight moments, each single, short, and skippable: passport stamp award, trip completion, "everyone is settled".
- Do not write tests for animation timing. In tests, run with reduced motion on.

## Essentials

- Layers: `src/domain/` is pure (no React, no Supabase); `src/api/` is the only Supabase caller; `src/hooks/` wraps it in TanStack Query; UI reads hooks and stores only.
- Layout: `app/` routes, `src/{domain,api,hooks,stores,components,offline}`, `supabase/{migrations,functions,tests}`.
- Names: app is `along`, Expo slug `along`. Bundle ID, package name, and domain are not chosen yet.
- Commands (adjust to `package.json`): `npx expo start`, `npx tsc --noEmit`, `supabase start`, `supabase db reset`, `supabase test db`.
