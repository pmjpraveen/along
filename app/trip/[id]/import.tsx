import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { importItems } from "../../../src/api/importItinerary";
import { createItem, loadItinerary } from "../../../src/api/itinerary";
import { searchPlaces } from "../../../src/api/placeSearch";
import { Alert } from "../../../src/components/Alert";
import { Button } from "../../../src/components/Buttons";
import { Pressable } from "../../../src/components/Pressable";
import { TextField } from "../../../src/components/TextField";
import { PlanDraft, toDrafts } from "../../../src/domain/importPlan";
import { haptic } from "../../../src/haptics";
import { Check, X } from "../../../src/icons";
import { toast } from "../../../src/stores/toast";
import { color, radius, space, type } from "../../../src/theme/tokens";
import { short } from "../../../src/domain/trip";

type Found = Record<string, { lat: number; lng: number }>;

// Import plans: paste an itinerary from anywhere, review what was found, add the ticked ones. Nothing is saved until "Add".
export default function ImportPlans() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<PlanDraft[] | null>(null);
  const [found, setFound] = useState<Found>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const find = async () => {
    setBusy(true); setError(null);
    const [trip, r] = await Promise.all([loadItinerary(id), importItems(id, text)]);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    if (!trip.ok) return setError(trip.message);
    if (r.items.length === 0) return setError("We couldn't find any plans in that text. Paste the part that lists the days and places.");
    setDrafts(toDrafts(r.items, trip.trip.start_date, trip.trip.end_date));
  };

  // Places are looked up one at a time in the background, a second apart (the search service's usage policy). A plan whose place is not found keeps the plain text.
  const stop = useRef(false);
  useEffect(() => () => { stop.current = true; }, []);
  const started = useRef(false);
  useEffect(() => {
    if (!drafts || started.current) return;
    started.current = true;
    (async () => {
      for (const d of drafts) {
        if (stop.current) return;
        if (!d.place) continue;
        const r = await searchPlaces(d.place);
        if (r.ok && r.places[0]) setFound((f) => ({ ...f, [d.key]: { lat: r.places[0].lat, lng: r.places[0].lng } }));
        await new Promise((res) => setTimeout(res, 1100));
      }
    })();
  }, [drafts]);

  const toggle = (key: string) => setDrafts((all) => all && all.map((d) => (d.key === key ? { ...d, on: !d.on } : d)));
  const chosen = useMemo(() => (drafts ?? []).filter((d) => d.on), [drafts]);

  const add = async () => {
    setBusy(true); setError(null);
    const failed: PlanDraft[] = [];
    for (const d of chosen) {
      const at = found[d.key];
      const location = d.place ? { text: d.place, url: null, place: at ? { ...at, name: d.place } : null } : undefined;
      const r = await createItem({ tripId: id, title: d.title, type: "activity", day: d.day, startTime: d.time, participantIds: [], location, description: d.note });
      if (!r.ok) failed.push(d);
    }
    setBusy(false);
    if (failed.length === 0) { haptic.success(); toast(chosen.length === 1 ? "Plan added" : `${chosen.length} plans added`); return router.back(); }
    // Keep only the ones that did not save, so a retry never adds the saved ones twice.
    setDrafts(failed);
    setError(`${chosen.length - failed.length} added, ${failed.length} didn't save. Try again.`);
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={space.s4} style={s.close}>
          <X size={22} color={color.iconInk} strokeWidth={2} />
        </Pressable>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={s.heading}>{drafts ? "Review plans" : "Import plans"}</Text>

        {!drafts && (
          <>
            <Text style={s.help}>Paste an itinerary from anywhere: a blog, a chat, a note, or the caption of a reel. You'll review the plans before anything is added.</Text>
            <TextField label="Itinerary text" placeholder={"Day 1: Jagannath Temple at 6am, then Swargadwar beach\nDay 2: Konark Sun Temple…"} value={text}
              onChangeText={setText} multiline maxLength={6000} autoCapitalize="sentences" style={{ minHeight: 220 }} />
          </>
        )}

        {drafts && (
          <>
            <Text style={s.help}>{drafts.length === 1 ? "1 plan found." : `${drafts.length} plans found.`} Untick any you don't want. You can edit a plan after it's added.</Text>
            <View style={s.list}>
              {[...drafts].sort((a, b) => a.day.localeCompare(b.day)).map((d, i, all) => (
                <View key={d.key}>
                  {(i === 0 || all[i - 1].day !== d.day) && <Text accessibilityRole="header" style={s.day}>{short(d.day)}</Text>}
                  <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: d.on }} accessibilityLabel={`${d.title}${d.time ? `, ${d.time}` : ""}`} onPress={() => { haptic.tap(); toggle(d.key); }} style={s.row}>
                    <View style={[s.box, d.on && s.boxOn]}>{d.on && <Check size={16} color={color.paper} strokeWidth={3} />}</View>
                    <View style={s.rowText}>
                      <Text style={s.title}>{d.title}</Text>
                      {(d.time || d.place) && <Text style={s.meta}>{[d.time, d.place].filter(Boolean).join(" · ")}</Text>}
                      {d.flag && <Text style={s.flag}>{d.flag}</Text>}
                    </View>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        )}
        {error && <Alert variant="negative">{error}</Alert>}
      </ScrollView>
      <View style={[s.footer, { paddingBottom: bottom + space.s12 }]}>
        {drafts
          ? <Button label={busy ? "Adding…" : chosen.length === 1 ? "Add 1 plan" : `Add ${chosen.length} plans`} onPress={add} type={chosen.length && !busy ? "primary" : "secondaryNeutral"} size="large" />
          : <Button label={busy ? "Reading…" : "Find plans"} onPress={find} type={text.trim().length >= 10 && !busy ? "primary" : "secondaryNeutral"} size="large" />}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, paddingTop: space.s20, paddingBottom: space.s24, gap: space.s20 },
  close: { width: 44, height: 44, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey, alignItems: "center", justifyContent: "center" },
  heading: { ...type.sheetTitle, color: color.obsidian },
  help: { ...type.body, color: color.charcoal },
  list: { gap: space.s4 },
  day: { ...type.fieldLabel, color: color.obsidian, paddingTop: space.s12, paddingBottom: space.s4 },
  row: { flexDirection: "row", gap: space.s12, minHeight: 48, paddingVertical: space.s8, alignItems: "flex-start" },
  box: { width: 24, height: 24, marginTop: space.s4, borderRadius: radius.pill, borderWidth: 1.5, borderColor: color.inputBorder, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: color.brandBlack, borderColor: color.brandBlack },
  rowText: { flex: 1, gap: 2 },
  title: { ...type.fieldValue, color: color.obsidian },
  meta: { ...type.fieldMessage, color: color.charcoal },
  flag: { ...type.fieldMessage, color: color.charcoal, fontStyle: "normal", textDecorationLine: "underline" },
  footer: { paddingHorizontal: space.s20, paddingTop: space.s12, borderTopWidth: 1, borderTopColor: color.borderNeutral, backgroundColor: color.paper },
});
