import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { addMonths, dayLabel, isoOf, monthGrid, monthTitle, parseIso, WEEKDAYS, Ym } from "../domain/calendar";
import { color, radius, shadow, space, type } from "../theme/tokens";

type Props = {
  value: string;                      // selected ISO date, or "" for none
  onSelect: (iso: string) => void;
  min?: string;                       // earliest selectable ISO date
  max?: string;                       // latest selectable ISO date
};

// The design system's date picker: a white card (radius 10, soft shadow) with month arrows, a Mon-Sun week row, and 36pt
// circular days. Weekdays are semibold Obsidian, weekends regular Charcoal, and the selected day is Forest Ink with a
// Bright Green number. Days outside min/max are dimmed and cannot be chosen.
export function Calendar({ value, onSelect, min, max }: Props) {
  const selected = parseIso(value);
  const start = selected ?? parseIso(min ?? "") ?? { year: new Date().getFullYear(), month: new Date().getMonth(), day: 1 };
  const [shown, setShown] = useState<Ym>({ year: start.year, month: start.month });
  const grid = monthGrid(shown);
  const move = (delta: number) => setShown((s) => addMonths(s, delta));

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => move(-1)} hitSlop={8} style={s.arrow}>
          <ChevronLeft size={22} color={color.forestInk} strokeWidth={2.5} />
        </Pressable>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.title}>{monthTitle(shown)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => move(1)} hitSlop={8} style={s.arrow}>
          <ChevronRight size={22} color={color.forestInk} strokeWidth={2.5} />
        </Pressable>
      </View>

      <View style={s.row}>
        {WEEKDAYS.map((d, i) => (
          <View key={d} style={s.cell} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Text maxFontSizeMultiplier={1.2} style={i >= 5 ? s.weekend : s.weekday}>{d}</Text>
          </View>
        ))}
      </View>

      {grid.map((week, r) => (
        <View key={r} style={s.row}>
          {week.map((day, c) => {
            if (day === null) return <View key={c} style={s.cell} />;
            const iso = isoOf(shown.year, shown.month, day);
            const on = iso === value;
            const blocked = (!!min && iso < min) || (!!max && iso > max);
            return (
              <Pressable key={c} accessibilityRole="button" accessibilityLabel={dayLabel(shown.year, shown.month, day)}
                accessibilityState={{ selected: on, disabled: blocked }} disabled={blocked} onPress={() => onSelect(iso)}
                hitSlop={{ top: 3, bottom: 3, left: 4, right: 4 }} style={[s.cell, on && s.selected, blocked && s.blocked]}>
                <Text maxFontSizeMultiplier={1.2} style={[c >= 5 ? s.weekend : s.weekday, on && s.selectedText]}>{day}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: color.paper, borderRadius: radius.small, borderCurve: "continuous", paddingVertical: space.s16, ...shadow.itemLight },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.s16, minHeight: 56 },
  title: { ...type.buttonLarge, color: color.obsidian },
  arrow: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: space.s24, paddingVertical: 3 },
  cell: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: radius.xLarge , borderCurve: "continuous"},
  weekday: { ...type.buttonLarge, color: color.obsidian, fontVariant: ["tabular-nums"] },
  weekend: { ...type.body, fontSize: 16, lineHeight: 24, letterSpacing: -0.08, color: color.charcoal, fontVariant: ["tabular-nums"] },
  selected: { backgroundColor: color.forestInk },
  selectedText: { color: color.brightGreen },
  blocked: { opacity: 0.3 },
});
