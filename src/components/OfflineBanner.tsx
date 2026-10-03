import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnline } from "../offline/connectivity";
import { useQueue } from "../offline/sync";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { EASE_IN_OUT, EASE_OUT, motion } from "../theme/motion";
import { color, space, type } from "../theme/tokens";

const SYNCED_MS = 3000;

// What to say, or null to say nothing. Calm wording, no alarm colours: being offline is normal on a trip.
export function bannerText(online: boolean, pending: number, justSynced: boolean): string | null {
  if (!online) {
    return pending > 0
      ? `You're offline. ${pending} ${pending === 1 ? "expense" : "expenses"} will sync when you're back. Showing last synced data.`
      : "You're offline. Showing what was last synced.";
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

  // The strip rises while fading in and fades out on leaving; it stays mounted (on its last words) until the fade ends. With Reduce Motion it just appears and goes.
  const reduced = useReducedMotion();
  const text = bannerText(online, pending, justSynced);
  const [held, setHeld] = useState<{ online: boolean; text: string } | null>(null);
  const p = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(p);
    if (text) {
      setHeld((h) => (h && h.online === online && h.text === text ? h : { online, text }));
      p.value = reduced ? 1 : withTiming(1, { duration: motion.bannerMs, easing: EASE_OUT });
    } else if (reduced) {
      p.value = 0;
      setHeld(null);
    } else {
      p.value = withTiming(0, { duration: motion.fadeMs, easing: EASE_IN_OUT }, (done) => { if (done) scheduleOnRN(setHeld, null); });
    }
  }, [text, online, reduced]);   // p is a stable shared value, so it is left out of the list
  const rise = reduced ? 0 : motion.bannerRise;
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * rise }] }));
  const shown = text ? { online, text } : held;
  if (!shown) return null;
  return (
    <Animated.View accessible accessibilityRole="text" accessibilityLiveRegion="polite" style={[s.bar, { paddingBottom: bottom + space.s8 }, style]}>
      <Text maxFontSizeMultiplier={1.3} style={s.text}>{shown.online ? "✓ " : "○ "}{shown.text}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  bar: { minHeight: 40, paddingHorizontal: space.s16, paddingTop: space.s8, backgroundColor: color.neutralWash, justifyContent: "center" },
  text: { ...type.label, color: color.forestInk },
});
