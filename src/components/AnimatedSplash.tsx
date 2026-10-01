import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { EASE_IN_OUT, EASE_OUT, motion } from "../theme/motion";
import { AlongLogo, LOGO_RATIO } from "./AlongLogo";

// The opening moment, from the brand animation: the logo sits on six tilted colour stripes; the stripes swing upright and widen to fill
// the screen, then the whole thing zooms through the logo into the app. The first frame matches the native splash image exactly, so the
// hand-off is invisible. Tap to skip. With Reduce Motion on it only holds, then fades. Runs once per launch.
const BG = "#222222";
const STRIPES = ["#ffcc3d", "#ffad00", "#ff4b00", "#de005a", "#6f00b1", "#002385"];
const TILT = -8.35;                 // degrees, counter-clockwise: the stripes rise to the right
const BAND = 0.1207;                // one stripe's thickness, as a fraction of the screen width
const LOGO_W = 0.413;               // the logo's width, as a fraction of the screen width
const END_SCALE_Y = 1 / (STRIPES.length * BAND);   // stretches the six stripes to exactly the screen width once upright
const ZOOM = 7;

export function AnimatedSplash({ ready, onShown, onDone }: { ready: boolean; onShown: () => void; onDone: () => void }) {
  const { width: w, height: h } = useWindowDimensions();
  const reduced = useReducedMotion();
  const turn = useSharedValue(0);
  const zoom = useSharedValue(0);
  const fade = useSharedValue(1);
  const started = useRef(false);

  const band = w * BAND;
  const stackH = band * STRIPES.length;
  const stackW = Math.hypot(w, h) * 1.2;   // long enough to cover the screen at any angle

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    if (reduced) {
      fade.value = withDelay(motion.splash.holdMs, withTiming(0, { duration: motion.fadeMs }, (done) => { if (done) scheduleOnRN(onDone); }));
      return;
    }
    turn.value = withDelay(motion.splash.holdMs, withTiming(1, { duration: motion.splash.turnMs, easing: EASE_IN_OUT }));
    zoom.value = withDelay(motion.splash.holdMs + motion.splash.turnMs - 80, withTiming(1, { duration: motion.splash.zoomMs, easing: EASE_OUT }, (done) => { if (done) scheduleOnRN(onDone); }));
  }, [ready, reduced, fade, turn, zoom, onDone]);

  const skip = () => { cancelAnimation(turn); cancelAnimation(zoom); cancelAnimation(fade); onDone(); };

  const stack = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(turn.value, [0, 1], [TILT, -90])}deg` }, { scaleY: interpolate(turn.value, [0, 1], [1, END_SCALE_Y]) }],
  }));
  const group = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(zoom.value, [0, 1], [1, ZOOM]) }] }));
  const root = useAnimatedStyle(() => ({ opacity: fade.value * interpolate(zoom.value, [0, 0.55, 1], [1, 1, 0]) }));

  return (
    <Animated.View style={[s.root, root]} onLayout={onShown}>
      <Pressable accessibilityRole="button" accessibilityLabel="Skip intro" onPress={skip} style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, group]}>
          <Animated.View style={[s.stack, { width: stackW, height: stackH, left: (w - stackW) / 2, top: (h - stackH) / 2 }, stack]}>
            {STRIPES.map((c) => <View key={c} style={{ height: band, backgroundColor: c }} />)}
          </Animated.View>
          <View style={[s.logo, { top: h / 2 - (w * LOGO_W * LOGO_RATIO) / 2 }]} pointerEvents="none">
            <AlongLogo width={w * LOGO_W} />
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: BG },
  stack: { position: "absolute" },
  logo: { position: "absolute", left: 0, right: 0, alignItems: "center" },
});
