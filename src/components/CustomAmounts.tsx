import { StyleSheet, Text, View } from "react-native";
import { color, radius, space, type } from "../theme/tokens";
import { AmountInput } from "./AmountInput";

type Person = { id: string; name: string };
type Props = {
  people: Person[]; values: Record<string, string>; onChange: (id: string, text: string) => void;
  exponent: number; symbol: string; remaining: string | null; ok: boolean; noun?: string; hints?: Record<string, string>;
};

// One amount (or percent, via noun/symbol) field per person in the split, plus a live "left to assign" line so the total is never a surprise at Save.
export function CustomAmounts({ people, values, onChange, exponent, symbol, remaining, ok, noun = "Amount", hints }: Props) {
  return (
    <View style={s.gap}>
      {people.map((p) => (
        <View key={p.id} style={s.gap}>
          <View style={s.head}>
          <Text maxFontSizeMultiplier={1.4} style={s.name}>{p.name}</Text>
          {hints?.[p.id] && <Text maxFontSizeMultiplier={1.4} style={s.hint}>{hints[p.id]}</Text>}
        </View>
          <AmountInput label={`${noun} for ${p.name}`} value={values[p.id] ?? ""} onChange={(t) => onChange(p.id, t)} exponent={exponent} symbol={symbol} />
        </View>
      ))}
      {remaining && (
        <View accessible accessibilityRole="alert" style={[s.status, ok && s.statusOk]}>
          <Text maxFontSizeMultiplier={1.4} style={s.statusText}>{ok ? "✓ " : ""}{remaining}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  gap: { gap: space.s8 },
  head: { flexDirection: "row", justifyContent: "space-between", gap: space.s12 },
  hint: { ...type.label, color: color.charcoal, fontVariant: ["tabular-nums"] },
  name: { ...type.label, color: color.charcoal },
  status: { padding: space.s12, borderRadius: radius.input, borderCurve: "continuous", borderWidth: 1.5, borderColor: color.alarmRed },
  statusOk: { borderColor: color.forestInk },
  statusText: { ...type.label, color: color.obsidian, fontVariant: ["tabular-nums"] },
});
