import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { formatDate, toIso } from "../domain/trip";
import { color, radius, space, type } from "../theme/tokens";

type Props = { label: string; value: string; onChange: (iso: string) => void; invalid?: boolean; minimumDate?: Date };

// Native picker: a compact inline control on iOS, the system dialog on Android. Value is ISO, display is DD-MM-YYYY.
export function DateField({ label, value, onChange, invalid, minimumDate }: Props) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  const picker = (
    <DateTimePicker value={date} mode="date" display={Platform.OS === "ios" ? "compact" : "default"}
      minimumDate={minimumDate} accessibilityLabel={label}
      onChange={(_, d) => { setOpen(false); if (d) onChange(toIso(d)); }} />
  );

  if (Platform.OS === "ios") {
    return (
      <View style={[s.box, s.row, invalid && s.invalid]}>
        <Text maxFontSizeMultiplier={1.4} style={[s.text, !value && s.placeholder]}>{value ? formatDate(value) : "DD-MM-YYYY"}</Text>
        {picker}
      </View>
    );
  }
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setOpen(true)} style={[s.box, invalid && s.invalid]}>
        <Text maxFontSizeMultiplier={1.4} style={[s.text, !value && s.placeholder]}>{value ? formatDate(value) : "DD-MM-YYYY"}</Text>
      </Pressable>
      {open && picker}
    </>
  );
}

const s = StyleSheet.create({
  box: { minHeight: 48, paddingHorizontal: space.s16, justifyContent: "center", borderRadius: radius.input, borderWidth: 1.5, borderColor: color.fog },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  invalid: { borderColor: color.alarmRed },
  text: { ...type.body, color: color.obsidian },
  placeholder: { color: color.slate },
});
