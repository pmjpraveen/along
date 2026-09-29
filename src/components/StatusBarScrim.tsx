import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProgressiveBlur } from "./ProgressiveBlur";

// Sits over the status bar on every screen so scrolling content blurs out under the clock and icons instead of colliding with them.
// One smooth blur that thins to nothing just below the status area. It ignores touches.
export function StatusBarScrim() {
  const { top } = useSafeAreaInsets();
  if (top <= 0) return null;
  return (
    <View pointerEvents="none" style={[s.wrap, { height: top + 8 }]}>
      <ProgressiveBlur edge="top" />
    </View>
  );
}

const s = StyleSheet.create({ wrap: { position: "absolute", top: 0, left: 0, right: 0 } });
