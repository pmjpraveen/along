import { StyleSheet, Text, View } from "react-native";
import { Pressable } from "./Pressable";
import { Part } from "../domain/notifications";
import { color, font, space, type } from "../theme/tokens";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";

// One notification as a flat row, like a History entry: the person's avatar, a sentence with names and titles in bold, and the time on
// the right. Unread ones carry a "New" badge, and the words "Unread." in the accessibility label, so it never relies on colour alone.
type Props = { actor: string; parts: Part[]; time: string; unread?: boolean; onPress: () => void };

export function NotificationItem({ actor, parts, time, unread = false, onPress }: Props) {
  const plain = parts.map((p) => p.text).join("");
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${unread ? "Unread. " : ""}${plain}, ${time}`} onPress={onPress} style={({ pressed }) => [s.row, pressed && s.pressed]}>
      <Avatar name={actor} size={40} />
      <View style={s.text}>
        <Text maxFontSizeMultiplier={1.4} style={s.line}>{parts.map((p, i) => <Text key={i} style={p.bold ? s.bold : undefined}>{p.text}</Text>)}</Text>
        {unread && <Badge label="New" variant="success" />}
      </View>
      <Text maxFontSizeMultiplier={1.4} style={s.time}>{time}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.s16, paddingVertical: space.s16, borderBottomWidth: 1, borderBottomColor: color.borderNeutral },
  pressed: { backgroundColor: color.neutralWash },
  text: { flex: 1, gap: space.s8, alignItems: "flex-start" },
  line: { ...type.fieldValue, color: color.charcoal },
  bold: { fontFamily: font.medium, color: color.obsidian },
  time: { ...type.fieldMessage, color: color.slate, fontVariant: ["tabular-nums"] },
});
