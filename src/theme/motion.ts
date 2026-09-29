import { spring } from "../domain/gesture";

// The one place for motion values. Springs are response (s) and damping ratio; default to no overshoot (1) and add bounce (~0.8)
// only where the gesture carried momentum, such as flicking a sheet.
export const motion = {
  sheet: spring(0.3, 0.8),
  settle: spring(0.4, 1),
} as const;
