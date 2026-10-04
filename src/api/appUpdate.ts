import { supabase } from "./supabase";

export type LatestRelease = { latestBuild: number; storeUrl: string };

// The newest build in this platform's store, or null when it can't be read. Never throws: a failed check just means no prompt.
export async function loadLatestRelease(platform: "ios" | "android"): Promise<LatestRelease | null> {
  try {
    const { data, error } = await supabase.rpc("latest_app_release", { p_platform: platform });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row || typeof row.latest_build !== "number" || typeof row.store_url !== "string") return null;
    return { latestBuild: row.latest_build, storeUrl: row.store_url };
  } catch {
    return null;
  }
}
