import { useLocalSearchParams, useRouter } from "expo-router";
import { toast } from "../../../src/stores/toast";
import { haptic } from "../../../src/haptics";
import { Mic, Square, X } from "../../../src/icons";
import { useDictation } from "../../../src/hooks/useDictation";
import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "../../../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createItem, loadItinerary, updateItem } from "../../../src/api/itinerary";
import { resolveLocation, ResolvedLocation } from "../../../src/api/location";
import { Alert } from "../../../src/components/Alert";
import { Button } from "../../../src/components/Buttons";
import { MapPreview } from "../../../src/components/MapPreview";
import { PlaceSearchField } from "../../../src/components/PlaceSearchField";
import { Skeleton } from "../../../src/components/Skeleton";
import { Chip } from "../../../src/components/Chip";
import { FieldLabel, FieldMessage, TextField } from "../../../src/components/TextField";
import { TimeField } from "../../../src/components/TimeField";
import { tripDays, validateItem } from "../../../src/domain/itinerary";
import { short } from "../../../src/domain/trip";
import { color, font, radius, space, type } from "../../../src/theme/tokens";

// Plan details (also the edit form when opened with an itemId): pick the day, then name, location, time and an optional message. The day defaults to the one you came from (or the
// trip's first), so the common case is a name and Save. The kind of plan defaults to "activity".
export default function AddItem() {
  const { id, day, itemId } = useLocalSearchParams<{ id: string; day?: string; itemId?: string }>();
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(day ?? "");
  const [days, setDays] = useState<string[]>([]);
  const [time, setTime] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const dictation = useDictation(message, (t) => setMessage(t.slice(0, 500)));
  const [errors, setErrors] = useState<{ title?: string; day?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);   // the version of the plan being edited, sent back so a concurrent change is not overwritten
  const [missing, setMissing] = useState(false);
  const [location, setLocation] = useState("");
  const [resolved, setResolved] = useState<ResolvedLocation | null>(null);
  // Resolve when the field loses focus so the group sees the place before saving; save re-resolves if the text changed since.
  // Picking a suggestion also ends editing, so the field's own blur-resolve runs right after the pick. Plain text has no coordinates, so its result
  // must never replace a place that was just picked (that made the map snippet vanish), and a result for text that has since changed is dropped.
  const picked = useRef<{ text: string; lat: number; lng: number } | null>(null);   // the place chosen from the suggestions, kept apart from the blur-resolve
  const latest = useRef(location);
  latest.current = location;
  const resolve = async () => {
    const text = location.trim();
    if (!text) return setResolved(null);
    const r = await resolveLocation(text);
    if (latest.current.trim() !== text) return;
    setResolved((prev) => (prev?.place && prev.text === text && !r.place ? prev : r));
  };

  // The trip's days become the chips (with any chosen day that lies outside them, so it is never lost).
  const [daysLoaded, setDaysLoaded] = useState(false);
  useEffect(() => {
    loadItinerary(id).then((r) => {
      setDaysLoaded(true);
      if (!r.ok) return;
      const list = tripDays(r.trip.start_date, r.trip.end_date, [...r.items.map((i) => i.day_date), ...(day ? [day] : [])]);
      setDays(list);
      setDate((d) => d || list[0] || "");
      if (!itemId) return;
      const item = r.items.find((x) => x.id === itemId);
      if (!item) return setMissing(true);
      setVersion(item.version);
      setTitle(item.title);
      setDate(item.day_date);
      setTime(item.start_time ? item.start_time.slice(0, 5) : null);
      setMessage(item.description ?? "");
      const text = item.location_text ?? item.formatted_address ?? "";
      setLocation(text);
      if (item.latitude !== null && item.longitude !== null) {
        const place = { lat: item.latitude, lng: item.longitude, name: item.formatted_address ?? (text || null) };
        picked.current = { text, lat: place.lat, lng: place.lng };
        setResolved({ text, url: item.location_url, place });
      } else if (text) setResolved({ text, url: item.location_url, place: null });
    });
  }, [id, day, itemId]);
  const numbered = useMemo(() => days.map((d, n) => ({ d, n: n + 1 })), [days]);

  const save = async () => {
    if (busy) return;
    const e = validateItem({ title, day: date });
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length) return;
    setBusy(true);
    // A place picked from the suggestions is saved with its coordinates, whatever the field's own resolving did since.
    const pick = picked.current?.text === location.trim() ? picked.current : null;
    const loc = pick ? { text: pick.text, url: null, place: { lat: pick.lat, lng: pick.lng, name: pick.text } }
      : resolved?.text === location.trim() ? resolved : location.trim() ? await resolveLocation(location) : undefined;
    const r = itemId
      ? await updateItem({ id: itemId, version, title, day: date, startTime: time, location: loc ?? undefined, description: message })
      : await createItem({ tripId: id, title, type: "activity", day: date, startTime: time, participantIds: [], location: loc ?? undefined, description: message });
    setBusy(false);
    if (r.ok) { haptic.success(); toast(itemId ? "Plan updated" : "Plan added"); router.back(); }
    else setFormError(r.message);
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={space.s4} style={s.close}>
          <X size={22} color={color.iconInk} strokeWidth={2} />
        </Pressable>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={s.heading}>{itemId ? "Edit plan" : "Plan details"}</Text>
        {missing && <Alert variant="negative" persist>This plan is no longer there. It may have been deleted.</Alert>}

        {!daysLoaded && <Skeleton label="Loading days" variant="dayChips" />}
        {numbered.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={s.chips} accessibilityRole="tablist" accessibilityLabel="Day">
            {numbered.map(({ d, n }) => {
              const on = d === date;
              return (
                <Chip key={d} role="tab" label={`${short(d)} - Day ${n}`} accessibilityLabel={`Day ${n}, ${short(d)}`} selected={on} onPress={() => setDate(d)} />
              );
            })}
          </ScrollView>
        )}
        {errors.day && <FieldMessage status="error">{errors.day}</FieldMessage>}

        <TextField label="Plan name" placeholder="e.g. Sunset at Baga Beach" value={title} onChangeText={setTitle} autoCapitalize="sentences"
          status={errors.title ? "error" : undefined} message={errors.title} />
        <View style={s.field}>
          <PlaceSearchField label="Location" placeholder="Search a place, or paste a Google or Apple Maps link" value={location} onChangeText={setLocation} onEndEditing={resolve}
            onPick={(p) => { picked.current = { text: p.title, lat: p.lat, lng: p.lng }; setLocation(p.title); setResolved({ text: p.title, url: null, place: { lat: p.lat, lng: p.lng, name: p.title } }); }} />
          {resolved?.place && <MapPreview place={resolved.place} />}
        </View>
        <View style={s.field}>
          <FieldLabel>Time</FieldLabel>
          <TimeField label="Time" value={time} onChange={setTime} />
        </View>
        <View style={s.field}>
          {/* The mic sits in the bottom right corner of the text box, so the box's bottom edge must be this wrapper's: the error line goes below it. */}
          <View>
            <TextField label="Message" placeholder="Notes for the group, e.g. Bring sunscreen" value={message} onChangeText={setMessage} multiline maxLength={500} autoCapitalize="sentences"
              style={{ minHeight: 140, paddingBottom: 56 }} status={dictation.error ? "error" : undefined} />
            {dictation.available && <Pressable accessibilityRole="button" accessibilityLabel={dictation.listening ? "Stop dictating" : "Dictate message"} accessibilityState={{ selected: dictation.listening }}
              onPress={() => { haptic.tap(); dictation.toggle(); }} style={[s.mic, dictation.listening && s.micOn]}>
              {dictation.listening ? <Square size={18} color={color.paper} strokeWidth={2} /> : <Mic size={20} color={color.iconInk} strokeWidth={1.75} />}
            </Pressable>}
          </View>
          {dictation.error && <FieldMessage status="error">{dictation.error}</FieldMessage>}
        </View>
        {formError && <Alert variant="negative">{formError}</Alert>}
      </ScrollView>
      <View style={[s.footer, { paddingBottom: bottom + space.s12 }]}>
        {/* Neutral until there is a name, then the one green action; pressing it early still explains what is missing. */}
        <Button label={busy ? "Saving…" : itemId ? "Save changes" : "Save Plan"} onPress={save} type={title.trim() && !missing ? "primary" : "secondaryNeutral"} size="large" />
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
  mic: { position: "absolute", right: space.s8, bottom: space.s8, width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey, alignItems: "center", justifyContent: "center" },
  micOn: { backgroundColor: color.brandBlack },
  footer: { paddingHorizontal: space.s20, paddingTop: space.s12, borderTopWidth: 1, borderTopColor: color.borderNeutral, backgroundColor: color.paper },
});
