import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnline } from "../offline/connectivity";
import { useQueue } from "../offline/sync";
import { color, space, type } from "../theme/tokens";

const SYNCED_MS = 3000;

// What to say, or null to say nothing. Calm wording, no alarm colours: being offline is normal on a trip.
export function bannerText(online: boolean, pending: number, justSynced: boolean): string | null {
  if (!online) {
    return pending > 0
      ? `You're offline. ${pending} ${pending === 1 ? "expense" : "expenses"} will sync when you're back. Showing last synced data.`
      : "You're offline. Showing last synced data.";
  }
  return justSynced ? "All synced" : null;
}

// A slim strip at the bottom of every screen: persistent while offline, a brief "All synced" once queued work has gone through.
export function OfflineBanner() {
  const online = useOnline((s) => s.online);
  const pending = useQueue((s) => s.items.filter((i) => i.status === "pending").length);
  const { bottom } = useSafeAreaInsets();
  const [justSynced, setJustSynced] = useState(false);
  const before = useRef(pending);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (before.current > 0 && pending === 0 && online) {
      setJustSynced(true);
      timer = setTimeout(() => setJustSynced(false), SYNCED_MS);
    }
    before.current = pending;
    return () => clearTimeout(timer);
  }, [pending, online]);

  const text = bannerText(online, pending, justSynced);
  if (!text) return null;
  return (
    <View accessible accessibilityRole="text" accessibilityLiveRegion="polite" style={[s.bar, { paddingBottom: bottom + space.s8 }]}>
      <Text maxFontSizeMultiplier={1.3} style={s.text}>{online ? "✓ " : "○ "}{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { minHeight: 40, paddingHorizontal: space.s16, paddingTop: space.s8, backgroundColor: color.neutralWash, justifyContent: "center" },
  text: { ...type.label, color: color.forestInk },
});
