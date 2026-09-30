import { StyleSheet, Text, View } from "react-native";
import { Pressable } from "./Pressable";
import { Check } from "lucide-react-native";
import type { Member } from "../api/members";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { color, radius, space, type } from "../theme/tokens";

type Props = { members: Pick<Member, "id" | "display_name" | "membership_type">[]; selected: string[]; onChange: (ids: string[]) => void; amounts?: Record<string, string> };


// Toggle who is joining. Guests are shown with a dashed ring and a Guest tag, at the same size as everyone.
export function ParticipantPicker({ members, selected, onChange, amounts }: Props) {
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <View>
      {members.map((m) => {
        const on = selected.includes(m.id);
        const guest = m.membership_type === "guest";
        return (
          <Pressable key={m.id} accessibilityRole="checkbox" accessibilityLabel={guest ? `${m.display_name}, guest` : m.display_name}
            accessibilityState={{ checked: on }} onPress={() => toggle(m.id)} style={s.row}>
            <Avatar name={m.display_name} guest={guest} size={40} />
            <Text maxFontSizeMultiplier={1.4} style={s.name}>{m.display_name}</Text>
            {guest && <Badge label="Guest" align="center" />}
            {on && amounts?.[m.id] && <Text maxFontSizeMultiplier={1.3} style={s.amount}>{amounts[m.id]}</Text>}
            <View style={[s.box, on && s.boxOn]}>{on && <Check size={16} color={color.forestInk} strokeWidth={3} />}</View>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.s12, minHeight: 56 },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: color.neutralWash, borderWidth: 1.5, borderColor: color.borderNeutral },
  guestRing: { borderStyle: "dashed", borderColor: color.slate },
  initials: { ...type.label, color: color.forestInk },
  name: { ...type.body, flex: 1, color: color.obsidian },
  amount: { ...type.label, color: color.charcoal, fontVariant: ["tabular-nums"] },
  tag: { ...type.label, color: color.charcoal },
  box: { width: 24, height: 24, borderRadius: 6, borderCurve: "continuous", borderWidth: 1.5, borderColor: color.forestInk, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: color.brightGreen },
});
