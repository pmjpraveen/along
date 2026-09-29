import { StyleSheet, Text, TextInput, View } from "react-native";
import { color, radius, space, type } from "../theme/tokens";

type Props = { label: string; value: string; onChange: (v: string) => void; exponent: number; symbol: string; invalid?: boolean };

// Keeps the text a valid partial amount for the currency: digits, one dot, at most `exponent` decimals.
export function sanitizeAmount(text: string, exponent: number): string {
  const cleaned = text.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  if (exponent === 0 || rest.length === 0) return whole;
  return `${whole}.${rest.join("").slice(0, exponent)}`;
}

export function AmountInput({ label, value, onChange, exponent, symbol, invalid }: Props) {
  return (
    <View style={[s.box, invalid && s.invalid]}>
      <Text maxFontSizeMultiplier={1.3} style={s.symbol}>{symbol}</Text>
      <View style={s.field}>
        <TextInput accessibilityLabel={label} value={value} onChangeText={(t) => onChange(sanitizeAmount(t, exponent))}
          keyboardType={exponent === 0 ? "number-pad" : "decimal-pad"} maxFontSizeMultiplier={1.3} style={s.input} />
        {/* iOS draws a native placeholder lower than the cursor and typed digits, so the placeholder is drawn here, centred like them. */}
        {value === "" && (
          <View pointerEvents="none" style={s.placeholderBox} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Text maxFontSizeMultiplier={1.3} style={s.placeholder}>{exponent === 0 ? "0" : `0.${"0".repeat(exponent)}`}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: "row", alignItems: "center", gap: space.s8, minHeight: 64, paddingHorizontal: space.s16, borderRadius: radius.small, borderCurve: "continuous", borderWidth: 1, borderColor: color.pebble, backgroundColor: color.paper },
  invalid: { borderWidth: 3, borderColor: color.alarmRed, paddingHorizontal: 14 },
  // Display face at input sizes, with normal tracking and no fixed line height (the display values are meant for 56pt and squash digits here).
  symbol: { fontFamily: type.display.fontFamily, fontSize: 24, color: color.charcoal },
  field: { flex: 1, justifyContent: "center" },
  placeholderBox: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, justifyContent: "center" },
  placeholder: { fontFamily: type.display.fontFamily, fontSize: 32, letterSpacing: -0.3, color: color.slate, fontVariant: ["tabular-nums"] },
  input: { fontFamily: type.display.fontFamily, fontSize: 32, height: 52, paddingVertical: 0, letterSpacing: -0.3, color: color.obsidian, fontVariant: ["tabular-nums"] },
});
