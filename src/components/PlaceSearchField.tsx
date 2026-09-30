import { MapPin } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { FoundPlace } from "../domain/places";
import { usePlaceSearch } from "../hooks/usePlaceSearch";
import { color, radius, space, type } from "../theme/tokens";
import { FieldMessage, TextField } from "./TextField";

type Props = {
  label: string; placeholder: string; value: string; onChangeText: (t: string) => void;
  onPick: (p: FoundPlace) => void; onEndEditing?: () => void; message?: string; status?: "error"; autoCapitalize?: "none" | "words";
};

// A location field that suggests places as you type (OpenStreetMap search) in a list under the field. Choosing one fills the field and
// hands the place, with its coordinates, to the screen. Typing freely still works: search never blocks saving, and a pasted map link is
// read by the screen, not searched.
export function PlaceSearchField({ label, placeholder, value, onChangeText, onPick, onEndEditing, message, status, autoCapitalize = "none" }: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  const searching = chosen !== value;   // once a place is chosen, stop searching until the text is edited again
  const { places, busy, error } = usePlaceSearch(value, searching);
  const pick = (p: FoundPlace) => { setChosen(p.title); onPick(p); };
  return (
    <View style={s.wrap}>
      <TextField label={label} placeholder={placeholder} value={value} onChangeText={onChangeText} onEndEditing={onEndEditing}
        autoCapitalize={autoCapitalize} autoCorrect={false} status={status} message={message} />
      {searching && busy && <ActivityIndicator accessibilityLabel="Searching places" color={color.forestInk} style={s.busy} />}
      {searching && error && <FieldMessage status="warning">{error}</FieldMessage>}
      {searching && places.length > 0 && (
        <View accessibilityLabel="Place suggestions" style={s.list}>
          {places.map((p, i) => (
            <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`${p.title}, ${p.subtitle}`} onPress={() => pick(p)}
              style={({ pressed }) => [s.row, i > 0 && s.rule, pressed && s.pressed]}>
              <MapPin size={18} color={color.slate} strokeWidth={1.75} />
              <View style={s.text}>
                <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={s.title}>{p.title}</Text>
                {!!p.subtitle && <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={s.sub}>{p.subtitle}</Text>}
              </View>
            </Pressable>
          ))}
          <Text maxFontSizeMultiplier={1.3} style={s.credit}>Search by OpenStreetMap</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: space.s8 },
  busy: { alignSelf: "flex-start" },
  list: { borderRadius: radius.card, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: space.s12, minHeight: 56, paddingHorizontal: space.s16, paddingVertical: space.s8 },
  rule: { borderTopWidth: 1, borderTopColor: color.borderNeutral },
  pressed: { backgroundColor: color.neutralWash },
  text: { flex: 1 },
  title: { ...type.label, color: color.obsidian },
  sub: { ...type.fieldMessage, color: color.slate },
  credit: { ...type.fieldMessage, fontSize: 11, lineHeight: 16, textAlign: "right", color: color.slate, paddingHorizontal: space.s12, paddingBottom: space.s8 },
});
