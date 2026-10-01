import { Easing } from "react-native-reanimated";
import { spring } from "../domain/gesture";

// The one place for motion values. Springs are response (s) and damping ratio; default to no overshoot (1) and add bounce (~0.8)
// only where the gesture carried momentum, such as flicking a sheet.
export const motion = {
  sheet: spring(0.3, 0.8),
  settle: spring(0.4, 1),
  fadeMs: 150,        // a quick crossfade when content swaps in place (another day, a confirmation)
  toastMs: 2200,      // how long a confirmation stays
  pressMs: 120,
  splash: { holdMs: 450, turnMs: 650, zoomMs: 600 },   // the opening animation: rest, stripes swing upright, zoom through the logo
  pressScale: 0.98,   // a touch dips the control to this size at once
} as const;

// Strong ease-out for anything entering or answering a touch; never ease-in on UI.
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
