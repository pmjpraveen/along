import { Pressable, StyleSheet, Text, View } from "react-native";
import { color, font, radius, space, type } from "../theme/tokens";

// Figma "Notifications" row: a flat row with a status dot, a title, an optional date and body. Unread has a warning-yellow dot and a
// Medium obsidian title; read has a pale dot and a Regular charcoal title. Unread is also in the accessibility label, never dot colour alone.
type Props = { title: string; body?: string; date?: string; unread?: boolean; onPress: () => void };

export function NotificationItem({ title, body, date, unread = false, onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${unread ? "Unread. " : ""}${title}`} onPress={onPress} style={({ pressed }) => [s.row, pressed && s.pressed]}>
      <View style={[s.dot, unread ? s.dotOn : s.dotOff]} />
      <View style={s.text}>
        <View style={s.head}>
          <Text maxFontSizeMultiplier={1.4} style={[s.title, unread ? s.titleOn : s.titleOff]}>{title}</Text>
          {date ? <Text maxFontSizeMultiplier={1.4} style={s.date}>{date}</Text> : null}
        </View>
        {body ? <Text maxFontSizeMultiplier={1.4} style={s.body}>{body}</Text> : null}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: space.s12, minHeight: 48, paddingVertical: space.s12 },
  pressed: { backgroundColor: color.neutralWash },
  dot: { width: 10, height: 10, borderRadius: radius.pill, marginTop: space.s8 },
  dotOn: { backgroundColor: color.warning },
  dotOff: { backgroundColor: color.borderNeutral },
  text: { flex: 1, gap: space.s4 },
  head: { flexDirection: "row", justifyContent: "space-between", gap: space.s12 },
  title: { ...type.body, flex: 1 },
  titleOn: { fontFamily: font.medium, color: color.obsidian },
  titleOff: { color: color.charcoal },
  date: { ...type.fieldMessage, color: color.slate },
  body: { ...type.fieldValue, color: color.charcoal },
});
