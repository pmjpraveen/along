import { Alert } from "../src/components/Alert";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createTrip, uploadCover } from "../src/api/trips";
import { PrimaryButton, TextButton } from "../src/components/Buttons";
import { FieldLabel, FieldMessage, TextField } from "../src/components/TextField";
import { TripCover } from "../src/components/TripCover";
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
  const [cover, setCover] = useState<{ uri: string; mime: string } | null>(null);
  const pickCover = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true, aspect: [16, 9] });
    if (!res.canceled && res.assets[0]) setCover({ uri: res.assets[0].uri, mime: res.assets[0].mimeType ?? "image/jpeg" });
  };

  const submit = async () => {
    if (busy) return;
    const e = validateTrip(draft);
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length) return;
    setBusy(true);
    const r = await createTrip(draft, "INR", key);
    // The cover is optional and uploaded once the trip exists (its folder is the trip id). If it fails the trip is still made,
    // and the owner can add a cover from the trip later.
    if (r.ok && cover) await uploadCover(r.tripId, cover.uri, cover.mime);
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
            {f.key === "start" || f.key === "end" ? (
              <>
                <FieldLabel>{f.label}</FieldLabel>
                <DateField label={f.label} value={draft[f.key]} invalid={!!errors[f.key]}
                  min={f.key === "end" && draft.start ? draft.start : undefined}
                  onChange={(iso) => setDraft({ ...draft, [f.key]: iso })} />
                {errors[f.key] && <FieldMessage status="error">{errors[f.key]!}</FieldMessage>}
              </>
            ) : (
              <TextField label={f.label} placeholder={f.placeholder} value={draft[f.key]} autoCapitalize="words"
                onChangeText={(v) => setDraft({ ...draft, [f.key]: v })}
                status={errors[f.key] ? "error" : undefined} message={errors[f.key]} />
            )}
          </View>
        ))}
        <View style={s.field}>
          <FieldLabel>Cover photo (optional)</FieldLabel>
          {cover && <TripCover uri={cover.uri} destination={draft.destination || "Your trip"} />}
          <TextButton label={cover ? "Choose a different photo" : "Add a cover photo"} onPress={pickCover} />
        </View>
        {formError && <Alert variant="negative">{formError}</Alert>}
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
  input: { minHeight: 48, paddingHorizontal: space.s16, borderRadius: radius.input, borderCurve: "continuous", borderWidth: 1.5, borderColor: color.borderNeutral, ...type.body, color: color.obsidian },
  inputError: { borderColor: color.alarmRed },
  error: { ...type.label, color: color.alarmRed },
});
