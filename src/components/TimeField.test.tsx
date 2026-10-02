import { fireEvent, render, screen , waitFor } from "@testing-library/react-native";
import { TimeField } from "./TimeField";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
let mockPicked: Date | null = null;
jest.mock("@react-native-community/datetimepicker", () => {
  const { Pressable, Text } = require("react-native");
  return { __esModule: true, default: ({ onChange, value }: { onChange: (e: unknown, d: Date) => void; value: Date }) => (
    <Pressable accessibilityRole="adjustable" accessibilityLabel="wheel" onPress={() => { const d = new Date(value); d.setHours(14, 5, 0, 0); mockPicked = d; onChange({}, d); }}><Text>wheel</Text></Pressable>
  ) };
});

test("an empty field says it is optional; a filled one shows the time", async () => {
  const { rerender } = await render(<TimeField label="Time" value={null} onChange={jest.fn()} />);
  expect(screen.getByText("Start time (optional)")).toBeTruthy();
  await rerender(<TimeField label="Time" value="09:30" onChange={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Time, 09:30" })).toBeTruthy();
});

test("tapping the field opens the picker in a bottom sheet, and Confirm sets the chosen time and closes", async () => {
  const onChange = jest.fn();
  await render(<TimeField label="Time" value={null} onChange={onChange} />);
  await waitFor(() => expect(screen.queryByRole("adjustable", { name: "wheel" })).toBeNull());
  await fireEvent.press(screen.getByRole("button", { name: "Time" }));
  expect(await screen.findByRole("header", { name: "Time" })).toBeTruthy();
  await fireEvent.press(screen.getByRole("adjustable", { name: "wheel" }));
  expect(onChange).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Confirm" }));
  expect(onChange).toHaveBeenCalledWith("14:05");
  await waitFor(() => expect(screen.queryByRole("adjustable", { name: "wheel" })).toBeNull());
});

test("with no time set there is nothing to remove; with one set, Remove time clears it", async () => {
  const onChange = jest.fn();
  const { unmount } = await render(<TimeField label="Time" value={null} onChange={onChange} />);
  await fireEvent.press(screen.getByRole("button", { name: "Time" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Remove time" })).toBeNull());
  unmount();
  await render(<TimeField label="Time" value="09:30" onChange={onChange} />);
  await fireEvent.press(screen.getByRole("button", { name: "Time, 09:30" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Remove time" }));
  expect(onChange).toHaveBeenCalledWith(null);
});
