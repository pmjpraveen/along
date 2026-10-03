import { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet, Text } from "react-native";
import { Pressable } from "./Pressable";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../stores/toast";
import { EASE_OUT, motion } from "../theme/motion";
import { color, radius, space, type } from "../theme/tokens";

// Confirms a save quietly: a pill that fades in above the tab bar, holds, and fades out. Opacity only, announced to screen readers,
// never blocks touches. Mounted once at the root so it survives the form closing.
export function Toast() {
  const { message, n, action } = useToast();
  const [live, setLive] = useState(false);   // the Undo can be tapped only while the toast is up
  const { bottom } = useSafeAreaInsets();
  const o = useSharedValue(0);
  useEffect(() => {
    if (!n) return;
    AccessibilityInfo.announceForAccessibility(message);
    cancelAnimation(o);
    const hold = action ? motion.toastActionMs : motion.toastMs;
    o.value = withSequence(withTiming(1, { duration: motion.fadeMs, easing: EASE_OUT }), withDelay(hold, withTiming(0, { duration: motion.fadeMs })));
    setLive(!!action);
    const id = setTimeout(() => setLive(false), motion.fadeMs + hold);
    return () => clearTimeout(id);
  }, [n, message, action, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  if (!n) return null;
  return (
    <Animated.View pointerEvents={action && live ? "box-none" : "none"} style={[s.wrap, { bottom: bottom + 96 }, style]}>
      <Text style={s.text}>{message}</Text>
      {action && live && (
        <Pressable accessibilityRole="button" accessibilityLabel={action.label} hitSlop={space.s12} onPress={() => { setLive(false); useToast.setState({ action: undefined }); action.onPress(); }}>
          <Text style={s.action}>{action.label}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", alignSelf: "center", flexDirection: "row", alignItems: "center", gap: space.s16, paddingHorizontal: space.s20, paddingVertical: space.s12, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.toast },
  text: { ...type.label, color: color.paper },
  action: { ...type.label, color: color.paper, textDecorationLine: "underline" },
});
