// Whether an install is behind the newest build in its store. Build numbers are compared (the version stays the same across builds). With no
// build number for the install (a build made before the app could read its own) there is nothing to compare, so no prompt.
export function isUpdateAvailable(installedBuild: number | null, latestBuild: number | null | undefined): boolean {
  if (installedBuild === null || !Number.isFinite(installedBuild)) return false;
  if (latestBuild === null || latestBuild === undefined || !Number.isFinite(latestBuild)) return false;
  return latestBuild > installedBuild;
}

// The build number text from the native side ("14") as a number, or null when it is missing or not a plain number.
export function parseBuild(text: string | null | undefined): number | null {
  if (!text || !/^\d+$/.test(text.trim())) return null;
  return Number(text.trim());
}
