import { supabase } from "./supabase";

// Development only: sign in as one of the seeded local test people (supabase/seed.sql) instead of Google, so every screen can be
// tried before OAuth is set up. Off unless this is a dev build AND EXPO_PUBLIC_DEV_LOGIN=1, and the password is never in the code.
export const DEV_PEOPLE = [
  { name: "Asha", email: "asha@along.test" },
  { name: "Ben", email: "ben@along.test" },
  { name: "Cy", email: "cy@along.test" },
];

export const devLoginEnabled = () => __DEV__ && process.env.EXPO_PUBLIC_DEV_LOGIN === "1";

export async function signInAsDev(email: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!devLoginEnabled()) return { ok: false, message: "Dev sign-in is turned off." };
  const password = process.env.EXPO_PUBLIC_DEV_PASSWORD;
  if (!password) return { ok: false, message: "Set EXPO_PUBLIC_DEV_PASSWORD in .env (see supabase/seed.sql)." };
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { ok: false, message: `Dev sign-in failed: ${error.message}. Did you run supabase db reset?` } : { ok: true };
  } catch {
    return { ok: false, message: "Couldn't reach the local Supabase. Is it running (supabase start)?" };
  }
}
