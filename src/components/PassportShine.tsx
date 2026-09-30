import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "../hooks/useReducedMotion";

// A glint that sweeps across the passport cover, then rests, forever. Two slanted bands of light (a wide soft one and a thin bright one)
// travel left to right, clipped by the card. With Reduce Motion on it stays still, resting on the cover. Ignores touches.
const SWEEP_MS = 1600;
const REST_MS = 3200;

export function PassportShine() {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(-200);

  useEffect(() => {
    if (reduced || width === 0) { x.value = width * 0.38; return; }
    x.value = -200;
    x.value = withRepeat(withDelay(REST_MS, withTiming(width + 200, { duration: SWEEP_MS, easing: Easing.inOut(Easing.quad) })), -1, false);
  }, [reduced, width, x]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
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
