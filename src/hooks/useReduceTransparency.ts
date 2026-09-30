import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// True when the user has turned on Reduce Transparency (iOS); it updates live. Blurs become solid surfaces when it is true.
export function useReduceTransparency(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.().then((on) => { if (live) setReduced(on); }, () => {});
    const sub = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduced);
    return () => { live = false; sub.remove(); };
  }, []);
  return reduced;
}
