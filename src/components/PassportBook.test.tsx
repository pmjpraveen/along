import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { PassportBook } from "./PassportBook";

const pages = [<Text key="a">First</Text>, <Text key="b">Second</Text>, <Text key="c">Third</Text>];

test("the book says which page it is on, and the arrows turn the pages, stopping at both ends", async () => {
  await render(<PassportBook pages={pages} firstNumber={6} tint="#123456" />);
  expect(screen.getByText("Page 6 · 1 of 3")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Previous page" }).props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getByText("Page 7 · 2 of 3")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getByText("Page 8 · 3 of 3")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Next page" }).props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: "Previous page" }));
  expect(screen.getByText("Page 7 · 2 of 3")).toBeTruthy();
});
