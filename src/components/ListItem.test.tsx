import { fireEvent, render, screen } from "@testing-library/react-native";
import { ListItem } from "./ListItem";

test("ListItem checkbox and radio report their state and toggle on press", async () => {
  const onPress = jest.fn();
  await render(<><ListItem title="Vanessa" subtitle="Sent 12GBP" trailing="checkbox" checked onPress={onPress} />
    <ListItem title="EUR" trailing="radio" onPress={() => {}} /></>);
  await fireEvent.press(screen.getByRole("checkbox", { name: "Vanessa, Sent 12GBP", checked: true }));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("radio", { name: "EUR", checked: false })).toBeTruthy();
});

test("ListItem with no action is not a control; a disabled one does not fire", async () => {
  const onPress = jest.fn();
  await render(<><ListItem title="Spent this month" subtitle="20.45 GBP" /><ListItem title="To your balance" trailing="chevron" disabled onPress={onPress} /></>);
  expect(screen.getAllByRole("button")).toHaveLength(1);
  await fireEvent.press(screen.getByRole("button"));
  expect(onPress).not.toHaveBeenCalled();
});

test("ListItem button trailing shows its own action", async () => {
  const onPress = jest.fn();
  await render(<ListItem title="Bank transfer" overline="Payment method" trailing="button" buttonLabel="Change" onPress={onPress} />);
  await fireEvent.press(screen.getByRole("button", { name: "Change" }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
