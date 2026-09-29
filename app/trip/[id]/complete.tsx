import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadTripSummary, SummaryResult } from "../../../src/api/passport";
import { completeTrip, stampForTrip } from "../../../src/api/trips";
import { OutlinedButton, PrimaryButton, TextButton } from "../../../src/components/Buttons";
import { TripSummaryCards } from "../../../src/components/TripSummaryCards";
import { formatDate } from "../../../src/domain/trip";
import { color, radius, space, type } from "../../../src/theme/tokens";

// Review the trip, then confirm. The owner sees who came, what was planned, what was spent and what is still to settle
// before anything changes; nothing is deleted or locked by completing.
export default function Complete() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stamp, setStamp] = useState<string | null>(null);

  const load = useCallback(async () => setSummary(await loadTripSummary(id)), [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (done) stampForTrip(id).then((x) => setStamp(x?.destination ?? null)); }, [done, id]);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await completeTrip(id);
    setBusy(false);
    if (r.ok) setDone(true);
    else setError(r.message);
  };

  const s0 = summary?.ok ? summary.summary : null;
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>{done ? "Trip completed" : "Complete this trip?"}</Text>
      {done ? (
        <>
          <View accessible style={s.card}>
            <Text maxFontSizeMultiplier={1.4} style={s.cardText}>✓ It's in your history now. Everything is still here, and balances stay open until they're settled.</Text>
          </View>
          {stamp && (
            <View accessible style={s.card}>
              <Text maxFontSizeMultiplier={1.4} style={s.cardText}>Passport stamp added: {stamp}</Text>
            </View>
          )}
          <OutlinedButton label="Add a photo to Memories" onPress={() => router.replace({ pathname: "/trip/[id]/memories", params: { id } })} />
          <PrimaryButton label="Done" onPress={() => router.back()} />
        </>
      ) : summary === null ? (
        <ActivityIndicator accessibilityLabel="Loading trip summary" color={color.forestInk} />
      ) : !s0 ? (
        <View style={s.gap}>
          <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {summary.ok ? "" : summary.message}</Text>
          <TextButton label="Retry" onPress={load} />
          <TextButton label="Not yet" onPress={() => router.back()} />
        </View>
      ) : (
        <>
          <Text maxFontSizeMultiplier={1.4} style={s.body}>{s0.destination_name} · {formatDate(s0.start_date)} → {formatDate(s0.end_date)}</Text>
          <TripSummaryCards summary={s0} />
          <Text maxFontSizeMultiplier={1.4} style={s.body}>
            The trip moves to your history. Nothing is deleted or locked: expenses, the itinerary and everyone's balances stay exactly as they are, and you can still settle up.
          </Text>
          {error && <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {error}</Text>}
          <PrimaryButton label={busy ? "Completing…" : "Complete trip"} onPress={confirm} />
          <TextButton label="Not yet" onPress={() => router.back()} />
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  heading: { ...type.display, fontSize: 40, lineHeight: 40, letterSpacing: -1.4, color: color.obsidian },
  gap: { gap: space.s8 },
  body: { ...type.body, color: color.charcoal },
  card: { padding: space.s16, borderRadius: radius.card, backgroundColor: color.fog },
  cardText: { ...type.body, color: color.forestInk },
  error: { ...type.label, color: color.alarmRed },
});
