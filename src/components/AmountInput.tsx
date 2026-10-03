import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { color, radius, space, type } from "../theme/tokens";

type Props = { label: string; value: string; onChange: (v: string) => void; exponent: number; symbol: string; invalid?: boolean; compact?: boolean; suffix?: boolean };

// Keeps the text a valid partial amount for the currency: digits, one dot, at most `exponent` decimals.
export function sanitizeAmount(text: string, exponent: number): string {
  const cleaned = text.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  if (exponent === 0 || rest.length === 0) return whole;
  return `${whole}.${rest.join("").slice(0, exponent)}`;
}

// `compact` makes it an ordinary input (48pt tall, regular text) for the per-person fields in a split; the main amount stays big.
// `suffix` puts the symbol after the number (a percent sign), instead of before it (a currency sign).
export function AmountInput({ label, value, onChange, exponent, symbol, invalid, compact, suffix }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[s.box, compact && s.boxCompact, focused && !invalid && s.focused, invalid && s.invalid]}>
      {!suffix && <Text maxFontSizeMultiplier={1.3} style={[s.symbol, compact && s.symbolCompact]}>{symbol}</Text>}
      <View style={s.field}>
        <TextInput accessibilityLabel={label} value={value} onChangeText={(t) => onChange(sanitizeAmount(t, exponent))}
          keyboardType={exponent === 0 ? "number-pad" : "decimal-pad"} maxFontSizeMultiplier={1.3} style={[s.input, compact && s.inputCompact]}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
        {/* iOS draws a native placeholder lower than the cursor and typed digits, so the placeholder is drawn here, centred like them. */}
        {value === "" && (
          <View pointerEvents="none" style={s.placeholderBox} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Text maxFontSizeMultiplier={1.3} style={[s.placeholder, compact && s.placeholderCompact]}>{exponent === 0 ? "0" : `0.${"0".repeat(exponent)}`}</Text>
          </View>
        )}
      </View>
      {suffix && <Text maxFontSizeMultiplier={1.3} style={[s.symbol, compact && s.symbolCompact]}>{symbol}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: "row", alignItems: "center", gap: space.s8, minHeight: 64, paddingHorizontal: space.s16, borderRadius: radius.card, borderCurve: "continuous", borderWidth: 1, borderColor: color.inputBorder, backgroundColor: color.paper },
  boxCompact: { minHeight: 48 },
  focused: { borderWidth: 3, borderColor: color.brandBlack, paddingHorizontal: 14 },
  invalid: { borderWidth: 3, borderColor: color.alarmRed, paddingHorizontal: 14 },
  // Display face at input sizes, with normal tracking and no fixed line height (the display values are meant for 56pt and squash digits here).
  symbol: { fontFamily: type.display.fontFamily, fontSize: 24, color: color.charcoal },
  symbolCompact: { fontFamily: type.fieldValue.fontFamily, fontSize: type.fieldValue.fontSize, color: color.obsidian },
  field: { flex: 1, justifyContent: "center" },
  placeholderBox: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, justifyContent: "center" },
  placeholder: { fontFamily: type.display.fontFamily, fontSize: 32, letterSpacing: -0.3, color: color.slate, fontVariant: ["tabular-nums"] },
  input: { fontFamily: type.display.fontFamily, fontSize: 32, height: 52, paddingVertical: 0, letterSpacing: -0.3, color: color.obsidian, fontVariant: ["tabular-nums"] },
  // The ordinary input look: the same face and size as every other field.
  inputCompact: { fontFamily: type.fieldValue.fontFamily, fontSize: type.fieldValue.fontSize, height: 28, letterSpacing: 0 },
  placeholderCompact: { fontFamily: type.fieldValue.fontFamily, fontSize: type.fieldValue.fontSize, letterSpacing: 0, color: color.pebble },
});
