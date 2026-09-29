import { Pressable, StyleSheet, Text } from "react-native";
import { color, radius, space, type } from "../theme/tokens";

type Props = { label: string; onPress: () => void };

export function PrimaryButton({ label, onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [s.primary, pressed && s.pressed]}>
      <Text maxFontSizeMultiplier={1.3} style={s.label}>{label}</Text>
    </Pressable>
  );
}

export function OutlinedButton({ label, onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [s.outlined, pressed && s.pressed]}>
      <Text maxFontSizeMultiplier={1.3} style={s.label}>{label}</Text>
    </Pressable>
  );
}

export function TextButton({ label, onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={space.s12}
      style={({ pressed }) => [s.text, pressed && s.pressed]}>
      <Text maxFontSizeMultiplier={1.3} style={[s.label, s.underline]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  primary: {
    minHeight: 56, paddingHorizontal: space.s24, alignItems: "center", justifyContent: "center",
    borderRadius: radius.pill, backgroundColor: color.daylight, borderWidth: 1, borderColor: color.forestInk,
  },
  outlined: {
    minHeight: 56, paddingHorizontal: space.s24, alignItems: "center", justifyContent: "center",
    borderRadius: radius.pill, borderWidth: 1.5, borderColor: color.forestInk,
  },
  text: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.8 },
  label: { ...type.label, color: color.forestInk },
  underline: { textDecorationLine: "underline" },
});
