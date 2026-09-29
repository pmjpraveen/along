// Colours come from the Figma design system (Wise UI Kit, "colours" page) in its own three groups, with the Figma variable
// names in the comments. Screens use the flat `color` below, which is built from these groups so there is one source.

// Core colours
export const core = {
  brightGreen: "#9fe870",   // core/bright green
  forestGreen: "#163300",   // core/forest green
} as const;

// Secondary colours
export const secondary = {
  brightOrange: "#ffc091", brightYellow: "#ffeb69", brightBlue: "#a0e1e1", brightPink: "#ffd7ef",   // secondary/bright *
  darkPurple: "#260a2f", darkGold: "#3a341c", darkCharcoal: "#21231d", darkMaroon: "#320707",        // secondary/dark *
} as const;

// Product colours (semantic roles)
export const product = {
  content: { primary: "#0e0f0c", secondary: "#454745", tertiary: "#6a6c6a", link: "#163300" },
  interactive: { primary: "#163300", accent: "#9fe870", secondary: "#868685", control: "#173301", contrast: "#9fe870" },
  background: { screen: "#ffffff", elevated: "#ffffff", neutral: "rgba(22,51,0,0.08)", overlay: "rgba(22,51,0,0.08)" },   // #16330014
  border: { neutral: "rgba(14,15,12,0.12)", overlay: "rgba(14,15,12,0.12)" },                                              // #0e0f0c1f
  sentiment: { negative: "#cb272f", positive: "#2f5711", warning: "#ffd11a" },
} as const;

export const color = {
  // Named as DESIGN.md names them, each pointing at its Figma source above.
  brightGreen: core.brightGreen, forestInk: core.forestGreen,
  obsidian: product.content.primary, charcoal: product.content.secondary, slate: product.content.tertiary, pebble: product.interactive.secondary,
  paper: product.background.screen, neutralWash: product.background.neutral, borderNeutral: product.border.neutral, control: product.interactive.control,
  alarmRed: product.sentiment.negative, positive: product.sentiment.positive, warning: product.sentiment.warning,
  ...secondary,
  // The "secondary" button fill is a hard-coded hex in Figma (not a variable): a pale green.
  secondaryFill: "#ddf7d2",
  // Not in the Figma palette; kept from DESIGN.md until the design system covers them.
  spruce: "#054d28", linenMist: "#e2f6d5", signalBlue: "#0b4c72", fog: "#e8ebe6",
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

export const space = { s4: 4, s8: 8, s12: 12, s16: 16, s20: 20, s24: 24, s32: 32, s40: 40, s48: 48, s64: 64 } as const;

export const radius = { small: 10, pill: 9999, input: 12, card: 16, sheet: 28, xLarge: 32 } as const;

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
  display: { fontFamily: font.medium, fontSize: 56, lineHeight: 54, letterSpacing: -1.96 },
} as const;
