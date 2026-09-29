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
