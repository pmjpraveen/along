import { useEffect } from "react";
import { AccessibilityInfo, StyleSheet, Text } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../stores/toast";
import { motion } from "../theme/motion";
import { color, radius, space, type } from "../theme/tokens";

// Confirms a save quietly: a pill that fades in above the tab bar, holds, and fades out. Opacity only, announced to screen readers,
// never blocks touches. Mounted once at the root so it survives the form closing.
export function Toast() {
  const { message, n } = useToast();
  const { bottom } = useSafeAreaInsets();
  const o = useSharedValue(0);
  useEffect(() => {
    if (!n) return;
    AccessibilityInfo.announceForAccessibility(message);
    cancelAnimation(o);
    o.value = withTiming(1, { duration: motion.fadeMs });
    o.value = withDelay(motion.toastMs, withTiming(0, { duration: motion.fadeMs }));
  }, [n, message, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  if (!n) return null;
  return (
    <Animated.View pointerEvents="none" style={[s.wrap, { bottom: bottom + 96 }, style]}>
      <Text maxFontSizeMultiplier={1.3} style={s.text}>{message}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", alignSelf: "center", paddingHorizontal: space.s20, paddingVertical: space.s12, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.forestInk },
  text: { ...type.label, color: color.paper },
});
