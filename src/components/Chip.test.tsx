import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { color } from "../theme/tokens";
import { Chip } from "./Chip";

const flat = (n: { props: { style?: unknown } }) => StyleSheet.flatten(n.props.style as never) as Record<string, unknown>;

test("a chip is a 32pt pill: selected #444444 with a white label, unselected #f4f4f4 at 85% with a #444444 label", async () => {
  await render(<><Chip role="tab" label="Day 1" selected onPress={jest.fn()} /><Chip role="tab" label="Day 2" selected={false} onPress={jest.fn()} /></>);
  expect(flat(screen.getByRole("tab", { name: "Day 1" }))).toMatchObject({ height: 32, borderRadius: 9999, backgroundColor: "#444444", opacity: 1 });
  expect(flat(screen.getByText("Day 1"))).toMatchObject({ color: color.paper });
  expect(flat(screen.getByRole("tab", { name: "Day 2" }))).toMatchObject({ height: 32, backgroundColor: "#f4f4f4", opacity: 0.85 });
  expect(flat(screen.getByText("Day 2"))).toMatchObject({ color: "#444444" });
  expect(screen.getByRole("tab", { name: "Day 1" }).props.accessibilityState).toMatchObject({ selected: true });
});

test("pressing a chip calls it once, and a radio chip carries the radio role", async () => {
  const onPress = jest.fn();
  await render(<Chip role="radio" label="Equally" selected={false} onPress={onPress} />);
  await fireEvent.press(screen.getByRole("radio", { name: "Equally" }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
