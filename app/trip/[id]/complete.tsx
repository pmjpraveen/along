import { Alert } from "../../../src/components/Alert";
import { PinnedBack, useContentTop, useScrollY } from "../../../src/components/PinnedBack";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "../../../src/hooks/useReducedMotion";
import { shapeFor } from "../../../src/domain/stampShape";
import { Stamp as StampArt } from "../../../src/components/Stamp";
import { EASE_OUT, motion } from "../../../src/theme/motion";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";
import { Skeleton } from "../../../src/components/Skeleton";
import { haptic } from "../../../src/haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, ChevronLeft, Info, MapPin, Stamp } from "../../../src/icons";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "../../../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadTripSummary, SummaryResult } from "../../../src/api/passport";
import { completeTrip, stampForTrip } from "../../../src/api/trips";
import { PrimaryButton, TextButton } from "../../../src/components/Buttons";
import { TripSummaryCards } from "../../../src/components/TripSummaryCards";
import { formatRange } from "../../../src/domain/trip";
import { color, radius, space, type } from "../../../src/theme/tokens";

// The stamp is pressed down onto the page: a touch large and faint, then settled. With Reduce Motion it only fades in.
function StampAward({ destination, date, tripId }: { destination: string; date: string; tripId: string }) {
  const reduced = useReducedMotion();   // read here, not in the worklet: the UI thread cannot call plain JS functions
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(1, { duration: reduced ? motion.fadeMs : motion.stampMs, easing: EASE_OUT }); }, [p, reduced]);
  const from = reduced ? 1 : motion.stampFrom;
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: from - (from - 1) * p.value }] }));
  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.stampAward, style]}>
      <StampArt compact destination={destination} date={date} kind="arrival" shape={shapeFor(tripId, "arrival")} tilt={-6} />
    </Animated.View>
  );
}

// Review the trip, then confirm. The owner sees who came, what was planned, what was spent and what is still to settle
// before anything changes; nothing is deleted or locked by completing.
export default function Complete() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const { scrollY, onScroll } = useScrollY();
  const contentTop = useContentTop();
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stamp, setStamp] = useState<string | null>(null);

  const load = useCallback(async () => setSummary(await loadTripSummary(id)), [id]);
  useEffect(() => { load(); }, [load]);
  const pull = usePullToRefresh(load);
  useEffect(() => { if (done) stampForTrip(id).then((x) => setStamp(x?.destination ?? null)); }, [done, id]);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await completeTrip(id);
    setBusy(false);
    if (r.ok) { haptic.success(); setDone(true); }
    else setError(r.message);
  };

  const s0 = summary?.ok ? summary.summary : null;
  const footer = done ? (
    <>
      <PrimaryButton label="Done" onPress={() => router.back()} />
      <TextButton label="Add a photo to Memories" onPress={() => router.replace({ pathname: "/trip/[id]/memories", params: { id } })} />
    </>
  ) : s0 ? (
    <>
      <PrimaryButton label={busy ? "Completing…" : "Complete trip"} onPress={confirm} />
      <TextButton label="Not yet" onPress={() => router.back()} />
    </>
  ) : null;
  return (
    <View style={s.screen}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} refreshControl={pull} contentInsetAdjustmentBehavior="never" contentContainerStyle={[s.content, { paddingTop: contentTop, paddingBottom: (footer ? 160 : space.s24) + bottom }]}>
        <View style={s.head}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>{done ? "Trip completed" : "Complete this trip?"}</Text>
          {s0 && (
            <View style={s.meta}>
              <MapPin size={16} color={color.charcoal} strokeWidth={1.75} />
              <Text maxFontSizeMultiplier={1.4} style={s.body}>{s0.destination_name} · {formatRange(s0.start_date, s0.end_date)}</Text>
            </View>
          )}
        </View>
        {summary === null ? (
          <Skeleton label="Loading trip summary" variant="summaryCards" />
        ) : !s0 ? (
          <View style={s.gap}>
            <Alert variant="negative" persist>{summary.ok ? "" : summary.message}</Alert>
            <TextButton label="Retry" onPress={load} />
            <TextButton label="Not yet" onPress={() => router.back()} />
          </View>
        ) : (
          <>
            <TripSummaryCards summary={s0} />
            {done ? (
              <View accessible style={s.note}>
                <View style={s.icon}><Check size={20} color={color.iconInk} strokeWidth={2} /></View>
                <Text maxFontSizeMultiplier={1.4} style={s.noteText}>It's in your history now. Everything is still here, and balances stay open until they're settled.</Text>
              </View>
            ) : (
              <View accessible style={s.note}>
                <View style={s.icon}><Info size={20} color={color.iconInk} strokeWidth={2} /></View>
                <Text maxFontSizeMultiplier={1.4} style={s.noteText}>
                  The trip moves to your history. Nothing is deleted or locked: expenses, the itinerary and everyone's balances stay exactly as they are, and you can still settle up.
                </Text>
              </View>
            )}
            {done && stamp && s0 && <StampAward destination={stamp.split(",")[0].trim()} date={s0.start_date} tripId={id} />}
            {done && stamp && (
              <View accessible style={s.note}>
                <View style={s.icon}><Stamp size={20} color={color.iconInk} strokeWidth={2} /></View>
                <Text maxFontSizeMultiplier={1.4} style={s.noteText}>Passport stamp added: {stamp}</Text>
              </View>
            )}
            {error && <Alert variant="negative">{error}</Alert>}
          </>
        )}
      </Animated.ScrollView>
      <PinnedBack onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} scrollY={scrollY} />
      {footer && <View style={[s.footer, { paddingBottom: bottom + space.s12 }]}>{footer}</View>}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  stampAward: { width: 240, alignSelf: "center" },
  head: { gap: space.s8, marginTop: space.s8, marginBottom: space.s8 },
  heading: { ...type.pageTitle, color: color.brandBlack },
  meta: { flexDirection: "row", alignItems: "center", gap: space.s8 },
  gap: { gap: space.s8 },
  body: { ...type.fieldValue, color: color.charcoal, flexShrink: 1 },
  note: { flexDirection: "row", alignItems: "flex-start", gap: space.s12, paddingVertical: space.s8 },
  icon: { width: 40, height: 40, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey, alignItems: "center", justifyContent: "center" },
  noteText: { ...type.fieldValue, color: color.charcoal, flex: 1, paddingTop: space.s8 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, gap: space.s4, paddingHorizontal: space.s20, paddingTop: space.s12, backgroundColor: color.paper, borderTopWidth: 1, borderTopColor: color.borderNeutral },
});
