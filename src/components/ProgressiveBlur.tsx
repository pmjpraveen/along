import { BlurView } from "expo-blur";
import { StyleSheet, View } from "react-native";

// A blur that thins out smoothly. React Native cannot mask a blur (a masked blur view stops blurring), so this stacks many
// blur layers that each reach a little less far than the last; where more layers overlap the blur is stronger. With this many
// layers of low strength the steps are far too small to see. `edge` is the fully blurred side. Ignores touches.
const LAYERS = 14;
export function ProgressiveBlur({ edge }: { edge: "top" | "bottom" }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: LAYERS }, (_, i) => (
        <BlurView key={i} intensity={9} tint="extraLight"
          style={[s.layer, edge === "top" ? { top: 0 } : { bottom: 0 }, { height: `${((LAYERS - i) / LAYERS) * 100}%` }]} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({ layer: { position: "absolute", left: 0, right: 0 } });
