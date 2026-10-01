import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { AnimatedSplash } from "../src/components/AnimatedSplash";
import { OfflineBanner } from "../src/components/OfflineBanner";
import { Toast } from "../src/components/Toast";
import { StatusBarScrim } from "../src/components/StatusBarScrim";
import { startConnectivity } from "../src/offline/connectivity";
import { startSync } from "../src/offline/sync";
import { initSession, useSession } from "../src/stores/session";

SplashScreen.preventAutoHideAsync();
initSession();
startConnectivity();

export default function Layout() {
  const status = useSession((s) => s.status);
  const [fontsLoaded, fontError] = useFonts({
    "GeistSans-Light": require("../assets/fonts/GeistSans-Light.ttf"),
    "GeistSans-Regular": require("../assets/fonts/GeistSans-Regular.ttf"),
    "GeistSans-Medium": require("../assets/fonts/GeistSans-Medium.ttf"),
  });
  const ready = status !== "loading" && (fontsLoaded || !!fontError);
  const [splashDone, setSplashDone] = useState(false);
  const hideNative = useCallback(() => { SplashScreen.hideAsync(); }, []);   // the animated splash's first frame is identical, so swap at once
  const endSplash = useCallback(() => setSplashDone(true), []);
  // The offline queue only runs while signed in, so a queued expense is never sent (or rejected) without a session.
  useEffect(() => { if (status === "in") startSync(); }, [status]);

  return (
    <View style={{ flex: 1 }}>
      {/* Order matters: the first available screen is where the app starts, so the invite link screen must not come first. */}
      {ready && <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === "in"}>
          <Stack.Screen name="index" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="history" />
          <Stack.Screen name="passport" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="trip/[id]" />
          {/* Forms rise from the bottom and dismiss back down (swipe or back), the same path in and out. */}
          <Stack.Screen name="create-trip" options={{ presentation: "modal" }} />
        </Stack.Protected>
        <Stack.Protected guard={status === "out"}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Screen name="join/[token]" />
      </Stack>}
      <StatusBarScrim />
      <OfflineBanner />
      <Toast />
      {!splashDone && <AnimatedSplash ready={ready} onShown={hideNative} onDone={endSplash} />}
    </View>
  );
}
