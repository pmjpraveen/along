import { createItem, moveItem, setParticipants } from "./itinerary";

const mockRpc = jest.fn();
jest.mock("./supabase", () => ({ supabase: { rpc: (...a: unknown[]) => mockRpc(...a) } }));
beforeEach(() => mockRpc.mockReset());

test("US-03 sends the item to the RPC", async () => {
  mockRpc.mockResolvedValue({ error: null });
  expect(await createItem({ tripId: "t1", title: "Beach", type: "activity", day: "2026-12-02", startTime: "09:00", participantIds: ["m1"] })).toEqual({ ok: true });
  expect(mockRpc).toHaveBeenCalledWith("create_itinerary_item",
    { p_trip: "t1", p_title: "Beach", p_type: "activity", p_day_date: "2026-12-02", p_start_time: "09:00", p_participant_member_ids: ["m1"],
      p_location_text: null, p_location_url: null, p_latitude: null, p_longitude: null, p_formatted_address: null, p_description: null });
});

test("US-03 a failed save returns a message", async () => {
  mockRpc.mockResolvedValue({ error: { message: "boom" } });
  expect(await createItem({ tripId: "t1", title: "Beach", type: "activity", day: "2026-12-02", startTime: null, participantIds: [] }))
    .toEqual({ ok: false, message: "Couldn't save the item. Try again." });
});

test("US-04 replacing participants sends the full list; a non-creator gets a specific message", async () => {
  mockRpc.mockResolvedValue({ error: null });
  expect(await setParticipants("i1", ["m1", "m2"])).toEqual({ ok: true });
  expect(mockRpc).toHaveBeenCalledWith("set_itinerary_participants", { p_item: "i1", p_member_ids: ["m1", "m2"] });
  mockRpc.mockResolvedValue({ error: { code: "42501", message: "x" } });
  const r = await setParticipants("i1", []);
  expect(r.ok === false && r.message).toMatch(/creator or the trip owner/);
});

test("3.3 a resolved place is sent with its raw text; plain text sends no coordinates", async () => {
  mockRpc.mockResolvedValue({ error: null });
  const base = { tripId: "t1", title: "Dinner", type: "restaurant" as const, day: "2026-12-02", startTime: null, participantIds: [] };
  await createItem({ ...base, location: { text: "https://maps.app.goo.gl/a", url: "https://maps.app.goo.gl/a", place: { lat: 1, lng: 2, name: "Spot" } } });
  expect(mockRpc.mock.calls[0][1]).toMatchObject({ p_location_text: "https://maps.app.goo.gl/a", p_latitude: 1, p_longitude: 2, p_formatted_address: "Spot" });
  await createItem({ ...base, location: { text: "Fish Curry Place", url: null, place: null } });
  expect(mockRpc.mock.calls[1][1]).toMatchObject({ p_location_text: "Fish Curry Place", p_location_url: null, p_latitude: null });
});

test("3.5 moving sends the version the user saw", async () => {
  mockRpc.mockResolvedValue({ error: null });
  expect(await moveItem("i1", "2026-12-03", 4)).toEqual({ ok: true });
  expect(mockRpc).toHaveBeenCalledWith("move_itinerary_item", { p_item: "i1", p_day_date: "2026-12-03", p_version: 4 });
});

test("3.5 a stale version and a non-creator get distinct messages", async () => {
  mockRpc.mockResolvedValue({ error: { message: "stale_version" } });
  const stale = await moveItem("i1", "2026-12-03", 1);
  expect(stale.ok === false && stale.stale).toBe(true);
  mockRpc.mockResolvedValue({ error: { code: "42501", message: "x" } });
  const denied = await moveItem("i1", "2026-12-03", 1);
  expect(denied.ok === false && denied.message).toMatch(/creator or the trip owner/);
});

test("a plan's message is sent trimmed, and none is sent when blank", async () => {
  mockRpc.mockResolvedValue({ error: null });
  await createItem({ tripId: "t1", title: "Beach", type: "activity", day: "2026-12-02", startTime: null, participantIds: [], description: "  Bring sunscreen " });
  expect(mockRpc.mock.calls[0][1]).toMatchObject({ p_description: "Bring sunscreen" });
  await createItem({ tripId: "t1", title: "Beach", type: "activity", day: "2026-12-02", startTime: null, participantIds: [], description: "   " });
  expect(mockRpc.mock.calls[1][1]).toMatchObject({ p_description: null });
});
