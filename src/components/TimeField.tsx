import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Pressable } from "./Pressable";
import { BottomSheet } from "./BottomSheet";
import { TextButton } from "./Buttons";
import { color, radius, space, type } from "../theme/tokens";

type Props = { label: string; value: string | null; onChange: (hhmm: string | null) => void };

const toHhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const toDate = (hhmm: string) => { const d = new Date(); const [h, m] = hhmm.split(":").map(Number); d.setHours(h, m, 0, 0); return d; };

// An optional time. The field shows the time (or "Start time (optional)") and opens a bottom sheet with a wheel to choose it, a Confirm button
// to set it and, once a time is set, a way to take it away again. Null means "no time", which is a valid plan.
export function TimeField({ label, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => new Date());
  const show = () => { setDraft(value ? toDate(value) : new Date()); setOpen(true); };
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={value ? `${label}, ${value}` : label} onPress={show} style={s.box}>
        <Text maxFontSizeMultiplier={1.4} style={[s.text, !value && s.placeholder]}>{value ?? "Start time (optional)"}</Text>
      </Pressable>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label} actionLabel="Confirm" onAction={() => { onChange(toHhmm(draft)); setOpen(false); }}>
        <View style={s.wheel}>
          <DateTimePicker value={draft} mode="time" display="spinner" themeVariant="light" textColor={color.obsidian} accessibilityLabel={`${label} wheel`} onChange={(_, d) => { if (d) setDraft(d); }} />
        </View>
        {value ? <TextButton label="Remove time" onPress={() => { onChange(null); setOpen(false); }} /> : null}
      </BottomSheet>
    </>
  );
}

const s = StyleSheet.create({
  box: { minHeight: 48, paddingHorizontal: space.s16, paddingVertical: 12, justifyContent: "center", borderRadius: radius.card, borderCurve: "continuous", borderWidth: 1, borderColor: color.inputBorder, backgroundColor: color.paper },
  text: { ...type.fieldValue, color: color.obsidian },
  placeholder: { color: color.pebble },
  wheel: { alignItems: "center" },
});
