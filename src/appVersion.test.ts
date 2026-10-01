import { appVersionLabel } from "./appVersion";

const mockNative = jest.fn();
jest.mock("expo-constants", () => ({ __esModule: true, default: { expoConfig: { version: "1.0.0" } } }));
jest.mock("expo-modules-core", () => ({ ...jest.requireActual("expo-modules-core"), requireOptionalNativeModule: (...a: unknown[]) => mockNative(...a) }));

test("the version shows the app version and the build number when the build has one", () => {
  mockNative.mockReturnValue({ nativeApplicationVersion: "1.2.0", nativeBuildVersion: "14" });
  expect(appVersionLabel()).toBe("Version 1.2.0 (14)");
});

test("a build without the native module falls back to app.json's version, without an error", () => {
  mockNative.mockReturnValue(null);
  expect(appVersionLabel()).toBe("Version 1.0.0");
});
