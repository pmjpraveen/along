import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { color, radius, space, type } from "../theme/tokens";

type Props = { label: string; value: string | null; onChange: (hhmm: string | null) => void };

const toHhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const toDate = (hhmm: string) => { const d = new Date(); const [h, m] = hhmm.split(":").map(Number); d.setHours(h, m, 0, 0); return d; };

// Optional native time picker. Null means "no time", which is a valid item.
export function TimeField({ label, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const picker = (
    <DateTimePicker value={value ? toDate(value) : new Date()} mode="time" display={Platform.OS === "ios" ? "compact" : "default"}
      accessibilityLabel={label} onChange={(_, d) => { setOpen(false); if (d) onChange(toHhmm(d)); }} />
  );
  return (
    <View style={s.row}>
      {value ? (
        <>
          {Platform.OS === "ios" ? picker : (
            <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setOpen(true)} style={s.box}>
              <Text maxFontSizeMultiplier={1.4} style={s.text}>{value}</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" accessibilityLabel="Remove time" hitSlop={space.s12} onPress={() => onChange(null)} style={s.clear}>
            <Text maxFontSizeMultiplier={1.4} style={s.text}>Remove</Text>
          </Pressable>
        </>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => onChange(toHhmm(new Date()))} style={s.box}>
          <Text maxFontSizeMultiplier={1.4} style={[s.text, s.placeholder]}>Add a time (optional)</Text>
        </Pressable>
      )}
      {open && Platform.OS !== "ios" && picker}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.s12 },
  box: { minHeight: 48, paddingHorizontal: space.s16, justifyContent: "center", borderRadius: radius.small, borderWidth: 1, borderColor: color.pebble, backgroundColor: color.paper },
  clear: { minHeight: 48, justifyContent: "center" },
  text: { ...type.body, color: color.obsidian },
  placeholder: { color: color.pebble },
});
