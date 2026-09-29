jest.unmock("./useReducedMotion");
import { act, renderHook } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { useReducedMotion } from "./useReducedMotion";

test("useReducedMotion reads the system setting and follows changes", async () => {
  let notify: (on: boolean) => void = () => {};
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(((_: string, cb: (on: boolean) => void) => { notify = cb; return { remove: jest.fn() }; }) as never);
  const { result } = await renderHook(() => useReducedMotion());
  await act(async () => {});
  expect(result.current).toBe(true);
  await act(async () => { notify(false); });
  expect(result.current).toBe(false);
});
