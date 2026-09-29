import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createItem } from "../../../src/api/itinerary";
import { resolveLocation, ResolvedLocation } from "../../../src/api/location";
import { listMembers, Member } from "../../../src/api/members";
import { MapPreview } from "../../../src/components/MapPreview";
import { ParticipantPicker } from "../../../src/components/ParticipantPicker";
import { PrimaryButton } from "../../../src/components/Buttons";
import { DateField } from "../../../src/components/DateField";
import { TimeField } from "../../../src/components/TimeField";
import { ITEM_TYPES, ItemType, TYPE_LABEL, validateItem } from "../../../src/domain/itinerary";
import { color, radius, space, type } from "../../../src/theme/tokens";

// The date defaults to the day the user came from (or the trip start), so the common case is title + Save.
export default function AddItem() {
  const { id, day } = useLocalSearchParams<{ id: string; day?: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(day ?? "");
  const [kind, setKind] = useState<ItemType>("activity");
  const [time, setTime] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ title?: string; day?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [location, setLocation] = useState("");
  const [resolved, setResolved] = useState<ResolvedLocation | null>(null);
  // Resolve when the field loses focus so the group sees the place before saving; save re-resolves if the text changed since.
  const resolve = async () => setResolved(location.trim() ? await resolveLocation(location) : null);
  const [members, setMembers] = useState<Member[]>([]);
  const [going, setGoing] = useState<string[]>([]);
  useEffect(() => { listMembers(id).then((r) => r.ok && setMembers(r.members)); }, [id]);

  const save = async () => {
    if (busy) return;
    const e = validateItem({ title, day: date });
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length) return;
    setBusy(true);
    const loc = resolved?.text === location.trim() ? resolved : location.trim() ? await resolveLocation(location) : undefined;
    const r = await createItem({ tripId: id, title, type: kind, day: date, startTime: time, participantIds: going, location: loc ?? undefined });
    setBusy(false);
    if (r.ok) router.back();
    else setFormError(r.message);
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Add to itinerary</Text>
        <View style={s.field}>
          <Text maxFontSizeMultiplier={1.4} style={s.label}>Title</Text>
          <TextInput accessibilityLabel="Title" placeholder="Beach day" placeholderTextColor={color.slate} value={title}
            onChangeText={setTitle} autoCapitalize="sentences" style={[s.input, errors.title ? s.inputError : null]} />
          {errors.title && <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {errors.title}</Text>}
        </View>
        <View style={s.field}>
          <Text maxFontSizeMultiplier={1.4} style={s.label}>Date</Text>
          <DateField label="Date" value={date} invalid={!!errors.day} onChange={setDate} />
          {errors.day && <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {errors.day}</Text>}
        </View>
        <View style={s.field}>
          <Text maxFontSizeMultiplier={1.4} style={s.label}>Time</Text>
          <TimeField label="Time" value={time} onChange={setTime} />
        </View>
        <View style={s.field}>
          <Text maxFontSizeMultiplier={1.4} style={s.label}>Type</Text>
          <View style={s.chips}>
            {ITEM_TYPES.map((t) => (
              <Pressable key={t} accessibilityRole="radio" accessibilityLabel={TYPE_LABEL[t]} accessibilityState={{ selected: kind === t }}
                onPress={() => setKind(t)} style={[s.chip, kind === t && s.chipOn]}>
                <Text maxFontSizeMultiplier={1.3} style={s.chipText}>{TYPE_LABEL[t]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={s.field}>
          <Text maxFontSizeMultiplier={1.4} style={s.label}>Location</Text>
          <TextInput accessibilityLabel="Location" placeholder="Type a place or paste a Google Maps link" placeholderTextColor={color.slate}
            value={location} onChangeText={setLocation} onEndEditing={resolve} autoCapitalize="none" style={s.input} />
          {resolved?.place && <MapPreview place={resolved.place} />}
        </View>
        {members.length > 0 && (
          <View style={s.field}>
            <Text maxFontSizeMultiplier={1.4} style={s.label}>Who's joining?</Text>
            <ParticipantPicker members={members} selected={going} onChange={setGoing} />
          </View>
        )}
        {formError && <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {formError}</Text>}
        <PrimaryButton label={busy ? "Saving…" : "Save"} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  heading: { ...type.display, fontSize: 40, lineHeight: 40, letterSpacing: -1.4, color: color.obsidian },
  field: { gap: space.s8 },
  label: { ...type.label, color: color.charcoal },
  input: { minHeight: 48, paddingHorizontal: space.s16, borderRadius: radius.input, borderWidth: 1.5, borderColor: color.fog, ...type.body, color: color.obsidian },
  inputError: { borderColor: color.alarmRed },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.s8 },
  chip: { minHeight: 48, paddingHorizontal: space.s16, justifyContent: "center", borderRadius: radius.pill, borderWidth: 1.5, borderColor: color.fog },
  chipOn: { borderColor: color.forestInk, backgroundColor: color.daylight },
  chipText: { ...type.label, color: color.forestInk },
  error: { ...type.label, color: color.alarmRed },
});
