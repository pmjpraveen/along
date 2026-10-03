import { ChevronLeft } from "../icons";
import { StyleSheet, View } from "react-native";
import Animated, { Extrapolation, interpolate, SharedValue, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius, space } from "../theme/tokens";
import { Pressable } from "./Pressable";

// Pages with a back button keep it fixed at the top while the page scrolls, or stretches on a pull to refresh. Only the content moves: the button
// stays where a thumb expects it, and the row behind it turns solid white once content scrolls up underneath.
export const PINNED_BACK_H = 48;

export function useScrollY() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  return { scrollY, onScroll };
}

// The padding a page's content needs at the top so it starts just below the pinned button.
export const useContentTop = () => useSafeAreaInsets().top + space.s16 + PINNED_BACK_H + space.s16;

export function PinnedBack({ onPress, scrollY }: { onPress: () => void; scrollY: SharedValue<number> }) {
  const { top } = useSafeAreaInsets();
  const bg = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [0, 12], [0, 1], Extrapolation.CLAMP) }));
  return (
    <View pointerEvents="box-none" style={[s.wrap, { height: top + space.s16 + PINNED_BACK_H + space.s8, paddingTop: top + space.s16 }]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.bg, bg]} />
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onPress} hitSlop={space.s4} style={s.round}>
        <ChevronLeft size={22} color={color.brandBlack} strokeWidth={1.75} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 5, paddingHorizontal: space.s20 },
  bg: { backgroundColor: color.paper },
  round: { width: PINNED_BACK_H, height: PINNED_BACK_H, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
});
