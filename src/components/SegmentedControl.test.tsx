import { fireEvent, render, screen } from "@testing-library/react-native";
import { SegmentedControl } from "./SegmentedControl";

const options = [{ value: "in", label: "Inside Europe" }, { value: "out", label: "Outside Europe" }];

test("SegmentedControl marks the selected option and reports a change once; re-pressing the selected one does nothing", async () => {
  const onChange = jest.fn();
  await render(<SegmentedControl accessibilityLabel="Region" options={options} value="in" onChange={onChange} />);
  expect(screen.getByRole("tab", { name: "Inside Europe", selected: true })).toBeTruthy();
  await fireEvent.press(screen.getByRole("tab", { name: "Inside Europe" }));
  expect(onChange).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("tab", { name: "Outside Europe" }));
  expect(onChange).toHaveBeenCalledWith("out");
});
