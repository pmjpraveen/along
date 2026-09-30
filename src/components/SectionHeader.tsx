import { StyleSheet, Text, View } from "react-native";
import { Pressable } from "./Pressable";
import { color, space, type } from "../theme/tokens";

// Figma "Section header": `section` is a large title with an optional underlined link on the right ("See all");
// `group` is a small charcoal label over a hairline that names a group of rows ("General").
type Props = { title: string; kind?: "section" | "group"; actionLabel?: string; onAction?: () => void };

export function SectionHeader({ title, kind = "section", actionLabel, onAction }: Props) {
  if (kind === "group") return <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.group}>{title}</Text>;
  return (
    <View style={s.row}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.title}>{title}</Text>
      {actionLabel && onAction && (
        <Pressable accessibilityRole="link" accessibilityLabel={`${actionLabel}, ${title}`} onPress={onAction} hitSlop={space.s12} style={s.link}>
          <Text maxFontSizeMultiplier={1.4} style={s.linkText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.s12, marginTop: space.s8 },
  title: { ...type.sheetTitle, flex: 1, fontSize: 24, lineHeight: 30, letterSpacing: -0.4, color: color.obsidian },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: { ...type.label, color: color.forestInk, textDecorationLine: "underline" },
  group: { ...type.label, color: color.charcoal, paddingVertical: space.s8, borderBottomWidth: 1, borderBottomColor: color.borderNeutral },
});
