import { supabase } from "./supabase";

// My display name, for the greeting and the profile. Null when it can't be read; screens fall back to a plain greeting.
export async function loadMyName(): Promise<string | null> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data } = await supabase.from("users").select("display_name").eq("id", auth.user.id).maybeSingle();
    return data?.display_name ?? null;
  } catch {
    return null;
  }
}

export type MyProfile = { name: string; email: string; since: string };

// Everything the Profile screen shows about me. Null when it can't be read.
export async function loadMyProfile(): Promise<MyProfile | null> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data } = await supabase.from("users").select("display_name, email, created_at").eq("id", auth.user.id).maybeSingle();
    if (!data) return null;
    return { name: data.display_name, email: data.email, since: String(data.created_at).slice(0, 10) };
  } catch {
    return null;
  }
}
