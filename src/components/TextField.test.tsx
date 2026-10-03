import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TextField } from "./TextField";
import { color } from "../theme/tokens";

const flat = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;

test("the field is labelled for screen readers and shows its label above it", async () => {
  await render(<TextField label="Trip name" value="" onChangeText={jest.fn()} placeholder="Goa" />);
  expect(screen.getByLabelText("Trip name")).toBeTruthy();
  expect(screen.getByText("Trip name")).toBeTruthy();
});

test("resting: white field, 1px light grey border, radius 16, Obsidian text, Pebble placeholder", async () => {
  await render(<TextField label="Name" value="" onChangeText={jest.fn()} placeholder="Goa" />);
  const st = flat(screen.getByLabelText("Name"));
  expect(st).toMatchObject({ backgroundColor: color.paper, borderRadius: 16, borderWidth: 1, borderColor: color.inputBorder, color: color.obsidian });
  expect(screen.getByLabelText("Name").props.placeholderTextColor).toBe(color.pebble);
});

test("focus thickens the border to 3px in the brand black without changing the box size, and blur restores it", async () => {
  await render(<TextField label="Name" value="" onChangeText={jest.fn()} />);
  const field = () => flat(screen.getByLabelText("Name"));
  // Height is fixed, and horizontally the thicker border is paid for with less padding, so nothing moves.
  const width = (st: Record<string, unknown>) => (st.borderWidth as number) * 2 + (st.paddingHorizontal as number) * 2;
  const before = width(field());
  expect(field()).toMatchObject({ minHeight: 48 });
  await fireEvent(screen.getByLabelText("Name"), "focus");
  expect(field()).toMatchObject({ borderWidth: 3, borderColor: color.brandBlack, minHeight: 48 });
  expect(width(field())).toBe(before);
  await fireEvent(screen.getByLabelText("Name"), "blur");
  expect(field()).toMatchObject({ borderWidth: 1, borderColor: color.inputBorder });
});

test("an error turns the border red and 3px, and shows an announced message with an icon and red text", async () => {
  await render(<TextField label="Name" value="" onChangeText={jest.fn()} status="error" message="Give your trip a name." />);
  expect(flat(screen.getByLabelText("Name"))).toMatchObject({ borderWidth: 3, borderColor: color.alarmRed });
  expect(screen.getByRole("alert")).toHaveTextContent("Give your trip a name.");
  expect(flat(screen.getByText("Give your trip a name.")).color).toBe(color.alarmRed);
});

test("a positive or warning message keeps the normal border and is a quiet notice, not an alert", async () => {
  const { rerender } = await render(<TextField label="Name" value="x" onChangeText={jest.fn()} status="positive" message="Looks good." />);
  expect(flat(screen.getByLabelText("Name")).borderColor).toBe(color.inputBorder);
  expect(screen.getByText("Looks good.")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
  await rerender(<TextField label="Name" value="x" onChangeText={jest.fn()} status="warning" message="That name is long." />);
  expect(screen.getByText("That name is long.")).toBeTruthy();
});

test("a plain message shows under the field in Charcoal", async () => {
  await render(<TextField label="Name" value="" onChangeText={jest.fn()} message="Shown to everyone on the trip." />);
  expect(flat(screen.getByText("Shown to everyone on the trip.")).color).toBe(color.charcoal);
});

test("disabled: faint border, tertiary label, cannot be edited", async () => {
  await render(<TextField label="Name" value="Goa" disabled onChangeText={jest.fn()} />);
  expect(screen.getByLabelText("Name").props.editable).toBe(false);
  expect(flat(screen.getByLabelText("Name")).borderColor).toBe(color.borderNeutral);
  expect(flat(screen.getByText("Name")).color).toBe(color.slate);
});

test("typing reports the text, and multiline fields are taller", async () => {
  const onChangeText = jest.fn();
  await render(<TextField label="Note" value="" multiline onChangeText={onChangeText} />);
  await fireEvent.changeText(screen.getByLabelText("Note"), "hello");
  expect(onChangeText).toHaveBeenCalledWith("hello");
  expect(flat(screen.getByLabelText("Note")).minHeight).toBe(96);
});
