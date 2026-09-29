import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { Card } from "./Card";

test("Card is a button only when it has an action, and it presses once", async () => {
  const onPress = jest.fn();
  await render(<><Card><Text>Static</Text></Card><Card onPress={onPress} accessibilityLabel="Open Goa"><Text>Goa</Text></Card></>);
  expect(screen.getAllByRole("button")).toHaveLength(1);
  await fireEvent.press(screen.getByRole("button", { name: "Open Goa" }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test("Card selected is exposed to assistive tech, not just drawn", async () => {
  await render(<Card onPress={() => {}} selected accessibilityLabel="Pick"><Text>x</Text></Card>);
  expect(screen.getByRole("button", { name: "Pick", selected: true })).toBeTruthy();
});
