import { toOutcome } from "./sync";

jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock("@react-native-community/netinfo", () => ({ addEventListener: jest.fn() }));
jest.mock("../api/expenses", () => ({ createExpense: jest.fn() }));

test("6.2 a saved expense leaves the queue", () => expect(toOutcome({ ok: true })).toEqual({ ok: true }));
test("6.2 a connection problem or server hiccup is retried later", () =>
  expect(toOutcome({ ok: false, message: "No connection.", retry: true })).toEqual({ ok: false, retry: true }));
test("6.2 a rejection is final and keeps its reason", () =>
  expect(toOutcome({ ok: false, message: "Couldn't save the expense. Try again." })).toEqual({ ok: false, retry: false, message: "Couldn't save the expense. Try again." }));
