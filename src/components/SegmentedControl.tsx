import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { EASE_OUT, motion } from "../theme/motion";
import { haptic } from "../haptics";
import { Pressable } from "./Pressable";
import { color, radius, space, type } from "../theme/tokens";

// 2-3 alike options in a soft grey pill track; the selected one is a white pill with a dark label. The pill slides to the chosen segment
// (transform only, on the UI thread); with Reduce Motion it jumps.
// Selection is also carried by the selected state and the colour change together, not by colour alone.
type Props<T extends string> = { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; accessibilityLabel: string };

export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const placed = useRef(false);   // the first placement is instant, so the pill never slides in from the left edge
  const itemW = width > 0 ? (width - space.s8) / options.length : 0;   // the track has 4 points of padding each side
  const at = options.findIndex((o) => o.value === value) * itemW;
  useEffect(() => {
    if (!itemW) return;
    x.value = placed.current && !reduced ? withTiming(at, { duration: motion.slideMs, easing: EASE_OUT }) : at;
    placed.current = true;
  }, [at, itemW, reduced, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={s.track} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
      {itemW > 0 && <Animated.View pointerEvents="none" style={[s.pill, { width: itemW }, pill]} />}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => on || (haptic.select(), onChange(o.value))} style={s.item}>
            <Text maxFontSizeMultiplier={1.3} style={[s.label, on && s.labelOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  track: { flexDirection: "row", padding: space.s4, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey },
  item: { flex: 1, minHeight: 44, paddingHorizontal: space.s16, borderRadius: radius.pill, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  pill: { position: "absolute", left: space.s4, top: space.s4, bottom: space.s4, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.paper },
  label: { ...type.buttonSmall, color: color.charcoal },
  labelOn: { color: color.obsidian },
});
