import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { Badge, BadgeVariant } from "./Badge";
import { color, tint } from "../theme/tokens";

const flat = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
const boxOf = (label: string) => flat(screen.getByText(label).parent!);

test("each variant has its own tint and text colour, from the design system's palette", async () => {
  const cases: [BadgeVariant, string, string, string][] = [
    ["error", "Error", tint.error, color.alarmRed],
    ["info", "Info", color.neutralWash, color.charcoal],
    ["success", "Success", tint.success, color.charcoal],
    ["warning", "Alert/warning", tint.warning, color.darkGold],
    ["neutral", "Neutral", tint.neutral, color.signalBlue],
  ];
  for (const [variant, label, bg, text] of cases) {
    const { unmount } = await render(<Badge variant={variant} label={label} />);
    expect(boxOf(label).backgroundColor).toBe(bg);
    expect(flat(screen.getByText(label)).color).toBe(text);
    await unmount();
  }
});

test("the label is 14/22 medium weight and the badge is at least 28 tall with rounded corners", async () => {
  await render(<Badge variant="success" label="Happening now" />);
  expect(flat(screen.getByText("Happening now"))).toMatchObject({ fontSize: 14, lineHeight: 22 });
  expect(boxOf("Happening now")).toMatchObject({ minHeight: 28, borderRadius: 9999 });
});

test("it hugs its content instead of stretching across the row", async () => {
  await render(<Badge label="Guest" />);
  expect(boxOf("Guest").alignSelf).toBe("flex-start");
});

test("inside a row it can be centred against its neighbours", async () => {
  await render(<Badge label="Owner" align="center" />);
  expect(boxOf("Owner").alignSelf).toBe("center");
});

test("it reads as a single element with its label, ", async () => {
  await render(<Badge variant="error" label="Sync failed" />);
  expect(screen.getByLabelText("Sync failed")).toBeTruthy();
});

test("a badge is text only, with no icon, for every variant", async () => {
  for (const variant of ["error", "info", "success", "warning", "neutral"] as BadgeVariant[]) {
    const { toJSON, unmount } = await render(<Badge variant={variant} label="x" />);
    expect(JSON.stringify(toJSON())).not.toContain("RNSVGSvgView");
    await unmount();
  }
});
