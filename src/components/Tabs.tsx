import { Pressable, StyleSheet, Text, View } from "react-native";
import { color, font, space, type } from "../theme/tokens";

// Figma "Tab": underlined text tabs that organise one screen into sections. Selected: Forest Ink medium text with a 2px
// Forest Ink underline; unselected: regular Slate text over a hairline. (For choosing between options, use SegmentedControl.)
type Props<T extends string> = { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void; accessibilityLabel: string };

export function Tabs<T extends string>({ tabs, value, onChange, accessibilityLabel }: Props<T>) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={s.bar}>
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <Pressable key={t.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => on || onChange(t.value)} style={[s.tab, on && s.on]}>
            <Text maxFontSizeMultiplier={1.3} style={[s.label, on ? s.labelOn : s.labelOff]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: "row", gap: space.s8, borderBottomWidth: 1, borderBottomColor: color.borderNeutral },
  tab: { minHeight: 44, paddingHorizontal: space.s8, justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent", marginBottom: -1 },
  on: { borderBottomColor: color.forestInk },
  label: { ...type.fieldValue },
  labelOn: { fontFamily: font.medium, color: color.forestInk },
  labelOff: { color: color.slate },
});
