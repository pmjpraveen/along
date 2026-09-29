import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PayerOption } from "../api/expenses";
import { color, radius, space, type } from "../theme/tokens";

type Props = { members: PayerOption[]; selected: string; onChange: (id: string) => void };

// Exactly one payer. "You" first; guests are shown with a dashed ring and a Guest tag.
export function PayerPicker({ members, selected, onChange }: Props) {
  const ordered = [...members].sort((a, b) => Number(b.isMe) - Number(a.isMe));
  return (
    <View>
      {ordered.map((m) => {
        const on = selected === m.id;
        const name = m.isMe ? "You" : m.name;
        return (
          <Pressable key={m.id} accessibilityRole="radio" accessibilityLabel={m.guest ? `${name}, guest` : name}
            accessibilityState={{ selected: on }} onPress={() => onChange(m.id)} style={s.row}>
            <View style={[s.avatar, m.guest && s.guestRing]}><Text style={s.initials}>{m.name.trim().slice(0, 1).toUpperCase()}</Text></View>
            <Text maxFontSizeMultiplier={1.4} style={s.name}>{name}</Text>
            {m.guest && <Text style={s.tag}>Guest</Text>}
            <View style={[s.dot, on && s.dotOn]}>{on && <View style={s.dotInner} />}</View>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.s12, minHeight: 56 },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: color.fog, borderWidth: 1.5, borderColor: color.fog },
  guestRing: { borderStyle: "dashed", borderColor: color.slate },
  initials: { ...type.label, color: color.forestInk },
  name: { ...type.body, flex: 1, color: color.obsidian },
  tag: { ...type.label, color: color.charcoal },
  dot: { width: 24, height: 24, borderRadius: radius.pill, borderWidth: 1.5, borderColor: color.forestInk, alignItems: "center", justifyContent: "center" },
  dotOn: { backgroundColor: color.daylight },
  dotInner: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: color.forestInk },
});
