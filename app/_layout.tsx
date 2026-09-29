import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { OfflineBanner } from "../src/components/OfflineBanner";
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
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  // The offline queue only runs while signed in, so a queued expense is never sent (or rejected) without a session.
  useEffect(() => { if (status === "in") startSync(); }, [status]);
  if (!ready) return null;

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="join/[token]" />
        <Stack.Protected guard={status === "in"}>
          <Stack.Screen name="index" />
          <Stack.Screen name="create-trip" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="trip/[id]/people" />
          <Stack.Screen name="trip/[id]/activity" />
          <Stack.Screen name="trip/[id]/itinerary" />
          <Stack.Screen name="trip/[id]/add-item" />
          <Stack.Screen name="trip/[id]/expenses" />
          <Stack.Screen name="trip/[id]/add-expense" />
          <Stack.Screen name="trip/[id]/balances" />
          <Stack.Screen name="trip/[id]/settle" />
        </Stack.Protected>
        <Stack.Protected guard={status === "out"}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
      <OfflineBanner />
    </View>
  );
}
