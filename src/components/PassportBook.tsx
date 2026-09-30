import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { ReactNode, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { color, font, radius, space } from "../theme/tokens";

// The passport's pages, one visible at a time, that you flip through: swipe sideways and the page turns like a leaf (it swings on its
// spine), or use the arrows. With Reduce Motion on, pages simply slide with no swing. The page count is always written out.
export function PassportBook({ pages, firstNumber = 1, tint }: { pages: ReactNode[]; firstNumber?: number; tint: string }) {
  const { width: screen } = useWindowDimensions();
  const width = screen - space.s20 * 2;
  const reduced = useReducedMotion();
  const ref = useRef<ScrollView>(null);
  const x = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const onScroll = useAnimatedScrollHandler((e) => { x.value = e.contentOffset.x; });
  const goTo = (i: number) => { const n = Math.max(0, Math.min(pages.length - 1, i)); ref.current?.scrollTo({ x: n * width, animated: !reduced }); setIndex(n); };

  return (
    <View>
      <Animated.ScrollView ref={ref as never} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}
        decelerationRate="fast" onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))} accessibilityLabel="Passport pages">
        {pages.map((p, i) => <Leaf key={i} i={i} x={x} width={width} swing={!reduced}>{p}</Leaf>)}
      </Animated.ScrollView>
      <View style={s.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous page" disabled={index === 0} onPress={() => goTo(index - 1)} hitSlop={space.s8} style={[s.arrow, index === 0 && s.off]}>
          <ChevronLeft size={20} color={tint} strokeWidth={2} />
        </Pressable>
        <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.3} style={[s.count, { color: tint }]}>{`Page ${firstNumber + index} · ${index + 1} of ${pages.length}`}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next page" disabled={index >= pages.length - 1} onPress={() => goTo(index + 1)} hitSlop={space.s8} style={[s.arrow, index >= pages.length - 1 && s.off]}>
          <ChevronRight size={20} color={tint} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

// One page: it stays flat when it is the one in view, and swings on its spine as it is turned away or turned in.
function Leaf({ i, x, width, swing, children }: { i: number; x: { value: number }; width: number; swing: boolean; children: ReactNode }) {
  const style = useAnimatedStyle(() => {
    if (!swing) return {};
    const deg = interpolate(x.value, [(i - 1) * width, i * width, (i + 1) * width], [70, 0, -70]);
    const fade = interpolate(x.value, [(i - 1) * width, i * width, (i + 1) * width], [0.4, 1, 0.4]);
    return { opacity: fade, transform: [{ perspective: 900 }, { rotateY: `${deg}deg` }] };
  });
  return <Animated.View style={[{ width }, style]}>{children}</Animated.View>;
}

const s = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: space.s12 },
  arrow: { width: 44, height: 44, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, alignItems: "center", justifyContent: "center" },
  off: { opacity: 0.35 },
  count: { fontFamily: font.medium, fontSize: 13, letterSpacing: 1 },
});
