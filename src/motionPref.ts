import { AccessibilityInfo } from "react-native";

// Whether Reduce Motion is on right now, readable from an event handler without a hook (so hundreds of pressables don't each subscribe).
let reduced = false;
AccessibilityInfo.isReduceMotionEnabled().then((on) => { reduced = on; }).catch(() => {});
AccessibilityInfo.addEventListener("reduceMotionChanged", (on) => { reduced = on; });
export const reduceMotionNow = () => reduced;
