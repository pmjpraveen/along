import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { Alert } from "./Alert";
import { color } from "../theme/tokens";

const flat = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;

test("a negative alert is announced as an alert and shows its message", async () => {
  await render(<Alert variant="negative">Couldn't load your trips. Try again.</Alert>);
  expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load your trips. Try again.");
});

test("a warning and a critical banner are announced; neutral and positive are quiet notices", async () => {
  const { rerender } = await render(<Alert variant="warning">Trip dates changed.</Alert>);
  expect(screen.getByRole("alert")).toBeTruthy();
  await rerender(<Alert variant="critical" title="Sync failed">Your expenses are saved on this phone.</Alert>);
  expect(screen.getByRole("alert")).toBeTruthy();
  await rerender(<Alert variant="positive">Payment recorded.</Alert>);
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByText("Payment recorded.")).toBeTruthy();
});

test("a simple alert is the soft pill: radius 32, 16 padding, neutral wash, 16/24 Obsidian text", async () => {
  await render(<Alert>Balances update live.</Alert>);
  const text = flat(screen.getByText("Balances update live."));
  expect(text).toMatchObject({ fontSize: 16, lineHeight: 24, color: color.obsidian });
  const box = flat(screen.getByText("Balances update live.").parent!.parent!.parent!);
  expect(box).toMatchObject({ borderRadius: 32, padding: 16, backgroundColor: color.neutralWash });
});

test("with an action it becomes the card: radius 10, 14/22 Charcoal text, and a small secondary-neutral button", async () => {
  const onAction = jest.fn();
  await render(<Alert actionLabel="Review dates" onAction={onAction}>Some items fall outside the trip dates.</Alert>);
  expect(flat(screen.getByText("Some items fall outside the trip dates.").parent!.parent!.parent!)).toMatchObject({ borderRadius: 10 });
  expect(flat(screen.getByText("Some items fall outside the trip dates."))).toMatchObject({ fontSize: 14, lineHeight: 22, color: color.charcoal });
  const btn = screen.getByRole("button", { name: "Review dates" });
  expect(flat(btn)).toMatchObject({ backgroundColor: color.neutralWash, minHeight: 30 });
  await fireEvent.press(btn);
  expect(onAction).toHaveBeenCalledTimes(1);
});

test("the action can be an underlined link instead of a button", async () => {
  await render(<Alert actionKind="link" actionLabel="Learn more" onAction={jest.fn()}>Prices are in rupees.</Alert>);
  expect(flat(screen.getByText("Learn more")).textDecorationLine).toBe("underline");
});

test("dismiss is a labelled control with a 48pt touch area that calls back", async () => {
  const onDismiss = jest.fn();
  await render(<Alert onDismiss={onDismiss}>Heads up.</Alert>);
  const btn = screen.getByRole("button", { name: "Dismiss" });
  const slop = btn.props.hitSlop as number;
  expect(24 + slop * 2).toBeGreaterThanOrEqual(48);
  await fireEvent.press(btn);
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

test("the critical banner is red with a semibold white title, white text and a white small button", async () => {
  const onAction = jest.fn();
  await render(<Alert variant="critical" title="Couldn't sync" actionLabel="Try again" onAction={onAction}>Your changes are saved on this phone.</Alert>);
  expect(flat(screen.getByText("Couldn't sync"))).toMatchObject({ color: color.paper, fontSize: 16, lineHeight: 24 });
  expect(flat(screen.getByText("Your changes are saved on this phone."))).toMatchObject({ color: color.paper, fontSize: 16 });
  const box = flat(screen.getByText("Couldn't sync").parent!.parent!.parent!);
  expect(box).toMatchObject({ backgroundColor: color.alarmRed, borderRadius: 10 });
  const btn = screen.getByRole("button", { name: "Try again" });
  expect(flat(btn)).toMatchObject({ backgroundColor: color.paper });
  expect(flat(screen.getByText("Try again")).color).toBe(color.alarmRed);
  await fireEvent.press(btn);
  expect(onAction).toHaveBeenCalledTimes(1);
});

test("a critical banner has no dismiss control: it stays until the problem is dealt with", async () => {
  await render(<Alert variant="critical" title="Sync failed" onDismiss={jest.fn()}>Try again later.</Alert>);
  expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
});

test("without an action or dismiss there are no buttons", async () => {
  await render(<Alert variant="negative">Nope.</Alert>);
  expect(screen.queryByRole("button")).toBeNull();
});
