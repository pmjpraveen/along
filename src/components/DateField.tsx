import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Pressable } from "./Pressable";
import { formatDate } from "../domain/trip";
import { color, radius, space, type } from "../theme/tokens";
import { BottomSheet } from "./BottomSheet";
import { Calendar } from "./Calendar";

type Props = { label: string; value: string; onChange: (iso: string) => void; invalid?: boolean; min?: string };

// A field that opens the design system's calendar in a bottom sheet. Value is ISO (YYYY-MM-DD); it is shown as DD-MM-YYYY. Picking a day closes it.
export function DateField({ label, value, onChange, invalid, min }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={value ? `${label}, ${formatDate(value)}` : label} onPress={() => setOpen(true)}
        style={[s.box, invalid && s.invalid]}>
        <Text maxFontSizeMultiplier={1.4} style={[s.text, !value && s.placeholder]}>{value ? formatDate(value) : "DD-MM-YYYY"}</Text>
      </Pressable>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <Calendar value={value} min={min} onSelect={(iso) => { onChange(iso); setOpen(false); }} />
      </BottomSheet>
    </>
  );
}

const s = StyleSheet.create({
  box: { minHeight: 48, paddingHorizontal: space.s16, paddingVertical: 12, justifyContent: "center", borderRadius: radius.card, borderCurve: "continuous", borderWidth: 1, borderColor: color.inputBorder, backgroundColor: color.paper },
  invalid: { borderWidth: 3, borderColor: color.alarmRed, paddingHorizontal: 14, paddingVertical: 10 },
  text: { ...type.fieldValue, color: color.obsidian },
  placeholder: { color: color.pebble },
});
