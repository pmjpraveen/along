import { fireEvent, render, screen } from "@testing-library/react-native";
import { TimeWheel } from "./TimeWheel";

const settleAt = (label: string, row: number) =>
  fireEvent(screen.getByRole("adjustable", { name: label }), "momentumScrollEnd", { nativeEvent: { contentOffset: { x: 0, y: row * 44 } } });

test("US-03 scrolling the hour wheel reports the new hour and keeps the minute", async () => {
  const onChange = jest.fn();
  await render(<TimeWheel hour={9} minute={30} onChange={onChange} />);
  await settleAt("Hour", 14);
  expect(onChange).toHaveBeenCalledWith(14, 30);
});

test("US-03 scrolling the minute wheel reports the new minute and keeps the hour", async () => {
  const onChange = jest.fn();
  await render(<TimeWheel hour={9} minute={30} onChange={onChange} />);
  await settleAt("Minute", 5);
  expect(onChange).toHaveBeenCalledWith(9, 5);
});

test("US-03 settling back on the same row reports nothing", async () => {
  const onChange = jest.fn();
  await render(<TimeWheel hour={9} minute={30} onChange={onChange} />);
  await settleAt("Hour", 9);
  expect(onChange).not.toHaveBeenCalled();
});

test("US-03 a screen reader can step the hour up and down, and the wheel announces its value", async () => {
  const onChange = jest.fn();
  await render(<TimeWheel hour={23} minute={0} onChange={onChange} />);
  const hour = screen.getByRole("adjustable", { name: "Hour" });
  expect(hour.props.accessibilityValue).toEqual({ text: "23" });
  await fireEvent(hour, "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
  expect(onChange).toHaveBeenCalledWith(22, 0);
  await fireEvent(hour, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
  expect(onChange).toHaveBeenLastCalledWith(23, 0);   // 23 is the last hour, so it stays
});
