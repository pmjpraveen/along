// From DESIGN.md token tables. Extend as screens need more.
export const color = {
  daylight: "#F5FF6A", forestInk: "#163300", spruce: "#054d28", linenMist: "#e2f6d5",
  signalBlue: "#0b4c72", alarmRed: "#cb272f", charcoal: "#454745", obsidian: "#0e0f0c",
  slate: "#6a6c6a", pebble: "#868685", fog: "#e8ebe6", paper: "#ffffff",
} as const;

export const space = { s4: 4, s8: 8, s12: 12, s16: 16, s20: 20, s24: 24, s32: 32, s40: 40, s48: 48, s64: 64 } as const;

export const radius = { pill: 9999, input: 12, card: 16, sheet: 28 } as const;

// Only Light 300, Regular 400 and Medium 500 are used; the display moments use Medium.
export const font = { light: "GeistSans-Light", regular: "GeistSans-Regular", medium: "GeistSans-Medium" } as const;

export const type = {
  body: { fontFamily: font.regular, fontSize: 18, lineHeight: 26, letterSpacing: -0.09 },
  label: { fontFamily: font.medium, fontSize: 16, lineHeight: 20 },
  display: { fontFamily: font.medium, fontSize: 56, lineHeight: 54, letterSpacing: -1.96 },
} as const;
