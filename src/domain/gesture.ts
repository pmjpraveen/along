// Pure gesture and spring maths (Apple's "Designing Fluid Interfaces"), so screens and tests share one definition.

// Where a moving thing comes to rest if it decelerates the way scrolling does. Velocity in px/s, result in px.
export function project(velocity: number, decelerationRate = 0.998): number {
  "worklet";
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

// Soft boundary: the further past the edge, the less the thing follows. Returns the displayed overshoot in px.
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  "worklet";
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

// A spring described as designers do: response (seconds to reach the target) and damping ratio (1 = no overshoot),
// converted to the stiffness/damping/mass that React Native's Animated.spring takes (unit mass).
export function spring(response: number, dampingRatio: number) {
  return { stiffness: (2 * Math.PI / response) ** 2, damping: (4 * Math.PI * dampingRatio) / response, mass: 1 };
}

// Dismiss when the flick's projected resting place is past halfway down the sheet; otherwise snap back.
export function shouldDismiss(position: number, velocity: number, sheetHeight: number): boolean {
  "worklet";
  return position + project(velocity) > sheetHeight / 2;
}
