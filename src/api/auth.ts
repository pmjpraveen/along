import * as Linking from "expo-linking";
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
