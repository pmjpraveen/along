import { fireEvent, render, screen } from "@testing-library/react-native";
import { NotificationItem } from "./NotificationItem";

test("NotificationItem announces unread in words and fires once when pressed", async () => {
  const onPress = jest.fn();
  await render(<><NotificationItem unread title="Ben added Dinner" body="₹900" date="Jul 11" onPress={onPress} /><NotificationItem title="Ben paid Asha" onPress={() => {}} /></>);
  await fireEvent.press(screen.getByRole("button", { name: "Unread. Ben added Dinner" }));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Ben paid Asha" })).toBeTruthy();
});
