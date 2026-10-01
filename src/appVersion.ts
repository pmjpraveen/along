import Constants from "expo-constants";
import { requireOptionalNativeModule } from "expo-modules-core";

// "Version 1.0.0 (12)": the app version and the build number of this install. The build number goes up by itself with every EAS build
// (eas.json autoIncrement). It comes from expo-application's native module; a build made before that was added doesn't have it, so this
// falls back to the version in app.json instead of failing.
export function appVersionLabel(): string {
  const native = requireOptionalNativeModule<{ nativeApplicationVersion?: string | null; nativeBuildVersion?: string | null }>("ExpoApplication");
  if (native?.nativeApplicationVersion) return `Version ${native.nativeApplicationVersion}${native.nativeBuildVersion ? ` (${native.nativeBuildVersion})` : ""}`;
  return `Version ${Constants.expoConfig?.version ?? "1.0.0"}`;
}
