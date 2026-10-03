import { StyleSheet, Text, View } from "react-native";
import { color, radius, space, type } from "../theme/tokens";
import { AmountInput } from "./AmountInput";

type Person = { id: string; name: string };
type Props = {
  people: Person[]; values: Record<string, string>; onChange: (id: string, text: string) => void;
  exponent: number; symbol: string; remaining: string | null; ok: boolean; noun?: string; hints?: Record<string, string>;
};

// One row per person in the split: their name on the left (with what it comes to underneath, for share splits) and their amount, percent or
// shares in an ordinary input on the right, so each input belongs to its name. Under the rows a line says what is still to assign or by how much it
// is over; once it all adds up, nothing is shown.
export function CustomAmounts({ people, values, onChange, exponent, symbol, remaining, ok, noun = "Amount", hints }: Props) {
  return (
    <View style={s.gap}>
      {people.map((p) => (
        <View key={p.id} style={s.row}>
          <View style={s.who}>
            <Text numberOfLines={1} style={s.name}>{p.name}</Text>
            {hints?.[p.id] && <Text style={s.hint}>{hints[p.id]}</Text>}
          </View>
          <View style={s.input}>
            <AmountInput label={`${noun} for ${p.name}`} value={values[p.id] ?? ""} onChange={(t) => onChange(p.id, t)} exponent={exponent} symbol={symbol} suffix={symbol === "%"} compact />
          </View>
        </View>
      ))}
      {remaining && !ok && (
        <View accessible accessibilityRole="alert" style={s.status}>
          <Text style={s.statusText}>{remaining}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  gap: { gap: space.s8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.s12 },
  who: { flex: 1, gap: 2 },
  input: { width: 150 },
  hint: { ...type.fieldMessage, color: color.slate, fontVariant: ["tabular-nums"] },
  name: { ...type.label, color: color.obsidian },
  status: { padding: space.s12, borderRadius: radius.input, borderCurve: "continuous", borderWidth: 1.5, borderColor: color.alarmRed },
  statusText: { ...type.label, color: color.obsidian, fontVariant: ["tabular-nums"] },
});
