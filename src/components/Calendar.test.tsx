import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { Calendar } from "./Calendar";
import { color } from "../theme/tokens";

const flat = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;

test("it opens on the selected month, titled the way the design system does", async () => {
  await render(<Calendar value="2022-11-18" onSelect={jest.fn()} />);
  expect(screen.getByText("November 2022")).toBeTruthy();
  // the week row is decorative for screen readers (each day already announces its weekday), so look at hidden elements too
  expect(screen.getByText("Mon", { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByText("Sun", { includeHiddenElements: true })).toBeTruthy();
});

test("every day of the month is there once, and tapping one reports its ISO date", async () => {
  const onSelect = jest.fn();
  await render(<Calendar value="2022-11-18" onSelect={onSelect} />);
  expect(screen.getAllByLabelText(/ November 2022$/)).toHaveLength(30);
  await fireEvent.press(screen.getByRole("button", { name: "Wednesday 23 November 2022" }));
  expect(onSelect).toHaveBeenCalledWith("2022-11-23");
});

test("the selected day is a Forest Ink circle with a Bright Green number; weekdays and weekends differ in weight and colour", async () => {
  await render(<Calendar value="2022-11-18" onSelect={jest.fn()} />);
  const sel = screen.getByRole("button", { name: "Friday 18 November 2022" });
  expect(flat(sel).backgroundColor).toBe(color.forestInk);
  expect(sel).toBeSelected();
  expect(flat(screen.getByText("18")).color).toBe(color.brightGreen);
  expect(flat(screen.getByText("16")).color).toBe(color.obsidian);      // a Wednesday
  expect(flat(screen.getByText("19")).color).toBe(color.charcoal);      // a Saturday
});

test("the arrows move between months and roll over the year", async () => {
  await render(<Calendar value="2022-12-05" onSelect={jest.fn()} />);
  await fireEvent.press(screen.getByRole("button", { name: "Next month" }));
  expect(screen.getByText("January 2023")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Previous month" }));
  await fireEvent.press(screen.getByRole("button", { name: "Previous month" }));
  expect(screen.getByText("November 2022")).toBeTruthy();
});

test("days before the earliest allowed date are dimmed and cannot be chosen", async () => {
  const onSelect = jest.fn();
  await render(<Calendar value="" min="2026-12-05" onSelect={onSelect} />);
  expect(screen.getByText("December 2026")).toBeTruthy();
  const early = screen.getByRole("button", { name: "Thursday 3 December 2026" });
  expect(early).toBeDisabled();
  await fireEvent.press(early);
  expect(onSelect).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Saturday 5 December 2026" }));
  expect(onSelect).toHaveBeenCalledWith("2026-12-05");
});

test("days after the latest allowed date cannot be chosen either", async () => {
  await render(<Calendar value="2026-12-05" max="2026-12-10" onSelect={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Friday 11 December 2026" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Thursday 10 December 2026" })).toBeEnabled();
});

test("touch areas stay generous: each day has hit slop and the arrows are 48pt", async () => {
  await render(<Calendar value="2022-11-18" onSelect={jest.fn()} />);
  const day = screen.getByRole("button", { name: "Friday 18 November 2022" }).props.hitSlop as { top: number; bottom: number; left: number; right: number };
  expect(36 + day.left + day.right).toBeGreaterThanOrEqual(44);
  expect(flat(screen.getByRole("button", { name: "Next month" }))).toMatchObject({ width: 48, height: 48 });
});
