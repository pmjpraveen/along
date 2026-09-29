import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// True when the user has turned on Reduce Motion (iOS) / removed animations (Android); it updates live.
// Components swap movement for an instant change or a crossfade when it is true.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => { if (live) setReduced(on); });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { live = false; sub.remove(); };
  }, []);
  return reduced;
}
