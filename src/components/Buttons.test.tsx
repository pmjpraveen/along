import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { Button, OutlinedButton, PrimaryButton, TextButton } from "./Buttons";
import { color } from "../theme/tokens";

const flat = (el: { props: { style?: unknown } }) => {
  const st = typeof el.props.style === "function" ? (el.props.style as (s: { pressed: boolean }) => unknown)({ pressed: false }) : el.props.style;
  return StyleSheet.flatten(st as never) as Record<string, unknown>;
};
const labelOf = (name: string) => screen.getByText(name);

test("primary is the black button with a white label, 16px corners, 56 tall and no border colour", async () => {
  await render(<Button label="Save" onPress={jest.fn()} />);
  const st = flat(screen.getByRole("button", { name: "Save" }));
  expect(st).toMatchObject({ backgroundColor: color.brandBlack, borderRadius: 16, minHeight: 56 });
  expect(st.borderColor).toBe("transparent");
  expect(flat(labelOf("Save"))).toMatchObject({ color: color.paper, fontSize: 16, lineHeight: 24 });
});

test("secondary and secondary neutral are light grey with a #222222 label, and destructive keeps its red border and label", async () => {
  await render(<>
    <Button label="A" type="secondary" onPress={jest.fn()} />
    <Button label="B" type="secondaryNeutral" onPress={jest.fn()} />
    <Button label="C" type="destructive" onPress={jest.fn()} />
  </>);
  expect(flat(screen.getByRole("button", { name: "A" })).backgroundColor).toBe(color.buttonGrey);
  expect(flat(screen.getByRole("button", { name: "B" })).backgroundColor).toBe(color.buttonGrey);
  expect(flat(labelOf("A")).color).toBe(color.brandBlack);
  const destructive = flat(screen.getByRole("button", { name: "C" }));
  expect(destructive).toMatchObject({ backgroundColor: color.paper, borderColor: color.alarmRed });
  expect(flat(labelOf("C")).color).toBe(color.alarmRed);
});

test("tertiary is an underlined text button with no fill", async () => {
  await render(<Button label="Skip" type="tertiary" size="medium" onPress={jest.fn()} />);
  expect(flat(screen.getByRole("button", { name: "Skip" })).backgroundColor).toBe("transparent");
  expect(flat(labelOf("Skip")).textDecorationLine).toBe("underline");
});

test("sizes follow the design system: large 56, medium 44, small 30 with 14/22 text", async () => {
  await render(<>
    <Button label="L" size="large" onPress={jest.fn()} />
    <Button label="M" size="medium" onPress={jest.fn()} />
    <Button label="S" size="small" onPress={jest.fn()} />
  </>);
  expect(flat(screen.getByRole("button", { name: "L" })).minHeight).toBe(56);
  expect(flat(screen.getByRole("button", { name: "M" })).minHeight).toBe(44);
  expect(flat(screen.getByRole("button", { name: "S" })).minHeight).toBe(30);
  expect(flat(labelOf("S"))).toMatchObject({ fontSize: 14, lineHeight: 22 });
});

test("a small button still has a 44pt touch area through hit slop", async () => {
  await render(<Button label="S" size="small" onPress={jest.fn()} />);
  const slop = screen.getByRole("button", { name: "S" }).props.hitSlop as { top: number; bottom: number };
  expect(30 + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
});

test("disabled buttons fall back to light grey and a Pebble label, and never fire", async () => {
  const onPress = jest.fn();
  await render(<Button label="Save" disabled onPress={onPress} />);
  const btn = screen.getByRole("button", { name: "Save" });
  expect(flat(btn).backgroundColor).toBe(color.buttonGrey);
  expect(flat(labelOf("Save")).color).toBe(color.pebble);
  await fireEvent.press(btn);
  expect(onPress).not.toHaveBeenCalled();
  expect(btn).toBeDisabled();
});

test("disabled destructive keeps its outline but in the faint border colour; disabled tertiary fades its label", async () => {
  await render(<>
    <Button label="Del" type="destructive" disabled onPress={jest.fn()} />
    <Button label="Skip" type="tertiary" size="medium" disabled onPress={jest.fn()} />
  </>);
  expect(flat(screen.getByRole("button", { name: "Del" })).borderColor).toBe(color.borderNeutral);
  expect(flat(labelOf("Skip")).color).toBe(color.borderNeutral);
});

test("a busy button shows a spinner instead of its label and ignores taps, but keeps its accessible name", async () => {
  const onPress = jest.fn();
  await render(<Button label="Save" busy onPress={onPress} />);
  expect(screen.queryByText("Save")).toBeNull();
  const btn = screen.getByRole("button", { name: "Save" });
  await fireEvent.press(btn);
  expect(onPress).not.toHaveBeenCalled();
  expect(btn).toBeBusy();
});

test("pressing an active button calls onPress once", async () => {
  const onPress = jest.fn();
  await render(<Button label="Go" onPress={onPress} />);
  await fireEvent.press(screen.getByRole("button", { name: "Go" }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("keyboard focus shows a ring that is removed on blur", async () => {
  await render(<Button label="Go" onPress={jest.fn()} />);
  const btn = screen.getByRole("button", { name: "Go" });
  expect(screen.queryByTestId("focus-ring")).toBeNull();
  await fireEvent(btn, "focus");
  expect(screen.getByTestId("focus-ring")).toBeTruthy();
  await fireEvent(btn, "blur");
  expect(screen.queryByTestId("focus-ring")).toBeNull();
});

test("the three names the screens use map onto the design system: primary, secondary and tertiary", async () => {
  await render(<>
    <PrimaryButton label="P" onPress={jest.fn()} />
    <OutlinedButton label="O" onPress={jest.fn()} />
    <TextButton label="T" onPress={jest.fn()} />
  </>);
  expect(flat(screen.getByRole("button", { name: "P" })).backgroundColor).toBe(color.brandBlack);
  expect(flat(screen.getByRole("button", { name: "O" })).backgroundColor).toBe(color.buttonGrey);
  expect(flat(labelOf("T")).textDecorationLine).toBe("underline");
});
