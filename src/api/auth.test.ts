import { signInWithGoogle } from "./auth";
import * as WebBrowser from "expo-web-browser";

const mockOAuth = jest.fn();
const mockExchange = jest.fn();
jest.mock("./supabase", () => ({
  supabase: { auth: { signInWithOAuth: (...a: unknown[]) => mockOAuth(...a), exchangeCodeForSession: (...a: unknown[]) => mockExchange(...a) } },
}));
jest.mock("expo-web-browser", () => ({ maybeCompleteAuthSession: jest.fn(), openAuthSessionAsync: jest.fn() }));
jest.mock("expo-linking", () => ({ createURL: (p: string) => `along://${p}` }));

const open = WebBrowser.openAuthSessionAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockOAuth.mockResolvedValue({ data: { url: "https://google/auth" }, error: null });
  mockExchange.mockResolvedValue({ error: null });
});

test("US-01 successful Google sign-in exchanges the code for one session", async () => {
  open.mockResolvedValue({ type: "success", url: "along://auth/callback?code=abc" });
  expect(await signInWithGoogle()).toEqual({ ok: true });
  expect(mockExchange).toHaveBeenCalledTimes(1);
  expect(mockExchange).toHaveBeenCalledWith("abc");
});

test("US-01 dismissing the Google picker creates no session", async () => {
  open.mockResolvedValue({ type: "cancel" });
  expect(await signInWithGoogle()).toEqual({ ok: false, cancelled: true });
  expect(mockExchange).not.toHaveBeenCalled();
});

test("US-01 callback without a code fails without a session", async () => {
  open.mockResolvedValue({ type: "success", url: "along://auth/callback?error=access_denied" });
  const r = await signInWithGoogle();
  expect(r).toEqual({ ok: false, message: expect.stringContaining("declined") });
  expect(mockExchange).not.toHaveBeenCalled();
});

test("US-04 offline failure gives a specific connection message", async () => {
  mockOAuth.mockRejectedValue(new TypeError("Network request failed"));
  expect(await signInWithGoogle()).toEqual({ ok: false, message: expect.stringContaining("You're offline") });
});

test("US-04 rejected code exchange returns an error, not a session", async () => {
  open.mockResolvedValue({ type: "success", url: "along://auth/callback?code=bad" });
  mockExchange.mockResolvedValue({ error: { name: "AuthApiError", message: "invalid grant" } });
  expect(await signInWithGoogle()).toEqual({ ok: false, message: expect.stringContaining("couldn't sign you in") });
});
