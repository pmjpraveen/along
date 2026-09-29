import { initialsOf } from "./initials";

test("initials are the first letters of the first two words, in capitals", () => {
  expect(initialsOf("Jane Wilson")).toBe("JW");
  expect(initialsOf("rahul")).toBe("R");
  expect(initialsOf("Mary Jane Watson")).toBe("MJ");
});

test("extra spaces and empty names are handled, and non-Latin letters and emoji are not cut in half", () => {
  expect(initialsOf("  Asha   Rao ")).toBe("AR");
  expect(initialsOf("")).toBe("");
  expect(initialsOf("   ")).toBe("");
  expect(initialsOf("अनु शर्मा")).toBe("अश");
  expect(initialsOf("😀 Smile")).toBe("😀S");
});
