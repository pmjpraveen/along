import { ReactNode, useState } from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Check } from "lucide-react-native";
import { color, radius, space } from "../theme/tokens";

// Figma "Card": neutral wash fill, no border. Pressed darkens the fill; focus and selected add a 2px Forest Ink ring
// (selected also shows a check, so it never rests on colour alone). The border is always 2px so states do not shift layout.
type Props = {
  children: ReactNode; onPress?: () => void; disabled?: boolean; selected?: boolean; style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string; accessible?: boolean;
};

export function Card({ children, onPress, disabled, selected, style, accessibilityLabel, accessible }: Props) {
  const [focused, setFocused] = useState(false);
  if (!onPress) return <View accessible={accessible} accessibilityLabel={accessibilityLabel} style={[s.card, selected && s.ring, style]}>{children}{selected && <Tick />}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={({ pressed }) => [s.card, pressed && s.pressed, (focused || selected) && s.ring, style]}>
      {children}{selected && <Tick />}
    </Pressable>
  );
}

function Tick() {
  return (
    <View style={s.check}>
      <Check size={12} color={color.forestInk} strokeWidth={3} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
    </View>
  );
}

const s = StyleSheet.create({
  card: { padding: space.s16, gap: space.s4, borderRadius: radius.card, borderCurve: "continuous", borderWidth: 2, borderColor: "transparent", backgroundColor: color.neutralWash },
  pressed: { backgroundColor: "rgba(22,51,0,0.2)" },
  ring: { borderColor: color.forestInk },
  check: { position: "absolute", top: space.s8, right: space.s8, width: 20, height: 20, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.brightGreen, alignItems: "center", justifyContent: "center" },
});
