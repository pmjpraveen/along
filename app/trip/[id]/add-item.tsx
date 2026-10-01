import { useLocalSearchParams, useRouter } from "expo-router";
import { toast } from "../../../src/stores/toast";
import { haptic } from "../../../src/haptics";
import { X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "../../../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createItem, loadItinerary } from "../../../src/api/itinerary";
import { resolveLocation, ResolvedLocation } from "../../../src/api/location";
import { Alert } from "../../../src/components/Alert";
import { Button } from "../../../src/components/Buttons";
import { MapPreview } from "../../../src/components/MapPreview";
import { PlaceSearchField } from "../../../src/components/PlaceSearchField";
import { Chip } from "../../../src/components/Chip";
import { FieldLabel, FieldMessage, TextField } from "../../../src/components/TextField";
import { TimeField } from "../../../src/components/TimeField";
import { tripDays, validateItem } from "../../../src/domain/itinerary";
import { short } from "../../../src/domain/trip";
import { color, font, radius, space, type } from "../../../src/theme/tokens";

// Plan details: pick the day, then name, location, time and an optional message. The day defaults to the one you came from (or the
// trip's first), so the common case is a name and Save. The kind of plan defaults to "activity".
export default function AddItem() {
  const { id, day } = useLocalSearchParams<{ id: string; day?: string }>();
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(day ?? "");
  const [days, setDays] = useState<string[]>([]);
  const [time, setTime] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ title?: string; day?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [location, setLocation] = useState("");
  const [resolved, setResolved] = useState<ResolvedLocation | null>(null);
  // Resolve when the field loses focus so the group sees the place before saving; save re-resolves if the text changed since.
  const resolve = async () => setResolved(location.trim() ? await resolveLocation(location) : null);

  // The trip's days become the chips (with any chosen day that lies outside them, so it is never lost).
  useEffect(() => {
    loadItinerary(id).then((r) => {
      if (!r.ok) return;
      const list = tripDays(r.trip.start_date, r.trip.end_date, [...r.items.map((i) => i.day_date), ...(day ? [day] : [])]);
      setDays(list);
      setDate((d) => d || list[0] || "");
    });
  }, [id, day]);
  const numbered = useMemo(() => days.map((d, n) => ({ d, n: n + 1 })), [days]);

  const save = async () => {
    if (busy) return;
    const e = validateItem({ title, day: date });
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length) return;
    setBusy(true);
    const loc = resolved?.text === location.trim() ? resolved : location.trim() ? await resolveLocation(location) : undefined;
    const r = await createItem({ tripId: id, title, type: "activity", day: date, startTime: time, participantIds: [], location: loc ?? undefined, description: message });
    setBusy(false);
    if (r.ok) { haptic.success(); toast("Plan added"); router.back(); }
    else setFormError(r.message);
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={space.s4} style={s.close}>
          <X size={22} color={color.iconInk} strokeWidth={2} />
        </Pressable>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={s.heading}>Plan details</Text>

        {numbered.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={s.chips} accessibilityRole="tablist" accessibilityLabel="Day">
            {numbered.map(({ d, n }) => {
              const on = d === date;
              return (
                <Chip key={d} role="tab" label={`${short(d)} - Day ${n}`} accessibilityLabel={`Day ${n}, ${short(d)}`} selected={on} onPress={() => { if (!on) haptic.select(); setDate(d); }} />
              );
            })}
          </ScrollView>
        )}
        {errors.day && <FieldMessage status="error">{errors.day}</FieldMessage>}

        <TextField label="Plan name" placeholder="e.g. Sunset at Baga Beach" value={title} onChangeText={setTitle} autoCapitalize="sentences"
          status={errors.title ? "error" : undefined} message={errors.title} />
        <View style={s.field}>
          <PlaceSearchField label="Location" placeholder="Search a place, or paste a Google or Apple Maps link" value={location} onChangeText={setLocation} onEndEditing={resolve}
            onPick={(p) => { setLocation(p.title); setResolved({ text: p.title, url: null, place: { lat: p.lat, lng: p.lng, name: p.title } }); }} />
          {resolved?.place && <MapPreview place={resolved.place} />}
        </View>
        <View style={s.field}>
          <FieldLabel>Time</FieldLabel>
          <TimeField label="Time" value={time} onChange={setTime} />
        </View>
        <TextField label="Message" placeholder="Notes for the group, e.g. Bring sunscreen" value={message} onChangeText={setMessage} multiline maxLength={500} autoCapitalize="sentences" style={{ minHeight: 140 }} />
        {formError && <Alert variant="negative">{formError}</Alert>}
      </ScrollView>
      <View style={[s.footer, { paddingBottom: bottom + space.s12 }]}>
        {/* Neutral until there is a name, then the one green action; pressing it early still explains what is missing. */}
        <Button label={busy ? "Saving…" : "Save Plan"} onPress={save} type={title.trim() ? "primary" : "secondaryNeutral"} size="large" />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, paddingTop: space.s20, paddingBottom: space.s24, gap: space.s20 },
  close: { width: 44, height: 44, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey, alignItems: "center", justifyContent: "center" },
  heading: { ...type.sheetTitle, color: color.obsidian },
  chipScroll: { flexGrow: 0 },
  chips: { gap: space.s8 },
  field: { gap: space.s8 },
  footer: { paddingHorizontal: space.s20, paddingTop: space.s12, borderTopWidth: 1, borderTopColor: color.borderNeutral, backgroundColor: color.paper },
});
