import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { unreadCount } from "../src/api/notifications";
import { PrimaryButton, TextButton } from "../src/components/Buttons";
import { useMyNotificationsRealtime } from "../src/hooks/useTripRealtime";
import { useSession } from "../src/stores/session";

// Placeholder Home; the empty state and trip list arrive in later stories.
export default function Home() {
  const router = useRouter();
  const pending = useSession((s) => s.pendingInvite);
  const [unread, setUnread] = useState(0);
  const refresh = useCallback(() => { unreadCount().then(setUnread); }, []);
  useFocusEffect(refresh);
  useMyNotificationsRealtime(refresh);
  if (pending) return <Redirect href={{ pathname: "/join/[token]", params: { token: pending } }} />;
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
      <Text>Home</Text>
      <PrimaryButton label="Create trip" onPress={() => router.push("/create-trip")} />
      <TextButton label={unread > 0 ? `Notifications (${unread} new)` : "Notifications"} onPress={() => router.push("/notifications")} />
    </View>
  );
}
