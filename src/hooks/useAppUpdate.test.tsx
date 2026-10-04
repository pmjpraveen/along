import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState, Platform } from "react-native";
import { useAppUpdate } from "./useAppUpdate";

const mockLoad = jest.fn();
let mockBuild: number | null = 5;
jest.mock("../api/appUpdate", () => ({ loadLatestRelease: (...a: unknown[]) => mockLoad(...a) }));
jest.mock("../appVersion", () => ({ installedBuild: () => mockBuild }));
beforeEach(() => { jest.clearAllMocks(); mockBuild = 5; });

test("US-30 an install behind the store shows the update, with the store page for its own platform", async () => {
  jest.replaceProperty(Platform, "OS", "android");
  mockLoad.mockResolvedValue({ latestBuild: 9, storeUrl: "https://play.google.com/store/apps/details?id=x" });
  const { result } = await renderHook(() => useAppUpdate());
  await waitFor(() => expect(result.current).toEqual({ storeUrl: "https://play.google.com/store/apps/details?id=x" }));
  expect(mockLoad).toHaveBeenCalledWith("android");
});

test("US-30 an up-to-date install, an unreadable build number or a failed check shows nothing", async () => {
  jest.replaceProperty(Platform, "OS", "ios");
  mockLoad.mockResolvedValue({ latestBuild: 5, storeUrl: "https://apps.apple.com/app/id1" });
  const a = await renderHook(() => useAppUpdate());
  await waitFor(() => expect(mockLoad).toHaveBeenCalled());
  expect(a.result.current).toBeNull();
  mockBuild = null;
  mockLoad.mockResolvedValue({ latestBuild: 9, storeUrl: "https://apps.apple.com/app/id1" });
  const b = await renderHook(() => useAppUpdate());
  await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(2));
  expect(b.result.current).toBeNull();
  mockBuild = 5;
  mockLoad.mockResolvedValue(null);
  const c = await renderHook(() => useAppUpdate());
  await waitFor(() => expect(mockLoad).toHaveBeenCalledTimes(3));
  expect(c.result.current).toBeNull();
});

test("US-30 it checks again when the app comes back to the front, so the prompt clears once the app is updated", async () => {
  jest.replaceProperty(Platform, "OS", "ios");
  let onChange: (s: string) => void = () => {};
  jest.spyOn(AppState, "addEventListener").mockImplementation(((_: string, cb: (s: string) => void) => { onChange = cb; return { remove: jest.fn() }; }) as never);
  mockLoad.mockResolvedValue({ latestBuild: 9, storeUrl: "https://apps.apple.com/app/id1" });
  const { result } = await renderHook(() => useAppUpdate());
  await waitFor(() => expect(result.current).not.toBeNull());
  mockBuild = 9;   // the person updated and returned to the app
  await act(async () => { onChange("active"); });
  await waitFor(() => expect(result.current).toBeNull());
});
