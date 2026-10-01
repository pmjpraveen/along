import { useIsFocused } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { EASE_SHINE, motion } from "../theme/motion";

// A glint that sweeps across a surface, then rests, `sweeps` times when the screen opens, and only while it is in front (the passport cover plays it
// three times, the Start new trip button twice). Two slanted bands of light (a wide soft one and a thin bright one)
// travel left to right, clipped by the surface they sit on. With Reduce Motion on, the passport keeps a still highlight; with `still` off nothing
// shows at all. Ignores touches.
export function PassportShine({ sweeps = 3, restMs = motion.shine.restMs, sweepMs = motion.shine.sweepMs, still = true }: { sweeps?: number; restMs?: number; sweepMs?: number; still?: boolean }) {
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(-200);

  useEffect(() => {
    if (reduced || width === 0 || !focused) { x.value = still ? width * 0.38 : width + 400; return; }
    x.value = -200;
    x.value = withRepeat(withDelay(restMs, withTiming(width + 200, { duration: sweepMs, easing: EASE_SHINE })), sweeps, false);
  }, [reduced, focused, width, x, sweeps, restMs, sweepMs, still]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  if (reduced && !still) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[s.track, style]}>
        <View style={s.slant}>
          <View style={s.wide} />
          <View style={s.thin} />
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  track: { position: "absolute", top: 0, bottom: 0, left: 0, width: 110 },
  slant: { position: "absolute", top: -60, bottom: -60, left: 0, right: 0, flexDirection: "row", transform: [{ rotate: "22deg" }] },
  wide: { width: 70, backgroundColor: "rgba(255,255,255,0.10)" },
  thin: { width: 16, marginLeft: 14, backgroundColor: "rgba(255,255,255,0.18)" },
});
