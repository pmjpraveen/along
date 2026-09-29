import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";
import { BottomSheet } from "./BottomSheet";
import { color } from "../theme/tokens";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 20 }) }));
const flat = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;

test("it shows a header, the body text and its content when visible, and nothing when hidden", async () => {
  const { rerender } = await render(<BottomSheet visible onClose={jest.fn()} title="Header" body="This is the body text if needed."><Text>Content</Text></BottomSheet>);
  expect(screen.getByRole("header", { name: "Header" })).toBeTruthy();
  expect(screen.getByText("This is the body text if needed.")).toBeTruthy();
  expect(screen.getByText("Content")).toBeTruthy();
  await rerender(<BottomSheet visible={false} onClose={jest.fn()} title="Header" />);
  expect(screen.queryByText("Header")).toBeNull();
});

test("the header is 28/32 medium Obsidian and the body 16/24", async () => {
  await render(<BottomSheet visible onClose={jest.fn()} title="Header" body="Body" />);
  expect(flat(screen.getByText("Header"))).toMatchObject({ fontSize: 28, lineHeight: 32, color: color.obsidian });
  expect(flat(screen.getByText("Body"))).toMatchObject({ fontSize: 16, lineHeight: 24 });
});

test("the close button is a 44pt circle on the neutral wash with a generous touch area, and closes the sheet", async () => {
  const onClose = jest.fn();
  await render(<BottomSheet visible onClose={onClose} title="Header" />);
  const close = screen.getByRole("button", { name: "Close" });
  expect(flat(close)).toMatchObject({ width: 44, height: 44, borderRadius: 9999, backgroundColor: color.neutralWash });
  expect((close.props.hitSlop as number) * 2 + 44).toBeGreaterThanOrEqual(48);
  await fireEvent.press(close);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("tapping the scrim closes it too", async () => {
  const onClose = jest.fn();
  await render(<BottomSheet visible onClose={onClose} title="Trip dates" />);
  await fireEvent.press(screen.getByRole("button", { name: "Close Trip dates" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("the sheet has rounded top corners and no rounded bottom", async () => {
  await render(<BottomSheet visible onClose={jest.fn()} title="Header" />);
  const sheet = flat(screen.getByRole("header").parent!.parent!.parent!);
  expect(sheet).toMatchObject({ borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: color.paper });
  expect(sheet.borderBottomLeftRadius).toBeUndefined();
});

test("a footer action is one primary button that fires once, and shows busy", async () => {
  const onAction = jest.fn();
  const { rerender } = await render(<BottomSheet visible onClose={jest.fn()} title="Header" actionLabel="Save" onAction={onAction} />);
  await fireEvent.press(screen.getByRole("button", { name: "Save" }));
  expect(onAction).toHaveBeenCalledTimes(1);
  expect(flat(screen.getByRole("button", { name: "Save" })).backgroundColor).toBe(color.brightGreen);
  await rerender(<BottomSheet visible onClose={jest.fn()} title="Header" actionLabel="Save" onAction={onAction} actionBusy />);
  await fireEvent.press(screen.getByRole("button", { name: "Save" }));
  expect(onAction).toHaveBeenCalledTimes(1);
});

test("without an action there is no footer", async () => {
  await render(<BottomSheet visible onClose={jest.fn()} title="Header" />);
  expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
});
