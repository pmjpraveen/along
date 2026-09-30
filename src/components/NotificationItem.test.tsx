import { fireEvent, render, screen } from "@testing-library/react-native";
import { NotificationItem } from "./NotificationItem";

const parts = [{ text: "Ben", bold: true }, { text: " added " }, { text: "Dinner", bold: true }];

test("NotificationItem announces unread in words, shows the time, and fires once when pressed", async () => {
  const onPress = jest.fn();
  await render(<><NotificationItem actor="Ben" parts={parts} time="10:09 AM" unread onPress={onPress} /><NotificationItem actor="Ben" parts={parts} time="09:00 AM" onPress={() => {}} /></>);
  await fireEvent.press(screen.getByRole("button", { name: "Unread. Ben added Dinner, 10:09 AM" }));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Ben added Dinner, 09:00 AM" })).toBeTruthy();
  expect(screen.getAllByText("New")).toHaveLength(1);
});
