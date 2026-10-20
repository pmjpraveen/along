import { exportExpenses } from "./exportExpenses";

const mockLoad = jest.fn();
jest.mock("./api/expenses", () => ({ loadExpenseExport: (...a: unknown[]) => mockLoad(...a) }));

test("RC-07 a trip with no expenses says so instead of making an empty file", async () => {
  mockLoad.mockResolvedValue({ ok: true, tripName: "Goa", currency: { code: "INR", exponent: 2 }, expenses: [], payments: [] });
  expect(await exportExpenses("t1", "csv", false, new Date(0))).toEqual({ ok: false, message: "No expenses to export yet." });
});

test("RC-05 a failed load is passed on and payments are only fetched for a spreadsheet", async () => {
  mockLoad.mockResolvedValue({ ok: false, message: "Couldn't load the expenses. Try again." });
  expect((await exportExpenses("t1", "pdf", true, new Date(0))).ok).toBe(false);
  expect(mockLoad).toHaveBeenLastCalledWith("t1", false);
});
