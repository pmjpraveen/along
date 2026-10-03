import { StyleSheet, Text, View } from "react-native";
import { Pressable } from "./Pressable";
import type { PayerOption } from "../api/expenses";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
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
            <Avatar name={m.name} uri={m.uri} guest={m.guest} size={40} />
            <Text maxFontSizeMultiplier={1.4} style={s.name}>{name}</Text>
            {m.guest && <Badge label="Guest" align="center" />}
            <View style={[s.dot, on && s.dotOn]}>{on && <View style={s.dotInner} />}</View>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.s12, minHeight: 56 },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: color.softGrey, borderWidth: 1.5, borderColor: color.borderNeutral },
  guestRing: { borderStyle: "dashed", borderColor: color.slate },
  initials: { ...type.label, color: color.iconInk },
  name: { ...type.body, flex: 1, color: color.obsidian },
  tag: { ...type.label, color: color.charcoal },
  dot: { width: 24, height: 24, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1.5, borderColor: color.slate, alignItems: "center", justifyContent: "center" },
  dotOn: { backgroundColor: color.brandBlack, borderColor: color.brandBlack },
  dotInner: { width: 10, height: 10, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.paper },
});
