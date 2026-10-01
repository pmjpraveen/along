import { ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Pressable } from "./Pressable";
import { Range } from "../domain/calendar";
import { formatDate, toIso } from "../domain/trip";
import { color, radius, space, type } from "../theme/tokens";
import { BottomSheet } from "./BottomSheet";
import { RangeCalendar } from "./Calendar";

type Props = { label: string; start: string; end: string; onChange: (r: Range) => void; invalid?: boolean; today?: string };

// A field showing a date range ("25-09-2026 → 02-10-2026") that opens the range calendar in a bottom sheet. Values are ISO. The range
// is only committed with Confirm, and Confirm waits for both a first and a last day. Days before `today` cannot be chosen.
export function DateRangeField({ label, start, end, onChange, invalid, today = toIso(new Date()) }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Range>({ start, end });
  const has = !!start && !!end;
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={has ? `${label}, ${formatDate(start)} to ${formatDate(end)}` : label}
        onPress={() => { setDraft({ start, end }); setOpen(true); }} style={[s.box, invalid && s.invalid]}>
        <Text maxFontSizeMultiplier={1.4} style={[s.text, !has && s.placeholder]}>{has ? `${formatDate(start)} → ${formatDate(end)}` : "Select date"}</Text>
        <ChevronRight size={20} color={color.brandBlack} strokeWidth={2} />
      </Pressable>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label} actionLabel="Confirm" actionType="secondaryNeutral" actionDisabled={!draft.end}
        onAction={() => { onChange(draft); setOpen(false); }}>
        <RangeCalendar value={draft} onChange={setDraft} min={today} />
      </BottomSheet>
    </>
  );
}

const s = StyleSheet.create({
  box: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.s8, paddingHorizontal: space.s16, paddingVertical: 12, borderRadius: radius.card, borderCurve: "continuous", borderWidth: 1, borderColor: color.inputBorder, backgroundColor: color.paper },
  invalid: { borderWidth: 3, borderColor: color.alarmRed, paddingHorizontal: 14, paddingVertical: 10 },
  text: { ...type.fieldValue, flex: 1, color: color.obsidian },
  placeholder: { color: color.pebble },
});
