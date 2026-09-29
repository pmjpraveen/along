import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createTrip } from "../src/api/trips";
import { PrimaryButton } from "../src/components/Buttons";
import { DateField } from "../src/components/DateField";
import { TripDraft, TripErrors, validateTrip } from "../src/domain/trip";
import { color, radius, space, type } from "../src/theme/tokens";

const FIELDS: { key: keyof TripDraft; label: string; placeholder: string }[] = [
  { key: "name", label: "Trip name", placeholder: "Goa with the gang" },
  { key: "destination", label: "Destination", placeholder: "Goa, India" },
  { key: "start", label: "Start date", placeholder: "" },
  { key: "end", label: "End date", placeholder: "" },
];

// ponytail: INR only; add a currency picker when a story asks.
export default function CreateTrip() {
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const key = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`).current;
  const [draft, setDraft] = useState<TripDraft>({ name: "", destination: "", start: "", end: "" });
  const [errors, setErrors] = useState<TripErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    const e = validateTrip(draft);
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length) return;
    setBusy(true);
    const r = await createTrip(draft, "INR", key);
    setBusy(false);
    if (r.ok) router.replace({ pathname: "/trip/[id]/people", params: { id: r.tripId } });
    else setFormError(r.message);
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>New trip</Text>
        {FIELDS.map((f) => (
          <View key={f.key} style={s.field}>
            <Text maxFontSizeMultiplier={1.4} style={s.label}>{f.label}</Text>
            {f.key === "start" || f.key === "end" ? (
              <DateField label={f.label} value={draft[f.key]} invalid={!!errors[f.key]}
                minimumDate={f.key === "end" && draft.start ? new Date(`${draft.start}T12:00:00`) : undefined}
                onChange={(iso) => setDraft({ ...draft, [f.key]: iso })} />
            ) : (
              <TextInput accessibilityLabel={f.label} placeholder={f.placeholder} placeholderTextColor={color.slate}
                value={draft[f.key]} onChangeText={(v) => setDraft({ ...draft, [f.key]: v })} autoCapitalize="words"
                style={[s.input, errors[f.key] ? s.inputError : null]} />
            )}
            {errors[f.key] && <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {errors[f.key]}</Text>}
          </View>
        ))}
        {formError && <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {formError}</Text>}
        <PrimaryButton label={busy ? "Creating…" : "Create trip"} onPress={submit} />
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
  error: { ...type.label, color: color.alarmRed },
});
