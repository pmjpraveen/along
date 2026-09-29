import { fireEvent, render, screen } from "@testing-library/react-native";
import { SectionHeader } from "./SectionHeader";

test("SectionHeader shows its title and a link that fires once", async () => {
  const onAction = jest.fn();
  await render(<SectionHeader title="Transactions" actionLabel="See all" onAction={onAction} />);
  expect(screen.getByRole("header", { name: "Transactions" })).toBeTruthy();
  await fireEvent.press(screen.getByRole("link", { name: "See all, Transactions" }));
  expect(onAction).toHaveBeenCalledTimes(1);
});

test("SectionHeader group is a heading with no link", async () => {
  await render(<SectionHeader kind="group" title="General" />);
  expect(screen.getByRole("header", { name: "General" })).toBeTruthy();
  expect(screen.queryByRole("link")).toBeNull();
});
