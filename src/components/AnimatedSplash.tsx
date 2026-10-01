import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { EASE_IN_OUT, EASE_OUT, EASE_ZOOM_THROUGH, motion } from "../theme/motion";
import { AlongLogo, LOGO_RATIO } from "./AlongLogo";

// The opening moment, from the brand animation: the logo sits on six tilted colour stripes; the stripes swing upright and widen to fill
// the screen, then the whole thing zooms all the way into the logo. It speeds up into the logo and cuts straight to the app (Home or sign-in) at the end, with no pause. The first frame matches the native splash image exactly, so the
// hand-off is invisible. Tap to skip. With Reduce Motion on it only holds, then fades. Runs once per launch.
const BG = "#222222";
const STRIPES = ["#ffcc3d", "#ffad00", "#ff4b00", "#de005a", "#6f00b1", "#002385"];
const TILT = -8.35;                 // degrees, counter-clockwise: the stripes rise to the right
const BAND = 0.1207;                // one stripe's thickness, as a fraction of the screen width
const LOGO_W = 0.413;               // the logo's width, as a fraction of the screen width
const END_SCALE_Y = 1 / (STRIPES.length * BAND);   // stretches the six stripes to exactly the screen width once upright
const ZOOM_STRIPES = 6;             // the stripes and the logo zoom by different amounts, so the logo rushes past the stripes: depth
const ZOOM_LOGO = 13;
const BREATH = 0.06;                // the logo swells a little while the stripes swing, so the opening is never still

export function AnimatedSplash({ ready, onShown, onDone }: { ready: boolean; onShown: () => void; onDone: () => void }) {
  const { width: w, height: h } = useWindowDimensions();
  const reduced = useReducedMotion();
  const turn = useSharedValue(0);
  const breath = useSharedValue(0);
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
    breath.value = withTiming(1, { duration: motion.splash.holdMs + motion.splash.turnMs + 300, easing: EASE_OUT });
    turn.value = withDelay(motion.splash.holdMs, withTiming(1, { duration: motion.splash.turnMs, easing: EASE_IN_OUT }));
    zoom.value = withDelay(motion.splash.holdMs + motion.splash.turnMs - 150, withTiming(1, { duration: motion.splash.zoomMs, easing: EASE_ZOOM_THROUGH }, (done) => { if (done) scheduleOnRN(onDone); }));
  }, [ready, reduced, fade, turn, zoom, onDone]);

  const skip = () => { cancelAnimation(breath); cancelAnimation(turn); cancelAnimation(zoom); cancelAnimation(fade); onDone(); };

  const stack = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(turn.value, [0, 1], [TILT, -90])}deg` }, { scaleY: interpolate(turn.value, [0, 1], [1, END_SCALE_Y]) }],
  }));
  const stripesZoom = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(zoom.value, [0, 1], [1, ZOOM_STRIPES]) }] }));
  const logoZoom = useAnimatedStyle(() => ({ transform: [{ scale: (1 + BREATH * breath.value) * interpolate(zoom.value, [0, 1], [1, ZOOM_LOGO]) }] }));
  // The last sliver of the zoom is the cut: the app is already showing underneath when the overlay is removed, so nothing waits.
  const root = useAnimatedStyle(() => ({ opacity: fade.value * interpolate(zoom.value, [0, 0.93, 1], [1, 1, 0]) }));

  return (
    <Animated.View style={[s.root, root]} onLayout={onShown}>
      <Pressable accessibilityRole="button" accessibilityLabel="Skip intro" onPress={skip} style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, stripesZoom]}>
          <Animated.View style={[s.stack, { width: stackW, height: stackH, left: (w - stackW) / 2, top: (h - stackH) / 2 }, stack]}>
            {STRIPES.map((c) => <View key={c} style={{ height: band, backgroundColor: c }} />)}
          </Animated.View>
        </Animated.View>
        <Animated.View style={[s.logo, { top: h / 2 - (w * LOGO_W * LOGO_RATIO) / 2 }, logoZoom]} pointerEvents="none">
          <AlongLogo width={w * LOGO_W} />
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
