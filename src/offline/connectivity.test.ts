import { isOnline } from "./connectivity";

jest.mock("@react-native-community/netinfo", () => ({ addEventListener: jest.fn() }));

test("6.3 offline only when disconnected or known to have no internet; an unknown check is treated as online", () => {
  expect(isOnline({ isConnected: true, isInternetReachable: true })).toBe(true);
  expect(isOnline({ isConnected: true, isInternetReachable: null })).toBe(true);
  expect(isOnline({ isConnected: null, isInternetReachable: null })).toBe(true);
  expect(isOnline({ isConnected: false, isInternetReachable: false })).toBe(false);
  expect(isOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
});
