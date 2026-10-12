import { importItems } from "./importItinerary";

const mockInvoke = jest.fn();
jest.mock("./supabase", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => mockInvoke(...a) } } }));
beforeEach(() => mockInvoke.mockReset());

test("US-03 sends the trip and text, returns the plans found", async () => {
  mockInvoke.mockResolvedValue({ data: { items: [{ title: "Fort" }] }, error: null });
  expect(await importItems("t1", "D1: Fort")).toEqual({ ok: true, items: [{ title: "Fort" }] });
  expect(mockInvoke).toHaveBeenCalledWith("import-itinerary", { body: { tripId: "t1", text: "D1: Fort" } });
});

test("US-03 the daily limit and an offline phone each get their own message", async () => {
  mockInvoke.mockResolvedValue({ data: null, error: { message: "x", context: { json: async () => ({ error: "limit" }) } } });
  expect(await importItems("t1", "text text text")).toEqual({ ok: false, message: expect.stringMatching(/import limit/) });
  mockInvoke.mockRejectedValue(new Error("Network request failed"));
  expect(await importItems("t1", "text text text")).toEqual({ ok: false, message: expect.stringMatching(/offline/) });
});
