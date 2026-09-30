import { forwardRef } from "react";
import { Pressable as RNPressable, PressableProps, View } from "react-native";
import { motion } from "../theme/motion";

// The app's Pressable: a drop-in for React Native's that dips slightly the instant a finger lands and returns on release, so every
// tap is acknowledged before it is committed. Any style the caller gives for the pressed state still applies.
export const Pressable = forwardRef<View, PressableProps>(({ style, disabled, ...rest }, ref) => (
  <RNPressable ref={ref} disabled={disabled} {...rest}
    style={(st) => [typeof style === "function" ? style(st) : style, st.pressed && !disabled && { transform: [{ scale: motion.pressScale }] }]} />
));
Pressable.displayName = "Pressable";
