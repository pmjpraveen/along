import { expenseLine, shareBp } from "./expense";
import { moneyParts } from "./money";

const base = { meId: "m1", paidById: "m2", addedById: "m2", paidBy: "Hemant", addedBy: "Hemant", myShareMinor: 0 };

test("an expense I paid says so, even if someone else added it", () => {
  expect(expenseLine({ ...base, paidById: "m1", paidBy: "Asha", myShareMinor: 500 })).toBe("Paid by You");
  expect(expenseLine({ ...base, paidById: "m1", addedById: "m2" })).toBe("Paid by You");
});

test("an expense paid by someone else that includes me says I owe them", () => {
  expect(expenseLine({ ...base, myShareMinor: 500 })).toBe("Owed to Hemant");
});

test("an expense that does not involve me is shown as added by whoever added it, or by me when I did", () => {
  expect(expenseLine(base)).toBe("Added by Hemant");
  expect(expenseLine({ ...base, addedById: "m1", addedBy: "Asha" })).toBe("Added by You");
  expect(expenseLine({ ...base, meId: null })).toBe("Added by Hemant");
});

test("shareBp gives each person's share in basis points and 0 for an empty total", () => {
  expect(shareBp(50000, 100000)).toBe(5000);
  expect(shareBp(33334, 100000)).toBe(3333);
  expect(shareBp(1, 0)).toBe(0);
});

test("moneyParts splits the prefix, whole part and decimals for large display", () => {
  expect(moneyParts(853305, 2, "INR")).toEqual({ prefix: "₹", whole: "8,533", frac: ".05" });
  expect(moneyParts(500, 0, "JPY")).toEqual({ prefix: "¥", whole: "500", frac: "" });
});
