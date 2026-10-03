import { StyleSheet, Text, View } from "react-native";
import { haptic } from "../haptics";
import { Pressable } from "./Pressable";
import { color, font, radius, space, type } from "../theme/tokens";

// Figma "Segmented control": 2-3 alike options in a Neutral Wash pill; the selected one is a white pill with medium-weight text.
// Selection is also carried by weight and the selected state, not by fill alone.
type Props<T extends string> = { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; accessibilityLabel: string };

export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={s.track}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => on || (haptic.select(), onChange(o.value))}
            style={[s.item, on && s.on]}>
            <Text maxFontSizeMultiplier={1.3} style={[s.label, { fontFamily: on ? font.medium : font.regular }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  track: { flexDirection: "row", padding: space.s4, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.neutralWash },
  item: { flex: 1, minHeight: 44, paddingHorizontal: space.s16, borderRadius: radius.pill, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  on: { backgroundColor: color.paper },
  label: { ...type.fieldValue, color: color.forestInk },
});
