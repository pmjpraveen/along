import { fireEvent, render, screen } from "@testing-library/react-native";
import { Tabs } from "./Tabs";

const tabs = [{ value: "a", label: "Tab 1" }, { value: "b", label: "Tab 2" }, { value: "c", label: "Tab 3" }];

test("Tabs marks the selected tab and reports a change to another tab once", async () => {
  const onChange = jest.fn();
  await render(<Tabs accessibilityLabel="Sections" tabs={tabs} value="a" onChange={onChange} />);
  expect(screen.getByRole("tab", { name: "Tab 1", selected: true })).toBeTruthy();
  await fireEvent.press(screen.getByRole("tab", { name: "Tab 1" }));
  expect(onChange).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("tab", { name: "Tab 3" }));
  expect(onChange).toHaveBeenCalledWith("c");
});
