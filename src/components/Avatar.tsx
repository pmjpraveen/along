import { ReactNode } from "react";
import { Check } from "lucide-react-native";
import { Image, StyleSheet, Text, View } from "react-native";
import { initialsOf } from "../domain/initials";
import { color, font, radius } from "../theme/tokens";

export const AVATAR_SIZES = [16, 24, 32, 40, 48, 56, 72] as const;
export type AvatarSize = (typeof AVATAR_SIZES)[number];

type Props = {
  name?: string;                    // initials come from this, and it names the avatar for screen readers
  uri?: string | null;              // a photo, when there is one
  size?: AvatarSize;
  icon?: ReactNode;                 // an icon avatar: outlined circle with the icon inside
  guest?: boolean;                  // a person with no account: dashed Slate ring, same size as everyone
  selected?: boolean;               // 2px Forest Ink ring and a green check badge
  badge?: string;                   // a small green badge at the bottom right
  notification?: boolean;           // a red dot at the top right
};

// The design system's avatar (Figma "avatar"): a circle with initials on the neutral wash (Forest Ink, medium weight), a
// photo, or an icon. Seven sizes, 16 to 72. Guests keep the same size and spacing as everyone, with a dashed ring.
export function Avatar({ name = "", uri, size = 40, icon, guest = false, selected = false, badge, notification = false }: Props) {
  const label = [name, guest ? "guest" : null, selected ? "selected" : null, notification ? "has a notification" : null].filter(Boolean).join(", ");
  const dot = Math.max(8, Math.round(size * 0.22));
  const chip = Math.max(14, Math.round(size * 0.4));
  return (
    <View accessible={!!name} accessibilityRole={name ? "image" : undefined} accessibilityLabel={label || undefined} style={{ width: size, height: size }}>
      <View style={[s.circle, { width: size, height: size },
        icon ? s.iconCircle : null, guest && s.guest, selected && s.selected]}>
        {uri ? <Image testID="avatar-photo" accessibilityIgnoresInvertColors source={{ uri }} style={{ width: size, height: size }} />
          : icon ? icon
          : size >= 24 ? <Text maxFontSizeMultiplier={1.2} style={[s.initials, { fontSize: Math.round(size * 0.4), lineHeight: Math.round(size * 0.5) }]}>{initialsOf(name)}</Text> : null}
      </View>
      {badge && (
        <View style={[s.chip, { width: chip, height: chip, borderRadius: chip / 2 , borderCurve: "continuous"}]}>
          <Text style={[s.chipText, { fontSize: Math.round(chip * 0.55) }]}>{badge}</Text>
        </View>
      )}
      {selected && (
        <View style={[s.chip, s.check, { width: chip, height: chip, borderRadius: chip / 2 , borderCurve: "continuous"}]}>
          <Check size={Math.round(chip * 0.7)} color={color.paper} strokeWidth={3} />
        </View>
      )}
      {notification && <View testID="avatar-notification" style={[s.dot, { width: dot, height: dot, borderRadius: dot / 2 , borderCurve: "continuous"}]} />}
    </View>
  );
}

type Person = { name: string; uri?: string | null; guest?: boolean };

// Overlapping avatars, then a "+N" circle for the rest ("text with numbers" in the design system).
export function AvatarGroup({ people, size = 40, max = 3 }: { people: Person[]; size?: AvatarSize; max?: number }) {
  const shown = people.slice(0, max);
  const more = people.length - shown.length;
  return (
    <View accessible accessibilityLabel={`${people.length} ${people.length === 1 ? "person" : "people"}`} style={s.group}>
      {shown.map((p, i) => (
        <View key={`${p.name}-${i}`} style={[s.ring, { borderRadius: size, borderCurve: "continuous", marginLeft: i === 0 ? 0 : -Math.round(size * 0.2) }]}>
          <Avatar name={p.name} uri={p.uri} guest={p.guest} size={size} />
        </View>
      ))}
      {more > 0 && (
        <View style={[s.ring, { borderRadius: size, borderCurve: "continuous", marginLeft: -Math.round(size * 0.2) }]}>
          <View style={[s.circle, { width: size, height: size }]}>
            <Text maxFontSizeMultiplier={1.2} style={[s.initials, { fontSize: Math.round(size * 0.4), lineHeight: Math.round(size * 0.5) }]}>+{more}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  circle: { borderRadius: radius.pill, borderCurve: "continuous", overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: color.neutralSolid },
  iconCircle: { backgroundColor: color.paper, borderWidth: 1, borderColor: color.borderNeutral },
  guest: { borderWidth: 1.5, borderStyle: "dashed", borderColor: color.slate },
  selected: { borderWidth: 2, borderColor: color.forestInk },
  initials: { fontFamily: font.medium, color: color.forestInk },
  chip: { position: "absolute", right: -2, bottom: -2, alignItems: "center", justifyContent: "center", backgroundColor: color.brightGreen, borderWidth: 2, borderColor: color.paper },
  check: { backgroundColor: color.positive },
  chipText: { fontFamily: font.medium, color: color.forestInk },
  dot: { position: "absolute", top: -1, right: -1, backgroundColor: color.alarmRed, borderWidth: 2, borderColor: color.paper },
  group: { flexDirection: "row", alignItems: "center" },
  ring: { borderWidth: 2, borderColor: color.paper },
});
