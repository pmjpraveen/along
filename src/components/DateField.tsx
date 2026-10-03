import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Pressable } from "./Pressable";
import { formatDate } from "../domain/trip";
import { color, radius, space, type, track } from "../theme/tokens";
import { BottomSheet } from "./BottomSheet";
import { Calendar } from "./Calendar";

type Props = { label: string; value: string; onChange: (iso: string) => void; invalid?: boolean; min?: string; max?: string; compact?: boolean; dark?: boolean };

// A field that opens the design system's calendar in a bottom sheet. Value is ISO (YYYY-MM-DD); it is shown as DD-MM-YYYY. Picking a day closes it. `compact` makes it a small box for tight spots, and `dark` turns it into a black pill with a white date.
export function DateField({ label, value, onChange, invalid, min, max, compact, dark }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={value ? `${label}, ${formatDate(value)}` : label} onPress={() => setOpen(true)}
        style={[s.box, compact && s.boxCompact, dark && s.boxDark, invalid && s.invalid]}>
        <Text maxFontSizeMultiplier={1.4} style={[s.text, compact && s.textCompact, dark && s.textDark, !value && s.placeholder]}>{value ? formatDate(value) : "Select date"}</Text>
      </Pressable>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <Calendar value={value} min={min} max={max} onSelect={(iso) => { onChange(iso); setOpen(false); }} />
      </BottomSheet>
    </>
  );
}

const s = StyleSheet.create({
  box: { minHeight: 48, paddingHorizontal: space.s16, paddingVertical: 12, justifyContent: "center", borderRadius: radius.card, borderCurve: "continuous", borderWidth: 1, borderColor: color.inputBorder, backgroundColor: color.paper },
  boxCompact: { minHeight: 40, paddingHorizontal: space.s12, paddingVertical: space.s8 },   // hugs its date instead of filling the width
  boxDark: { backgroundColor: color.brandBlack, borderColor: color.brandBlack, borderRadius: radius.pill },   // a dark pill with a white date
  textDark: { color: color.paper },
  textCompact: { fontSize: 14, letterSpacing: track(14), lineHeight: 20 },
  invalid: { borderWidth: 3, borderColor: color.alarmRed, paddingHorizontal: 14, paddingVertical: 10 },
  text: { ...type.fieldValue, color: color.obsidian },
  placeholder: { color: color.pebble },
});
