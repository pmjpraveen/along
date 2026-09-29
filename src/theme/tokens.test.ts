import { color, core, product, secondary } from "./tokens";

// The values below are read straight from the Figma design system's colour variables. If a token drifts from Figma, this fails.
test("core colours match Figma", () => {
  expect(core).toEqual({ brightGreen: "#9fe870", forestGreen: "#163300" });
});

test("secondary colours match Figma", () => {
  expect(secondary).toEqual({
    brightOrange: "#ffc091", brightYellow: "#ffeb69", brightBlue: "#a0e1e1", brightPink: "#ffd7ef",
    darkPurple: "#260a2f", darkGold: "#3a341c", darkCharcoal: "#21231d", darkMaroon: "#320707",
  });
});

test("product colours match Figma, including the two 8% and 12% tints", () => {
  expect(product.content).toEqual({ primary: "#0e0f0c", secondary: "#454745", tertiary: "#6a6c6a", link: "#163300" });
  expect(product.interactive).toEqual({ primary: "#163300", accent: "#9fe870", secondary: "#868685", control: "#173301", contrast: "#9fe870" });
  expect(product.background).toEqual({ screen: "#ffffff", elevated: "#ffffff", neutral: "rgba(22,51,0,0.08)", overlay: "rgba(22,51,0,0.08)" });
  expect(product.border).toEqual({ neutral: "rgba(14,15,12,0.12)", overlay: "rgba(14,15,12,0.12)" });
  expect(product.sentiment).toEqual({ negative: "#cb272f", positive: "#2f5711", warning: "#ffd11a" });
});

test("the 8-digit hex the Figma file reports converts to the rgba the app uses", () => {
  const rgba = (hex: string) => {
    const [r, g, b, a] = [1, 3, 5, 7].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return `rgba(${r},${g},${b},${Math.round((a / 255) * 100) / 100})`;
  };
  expect(rgba("#16330014")).toBe(product.background.neutral);
  expect(rgba("#0e0f0c1f")).toBe(product.border.neutral);
});

test("the flat colours screens use each point at their Figma source", () => {
  expect(color.brightGreen).toBe(core.brightGreen);
  expect(color.forestInk).toBe(core.forestGreen);
  expect(color.obsidian).toBe(product.content.primary);
  expect(color.charcoal).toBe(product.content.secondary);
  expect(color.slate).toBe(product.content.tertiary);
  expect(color.pebble).toBe(product.interactive.secondary);
  expect(color.alarmRed).toBe(product.sentiment.negative);
  expect(color.neutralWash).toBe(product.background.neutral);
  expect(color.brightOrange).toBe(secondary.brightOrange);
  expect(color.darkMaroon).toBe(secondary.darkMaroon);
});

test("the accent is never used as a body-text colour: it only has the contrast for fills next to Forest Ink", () => {
  const lum = (h: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  expect(ratio(color.forestInk, color.brightGreen)).toBeGreaterThan(7);
  expect(ratio(color.brightGreen, color.paper)).toBeLessThan(3);
});
