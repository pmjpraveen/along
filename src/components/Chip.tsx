import { StyleSheet, Text } from "react-native";
import { color, radius, space, type } from "../theme/tokens";
import { haptic } from "../haptics";
import { Pressable } from "./Pressable";

// The app's chip: a 32pt pill. Selected is #444444 with a white label; unselected is #f4f4f4 at 85% with a #444444 label. The touch area is
// taller than the pill (hit slop), so it is still easy to hit. Used for the day chips and the split methods; choosing a different one ticks under the finger.
export function Chip({ label, accessibilityLabel, role, selected, onPress }: { label: string; accessibilityLabel?: string; role: "tab" | "radio"; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole={role} accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ selected }} hitSlop={{ top: 6, bottom: 6 }} onPress={() => { if (!selected) haptic.select(); onPress(); }}
      style={[s.chip, selected && s.on]}>
      <Text style={[s.label, selected && s.labelOn]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: { minHeight: 32, paddingVertical: 4, paddingHorizontal: space.s16, borderRadius: radius.pill, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: color.softGrey, opacity: 0.85 },
  on: { backgroundColor: color.iconInk, opacity: 1 },
  label: { ...type.buttonSmall, color: color.iconInk },
  labelOn: { color: color.paper },
});
