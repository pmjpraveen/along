import { Easing } from "react-native-reanimated";
import { spring } from "../domain/gesture";

// The one place for motion values. Springs are response (s) and damping ratio; default to no overshoot (1) and add bounce (~0.8)
// only where the gesture carried momentum, such as flicking a sheet.
export const motion = {
  sheet: spring(0.3, 0.8),
  settle: spring(0.4, 1),
  fadeMs: 150,        // a quick crossfade when content swaps in place (another day, a confirmation)
  toastMs: 2200,      // how long a confirmation stays
  toastActionMs: 5000,   // how long one with an Undo stays, so there is time to reach it
  pressMs: 120,
  splash: { holdMs: 150, turnMs: 800, zoomMs: 1100 },   // the opening animation: rest, stripes swing upright, zoom all the way into the logo and straight into the app
  shine: { sweepMs: 1600, restMs: 3200, buttonSweepMs: 900, buttonRestMs: 500 },   // the glint across the passport cover and the Start new trip button
  skeleton: { pulseMs: 800, low: 0.45 },   // a loading placeholder breathes between full and this opacity, on the UI thread
  pressScale: 0.98,   // a touch dips the control to this size at once
} as const;

// Strong ease-out for anything entering or answering a touch; never ease-in on UI.
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_SHINE = Easing.inOut(Easing.quad);
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
// The splash's final zoom speeds up all the way to the cut, so there is no slowing-down pause before the app appears.
export const EASE_ZOOM_THROUGH = Easing.bezier(0.55, 0, 1, 0.45);
