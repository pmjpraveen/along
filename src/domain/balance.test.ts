import { describeBalance } from "./balance";

test("US-09 says who owes or is owed, in plain words, for me and for others", () => {
  expect(describeBalance(50000, "Asha", true, 2, "INR")).toBe("You're owed ₹500.00");
  expect(describeBalance(-80000, "Asha", true, 2, "INR")).toBe("You owe ₹800.00");
  expect(describeBalance(0, "Asha", true, 2, "INR")).toBe("You're settled up");
  expect(describeBalance(245000, "Rahul", false, 2, "INR")).toBe("Rahul is owed ₹2,450.00");
  expect(describeBalance(-120000, "Anu", false, 2, "INR")).toBe("Anu owes ₹1,200.00");
  expect(describeBalance(0, "Anu", false, 2, "INR")).toBe("Anu is settled up");
});

test("US-09 respects the currency's decimals", () => {
  expect(describeBalance(-500, "Ken", false, 0, "JPY")).toBe("Ken owes ¥500");
});
