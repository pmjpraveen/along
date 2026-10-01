import { acceptInvite, claimGuestProfile, createInviteLink, previewInvite } from "./invites";

const mockRpc = jest.fn();
jest.mock("./supabase", () => ({ supabase: { rpc: (...a: unknown[]) => mockRpc(...a) } }));
jest.mock("expo-linking", () => ({ createURL: (p: string) => `along://${p}` }));
beforeEach(() => mockRpc.mockReset());

test("US-16 builds a shareable link from the returned token", async () => {
  mockRpc.mockResolvedValue({ data: "abc", error: null });
  expect(await createInviteLink("t1")).toEqual({ ok: true, url: "along://join/abc", token: "abc" });
});

test("US-16 accepting returns the trip id", async () => {
  mockRpc.mockResolvedValue({ data: "t1", error: null });
  expect(await acceptInvite("abc")).toEqual({ ok: true, tripId: "t1" });
});

test("US-16 an expired invite gets an explicit message", async () => {
  mockRpc.mockResolvedValue({ data: null, error: { message: "invite_expired" } });
  const r = await acceptInvite("abc");
  expect(r.ok === false && r.message).toMatch(/expired/);
});

test("US-16b preview returns the trip summary", async () => {
  const preview = { name: "Goa", destination: "Goa, India", start_date: "2026-12-01", end_date: "2026-12-05", participant_count: 2 };
  mockRpc.mockResolvedValue({ data: preview, error: null });
  expect(await previewInvite("abc")).toEqual({ ok: true, preview });
});

test("US-16b a revoked invite previews as an explicit error", async () => {
  mockRpc.mockResolvedValue({ data: null, error: { message: "invite_revoked" } });
  const r = await previewInvite("abc");
  expect(r.ok === false && r.message).toMatch(/turned off/);
});

test("US-17 a claim link names the guest and claiming sends explicit confirmation", async () => {
  mockRpc.mockResolvedValue({ data: "abc", error: null });
  await createInviteLink("t1", "m2");
  expect(mockRpc).toHaveBeenCalledWith("create_invite", { p_trip: "t1", p_claims_member: "m2" });
  mockRpc.mockResolvedValue({ data: "t1", error: null });
  expect(await claimGuestProfile("abc")).toEqual({ ok: true, tripId: "t1" });
  expect(mockRpc).toHaveBeenLastCalledWith("claim_guest_profile", { p_token: "abc", p_confirm: true });
});

test("US-17 a conflicting claim shows an explicit message", async () => {
  mockRpc.mockResolvedValue({ data: null, error: { message: "already_member" } });
  const r = await claimGuestProfile("abc");
  expect(r.ok === false && r.message).toMatch(/already in this trip/);
});
