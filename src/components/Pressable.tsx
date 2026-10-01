import { forwardRef, useState } from "react";
import { Pressable as RNPressable, PressableProps, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { EASE_OUT, motion } from "../theme/motion";

const APressable = Animated.createAnimatedComponent(RNPressable);

// The app's Pressable: a drop-in for React Native's that dips slightly the instant a finger lands and eases back on release, on the UI
// thread (pass dip={false} for full-width rows, which fill instead of shrinking), so every tap is acknowledged before it is committed. Any style the caller gives for the pressed state still applies.
export const Pressable = forwardRef<View, PressableProps & { dip?: boolean }>(({ style, disabled, dip: dips = true, onPressIn, onPressOut, onHoverIn, onHoverOut, ...rest }, ref) => {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const scale = useSharedValue(1);
  const dip = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const to = (v: number) => { scale.value = withTiming(v, { duration: motion.pressMs, easing: EASE_OUT }); };
  return (
    <APressable ref={ref as never} disabled={disabled} {...rest}
      onPressIn={(e) => { setPressed(true); if (!disabled && dips) to(motion.pressScale); onPressIn?.(e); }}
      onPressOut={(e) => { setPressed(false); to(1); onPressOut?.(e); }}
      onHoverIn={(e) => { setHovered(true); onHoverIn?.(e); }} onHoverOut={(e) => { setHovered(false); onHoverOut?.(e); }}
      style={[typeof style === "function" ? style({ pressed, hovered }) : style, dip]} />
  );
});
Pressable.displayName = "Pressable";
