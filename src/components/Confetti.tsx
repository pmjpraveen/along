import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { motion } from "../theme/motion";
import { splashStripes } from "../theme/tokens";

// Party poppers for the payment-recorded moment: brand-coloured pieces burst from the bottom-left and bottom-right corners, arc up and inward,
// then fall back. Each piece follows a simple projectile path; its launch strength comes from its index (no randomness). Only transform and opacity
// move, on the UI thread. It ignores touches, and the caller skips it entirely under Reduce Motion.
function Piece({ i, p, width, height }: { i: number; p: { value: number }; width: number; height: number }) {
  const left = i % 2 === 0;                                  // alternate corners
  const k = Math.floor(i / 2);
  const apex = (0.4 + (k % 5) * 0.11) * height;              // how high it climbs: 40% to 84% of the screen
  const angle = ((12 + (k % 4) * 6) * Math.PI) / 180;        // launch angle from straight up, leaning toward the middle: 12 to 30 degrees
  const delay = (k % 3) * 0.03;                              // three small waves, so it bursts rather than appears
  const turns = 1 + (k % 4) * 0.6;
  const wide = k % 3 === 0;
  const up = apex * 8;                                       // launch speed for that apex, with gravity twice the launch speed (apex at 25% of the time)
  const side = apex * 4 * Math.tan(angle);                   // sideways speed for that angle: at the apex it has moved apex x tan(angle) toward the middle
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (p.value - delay) / (1 - delay)));
    return {
      opacity: interpolate(t, [0, 0.03, 0.8, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: (left ? 0 : width) + (left ? 1 : -1) * side * t },
        { translateY: -up * t + 2 * up * t * t },
        { rotate: `${t * turns * 360}deg` },
      ],
    };
  });
  return <Animated.View style={[s.piece, { width: wide ? 14 : 8, height: wide ? 8 : 14, backgroundColor: splashStripes[i % splashStripes.length] }, style]} />;
}

export function Confetti() {
  const { width, height } = useWindowDimensions();
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(1, { duration: motion.confetti.ms, easing: Easing.linear }); }, [p]);
  return (
    <View pointerEvents="none" style={s.fill} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {Array.from({ length: motion.confetti.pieces }, (_, i) => <Piece key={i} i={i} p={p} width={width} height={height} />)}
    </View>
  );
}

const s = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" },
  piece: { position: "absolute", left: 0, bottom: 0, borderRadius: 2 },
});
