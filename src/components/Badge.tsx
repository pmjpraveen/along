import { StyleSheet, Text, View } from "react-native";
import { color, font, radius, space, tint, track } from "../theme/tokens";

export type BadgeVariant = "error" | "info" | "success" | "warning" | "neutral";

const LOOK: Record<BadgeVariant, { bg: string; text: string }> = {
  error: { bg: tint.error, text: color.alarmRed },
  info: { bg: color.neutralWash, text: color.charcoal },
  success: { bg: tint.success, text: color.charcoal },
  warning: { bg: tint.warning, text: color.darkGold },
  neutral: { bg: tint.neutral, text: color.signalBlue },
};

type Props = { variant?: BadgeVariant; label: string; align?: "start" | "center" };

// A small status tag: a tinted pill with a semibold 14pt label. The word carries the meaning, so it never relies on colour alone.
export function Badge({ variant = "info", label, align = "start" }: Props) {
  const look = LOOK[variant];
  return (
    <View accessible accessibilityLabel={label} style={[s.box, { backgroundColor: look.bg, alignSelf: align === "center" ? "center" : "flex-start" }]}>
      <Text maxFontSizeMultiplier={1.3} style={[s.label, { color: look.text }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: "row", alignItems: "center", minHeight: 28, paddingHorizontal: space.s12, paddingVertical: 3, borderRadius: radius.pill , borderCurve: "continuous"},
  label: { fontFamily: font.medium, fontSize: 14, lineHeight: 22, letterSpacing: track(14) },
});
