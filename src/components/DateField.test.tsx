import { fireEvent, render, screen } from "@testing-library/react-native";
import { DateField } from "./DateField";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

test("an empty field says the format; a filled one shows DD-MM-YYYY", async () => {
  const { rerender } = await render(<DateField label="Start date" value="" onChange={jest.fn()} />);
  expect(screen.getByText("DD-MM-YYYY")).toBeTruthy();
  await rerender(<DateField label="Start date" value="2026-12-05" onChange={jest.fn()} />);
  expect(screen.getByText("05-12-2026")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Start date, 05-12-2026" })).toBeTruthy();
});

test("tapping the field opens the calendar, and picking a day reports it and closes", async () => {
  const onChange = jest.fn();
  await render(<DateField label="Start date" value="2026-12-05" onChange={onChange} />);
  expect(screen.queryByText("December 2026")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Start date, 05-12-2026" }));
  expect(await screen.findByText("December 2026")).toBeTruthy();
  expect(screen.getByRole("header", { name: "Start date" })).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Tuesday 8 December 2026" }));
  expect(onChange).toHaveBeenCalledWith("2026-12-08");
  expect(screen.queryByText("December 2026")).toBeNull();
});

test("the earliest date is passed on, so an end date cannot be before the start", async () => {
  const onChange = jest.fn();
  await render(<DateField label="End date" value="" min="2026-12-05" onChange={onChange} />);
  await fireEvent.press(screen.getByRole("button", { name: "End date" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Friday 4 December 2026" }));
  expect(onChange).not.toHaveBeenCalled();
});

test("tapping outside the calendar closes it without changing anything", async () => {
  const onChange = jest.fn();
  await render(<DateField label="Start date" value="2026-12-05" onChange={onChange} />);
  await fireEvent.press(screen.getByRole("button", { name: "Start date, 05-12-2026" }));
  await fireEvent.press(await screen.findByRole("button", { name: "Close Start date" }));
  expect(screen.queryByText("December 2026")).toBeNull();
  expect(onChange).not.toHaveBeenCalled();
});
