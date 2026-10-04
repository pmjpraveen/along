import { useCallback, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { loadLatestRelease } from "../api/appUpdate";
import { installedBuild } from "../appVersion";
import { isUpdateAvailable } from "../domain/appUpdate";

// The store page to open when this install is behind the newest build, or null. Checked when the screen opens and every time the app comes back
// to the front, so it keeps showing until the app is updated and clears once it is. Not on the web.
export function useAppUpdate(): { storeUrl: string } | null {
  const [url, setUrl] = useState<string | null>(null);
  const check = useCallback(async () => {
    if (Platform.OS !== "ios" && Platform.OS !== "android") return;
    const release = await loadLatestRelease(Platform.OS);
    setUrl(release && isUpdateAvailable(installedBuild(), release.latestBuild) ? release.storeUrl : null);
  }, []);
  useEffect(() => {
    check();
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") check(); });
    return () => sub.remove();
  }, [check]);
  return url ? { storeUrl: url } : null;
}
