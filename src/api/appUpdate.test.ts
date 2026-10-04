import { loadLatestRelease } from "./appUpdate";

const mockRpc = jest.fn();
jest.mock("./supabase", () => ({ supabase: { rpc: (...a: unknown[]) => mockRpc(...a) } }));
beforeEach(() => mockRpc.mockReset());

test("US-30 reads the newest build and store page for the platform", async () => {
  mockRpc.mockResolvedValue({ data: [{ latest_build: 9, store_url: "https://apps.apple.com/app/id1" }], error: null });
  expect(await loadLatestRelease("ios")).toEqual({ latestBuild: 9, storeUrl: "https://apps.apple.com/app/id1" });
  expect(mockRpc).toHaveBeenCalledWith("latest_app_release", { p_platform: "ios" });
});

test("US-30 an unreadable answer, an error or being offline all mean no prompt, never a crash", async () => {
  mockRpc.mockResolvedValueOnce({ data: [], error: null });
  expect(await loadLatestRelease("android")).toBeNull();
  mockRpc.mockResolvedValueOnce({ data: null, error: { message: "x" } });
  expect(await loadLatestRelease("android")).toBeNull();
  mockRpc.mockResolvedValueOnce({ data: [{ latest_build: "9", store_url: 5 }], error: null });
  expect(await loadLatestRelease("android")).toBeNull();
  mockRpc.mockRejectedValueOnce(new Error("network"));
  expect(await loadLatestRelease("android")).toBeNull();
});
