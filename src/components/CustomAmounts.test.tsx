import { fireEvent, render, screen } from "@testing-library/react-native";
import { CustomAmounts } from "./CustomAmounts";

const people = [{ id: "a", name: "Asha" }, { id: "b", name: "Ben" }];

test("5.1 one amount field per person, reporting who changed", async () => {
  const onChange = jest.fn();
  await render(<CustomAmounts people={people} values={{ a: "70" }} onChange={onChange} exponent={2} symbol="₹" remaining={null} ok={false} />);
  expect(screen.getByLabelText("Amount for Asha").props.value).toBe("70");
  await fireEvent.changeText(screen.getByLabelText("Amount for Ben"), "30.505");
  expect(onChange).toHaveBeenCalledWith("b", "30.50");
});

test("5.1 the remaining line shows what is left, and a tick when fully assigned", async () => {
  const { rerender } = await render(<CustomAmounts people={people} values={{}} onChange={jest.fn()} exponent={2} symbol="₹" remaining="₹10.00 still to assign." ok={false} />);
  expect(screen.getByText("₹10.00 still to assign.")).toBeTruthy();
  await rerender(<CustomAmounts people={people} values={{}} onChange={jest.fn()} exponent={2} symbol="₹" remaining="Fully assigned" ok />);
  expect(screen.getByText("✓ Fully assigned")).toBeTruthy();
});

test("5.3 each person can show a live hint next to their name", async () => {
  await render(<CustomAmounts noun="Shares" people={people} values={{}} onChange={jest.fn()} exponent={0} symbol="×" remaining={null} ok={false} hints={{ a: "₹750.00" }} />);
  expect(screen.getByText("₹750.00")).toBeTruthy();
  expect(screen.getByLabelText("Shares for Asha")).toBeTruthy();
});
