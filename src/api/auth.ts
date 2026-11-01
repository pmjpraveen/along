import * as Linking from "expo-linking";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export type SignInResult =
  | { ok: true }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled?: false; message: string };

const OFFLINE = "You're offline. Check your connection and try again.";
const isOffline = (e: { name?: string; message?: string }) =>
  e.name === "AuthRetryableFetchError" || /network|fetch|offline/i.test(e.message ?? "");
const fail = (message: string): SignInResult => ({ ok: false, message });

// The handle_new_user trigger creates the users row on first sign-in; the client never writes it.
export async function signInWithGoogle(): Promise<SignInResult> {
  try {
    const redirectTo = Linking.createURL("auth/callback");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) return fail(isOffline(error) ? OFFLINE : "Couldn't start Google sign-in. Try again.");

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type !== "success") return { ok: false, cancelled: true };

    const params = new URL(res.url).searchParams;
    if (params.get("error") === "access_denied") return fail("Google sign-in was declined. Choose an account and allow access to continue.");
    const code = params.get("code");
    if (!code) return fail("Google sign-in didn't finish. Try again.");

    const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr) return fail(isOffline(exErr) ? OFFLINE : "We couldn't sign you in with that account. Try again.");
    return { ok: true };
  } catch (e) {
    return fail(isOffline(e as Error) ? OFFLINE : "Something went wrong. Try again.");
  }
}

// Sign in with Apple, iOS only (Apple's native sheet, then the identity token goes to Supabase; Android has no button for it). The native modules are required
// lazily, so an app build made before they were added simply has no Apple button instead of crashing. Apple sends the name only the first time and not in the token,
// so it is saved to the profile here, once, from what the sheet returned.
export async function appleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    const Apple = require("expo-apple-authentication") as typeof import("expo-apple-authentication");
    return await Apple.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithApple(): Promise<SignInResult> {
  try {
    const Apple = require("expo-apple-authentication") as typeof import("expo-apple-authentication");
    const Crypto = require("expo-crypto") as typeof import("expo-crypto");
    const raw = Crypto.randomUUID();
    const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
    const cred = await Apple.signInAsync({ requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL], nonce: hashed });
    if (!cred.identityToken) return fail("Apple sign-in didn't finish. Try again.");
    const { error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: cred.identityToken, nonce: raw });
    if (error) return fail(isOffline(error) ? OFFLINE : "We couldn't sign you in with Apple. Try again.");
    const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(" ").trim();
    if (name) await Promise.resolve(supabase.rpc("set_my_name", { p_name: name })).catch(() => {});   // best effort: a failed name must not undo a good sign-in
    return { ok: true };
  } catch (e) {
    if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") return { ok: false, cancelled: true };
    return fail(isOffline(e as Error) ? OFFLINE : "Something went wrong. Try again.");
  }
}

// Email and password sign-in, for an account made in the Supabase dashboard (the App Store reviewer's test account). Nobody can sign up with it:
// the account has to exist already.
export async function signInWithEmail(email: string, password: string): Promise<SignInResult> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (!error) return { ok: true };
    return fail(isOffline(error) ? OFFLINE : error.status === 400 ? "That email and password don't match. Check them and try again." : "Couldn't sign you in right now. Try again in a moment.");
  } catch {
    return fail(OFFLINE);
  }
}
