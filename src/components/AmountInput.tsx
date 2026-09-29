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
      <TextInput accessibilityLabel={label} value={value} onChangeText={(t) => onChange(sanitizeAmount(t, exponent))}
        keyboardType={exponent === 0 ? "number-pad" : "decimal-pad"} placeholder={exponent === 0 ? "0" : `0.${"0".repeat(exponent)}`}
        placeholderTextColor={color.slate} maxFontSizeMultiplier={1.3} style={s.input} />
    </View>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: "row", alignItems: "center", gap: space.s8, minHeight: 64, paddingHorizontal: space.s16, borderRadius: radius.input, borderWidth: 1.5, borderColor: color.fog },
  invalid: { borderColor: color.alarmRed },
  symbol: { ...type.display, fontSize: 28, color: color.charcoal },
  input: { ...type.display, flex: 1, fontSize: 32, minHeight: 48, color: color.obsidian, fontVariant: ["tabular-nums"] },
});
