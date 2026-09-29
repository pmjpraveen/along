# Along — Style Reference
> deep moss with daylight yellow. Sunlit yellow sparks on a dark forest floor, with large, light-handed display type announcing every move.

**Theme:** light. Forest Ink cards and sections invert the canvas for emphasis; there is no full dark theme in the MLP.
**Platform:** iOS + Android, phone-first, React Native (Expo). All sizes are density-independent: 1 unit = 1pt on iOS, 1dp on Android. Text scales with the system font size.
**Font:** Geist Sans, one family for everything.

Along speaks in a confident, warm voice. A deep forest green (#163300) carries text, dark cards, and icons, while a single sunlit yellow, Daylight (#F5FF6A), marks the primary action, the active tab, the current selection, and key highlights. Display type is Geist Sans Medium, tightly tracked and set large at the moments that matter: the welcome screen, a trip header, "everyone is settled". Everything else stays restrained on a near-white canvas with soft gray-green surfaces (#e8ebe6). Buttons, tags, tabs, and avatars are pill-shaped; cards and inputs take gentle corners; large cards and sheets take 28. Nothing gradients. The yellow and forest pairing inverts cleanly when a card goes dark, which creates rhythm without decoration.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Daylight | `#F5FF6A` | `color.daylight` | **Primary.** Fill for the primary action, active tab and segment, current selection, and key highlights. Always carries Forest Ink content on top. On light surfaces it is a fill only, never text, icon, or thin stroke (about 1.1:1 against white). On Forest Ink it can be text |
| Forest Ink | `#163300` | `color.forestInk` | Dominant brand dark: headings in nav, dark card backgrounds, label text on Daylight, icon strokes, outline borders. Wherever you need weight or authority, reach for Forest Ink |
| Spruce | `#054d28` | `color.spruce` | Secondary dark green for card surfaces and tonal depth on dark sections where Forest Ink is too heavy |
| Linen Mist | `#e2f6d5` | `color.linenMist` | Pale green wash for tinted card backgrounds, avatar placeholders, tag fills, pressed states on light rows |
| Signal Blue | `#0b4c72` | `color.signalBlue` | Supporting accent for decorative details and low-frequency emphasis, such as map and link moments |
| Alarm Red | `#cb272f` | `color.alarmRed` | Errors and destructive actions only (inline validation, delete confirmation). Always with an icon and a message. Never decorative and never a money-sign color |
| Charcoal | `#454745` | `color.charcoal` | Primary body text and dense UI. A slightly warm black that feels softer than #000 on white |
| Obsidian | `#0e0f0c` | `color.obsidian` | Display headlines and high-contrast headings. A green-tinted black, not neutral gray |
| Slate | `#6a6c6a` | `color.slate` | Secondary text, helper labels, subdued icons. The lightest gray that still passes AA for text |
| Pebble | `#868685` | `color.pebble` | Placeholders, disabled content, input borders, hairline icon strokes. Not for body or secondary text |
| Fog | `#e8ebe6` | `color.fog` | Card surfaces, dividers, panel backgrounds, segmented-control track. A green-tinted off-white |
| Paper | `#ffffff` | `color.paper` | Screen canvas, inverted card surfaces |

### Contrast (approximate)

| Pair | Ratio | Use |
|------|-------|-----|
| Forest Ink on Daylight | 12.9:1 | Primary button label, active tab text |
| Charcoal on Daylight | 8.7:1 | Acceptable alternative label |
| Daylight on Forest Ink | 12.9:1 | Headlines and numbers on dark cards |
| Charcoal on Paper | 9.4:1 | Body text |
| Slate on Paper | 5.4:1 | Secondary text (passes AA) |
| Alarm Red on Paper | 5.4:1 | Error text |
| Pebble on Paper | 3.6:1 | Placeholders, borders, disabled only |
| Daylight on Paper | 1.1:1 | Never as text, icon, or stroke |

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

### Primary Pill Button
**Role:** The signature action: a filled yellow pill that says "do this next".

Daylight fill, Forest Ink label in `label` type, 9999 radius, 24 horizontal padding, 52 tall (56 when full width in a bottom action bar). On Paper or Fog surfaces add a 1px Forest Ink border so the pill stays visible; on Forest Ink or Spruce surfaces there is no border. No shadow. One primary button per screen.

### Outlined Pill Button
**Role:** Secondary action where a second filled button would compete.

Paper fill, 1px Forest Ink border, Forest Ink label, 9999 radius, 48 tall. Same padding as primary.

### Text Link Button
**Role:** Low-weight inline action, paired under or beside a primary button.

Underlined Forest Ink text in `label` type, no background, no border, with `hitSlop` up to a 44 target.

### Screen Header
**Role:** Names the screen and holds its actions.

Left-aligned large title in `heading` type (Forest Ink or Obsidian) that collapses to a 20 Medium title on scroll, using the native large-title behavior. Back and action icons sit in 44 circular targets. A trip header adds the cover image in a 28-radius mask, the trip name, and dates in `caption` Slate.

### Bottom Tab Bar
**Role:** Global navigation: Trips and Profile.

Paper background, hairline top border, 64 tall plus the bottom inset. Two items, each an icon over a `micro` label. Active: Forest Ink icon and label on a Daylight pill (56 by 32) behind the icon, with a 1px Forest Ink border. Inactive: Slate icon and label.

### Segmented Tab Control
**Role:** Section switcher inside a trip (Overview, Itinerary, Expenses, People). Single active state in yellow.

Pill track in Fog, four equal segments, about 40 tall. Active segment: Daylight fill, Forest Ink Medium label, 1px Forest Ink border. Inactive: transparent with Charcoal label.

### Display Headline
**Role:** The brand's voice, used on the welcome screen, trip header, and celebration moments.

`display` or `heading-lg` in Medium, tight tracking. Obsidian or Forest Ink on light, Daylight on dark. Sentence case by default; all caps only for hero moments and stamp text.

### Value Row
**Role:** Icon, heading, and one supporting line, stacked in a list on the welcome screen and in empty states.

24 icon in a Forest Ink stroke on the left, 12 gap, title in Medium 18, supporting line in `body` Slate. 20 gap between rows.

### Participant Avatar Item
**Role:** One person in a grid or row, used in the participant picker and the People screen.

56 circular avatar (photo, or initials in Medium 18 Forest Ink on Linen Mist), name below in `labelSm`, one line, truncated. Guests use a dashed 1.5px Slate ring and a Guest tag, and are never second-class in size or spacing. Selected: 2px Forest Ink ring plus a 20 Daylight check badge with a 1px Forest Ink border. Grid of four columns with 16 gaps.

### Trip Summary Card (dark)
**Role:** Inverted surface for emphasis: balances hero, trip overview, completion.

Forest Ink background, 28 radius, 24 padding. Headline in Daylight, body in Paper. May hold an inset Paper card (16 radius, 16 padding) for the amount or the person owed. Pair with an outlined pill for the action inside.

### List Row (expense, itinerary item)
**Role:** The repeating unit of the Expenses and Itinerary screens.

16 vertical and 20 horizontal padding, Fog hairline separators. Expense: 40 circular category icon on Linen Mist, title in `label`, subtitle in `caption` Slate ("Paid by Rahul, 4 people"), amount right-aligned in `amount` with tabular numerals. Itinerary item: time in `labelSm` Slate, title in `label`, location line in `caption`, optional 56 map preview in a 12-radius mask.

### Currency Selector Pill
**Role:** Currency picker with a "Change" action, on a form or inside a dark card.

Paper pill, 8 vertical padding. Left: 24 circular chip on Linen Mist with the currency symbol, then the code in Medium 16 Charcoal. Right: small outlined "Change" pill with `hitSlop`.

### Amount Input
**Role:** Fast expense entry: the amount is the hero of the screen.

Centered `amount-xl` numerals in Forest Ink, currency symbol beside it in Slate Medium 24, numeric keypad, formatting driven by the currency's minor-unit exponent. Title, payer, and participants sit below in standard inputs and rows.

### Input Field
**Role:** Text fields for titles, notes, and search.

12 radius, 52 tall, 16 horizontal padding, `body` type, 1.5px Pebble border. Label above in `labelSm` Slate; placeholder in Pebble is always accompanied by that label. Focus: border turns Forest Ink, no glow. Error: Alarm Red border and a message below with an icon in `caption`.

### Quick Add Button
**Role:** Persistent "+ Expense" shortcut on trip screens.

Floating Daylight pill, 56 tall, plus icon and `label` text in Forest Ink, 1px Forest Ink border, `shadow.lg`. Right-aligned to the 20 screen padding and 16 above the tab bar. It is the primary action for that screen, so no second Daylight button appears.

### Badge / Tag
**Role:** Small status and category labels.

9999 radius, 6 vertical and 12 horizontal padding, `micro` type. Linen Mist fill with Forest Ink text, or Forest Ink fill with Daylight text. Guest tag: Paper fill, 1px dashed Slate border, Slate text.

### Bottom Sheet
**Role:** Participant picker, split configuration, and other focused tasks.

Paper, 28 top radius, 24 padding, a 36 by 4 Pebble grabber, and a Forest Ink scrim at 40% opacity. Primary action in a full-width bar pinned above the inset.

## Interaction States

| State | Treatment |
|-------|-----------|
| Pressed | Opacity 0.8 on buttons and rows; rows may also fill Linen Mist. No hover on mobile |
| Disabled | Fog fill, Pebble label, no border; still meets the touch target |
| Focused (input) | Border Pebble to Forest Ink, same 1.5px width |
| Selected | 2px Forest Ink ring plus a Daylight check; never color alone |
| Loading (button) | Label replaced by a small Forest Ink spinner, width unchanged |
| Error | Alarm Red border or text, with an icon and a specific message |

Motion follows the animation rules in CLAUDE.md.

## Do's and Don'ts

### Do
- Set display headlines in Medium at 32 to 56 with -0.03em to -0.035em tracking. Size and tight tracking are the signature; never reach for a heavier weight.
- Use Daylight for the primary action fill, the active tab or segment, and the current selection. One Daylight primary action per screen.
- Always put Forest Ink on Daylight. On light surfaces give a Daylight fill a 1px Forest Ink border.
- Default to a 9999 radius for buttons, tags, avatars, and segments; 16 for cards, 12 for inputs, 28 for large cards and sheets.
- Use Forest Ink for text and dark surfaces, not pure black.
- Track tightly at large sizes and neutrally at 16 and below.
- Pair one filled primary button with an underlined text link as the secondary action, never two filled buttons side by side.
- Invert a card to Forest Ink to create rhythm; Daylight text on dark green is the built-in emphasis.
- Show amounts with tabular numerals and a word or sign ("You owe Rahul ₹800"), never color alone.
- Keep touch targets at 44 on iOS and 48 on Android, and let text grow with Dynamic Type.

### Don't
- Don't use Charcoal for display headlines; use Obsidian or Forest Ink.
- Don't add gradients or blurs. Shadows are for floating elements only (Quick Add, sheets, modals); everything else uses hairlines.
- Don't use Daylight as text, icon, or thin stroke on a light background.
- Don't use corners below 8 on buttons, tags, or segments.
- Don't set headlines above 28 in Regular or Medium.
- Don't put two Daylight elements close together, and never a Quick Add button and a primary button on the same screen.
- Don't use #000000 for body text, and don't use Pebble for body or secondary text.
- Don't pair a custom `fontFamily` with `fontWeight`, and don't fall back to the system font mid-app.
- Don't use Alarm Red decoratively or to signal who owes whom.

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Paper | `#ffffff` | Screen canvas, the default background |
| 1 | Fog | `#e8ebe6` | Cards, panels, segmented-control track, separators |
| 2 | Linen Mist | `#e2f6d5` | Tinted highlights: avatar placeholders, tag fills, pressed rows |
| 3 | Daylight | `#F5FF6A` | Active surface: primary button, active tab, selection |
| 4 | Forest Ink | `#163300` | Inverted surface: dark cards, high-contrast blocks |

## Elevation

Flat by design. Use a hairline for containment and a shadow only when an element floats above content. React Native has one shadow layer, and `shadowRadius` is about half the CSS blur.

- **Cards and icon containers:** hairline `borderWidth: 1`, `borderColor: rgba(14, 15, 12, 0.12)`
- **Floating (Quick Add, tab bar over content):** `shadow.lg`, offset 6, radius 10, opacity 0.08, Android elevation 4
- **Sheets and modals:** `shadow.xl`, offset 10, radius 16, opacity 0.15, Android elevation 10
- **Input focus:** 1.5px Forest Ink border, no shadow

## Imagery

The group's own photography is the hero: cover photos and memories fill headers and cards in rounded masks (28 for cards, full circles for avatars), high-key and casual. Illustration is rare and flat, drawn in Forest Ink and Daylight only, and reserved for empty states. The collectible motif is the passport stamp: a rounded or circular Forest Ink double-ring stamp holding the destination in Black caps, the dates in Medium, and a Daylight dot, set at a slight fixed tilt. It should feel like something you want to keep, not a generic achievement badge. No stock patterns and no abstract decoration.

## Layout

One centered column on a 20 screen padding with 32 between sections. Welcome pattern: a large Medium headline top-left, a photo or illustration breaking the lower edge, a full-width primary pill pinned above the bottom inset with a text link beneath it. Section rhythm alternates Paper, a Fog or Linen Mist band, and a Forest Ink card. Navigation is the two-tab bottom bar globally and the segmented control inside a trip. The Quick Add pill floats bottom-right on trip screens. Lists are full-bleed rows with hairline separators; forms are single-column with one field per row.

## Agent Prompt Guide

Quick Color Reference
- text: `color.charcoal` for body, `color.obsidian` for display, `color.slate` for secondary
- background: `color.paper` canvas, `color.fog` cards and tracks
- border: `color.pebble` for hairlines and inputs, `color.forestInk` for emphasis and outlines
- primary action: `color.daylight` fill with `color.forestInk` label (1px Forest Ink border on light surfaces)
- dark surface: `color.forestInk`, with `color.daylight` headlines

Example Component Prompts

1. Primary button: a `Pressable`, height 52, `borderRadius` 9999, `paddingHorizontal` 24, `backgroundColor` `color.daylight`, label in `type.label` and `color.forestInk`. On Paper or Fog add `borderWidth` 1 and `borderColor` `color.forestInk`. Pressed opacity 0.8. Full-width variant is 56 tall and pinned above the bottom safe-area inset.

2. Segmented control: Fog pill track, four equal segments about 40 tall, `borderRadius` 9999. Active segment `color.daylight` fill, `color.forestInk` `type.label` text, 1px Forest Ink border; inactive transparent with `color.charcoal` text.

3. Participant avatar item: 56 circular avatar (photo, or initials in Medium 18 on `color.linenMist`), name below in `type.labelSm`, one line. Guest: dashed 1.5px `color.slate` ring plus a Guest tag. Selected: 2px `color.forestInk` ring and a 20 Daylight check badge with a 1px Forest Ink border. Four-column grid, 16 gaps.

4. Trip summary card: `color.forestInk` background, `borderRadius` 28, padding 24. Headline in `type.title` and `color.daylight`, body in `type.body` and `color.paper`. Inset Paper card with `borderRadius` 16 and padding 16 holds the amount in `type.amount`. An outlined pill sits below.

5. Amount input: centered `type.amountXl` numerals in `color.forestInk`, currency symbol in `color.slate` Medium 24, numeric keypad, `fontVariant: ['tabular-nums']`, formatted by the currency's minor-unit exponent.

6. List row (expense): 40 circular icon on `color.linenMist`, title `type.label`, subtitle `type.caption` in `color.slate`, amount right-aligned in `type.amount`. Padding 16 by 20, `color.fog` hairline separator.

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
  daylight: '#F5FF6A',
  forestInk: '#163300',
  spruce: '#054d28',
  linenMist: '#e2f6d5',
  signalBlue: '#0b4c72',
  alarmRed: '#cb272f',
  charcoal: '#454745',
  obsidian: '#0e0f0c',
  slate: '#6a6c6a',
  pebble: '#868685',
  fog: '#e8ebe6',
  paper: '#ffffff',
  scrim: 'rgba(22, 51, 0, 0.4)',
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
