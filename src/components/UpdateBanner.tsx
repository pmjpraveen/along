import { useEffect } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import Animated, { cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { haptic } from "../haptics";
import { EASE_OUT, motion } from "../theme/motion";
import { color, radius, space, type } from "../theme/tokens";
import { Pressable } from "./Pressable";

// One ring: starts the size of the button, swells outward and fades, then starts again. Only transform and opacity move, on the UI thread.
// With Reduce Motion the ring sits still, a little larger than the button.
function Ring({ delayMs, reduced }: { delayMs: number; reduced: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduced) { p.value = 0.35; return; }
    p.value = 0;
    p.value = withDelay(delayMs, withRepeat(withTiming(1, { duration: motion.updatePulse.ms, easing: EASE_OUT }), -1, false));
    return () => cancelAnimation(p);
  }, [reduced, delayMs, p]);
  const style = useAnimatedStyle(() => ({
    opacity: reduced ? 0.45 : interpolate(p.value, [0, 1], [0.7, 0]),
    transform: [{ scale: interpolate(p.value, [0, 1], [1, motion.updatePulse.scale]) }],
  }));
  return <Animated.View pointerEvents="none" style={[s.ring, style]} />;
}

// "The app has a new update": a 64pt dark bar with one 36pt Update button that opens this platform's store page, with two gold rings pulsing
// out from it. It cannot be dismissed, so it stays until the app is updated. It spans the full width of the screen (the parent's side padding
// is cancelled), and is read out as one alert. The button's touch area is padded to 44pt.
export function UpdateBanner({ storeUrl }: { storeUrl: string }) {
  const reduced = useReducedMotion();
  return (
    <View accessibilityRole="alert" style={s.bar}>
      <Text maxFontSizeMultiplier={1.3} style={s.text}>The app has a new update</Text>
      <View style={s.buttonWrap}>
        <Ring delayMs={0} reduced={reduced} />
        <Ring delayMs={motion.updatePulse.ms / 2} reduced={reduced} />
        <Pressable accessibilityRole="button" accessibilityLabel="Update the app" accessibilityHint="Opens the store" hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          onPress={() => { haptic.tap(); Linking.openURL(storeUrl); }} style={s.button}>
          <Text maxFontSizeMultiplier={1.3} style={s.buttonText}>Update</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { marginHorizontal: -space.s20, minHeight: 64, paddingHorizontal: space.s20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.s16, overflow: "hidden", backgroundColor: color.obsidian },
  text: { ...type.fieldValue, flex: 1, color: color.paper },
  buttonWrap: { height: 36, justifyContent: "center" },
  ring: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1.5, borderColor: color.updateGold },
  button: { height: 36, paddingHorizontal: space.s20, borderRadius: radius.pill, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: color.updateGold },
  buttonText: { ...type.buttonSmall, fontSize: 16, lineHeight: 22, color: color.obsidian },
});
