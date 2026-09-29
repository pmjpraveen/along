import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Member } from "../api/members";
import { color, radius, space, type } from "../theme/tokens";

type Props = { members: Member[]; selected: string[]; onChange: (ids: string[]) => void };

const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

// Toggle who is joining. Guests are shown with a dashed ring and a Guest tag, at the same size as everyone.
export function ParticipantPicker({ members, selected, onChange }: Props) {
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <View>
      {members.map((m) => {
        const on = selected.includes(m.id);
        const guest = m.membership_type === "guest";
        return (
          <Pressable key={m.id} accessibilityRole="checkbox" accessibilityLabel={guest ? `${m.display_name}, guest` : m.display_name}
            accessibilityState={{ checked: on }} onPress={() => toggle(m.id)} style={s.row}>
            <View style={[s.avatar, guest && s.guestRing]}><Text style={s.initials}>{initials(m.display_name)}</Text></View>
            <Text maxFontSizeMultiplier={1.4} style={s.name}>{m.display_name}</Text>
            {guest && <Text style={s.tag}>Guest</Text>}
            <View style={[s.box, on && s.boxOn]}>{on && <Text style={s.tick}>✓</Text>}</View>
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
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: color.forestInk, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: color.daylight },
  tick: { color: color.forestInk, fontSize: 16, lineHeight: 18 },
});
