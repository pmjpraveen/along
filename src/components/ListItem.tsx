import { ReactNode } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Pressable } from "./Pressable";
import { Check, ChevronRight, Pencil } from "lucide-react-native";
import { color, radius, space, type } from "../theme/tokens";
import { Button } from "./Buttons";

// Figma "List item": leading visual (an Avatar), title and subtitle, and one trailing control.
// `none` is display only. `button` puts a small secondary button on the right (the row itself is not tappable).
// `chevron` and `edit` make the whole row a button; `checkbox`, `radio` and `switch` make it a control that reports `checked`.
// `inactive` is the dashed "connect" prompt; `disabled` greys the text.
export type ListItemTrailing = "none" | "chevron" | "edit" | "checkbox" | "radio" | "switch" | "button";
type Props = {
  title: string; subtitle?: string; overline?: string; leading?: ReactNode; trailing?: ListItemTrailing; buttonLabel?: string;
  checked?: boolean; onPress?: () => void; inactive?: boolean; disabled?: boolean; value?: string; message?: string; destructive?: boolean;
};

export function ListItem({ title, subtitle, overline, leading, trailing = "none", buttonLabel, checked = false, onPress, inactive, disabled, value, message, destructive }: Props) {
  const body = (
    <>
      {leading}
      <View style={s.text}>
        {overline ? <Text maxFontSizeMultiplier={1.4} style={s.overline}>{overline}</Text> : null}
        <Text maxFontSizeMultiplier={1.4} style={[s.title, disabled && s.muted, destructive && s.destructive]}>{title}</Text>
        {subtitle ? <Text maxFontSizeMultiplier={1.4} style={s.subtitle}>{subtitle}</Text> : null}
        {message ? <Text maxFontSizeMultiplier={1.4} style={s.message}>{message}</Text> : null}
      </View>
      {value ? <Text maxFontSizeMultiplier={1.4} style={[s.title, disabled && s.muted]}>{value}</Text> : null}
      {trailing === "chevron" && <ChevronRight size={20} color={color.brandBlack} strokeWidth={2} />}
      {trailing === "edit" && <Pencil size={18} color={color.forestInk} strokeWidth={2} />}
      {trailing === "checkbox" && <View style={[s.box, checked && s.on]}>{checked && <Check size={14} color={color.paper} strokeWidth={3} />}</View>}
      {trailing === "radio" && <View style={[s.radio, checked && s.on]}>{checked && <View style={s.dot} />}</View>}
    </>
  );
  const shell = [s.row, inactive && s.inactive];
  if (trailing === "switch")
    return <View style={shell}>{body}<Switch accessibilityLabel={title} value={checked} onValueChange={() => onPress?.()} trackColor={{ true: color.brandBlack, false: color.inputBorder }} thumbColor={color.paper} ios_backgroundColor={color.inputBorder} /></View>;
  if (trailing === "button")
    return <View accessible style={shell}>{body}<Button label={buttonLabel ?? "Change"} type="secondary" size="small" onPress={onPress ?? (() => {})} /></View>;
  if (trailing === "none" || !onPress) return <View accessible style={shell}>{body}</View>;
  const role = trailing === "checkbox" ? "checkbox" : trailing === "radio" ? "radio" : "button";
  return (
    <Pressable accessibilityRole={role} accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title} accessibilityState={{ checked, disabled: !!disabled }}
      dip={false} disabled={disabled} onPress={onPress} style={({ pressed, hovered }) => [shell, hovered && s.hovered, pressed && s.pressed]}>{body}</Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.s16, minHeight: 48, padding: space.s16, backgroundColor: color.paper },
  inactive: { backgroundColor: color.neutralWash, borderRadius: radius.card, borderCurve: "continuous", borderWidth: 1, borderStyle: "dashed", borderColor: color.borderNeutral },
  hovered: { backgroundColor: color.softGrey },
  pressed: { backgroundColor: "#ececec" },
  text: { flex: 1 },
  overline: { ...type.fieldMessage, color: color.charcoal },
  title: { ...type.label, color: color.obsidian },
  subtitle: { ...type.fieldMessage, color: color.charcoal },
  message: { ...type.fieldMessage, color: color.alarmRed },
  muted: { color: color.slate },
  destructive: { color: color.alarmRed },
  box: { width: 24, height: 24, borderRadius: 6, borderCurve: "continuous", borderWidth: 1.5, borderColor: color.slate, alignItems: "center", justifyContent: "center" },
  radio: { width: 24, height: 24, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1.5, borderColor: color.slate, alignItems: "center", justifyContent: "center" },
  on: { borderColor: color.brandBlack, backgroundColor: color.brandBlack },   // chosen: black fill with a white tick or dot
  dot: { width: 10, height: 10, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.paper },
});
