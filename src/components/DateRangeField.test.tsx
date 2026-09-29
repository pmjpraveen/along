import { fireEvent, render, screen } from "@testing-library/react-native";
import { DateRangeField } from "./DateRangeField";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

test("Duration shows a placeholder, and Confirm waits for a last day, then commits the range once", async () => {
  const onChange = jest.fn();
  await render(<DateRangeField label="Duration" start="2026-10-01" end="" onChange={onChange} />);
  expect(screen.getByText("Select date")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Duration" }));
  await fireEvent.press(screen.getByRole("button", { name: "Confirm" }));
  expect(onChange).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Monday 5 October 2026" }));
  await fireEvent.press(screen.getByRole("button", { name: "Confirm" }));
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith({ start: "2026-10-01", end: "2026-10-05" });
});

test("a chosen range reads as DD-MM-YYYY to DD-MM-YYYY", async () => {
  await render(<DateRangeField label="Duration" start="2026-10-01" end="2026-10-05" onChange={jest.fn()} />);
  expect(screen.getByText("01-10-2026 → 05-10-2026")).toBeTruthy();
});

test("days before today cannot be chosen", async () => {
  const onChange = jest.fn();
  await render(<DateRangeField label="Duration" start="2026-10-01" end="" today="2026-10-03" onChange={onChange} />);
  await fireEvent.press(screen.getByRole("button", { name: "Duration" }));
  const future = screen.getByRole("button", { name: "Monday 5 October 2026" });
  const before = screen.getByRole("button", { name: "Friday 2 October 2026" });
  expect(before.props.accessibilityState.disabled).toBe(true);
  expect(future.props.accessibilityState.disabled).toBe(false);
});
