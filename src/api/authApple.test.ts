import { Platform } from "react-native";
import { appleSignInAvailable, signInWithApple } from "./auth";

const mockIdToken = jest.fn();
const mockRpc = jest.fn();
jest.mock("./supabase", () => ({ supabase: { auth: { signInWithIdToken: (...a: unknown[]) => mockIdToken(...a) }, rpc: (...a: unknown[]) => mockRpc(...a) } }));
jest.mock("expo-web-browser", () => ({ maybeCompleteAuthSession: jest.fn(), openAuthSessionAsync: jest.fn() }));
jest.mock("expo-linking", () => ({ createURL: (p: string) => `along://${p}` }));

const mockSignIn = jest.fn();
const mockAvailable = jest.fn();
jest.mock("expo-apple-authentication", () => ({
  isAvailableAsync: () => mockAvailable(),
  signInAsync: (...a: unknown[]) => mockSignIn(...a),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));
jest.mock("expo-crypto", () => ({
  randomUUID: () => "raw-nonce",
  digestStringAsync: async (_: unknown, v: string) => `sha(${v})`,
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockIdToken.mockResolvedValue({ error: null });
  mockRpc.mockResolvedValue({ error: null });
  mockAvailable.mockResolvedValue(true);
});

test("US-01 Apple sign-in sends the hashed nonce to Apple and the raw one to Supabase, once", async () => {
  mockSignIn.mockResolvedValue({ identityToken: "tok", fullName: { givenName: "Asha", familyName: "Rao" } });
  expect(await signInWithApple()).toEqual({ ok: true });
  expect(mockSignIn).toHaveBeenCalledWith(expect.objectContaining({ nonce: "sha(raw-nonce)" }));
  expect(mockIdToken).toHaveBeenCalledTimes(1);
  expect(mockIdToken).toHaveBeenCalledWith({ provider: "apple", token: "tok", nonce: "raw-nonce" });
});

test("US-01 the name Apple gives on the first sign-in is saved; no name means nothing is saved", async () => {
  mockSignIn.mockResolvedValue({ identityToken: "tok", fullName: { givenName: "Asha", familyName: "Rao" } });
  await signInWithApple();
  expect(mockRpc).toHaveBeenCalledWith("set_my_name", { p_name: "Asha Rao" });
  mockRpc.mockClear();
  mockSignIn.mockResolvedValue({ identityToken: "tok", fullName: null });
  await signInWithApple();
  expect(mockRpc).not.toHaveBeenCalled();
});

test("US-01 a failed name save does not undo the sign-in", async () => {
  mockSignIn.mockResolvedValue({ identityToken: "tok", fullName: { givenName: "Asha", familyName: null } });
  mockRpc.mockRejectedValue(new Error("boom"));
  expect(await signInWithApple()).toEqual({ ok: true });
  expect(mockIdToken).toHaveBeenCalledTimes(1);
});

test("US-01 closing Apple's sheet creates no session", async () => {
  mockSignIn.mockRejectedValue({ code: "ERR_REQUEST_CANCELED" });
  expect(await signInWithApple()).toEqual({ ok: false, cancelled: true });
  expect(mockIdToken).not.toHaveBeenCalled();
});

test("US-01 no identity token fails without a session; a rejected token gives a specific message", async () => {
  mockSignIn.mockResolvedValue({ identityToken: null });
  expect(await signInWithApple()).toEqual({ ok: false, message: expect.stringContaining("didn't finish") });
  expect(mockIdToken).not.toHaveBeenCalled();
  mockSignIn.mockResolvedValue({ identityToken: "tok" });
  mockIdToken.mockResolvedValue({ error: { message: "bad token", status: 400 } });
  expect(await signInWithApple()).toEqual({ ok: false, message: "We couldn't sign you in with Apple. Try again." });
});

test("US-04 offline gives the connection message", async () => {
  mockSignIn.mockResolvedValue({ identityToken: "tok" });
  mockIdToken.mockResolvedValue({ error: { name: "AuthRetryableFetchError", message: "Network request failed" } });
  expect(await signInWithApple()).toEqual({ ok: false, message: expect.stringContaining("offline") });
});

test("US-01 Sign in with Apple is offered on iOS only", async () => {
  expect(await appleSignInAvailable()).toBe(true);
  const os = Platform.OS;
  (Platform as { OS: string }).OS = "android";
  expect(await appleSignInAvailable()).toBe(false);
  (Platform as { OS: string }).OS = os;
});
