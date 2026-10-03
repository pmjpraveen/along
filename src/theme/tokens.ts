// Colours come from the Figma design system (Wise UI Kit, "colours" page) in its own three groups, with the Figma variable
// names in the comments. Screens use the flat `color` below, which is built from these groups so there is one source.

// Core colours
export const core = {
  brightGreen: "#9fe870",   // core/bright green
  forestGreen: "#163300",   // core/forest green
} as const;

// Secondary colours
export const secondary = {
  brightYellow: "#ffeb69", brightBlue: "#a0e1e1",   // secondary/bright *: the warning and neutral badge tints
  darkGold: "#3a341c",                               // secondary/dark gold: the warning badge label
} as const;

// Product colours (semantic roles)
export const product = {
  content: { primary: "#222222", secondary: "#6a6a6a", tertiary: "#6a6a6a" },   // primary text, then one grey for everything secondary or quieter
  interactive: { secondary: "#868685" },                                         // placeholder text and disabled labels
  background: { screen: "#ffffff", neutral: "rgba(22,51,0,0.08)" },              // #16330014
  border: { neutral: "rgba(14,15,12,0.12)" },                                     // #0e0f0c1f
  sentiment: { negative: "#cb272f", positive: "#2f5711", warning: "#ffd11a" },
} as const;

// Button fills for the hovered (pointer) and pressed (finger down) states, by button type.
export const buttonState = {
  primary: { hover: "#383838", pressed: "#000000" },
  secondary: { hover: "#e9e9e9", pressed: "#dcdcdc" },
  destructive: { hover: "#fdf2f2", pressed: "#fbe2e2" },
  tertiary: { hover: "#f4f4f4", pressed: "#e8e8e8" },
} as const;

// Fills for a tappable row (list item) when hovered by a pointer and when pressed.
export const rowState = { hover: "#f4f4f4", pressed: "#ececec" } as const;

export const color = {
  // Named as DESIGN.md names them, each pointing at its Figma source above.
  forestInk: core.forestGreen,
  brandBlack: "#222222", scrim: "rgba(0,0,0,0.25)", toast: "rgba(0,0,0,0.85)",   // the neutral dim behind every sheet and dialog, the same as the native modal screens
   dateFill: "#444444", cream: "#f8f4ed", inputBorder: "#d0d0d0", softGrey: "#f4f4f4", iconInk: "#444444", buttonGrey: "#f2f2f2", obsidian: product.content.primary, charcoal: product.content.secondary, slate: product.content.tertiary, pebble: product.interactive.secondary,
  paper: product.background.screen, neutralWash: product.background.neutral, borderNeutral: product.border.neutral,
  darkGold: secondary.darkGold, alarmRed: product.sentiment.negative, positive: product.sentiment.positive, warning: product.sentiment.warning,
  // Neutral wash (Forest Green at 8%) flattened onto white, for surfaces that overlap and so must not show through each other.
  neutralSolid: "#ecefeb",
  // Not in the Figma palette.
  signalBlue: "#0b4c72",
} as const;

// Badge tints (Figma "badges"): each status colour at low strength behind its label.
const alpha = (hex: string, a: number) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
};
export const tint = {
  error: alpha(product.sentiment.negative, 0.12),
  success: alpha(core.brightGreen, 0.3),
  warning: alpha(secondary.brightYellow, 0.4),
  neutral: alpha(secondary.brightBlue, 0.22),
} as const;

// Blends two #rrggbb colours: t = 0 is a, t = 1 is b. Used to draw gradients as thin strips.
export const mix = (a: string, b: string, t: number) =>
  "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, "0")).join("");

export const space = { s4: 4, s8: 8, s12: 12, s16: 16, s20: 20, s24: 24, s32: 32, s40: 40, s48: 48, s64: 64 } as const;

export const radius = { small: 10, pill: 9999, input: 12, card: 16, tile: 24, sheet: 28, xLarge: 32 } as const;

// Figma "item-shadow-light": drop shadow, offset (0, 6), blur 20, black at 8%. RN's shadowRadius is half the blur.
export const shadow = {
  itemLight: { shadowColor: "#000000", shadowOffset: { width: 0, height: 6 }, shadowRadius: 10, shadowOpacity: 0.08, elevation: 4 },
} as const;

// Only Light 300, Regular 400 and Medium 500 are used; the display moments use Medium.
export const font = { light: "GeistSans-Light", regular: "GeistSans-Regular", medium: "GeistSans-Medium" } as const;

export const type = {
  // Button labels (Figma "Body large bold" / "Body default bold"). The design system uses Inter SemiBold; Geist Medium is the closest weight we ship.
  buttonLarge: { fontFamily: font.medium, fontSize: 16, lineHeight: 24, letterSpacing: 0.08 },
  // Input fields (Figma "Body default bold" label, "Body large" value, "Body default" message).
  fieldLabel: { fontFamily: font.medium, fontSize: 14, lineHeight: 22, letterSpacing: 0.175 },
  fieldValue: { fontFamily: font.regular, fontSize: 16, lineHeight: 24, letterSpacing: -0.08 },
  fieldMessage: { fontFamily: font.regular, fontSize: 14, lineHeight: 22, letterSpacing: 0.14 },
  sheetTitle: { fontFamily: font.medium, fontSize: 28, lineHeight: 32, letterSpacing: -0.56 },
  buttonSmall: { fontFamily: font.medium, fontSize: 14, lineHeight: 22, letterSpacing: 0.175 },
  body: { fontFamily: font.regular, fontSize: 18, lineHeight: 26, letterSpacing: -0.09 },
  label: { fontFamily: font.medium, fontSize: 16, lineHeight: 20 },
  pageTitle: { fontFamily: font.medium, fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },   // the title at the top of every page
  display: { fontFamily: font.medium, fontSize: 56, lineHeight: 54, letterSpacing: -1.96 },
} as const;

// The darker pill behind a trip's dates: the trip's card colour darkened about 10%.
export const pillOn = (card: string) => mix(card, "#000000", 0.105);

// The passport cover's embossing and its colour before a country is chosen, and the opening animation's stripes: brand art, so named here
// rather than scattered through screens.
export const passportArt = { gold: "#e8cf8a", defaultCover: "#1f6f78", goldFrame: "rgba(232,207,138,0.35)" } as const;
export const splashStripes = ["#ffcc3d", "#ffad00", "#ff4b00", "#de005a", "#6f00b1", "#002385"] as const;
