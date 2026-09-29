import { Alert } from "../src/components/Alert";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createTrip, uploadCover } from "../src/api/trips";
import { Image as ImageIcon, X } from "lucide-react-native";
import { PrimaryButton } from "../src/components/Buttons";
import { FieldLabel, FieldMessage, TextField } from "../src/components/TextField";
import { DateRangeField } from "../src/components/DateRangeField";
import { toIso, TripDraft, TripErrors, validateTrip } from "../src/domain/trip";
import { color, radius, space, type } from "../src/theme/tokens";

// ponytail: INR only; add a currency picker when a story asks.
export default function CreateTrip() {
  const { bottom } = useSafeAreaInsets();
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
    const e = validateTrip(draft, toIso(new Date()));
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
    <View style={s.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={[s.content, { paddingTop: space.s20 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={space.s4} style={s.close}>
          <X size={22} color={color.forestInk} strokeWidth={2} />
        </Pressable>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={s.heading}>Start new trip</Text>

        {cover ? (
          // Once a photo is chosen the wide card gives way to a square thumbnail; tapping it picks a different photo.
          <Pressable accessibilityRole="button" accessibilityLabel="Change image" onPress={pickCover} style={s.thumb}>
            <Image accessibilityIgnoresInvertColors source={{ uri: cover.uri }} style={s.thumbImage} />
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Add image" onPress={pickCover} style={s.cover}>
            <View style={s.coverIcon}><ImageIcon size={24} color={color.forestInk} strokeWidth={1.75} /></View>
            <Text maxFontSizeMultiplier={1.3} style={s.coverText}>Add Image</Text>
          </Pressable>
        )}

        <TextField label="Trip name" placeholder="Trip name" value={draft.name} autoCapitalize="words" onChangeText={(v) => setDraft({ ...draft, name: v })}
          status={errors.name ? "error" : undefined} message={errors.name} />
        <TextField label="Location" placeholder="Add trip location" value={draft.destination} autoCapitalize="words" onChangeText={(v) => setDraft({ ...draft, destination: v })}
          status={errors.destination ? "error" : undefined} message={errors.destination} />
        <View style={s.field}>
          <FieldLabel>Duration</FieldLabel>
          <DateRangeField label="Duration" start={draft.start} end={draft.end} invalid={!!(errors.start || errors.end)}
            onChange={(r) => setDraft({ ...draft, start: r.start, end: r.end })} />
          {(errors.start || errors.end) && <FieldMessage status="error">{(errors.start ?? errors.end)!}</FieldMessage>}
        </View>
        {formError && <Alert variant="negative">{formError}</Alert>}
      </ScrollView>
      <View style={[s.footer, { paddingBottom: bottom + space.s12 }]}>
        <PrimaryButton label={busy ? "Creating…" : "Create trip"} onPress={submit} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, paddingBottom: space.s24, gap: space.s20 },
  close: { width: 44, height: 44, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.neutralWash, alignItems: "center", justifyContent: "center" },
  heading: { ...type.sheetTitle, color: color.obsidian, marginBottom: space.s4 },
  cover: { minHeight: 154, borderRadius: radius.tile, borderCurve: "continuous", backgroundColor: color.neutralWash, alignItems: "center", justifyContent: "center", gap: space.s12, overflow: "hidden" },
  thumb: { width: 104, height: 104, borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden", backgroundColor: color.neutralWash },
  thumbImage: { width: "100%", height: "100%" },
  coverIcon: { width: 56, height: 56, borderRadius: radius.input, borderCurve: "continuous", backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  coverText: { ...type.label, color: color.obsidian },
  field: { gap: space.s8 },
  footer: { paddingHorizontal: space.s20, paddingTop: space.s12, borderTopWidth: 1, borderTopColor: color.borderNeutral, backgroundColor: color.paper },
});
