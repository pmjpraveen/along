# Along — Style Reference
> deep moss with bright green. Fresh green sparks on a dark forest floor, with large, light-handed display type announcing every move.

**Theme:** light. Forest Ink cards and sections invert the canvas for emphasis; there is no full dark theme in the MLP.
**Platform:** iOS + Android, phone-first, React Native (Expo). All sizes are density-independent: 1 unit = 1pt on iOS, 1dp on Android. Text scales with the system font size.
**Font:** Geist Sans, one family for everything.

Along speaks in a confident, warm voice. A deep forest green (#163300) carries text, dark cards, and icons, while a single fresh green, Bright Green (#9FE870), marks the primary action, the active tab, the current selection, and key highlights. Display type is Geist Sans Medium, tightly tracked and set large at the moments that matter: the welcome screen, a trip header, "everyone is settled". Everything else stays restrained on a near-white canvas with soft gray-green surfaces (#e8ebe6). Buttons, tags, tabs, and avatars are pill-shaped; cards and inputs take gentle corners; large cards and sheets take 28. Nothing gradients. The yellow and forest pairing inverts cleanly when a card goes dark, which creates rhythm without decoration.

## Current styling — the refresh that supersedes anything below that disagrees

The app moved from the green look to a neutral one. Where a section further down still says Bright Green or Forest Ink for a button, a field or a text colour, this section wins. Every value is a token in `src/theme/tokens.ts`.

**Text and icons**
- Primary text `#222222` (`color.obsidian`, `color.brandBlack`). Secondary and quieter text `#6a6a6a` (`color.charcoal`, `color.slate`); there is one grey, not two.
- Icons on a grey tile are `#444444` (`color.iconInk`). Red stays for destructive things only (Delete trip, Delete account, errors).

**Buttons** (`Button`, all with 16px smooth corners)
- Primary: `#222222` fill, white label, 56 tall when large. Secondary and secondary-neutral: `#f2f2f2` fill, `#222222` label. Disabled: `#f2f2f2` fill, grey label. Destructive: white fill, red border and label. Tertiary: no fill, underlined `#222222` label.
- Round icon buttons: back, bell, history and settings are 48pt white circles with a 1px outline and a `#222222` icon. Close buttons and icon tiles are `#f4f4f4` circles with a `#444444` icon (`color.softGrey`).

**Inputs** (`TextField`, date, time, place, amount, and the Paid by / Split with pickers)
- Label above, then a white box: 16px radius, 1px `#d0d0d0` border (`color.inputBorder`), 48 tall, 16pt value text. Focus is a 3px `#222222` border; errors are 3px red with a message. A picker row is the same box with the value and a chevron, never a label inside the box.
- The big amount input is only for the main Amount. Per-person fields in a split are ordinary inputs on the same row as the person's name, with the percent sign after the number. When a split adds up, nothing is shown; only what is left or over is.

**Choices**
- Chips (`Chip`): 32pt pills. Selected `#444444` with a white label; unselected `#f4f4f4` at 85% with a `#444444` label. The touch area is taller than the pill.
- Checkboxes and radios: chosen is a black fill with a white tick or dot; unchosen is a grey outline.
- Calendar: the selected day or range is `#444444` with white numbers; weeks start on Sunday.

**Surfaces**
- Pages are plain white: the coloured header gradients are gone. Sheets and dialogs dim the screen with a neutral `rgba(0,0,0,0.25)` scrim (`color.scrim`).
- Bottom sheets: content is 20pt from the edges, list rows use `SheetRows` so their icons line up with the title, and the bottom space is only the home-indicator area (capped at 34pt).
- Avatars: `#f4f4f4` circle, `#444444` initials.

**Trip cards and colours**
- Six card colours, stored on every trip as an index 0 to 5 and given when the trip is created, in turn per owner: `#ffc091`, `#e5ebff`, `#ebe0d9`, `#d9e0ab`, `#def6ff`, `#fff27b` (`CARD_COLORS`). The owner can change it in Trip settings.
- Home and the Completed trips cards: photo, a date pill (the card colour darkened about 10%), the trip name on a tilted `#222222` tag (wrapped lines merge into one shape, two lines at most), and the place. Completed cards add a faint arrival stamp (top right) and departure stamp (bottom left), each cut off by the card's edge.
- Trip page: the trip's colour is a band behind the header. The navigation row stays pinned on the band, the details fold away under it as you scroll, and "Plans" tucks away so only the day chips stay pinned. Plan cards are `#f4f4f4`; a map preview sits 8pt in from the card's left, right and bottom.

**Stamps:** ten shapes (rectangle, oval, circle, hexagon, cut-corner, octagon, stadium, arch, ticket, triangle) and ten frame styles (solid, dashed, bold, triple, banner, dotted, beaded, dash-dot, stencil, offset), chosen from the trip so a stamp always looks the same.

**Brand:** the wordmark is `#222222` on white; the splash and icon sit on `#222222`, and the splash animation is the six tilted colour stripes.

## Tokens — Colors

Every colour is a token in `src/theme/tokens.ts`; screens never hard-code a hex. Tokens that no screen used have been removed (Bright Green as a button colour, Spruce, Soft Grey, Fog, Control, the secondary fill, and the bright and dark secondary palette except the two badge tints and Dark Gold).

### Text, icons and surfaces

| Name | Value | Token | Role |
|------|-------|-------|------|
| Brand Black | `#222222` | `color.brandBlack`, `color.obsidian` | Primary text, headings, primary buttons, the wordmark, focus borders, chosen checkboxes and radios, switch track when on |
| Charcoal | `#6a6a6a` | `color.charcoal`, `color.slate` | Secondary text and anything quieter. One grey, not two |
| Icon Ink | `#444444` | `color.iconInk`, `color.dateFill` | Icons on grey tiles and initials in avatars, the selected chip and the selected calendar day |
| Pebble | `#868685` | `color.pebble` | Placeholders and disabled labels. Not for body text |
| Paper | `#ffffff` | `color.paper` | Screen canvas, inputs, sheets, dialogs |
| Soft Grey | `#f4f4f4` | `color.softGrey` | Icon tiles, close buttons, avatars, plan cards, the unselected chip (at 85%), summary cards |
| Button Grey | `#f2f2f2` | `color.buttonGrey` | Secondary and disabled button fill |
| Input Border | `#d0d0d0` | `color.inputBorder` | 1px border of input fields and the switch track when off |
| Border Neutral | `rgba(14,15,12,0.12)` | `color.borderNeutral` | Hairlines: lists, dividers, round outline buttons |
| Neutral Wash | `rgba(22,51,0,0.08)` | `color.neutralWash` | Neutral alert and card backgrounds, tracks (flattened: `color.neutralSolid` `#ecefeb` where surfaces overlap) |
| Cream | `#f8f4ed` | `color.cream` | Background of error messages (the negative alert) |
| Scrim | `rgba(0,0,0,0.25)` | `color.scrim` | The neutral dim behind every sheet and dialog |
| Toast | `rgba(0,0,0,0.85)` | `color.toast` | Toast background, with white text |
| Forest Ink | `#163300` | `color.forestInk` | Legacy brand dark, now only in a few details; new work uses Brand Black |
| Signal Blue | `#0b4c72` | `color.signalBlue` | Supporting accent for links and map moments |

### Status

| Name | Value | Token | Role |
|------|-------|-------|------|
| Alarm Red | `#cb272f` | `color.alarmRed` | Errors and destructive actions only, always with an icon and words. Never decorative, never a money-sign colour |
| Positive | `#2f5711` | `color.positive` | Success icon and notices |
| Warning | `#ffd11a` | `color.warning` | Warning icon; the glyph on it is dark |
| Dark Gold | `#3a341c` | `color.darkGold` | Label text on the warning badge |

Badge tints (`tint.*`): error is red at 12%, success is Bright Green at 30%, warning is Bright Yellow `#ffeb69` at 40%, neutral is Bright Blue `#a0e1e1` at 22%.

### Interaction fills

| Token | Hover | Pressed |
|-------|-------|---------|
| `buttonState.primary` | `#383838` | `#000000` |
| `buttonState.secondary` (and secondary-neutral) | `#e9e9e9` | `#dcdcdc` |
| `buttonState.destructive` | `#fdf2f2` | `#fbe2e2` |
| `buttonState.tertiary` | `#f4f4f4` | `#e8e8e8` |
| `rowState` (list rows) | `#f4f4f4` | `#ececec` |

Hover only shows with a pointer (iPad, Android with a mouse, web); a finger only ever presses. A pressed button also dips a little, a pressed row only fills.

### Trip card colours

Six, stored on every trip as an index 0 to 5 (`CARD_COLORS` in `src/domain/trip.ts`): `#ffc091`, `#e5ebff`, `#ebe0d9`, `#d9e0ab`, `#def6ff`, `#fff27b`. A date pill uses the card colour darkened by about 10% (`mix(card, "#000000", 0.105)`), and gradients are drawn as thin strips with `mix(a, b, t)`.

### Figma colour variables (source of truth)
Imported from the Wise UI Kit "colours" page. `src/theme/tokens.ts` exports what the app uses as `core`, `secondary` and `product`, and `src/theme/tokens.test.ts` fails if any value drifts.

| Group | Figma variable | Value |
|-------|----------------|-------|
| Core | `core/bright green` `core/forest green` | `#9fe870` `#163300` |
| Secondary | `secondary/bright yellow` `bright blue` `dark gold` | `#ffeb69` `#a0e1e1` `#3a341c` |
| Product content | `primary` `secondary` `tertiary` | `#222222` `#6a6a6a` `#6a6a6a` |
| Product interactive | `secondary` | `#868685` |
| Product background | `screen` `neutral` | `#ffffff` `#16330014` |
| Product border | `neutral` | `#0e0f0c1f` |
| Product sentiment | `negative` `positive` `warning` | `#cb272f` `#2f5711` `#ffd11a` |

### Contrast (approximate)

| Pair | Ratio | Use |
|------|-------|-----|
| Brand Black on Paper | 15.9:1 | Body text and headings |
| White on Brand Black | 15.9:1 | Primary button label, toast |
| Charcoal on Paper | 5.4:1 | Secondary text (passes AA) |
| Charcoal on Soft Grey | 4.9:1 | Secondary text on cards (passes AA) |
| Icon Ink on Soft Grey | 8.9:1 | Icons and initials on tiles |
| White on Icon Ink | 9.7:1 | Selected chip and calendar day |
| Alarm Red on Paper | 5.4:1 | Error text |
| Alarm Red on Cream | 4.9:1 | Error message on its background |
| Pebble on Paper | 3.6:1 | Placeholders and disabled only |
| Input Border on Paper | 1.5:1 | A hairline, never carrying meaning on its own |

## Tokens — Typography

### Geist Sans — the only family. Contrast comes from size and tracking, not weight: Medium speaks, Light whispers. · `font.*`
- **Weights:** Light 300, Regular 400, Medium 500 only. No SemiBold, Bold, or Black anywhere. Geist Sans is free and open source (SIL Open Font License). The `.ttf` files are bundled from `assets/fonts/`, since a device cannot read fonts installed on the developer's Mac
- **Sizes:** 12, 14, 16, 18, 20, 24, 28, 32, 40, 56
- **Line height:** 1.0 to 1.5 in general; never below 0.95, even on display, so ascenders survive Dynamic Type
- **Letter spacing:** tight at large sizes (-0.035em at 56 down to -0.01em at 20), neutral at 16, slightly positive at 12 to 14. Do not track body or caption sizes negatively
- **Numerals:** amounts use `fontVariant: ['tabular-nums']`; Geist Sans ships tabular figures
- **Role:** Medium for display, headings, amounts, labels, buttons, and tabs; Regular for body and captions; Light reserved for large decorative numerals only (never body text). Hierarchy comes from size and tracking

**React Native rules**

- Load with `expo-font` and hold the splash screen until the fonts are ready. Never show a system-font flash.
- Register each weight as its own family name (`GeistSans-Light`, `-Regular`, `-Medium`, matching the font files). Never combine a custom `fontFamily` with `fontWeight`; Android does not resolve it reliably.
- No italics.
- Bundle the static `.ttf` files (Geist ships a variable font, but a fixed instance per weight is more reliable across Android devices) and keep them out of any location outside the app bundle.

### Type Scale

| Role | Weight | Size | Line Height | Letter Spacing | Token |
|------|--------|------|-------------|----------------|-------|
| micro | Medium | 12 | 16 | +0.12 | `type.micro` |
| caption | Regular | 14 | 20 | +0.07 | `type.caption` |
| body | Regular | 16 | 24 | 0 | `type.body` |
| body-lg | Regular | 18 | 26 | -0.09 | `type.bodyLg` |
| label | Medium | 16 | 20 | 0 | `type.label` |
| label-sm | Medium | 14 | 20 | 0 | `type.labelSm` |
| title | Medium | 20 | 26 | -0.20 | `type.title` |
| heading-sm | Medium | 24 | 28 | -0.36 | `type.headingSm` |
| heading | Medium | 28 | 32 | -0.56 | `type.heading` |
| heading-lg | Medium | 32 | 32 | -0.96 | `type.headingLg` |
| display | Medium | 56 | 54 | -1.96 | `type.display` |
| amount | Medium | 18 | 24 | 0 | `type.amount` |
| amount-xl | Medium | 40 | 44 | -0.80 | `type.amountXl` |

Letter spacing is in points. Dynamic Type stays on: body and caption scale up to 1.4x, buttons and labels to 1.3x, display, heading-lg, and amount-xl to 1.15x (`maxFontSizeMultiplier`). Containers use `minHeight`, never a fixed height around text.

## Tokens — Spacing & Shapes

**Base unit:** 4

**Density:** comfortable

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 4 | 4 | `space.s4` |
| 8 | 8 | `space.s8` |
| 12 | 12 | `space.s12` |
| 16 | 16 | `space.s16` |
| 20 | 20 | `space.s20` |
| 24 | 24 | `space.s24` |
| 32 | 32 | `space.s32` |
| 40 | 40 | `space.s40` |
| 48 | 48 | `space.s48` |
| 64 | 64 | `space.s64` |

### Border Radius

| Element | Value |
|---------|-------|
| buttons | 9999 |
| tags | 9999 |
| navSegments | 9999 |
| avatars and image masks | 9999 |
| inputs | 12 |
| cards | 16 |
| largeCards and sheets (top corners) | 28 |

### Layout

- **Screen padding:** 20 on both sides
- **Section gap:** 32
- **Card padding:** 20 (24 on dark cards)
- **Element gap:** 8 to 12
- **Touch targets:** at least 44 on iOS and 48 on Android; extend small controls with `hitSlop`
- **Safe areas:** every screen respects insets; bottom actions sit above the home indicator
- **Larger screens:** center content at a 600 maximum width

## Components

### Buttons
**Role:** Every action. One component (`Button` in `src/components/Buttons.tsx`), imported from the Figma "buttons" page: five types, three sizes, active and disabled, always a 9999-radius pill.

| Type | Fill | Label | Use |
|------|------|-------|-----|
| primary | Bright Green | Forest Ink | The one "do this next" action. One per screen. No border, no shadow |
| secondary | `#ddf7d2` (pale green) | Forest Ink | A second action that should not compete with primary |
| secondary neutral | Forest Ink at 8% (`neutralWash`) | Forest Ink | Quiet actions on busy surfaces |
| destructive | Paper, 1px Alarm Red border | Alarm Red | Delete and other destructive actions only |
| tertiary | none | Forest Ink, underlined | Low-weight inline action |

| Size | Height | Padding | Label |
|------|--------|---------|-------|
| large | 52, fills the width | 14 vertical, 24 horizontal | 16/24 |
| medium | 44 (48 on Android) | 10 vertical, 16 horizontal | 16/24 |
| small | 30 | 4 vertical, 12 horizontal | 14/22 |

- **Labels:** the design system uses Inter SemiBold; we use Geist Medium, the closest weight we ship (`type.buttonLarge`, `type.buttonSmall`).
- **Disabled:** primary, secondary and secondary neutral fall back to the neutral wash with a Pebble label. Destructive keeps its outline in the faint border colour. Tertiary fades to the faint border colour.
- **Touch targets:** small and medium buttons keep a 44pt (48dp) touch area through `hitSlop`; the visible pill stays the size above.
- **Focus:** a 2px Forest Ink ring, 2px outside the pill, shown for keyboard focus. It is an overlay, so it never moves the layout.
- **Busy:** the label is replaced by a spinner and taps are ignored; the accessible name stays.
- **Existing names:** `PrimaryButton` is primary large, `OutlinedButton` is secondary large, `TextButton` is tertiary medium.
- **Not built yet:** icon buttons (44 and 24), the labelled quick-action button with text underneath, and the helper-text variant.

### Date Picker
**Role:** Choose a date from a calendar. `Calendar` (`src/components/Calendar.tsx`) is the design system's date picker, and `DateField` opens it from a form field over a Forest Ink scrim.

White card, `radius.small` (10), 16 vertical padding, `shadow.itemLight` (offset 0/6, blur 20, black at 8%). Header row (56 tall): a 48pt previous arrow, the month and year in `type.buttonLarge` Obsidian, a 48pt next arrow, arrows in Forest Ink. Week row Mon to Sun (weeks start on Monday). Days are 36pt circles (radius 32) with 24 horizontal padding and 6 vertical gap.

- **Weekdays:** semibold-weight Obsidian. **Weekends:** regular-weight Charcoal.
- **Selected:** Forest Ink circle with a Bright Green number.
- **Unavailable:** dimmed and not pressable (used for an end date before the start date).
- **Accessibility:** every day is a button labelled with its full date ("Friday 18 November 2022") and selected or disabled state; the week row is decorative. Days keep a 44pt touch area through hit slop.
- **Values:** ISO (`YYYY-MM-DD`) inside, `DD-MM-YYYY` on screen. The time field still uses the platform's native picker.

### Alert
**Role:** An important message about the current task, in the context of a screen. `Alert` in `src/components/Alert.tsx`, from the Figma "alerts" page.

| Kind | Look |
|------|------|
| neutral, positive, negative, warning | Soft pill (radius 32), Neutral Wash fill, 16 padding and gap, a 32pt status icon, one line of 16/24 Obsidian text |
| with button | Card (radius 10), icon at the top, 14/22 Charcoal text, then a small secondary-neutral button |
| with link | Same card, ending in a small underlined tertiary link |
| critical banner | Card (radius 10) filled Alarm Red, white icon (white disc, red mark), semibold 16/24 white title, 16/24 white text, a small white button with a red label. No dismiss: it stays until the problem is dealt with |

- **Icons:** neutral (Charcoal "i"), positive (`#2f5711` check), negative (red cross), warning (yellow, Obsidian mark). They are the Figma vector paths, so shape as well as colour tells them apart.
- **Dismiss:** a 24pt circular control at the top right of the card kinds, with a 48pt touch area.
- **Announcing:** negative, warning and critical are announced as alerts; neutral and positive are quiet notices.
- **In use:** load and form errors are negative pills; a queued expense the server refused is a critical banner with Discard.

### Avatar
**Role:** Represents a person (or an object) at a glance. `Avatar` and `AvatarGroup` in `src/components/Avatar.tsx`, from the Figma "avatar" page.

- **Types:** text (initials in Forest Ink, medium weight, on the Neutral Wash), photo, and icon (outlined circle with the icon inside).
- **Sizes:** 16, 24, 32, 40, 48, 56, 72. The 16pt size is a plain circle; initials start at 24. Initials are about 40% of the circle.
- **Selected:** 2px Forest Ink ring and a green check badge at the bottom right. Announced as "selected", never colour alone.
- **Badge:** a small Bright Green circle at the bottom right with a 2px white edge. **Notification:** a red dot at the top right, announced as "has a notification".
- **Group:** `AvatarGroup` overlaps avatars by 20% with a white 2px edge and folds the rest into a "+N" circle.
- **Guests:** the same size and spacing as everyone, with a dashed 1.5px Slate ring (a rule of this app, on top of the design system) and a "guest" announcement.
- **Not built yet:** flag avatars and the diagonal double avatar.

### Bottom Navigation
**Role:** Switch between the app's top-level places. `BottomNav` (presentational) and `MainTabs` (wired to the router and the unread count), from the Figma "bottom navigation" page.

A Paper bar with a 1px hairline top border (`borderNeutral`), at least 64 tall plus the bottom safe-area inset. Items share the width evenly; each is a 24pt outlined line icon over a 12/16 label, with a 48pt-plus touch area.

- **Active:** Forest Ink, heavier icon stroke and a medium-weight label. **Inactive:** Slate, lighter stroke, regular-weight label. Active is shown by weight and colour together and announced as "selected".
- **Items in this app:** Trips (home icon), Passport (ticket icon), Notifications (bell icon). It appears on those three screens only, not inside a trip.
- **Dot:** a red dot on Notifications when something is unread, announced as "new", updating live, hidden while that tab is open.
- **Switching:** replaces the screen (no back-stack growth); tapping the active tab does nothing.
- The Figma page shows four items (Home, Cards, Recipients, Manage); the layout is the same for any number.

### Screen Header
**Role:** Names the screen and holds its actions.

Left-aligned large title in `heading` type (Forest Ink or Obsidian) that collapses to a 20 Medium title on scroll, using the native large-title behavior. Back and action icons sit in 44 circular targets. A trip header adds the cover image in a 28-radius mask, the trip name, and dates in `caption` Slate.

### Bottom Tab Bar
**Role:** Global navigation: Trips and Profile.

Paper background, hairline top border, 64 tall plus the bottom inset. Two items, each an icon over a `micro` label. Active: Forest Ink icon and label on a Bright Green pill (56 by 32) behind the icon, with a 1px Forest Ink border. Inactive: Slate icon and label.

### Segmented Tab Control
**Role:** Section switcher inside a trip (Overview, Itinerary, Expenses, People). Single active state in Bright Green.

Pill track in Soft Grey, four equal segments, about 40 tall. Active segment: Bright Green fill, Forest Ink Medium label, 1px Forest Ink border. Inactive: transparent with Charcoal label.

### Display Headline
**Role:** The brand's voice, used on the welcome screen, trip header, and celebration moments.

`display` or `heading-lg` in Medium, tight tracking. Obsidian or Forest Ink on light, Bright Green on dark. Sentence case by default; all caps only for hero moments and stamp text.

### Value Row
**Role:** Icon, heading, and one supporting line, stacked in a list on the welcome screen and in empty states.

24 icon in a Forest Ink stroke on the left, 12 gap, title in Medium 18, supporting line in `body` Slate. 20 gap between rows.

### Participant Avatar Item
**Role:** One person in a grid or row, used in the participant picker and the People screen.

56 circular avatar (photo, or initials in Medium 18 Forest Ink on Soft Grey), name below in `labelSm`, one line, truncated. Guests use a dashed 1.5px Slate ring and a Guest tag, and are never second-class in size or spacing. Selected: 2px Forest Ink ring plus a 20 Bright Green check badge with a 1px Forest Ink border. Grid of four columns with 16 gaps.

### Trip Summary Card (dark)
**Role:** Inverted surface for emphasis: balances hero, trip overview, completion.

Forest Ink background, 28 radius, 24 padding. Headline in Bright Green, body in Paper. May hold an inset Paper card (16 radius, 16 padding) for the amount or the person owed. Pair with an outlined pill for the action inside.

### List Row (expense, itinerary item)
**Role:** The repeating unit of the Expenses and Itinerary screens.

16 vertical and 20 horizontal padding, hairline separators. Expense: 40 circular category icon on Soft Grey, title in `label`, subtitle in `caption` Slate ("Paid by Rahul, 4 people"), amount right-aligned in `amount` with tabular numerals. Itinerary item: time in `labelSm` Slate, title in `label`, location line in `caption`, optional 56 map preview in a 12-radius mask.

### Currency Selector Pill
**Role:** Currency picker with a "Change" action, on a form or inside a dark card.

Paper pill, 8 vertical padding. Left: 24 circular chip on Soft Grey with the currency symbol, then the code in Medium 16 Charcoal. Right: small outlined "Change" pill with `hitSlop`.

### Amount Input
**Role:** Fast expense entry: the amount is the hero of the screen.

Centered `amount-xl` numerals in Forest Ink, currency symbol beside it in Slate Medium 24, numeric keypad, formatting driven by the currency's minor-unit exponent. Title, payer, and participants sit below in standard inputs and rows.

### Input Field
**Role:** Text fields for titles, notes, and search.

12 radius, 52 tall, 16 horizontal padding, `body` type, 1.5px Pebble border. Label above in `labelSm` Slate; placeholder in Pebble is always accompanied by that label. Focus: border turns Forest Ink, no glow. Error: Alarm Red border and a message below with an icon in `caption`.

### Quick Add Button
**Role:** Persistent "+ Expense" shortcut on trip screens.

Floating Bright Green pill, 56 tall, plus icon and `label` text in Forest Ink, 1px Forest Ink border, `shadow.lg`. Right-aligned to the 20 screen padding and 16 above the tab bar. It is the primary action for that screen, so no second Bright Green button appears.

### Badge / Tag
**Role:** Small status and category labels.

9999 radius, 6 vertical and 12 horizontal padding, `micro` type. Soft Grey fill with Forest Ink text, or Forest Ink fill with Bright Green text. Guest tag: Paper fill, 1px dashed Slate border, Slate text. Badges carry no icon: the word carries the meaning (`src/components/Badge.tsx`: tinted pill, 12 horizontal padding, Medium 14).

### Bottom Sheet
**Role:** Participant picker, split configuration, and other focused tasks.

Paper, 28 top radius, 24 padding, a 36 by 4 Pebble grabber, and a Forest Ink scrim at 40% opacity. Primary action in a full-width bar pinned above the inset.

## Interaction States

| State | Treatment |
|-------|-----------|
| Pressed | Buttons darken a step (`buttonState`) and dip to 0.98 in 120 ms; rows fill (`rowState.pressed`) and do not shrink. With Reduce Motion on there is no dip |
| Hover | Only with a pointer (iPad, Android mouse, web): the same fills, one step lighter (`buttonState`, `rowState.hover`) |
| Disabled | Button Grey fill, Pebble label, no border; still meets the touch target; no pressed or hover fill |
| Focused (input) | 3px Brand Black border, no layout shift |
| Selected | Chip `#444444` with a white label; radio and checkbox black fill with a white dot or tick; never colour alone |
| Loading (button) | Label replaced by a small spinner, width unchanged |
| Error | Alarm Red text and icon on a Cream background (the message clears itself after 5 seconds), or a 3px red input border with the message under it |

**Dialogs** (`Dialog`) move like sheets: a spring up from the bottom edge, a scrim that fades with the card's position, and the card can be grabbed at any moment: drag it down to dismiss (a flick carries on out). With Reduce Motion it fades. The trip's third tab is **Activity**; Home's clock icon for finished trips is "Trip history".

**Icons** come from `src/icons.ts`, never from `lucide-react-native` directly: the package's main file loads all ~1900 icons at startup. Add the icon to that file first.

**Pinned back button:** pages with a scrolling body keep the back button fixed at the top (`PinnedBack` in `src/components/PinnedBack.tsx`); only the content moves, including on a pull to refresh. The row behind the button turns solid once content scrolls up under it. The trip pages do the same with their coloured band, which also shows above the page while pulling.

**Haptics** tick once under the finger for a different chip, a radio, a checkbox or a switch; success and warning tick on save, delete and failure. Never on scroll, never the only feedback.

**Motion**: all durations, springs and easings live in `src/theme/motion.ts`. A sheet opens and closes with a settle (no bounce); only a flick earns the bouncier spring. Toasts fade in 150 ms, hold 2.2 s and fade out. The glint on the Start new trip button plays twice, the passport cover's three times, and only while the screen is in front. Animate only transform and opacity, never tween money, and honour Reduce Motion everywhere (crossfade or instant change instead of movement). The rest follows the animation rules in CLAUDE.md.

## Do's and Don'ts

### Do
- Set display headlines in Medium at 32 to 56 with -0.03em to -0.035em tracking. Size and tight tracking are the signature; never reach for a heavier weight.
- Use Bright Green for the primary action fill, the active tab or segment, and the current selection. One Bright Green primary action per screen.
- Always put Forest Ink on Bright Green. On light surfaces give a Bright Green fill a 1px Forest Ink border.
- Default to a 9999 radius for buttons, tags, avatars, and segments; 16 for cards, 12 for inputs, 28 for large cards and sheets.
- Use Forest Ink for text and dark surfaces, not pure black.
- Track tightly at large sizes and neutrally at 16 and below.
- Pair one filled primary button with an underlined text link as the secondary action, never two filled buttons side by side.
- Invert a card to Forest Ink to create rhythm; Bright Green text on dark green is the built-in emphasis.
- Show amounts with tabular numerals and a word or sign ("You owe Rahul ₹800"), never color alone.
- Keep touch targets at 44 on iOS and 48 on Android, and let text grow with Dynamic Type.

### Don't
- Don't use Charcoal for display headlines; use Obsidian or Forest Ink.
- Don't add gradients or blurs. Shadows are for floating elements only (Quick Add, sheets, modals); everything else uses hairlines.
- Don't use Bright Green as text, icon, or thin stroke on a light background.
- Don't use corners below 8 on buttons, tags, or segments.
- Don't set headlines above 28 in Regular or Medium.
- Don't put two Bright Green elements close together, and never a Quick Add button and a primary button on the same screen.
- Don't use #000000 for body text, and don't use Pebble for body or secondary text.
- Don't pair a custom `fontFamily` with `fontWeight`, and don't fall back to the system font mid-app.
- Don't use Alarm Red decoratively or to signal who owes whom.

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Paper | `#ffffff` | Screen canvas, inputs, sheets, the default background |
| 1 | Soft Grey | `#f4f4f4` | Cards, tiles, plan cards, summary cards |
| 2 | Button Grey | `#f2f2f2` | Secondary button fill |
| 3 | Brand Black | `#222222` | Primary button, name tags, toast (at 85%) |
| 4 | Trip colour | one of the six card colours | The band behind a trip's header, its card on Home and History |

## Elevation

Flat by design. Use a hairline for containment and a shadow only when an element floats above content. React Native has one shadow layer, and `shadowRadius` is about half the CSS blur.

- **Cards and icon containers:** hairline `borderWidth: 1`, `borderColor: rgba(14, 15, 12, 0.12)`
- **Floating (Quick Add, tab bar over content):** `shadow.lg`, offset 6, radius 10, opacity 0.08, Android elevation 4
- **Sheets and modals:** `shadow.xl`, offset 10, radius 16, opacity 0.15, Android elevation 10
- **Input focus:** 1.5px Forest Ink border, no shadow

## Imagery

The group's own photography is the hero: cover photos and memories fill headers and cards in rounded masks (28 for cards, full circles for avatars), high-key and casual. Illustration is rare and flat, drawn in Forest Ink and Bright Green only, and reserved for empty states. The collectible motif is the passport stamp: a rounded or circular Forest Ink double-ring stamp holding the destination in Black caps, the dates in Medium, and a Bright Green dot, set at a slight fixed tilt. It should feel like something you want to keep, not a generic achievement badge. No stock patterns and no abstract decoration.

## Layout

One centered column on a 20 screen padding with 32 between sections. Welcome pattern: a large Medium headline top-left, a photo or illustration breaking the lower edge, a full-width primary pill pinned above the bottom inset with a text link beneath it. Section rhythm alternates Paper, a Fog or Soft Grey band, and a Forest Ink card. Navigation is the two-tab bottom bar globally and the segmented control inside a trip. The Quick Add pill floats bottom-right on trip screens. Lists are full-bleed rows with hairline separators; forms are single-column with one field per row.

## Agent Prompt Guide

Quick Color Reference
- text: `color.brandBlack` for primary text and headings, `color.charcoal` for secondary
- background: `color.paper` canvas, `color.softGrey` cards and tiles
- border: `color.inputBorder` for inputs, `color.borderNeutral` for hairlines, `color.brandBlack` for focus
- primary action: `color.brandBlack` fill with a white label
- error: `color.cream` background, `color.alarmRed` icon, `color.brandBlack` text

Example Component Prompts

1. Primary button: the shared `Button`, 56 tall, 16 radius with continuous corners, `color.brandBlack` fill and a white `type.buttonLarge` label. Pressed and hover fills come from `buttonState.primary`.

2. Chip: the shared `Chip`, 32 tall pill; selected `color.iconInk` with a white label, unselected `color.softGrey` at 85% with an `iconInk` label.

3. Participant avatar item: a circular avatar (photo, or initials in `color.iconInk` on `color.softGrey`), name below in `type.fieldMessage`, one line. Guest: dashed 1.5px `color.slate` ring plus a Guest tag.

4. Trip header: the trip's card colour as a band, the cover photo with a white ring, a date pill, the name on a tilted `color.brandBlack` tag, the place, then the avatars. The back button stays pinned on the band.

5. List row: 40 circular icon tile (`color.softGrey`, `color.iconInk` glyph), title `type.label`, subtitle `type.fieldMessage` in `color.charcoal`, a chevron. Pressed fills with `rowState.pressed`; the row does not shrink.

## Similar Brands

- **Revolut** — Same dual-color strategy: a deep brand color as the dominant surface and text, one bright accent for actions and highlights, pill buttons, large confident headlines.
- **Monzo** — A single bright accent on a neutral canvas, pill-shaped interactive elements, friendly rounded geometry, and copy that speaks directly to the user.
- **Cash App** — High-contrast near-black on white with one vivid accent and oversized bold headlines as the main brand expression.
- **N26** — Flat surfaces, hairlines instead of shadows, generous white space, and one saturated accent driving all interactive emphasis.

These are reference points for tone, not templates.

## Quick Start

Keep every value in one module, `src/theme/tokens.ts`, and import from it. No hard-coded colors, sizes, or radii in screens.

```ts
export const color = {
  brandBlack: '#222222', obsidian: '#222222',
  charcoal: '#6a6a6a', slate: '#6a6a6a',
  iconInk: '#444444', dateFill: '#444444',
  pebble: '#868685', paper: '#ffffff',
  softGrey: '#f4f4f4', buttonGrey: '#f2f2f2', inputBorder: '#d0d0d0',
  cream: '#f8f4ed', alarmRed: '#cb272f', positive: '#2f5711', warning: '#ffd11a',
  neutralWash: 'rgba(22, 51, 0, 0.08)', borderNeutral: 'rgba(14, 15, 12, 0.12)',
  scrim: 'rgba(0, 0, 0, 0.25)', toast: 'rgba(0, 0, 0, 0.85)',
} as const;

// One family name per weight; never combine with fontWeight.
export const font = {
  light: 'GeistSans-Light',
  regular: 'GeistSans-Regular',
  medium: 'GeistSans-Medium',
} as const;

export const type = {
  micro:      { fontFamily: font.medium,  fontSize: 12, lineHeight: 16, letterSpacing: 0.12 },
  caption:    { fontFamily: font.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0.07 },
  body:       { fontFamily: font.regular, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  bodyLg:     { fontFamily: font.regular, fontSize: 18, lineHeight: 26, letterSpacing: -0.09 },
  label:      { fontFamily: font.medium,  fontSize: 16, lineHeight: 20, letterSpacing: 0 },
  labelSm:    { fontFamily: font.medium,  fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  title:      { fontFamily: font.medium,  fontSize: 20, lineHeight: 26, letterSpacing: -0.20 },
  headingSm:  { fontFamily: font.medium,  fontSize: 24, lineHeight: 28, letterSpacing: -0.36 },
  heading:    { fontFamily: font.medium,  fontSize: 28, lineHeight: 32, letterSpacing: -0.56 },
  headingLg:  { fontFamily: font.medium,  fontSize: 32, lineHeight: 32, letterSpacing: -0.96 },
  display:    { fontFamily: font.medium,  fontSize: 56, lineHeight: 54, letterSpacing: -1.96 },
  amount:     { fontFamily: font.medium,  fontSize: 18, lineHeight: 24, letterSpacing: 0,
                fontVariant: ['tabular-nums'] as const },
  amountXl:   { fontFamily: font.medium,  fontSize: 40, lineHeight: 44, letterSpacing: -0.80,
                fontVariant: ['tabular-nums'] as const },
} as const;

export const space = {
  s4: 4, s8: 8, s12: 12, s16: 16, s20: 20, s24: 24, s32: 32, s40: 40, s48: 48, s64: 64,
} as const;

export const radius = { input: 12, card: 16, large: 28, pill: 9999 } as const;

export const shadow = {
  hairline: { borderWidth: 1, borderColor: 'rgba(14, 15, 12, 0.12)' },
  lg: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  xl: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 }, elevation: 10 },
} as const;

export const layout = { screenPadding: 20, tabBarHeight: 64, contentMaxWidth: 600 } as const;
```

## Card

Source: Figma "Card" page (read from a screenshot, so values are approximate). Component: `src/components/Card.tsx`.

- Fill Neutral Wash, radius 16, padding 16, no visible border (a transparent 2px border keeps layout steady across states).
- Pressed: darker fill (Forest Green at 20%). Focused: 2px Forest Ink ring. Selected: 2px Forest Ink ring plus a Bright Green check badge top right.
- Not-yet-built Figma variants: large card with footer actions, currency card, dashed "add" card, illustration card.

## Divider

Source: Figma "Divider" page (screenshot, approximate). Component: `src/components/Divider.tsx`.

- Section divider: 4px Neutral Wash rule, full width of the container. Sub-section divider: 1px Border Neutral hairline, inset to match content.

## List item

Source: Figma "List item" page (screenshot, approximate). Component: `src/components/ListItem.tsx`.

- Row on Paper: leading Avatar, title (medium) with subtitle or overline (14/22 charcoal), one trailing control: none, chevron, edit, checkbox, radio, switch, or a small secondary button.
- Prompt variant adds an inline error message under the title. Inactive: dashed border on Neutral Wash ("Connect an account"). Disabled/cancelled: title and value in Slate.

## Modal

Source: Figma "Modal" page (screenshot, approximate). Component: `src/components/Dialog.tsx` (named Dialog to avoid clashing with React Native's Modal).

- Phone: an inset card floating 8pt above the bottom edge, radius 28, padding 24. Header with a 32px close circle at the right, bold subheader, body, optional content, one Bright Green primary button. Use BottomSheet for browsing/long content, Dialog for one interrupting message.

## Section header

Source: Figma "Section header" page (screenshot, approximate). Component: `src/components/SectionHeader.tsx`.

- Section: large title (24) with an optional underlined Forest Ink link on the right ("See all"). Group: small charcoal label over a 1px hairline.

## Segmented control

Source: Figma "Segmented control" page (screenshot, approximate). Component: `src/components/SegmentedControl.tsx`.

- 2-3 alike options in a full-pill Neutral Wash track; the selected option is a white pill with Medium-weight Forest Ink text. Segments are at least 44pt tall.

## Tab

Source: Figma "Tab" page (screenshot, approximate). Component: `src/components/Tabs.tsx`.

- Underlined text tabs over a 1px hairline. Selected: Medium Forest Ink text and a 2px Forest Ink underline. Unselected: Regular Slate text. At least 44pt tall. Use SegmentedControl to choose between options, Tabs to switch sections.

## Notification item

Source: Figma "Notifications" page (screenshot, approximate). Component: `src/components/NotificationItem.tsx`.

- Flat row (no card): 10px status dot, title, optional date at the right, optional body. Unread: Warning-yellow dot and Medium Obsidian title. Read: pale dot and Regular Charcoal title. Unread is also spoken in the accessibility label.
- Not built: the Inbox screen chrome (circular back button, large "Inbox" title, "Notifications" group header).

## Upload

Source: Figma "Upload" page (screenshot, approximate). Component: `src/components/UploadCard.tsx`.

- Centred Neutral Wash card, radius 32, padding 32: 56px white icon circle, title, hint with the size limit, one primary medium button. No drag and drop on phones.

## Home and navigation

There is no tab bar. Home (`app/index.tsx`) is the hub: greeting, a bell (notifications, with an unread dot) and the avatar (profile, which holds the Travel Passport) on top; "Planning" with a history button beside the title; trips as two-up tiles tilted a few degrees, alternating; "Invite friends"; and one pinned "Start new trip" primary button. Finished trips live in Trip history (`app/history.tsx`). Source: user mockup (screenshot, approximate).
