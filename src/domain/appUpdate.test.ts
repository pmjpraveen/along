import { isUpdateAvailable, parseBuild } from "./appUpdate";

test("US-30 an install older than the store's newest build is out of date; the same or newer is not", () => {
  expect(isUpdateAvailable(5, 6)).toBe(true);
  expect(isUpdateAvailable(6, 6)).toBe(false);
  expect(isUpdateAvailable(7, 6)).toBe(false);
  expect(isUpdateAvailable(1, 12)).toBe(true);
});

test("US-30 no prompt when either number is unknown, or when nothing has been released yet", () => {
  expect(isUpdateAvailable(null, 6)).toBe(false);
  expect(isUpdateAvailable(5, null)).toBe(false);
  expect(isUpdateAvailable(5, undefined)).toBe(false);
  expect(isUpdateAvailable(5, 0)).toBe(false);
  expect(isUpdateAvailable(NaN, 6)).toBe(false);
});

test("US-30 the native build number is read as a whole number, or not at all", () => {
  expect(parseBuild("14")).toBe(14);
  expect(parseBuild(" 7 ")).toBe(7);
  for (const bad of [null, undefined, "", "abc", "1.2.3", "12a", "-3"]) expect(parseBuild(bad)).toBeNull();
});
