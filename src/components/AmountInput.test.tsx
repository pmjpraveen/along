import { fireEvent, render, screen } from "@testing-library/react-native";
import { AmountInput, sanitizeAmount } from "./AmountInput";

test("US-05 typing keeps only a valid partial amount for the currency", () => {
  expect(sanitizeAmount("12.345", 2)).toBe("12.34");
  expect(sanitizeAmount("1a2.5", 2)).toBe("12.5");
  expect(sanitizeAmount("1.2.3", 2)).toBe("1.23");
  expect(sanitizeAmount("500.5", 0)).toBe("500");
  expect(sanitizeAmount("1.2345", 3)).toBe("1.234");
  expect(sanitizeAmount("-5", 2)).toBe("5");
});

test("US-05 the field reports the cleaned text", async () => {
  const onChange = jest.fn();
  await render(<AmountInput label="Amount" value="" onChange={onChange} exponent={2} symbol="₹" />);
  await fireEvent.changeText(screen.getByLabelText("Amount"), "8x00.999");
  expect(onChange).toHaveBeenCalledWith("800.99");
});
