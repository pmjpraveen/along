import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Pressable } from "../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listTrips, TripListResult } from "../src/api/trips";
import { Alert } from "../src/components/Alert";
import { TextButton } from "../src/components/Buttons";
import { Stamp } from "../src/components/Stamp";
import { TripCover } from "../src/components/TripCover";
import { TripNameTag } from "../src/components/TripNameTag";
import { placement } from "../src/domain/passportPage";
import { shapeFor } from "../src/domain/stampShape";
import { cardColorAt, formatRange } from "../src/domain/trip";
import { usePullToRefresh } from "../src/hooks/usePullToRefresh";
import { color, font, mix, radius, shadow, space, type } from "../src/theme/tokens";

// Completed trips, most recent first. Each is a coloured card (six colours handed out in order, oldest first) with its photo peeking over the
// top edge, the arrival stamp (top right) and departure stamp (bottom left) faint behind the text, the dates, the name on a tilted dark tag and the place. Opens the trip's summary.
const CARD_H = 160;
const STAMP_W = 140;   // half of this shows; the other half is cut off by the card's edge
const PEEK = 20;
export default function TripHistory() {
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const tile = (width - space.s20 * 2 - space.s24) / 2;   // two cards across
  const [state, setState] = useState<TripListResult | null>(null);
  const load = useCallback(async () => setState(await listTrips()), []);
  useEffect(() => { load(); }, [load]);
  const pull = usePullToRefresh(load);
  const past = state?.ok ? state.trips.filter((t) => t.phase === "completed" || t.phase === "archived") : [];

  return (
    <View style={s.screen}>
      <ScrollView style={s.scroll} contentInsetAdjustmentBehavior="never" refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: top + space.s16, paddingBottom: bottom + space.s24 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={space.s4} style={s.round}>
          <ChevronLeft size={22} color={color.forestInk} strokeWidth={1.75} />
        </Pressable>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Completed trips</Text>
        {state === null ? (
          <ActivityIndicator accessibilityLabel="Loading your trips" color={color.forestInk} />
        ) : !state.ok ? (
          <View style={s.gap}>
            <Alert variant="negative">{state.message}</Alert>
            <TextButton label="Retry" onPress={load} />
          </View>
        ) : past.length === 0 ? (
          <Text maxFontSizeMultiplier={1.4} style={s.body}>No finished trips yet. Once you complete one, it lands here.</Text>
        ) : (
          <View style={s.list}>
            {past.map((t, i) => {
              const bg = cardColorAt(i, past.length);
              return (
                <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`${t.name}, ${t.destination_name}, ${formatRange(t.start_date, t.end_date)}`}
                  onPress={() => router.push({ pathname: "/trip/[id]/summary", params: { id: t.id } })} style={{ width: tile }}>
                  <View style={s.peek}><TripCover uri={t.coverUrl} destination={t.destination_name} ratio={1} /></View>
                  <View style={[s.shadow, { backgroundColor: bg }]}>
                  <View style={s.card}>
                    {/* The two stamps the trip earned, arrival top right, departure bottom left (same shapes and inks as in the passport), faint behind the
                        text, each half pressed off its card edge. */}
                    {(["arrival", "departure"] as const).map((kind, k) => (
                      <View key={kind} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
                        style={[s.stamp, k === 0 ? s.stampTop : s.stampBottom, { width: STAMP_W }, k === 0 ? { right: -STAMP_W / 2 } : { left: -STAMP_W / 2 }]}>
                        <Stamp compact destination={t.destination_name.split(",")[0].trim()} date={kind === "arrival" ? t.start_date : t.end_date} kind={kind}
                          shape={shapeFor(t.id, kind)} ink={placement(t.id, k).ink} tilt={k === 0 ? -8 : 6} />
                      </View>
                    ))}
                    <View style={s.meta}>
                      <View style={[s.datePill, { backgroundColor: mix(bg, "#000000", 0.105) }]}><Text maxFontSizeMultiplier={1.3} style={s.dateText}>{formatRange(t.start_date, t.end_date)}</Text></View>
                      <TripNameTag name={t.name} maxWidth={tile - space.s16 * 2} tilt={-2} />
                      <Text maxFontSizeMultiplier={1.3} style={s.place}>{t.destination_name}</Text>
                    </View>
                  </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  scroll: { flex: 1 },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  heading: { ...type.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: color.obsidian },
  gap: { gap: space.s8 },
  list: { flexDirection: "row", flexWrap: "wrap", columnGap: space.s24, rowGap: space.s24 },
  // The photo sits behind the card, inset 16 each side, and shows only its top 20pt above the card's edge.
  peek: { position: "absolute", top: 0, left: space.s16, right: space.s16, height: 80, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, borderCurve: "continuous", overflow: "hidden" },
  shadow: { marginTop: PEEK, borderRadius: radius.xLarge, borderCurve: "continuous", ...shadow.itemLight },
  card: { minHeight: CARD_H, borderRadius: radius.xLarge, borderCurve: "continuous", overflow: "hidden", paddingTop: space.s12, paddingBottom: space.s16, paddingHorizontal: space.s16, justifyContent: "flex-end", alignItems: "center" },
  stamp: { position: "absolute", opacity: 0.55 },
  stampTop: { top: -2 },
  stampBottom: { bottom: -2 },
  meta: { alignItems: "center", gap: space.s8, alignSelf: "stretch" },
  datePill: { paddingHorizontal: space.s8, paddingVertical: 2, borderRadius: 6, borderCurve: "continuous" },
  dateText: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.obsidian, fontVariant: ["tabular-nums"] },
  place: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, textAlign: "center", color: color.obsidian },
  body: { ...type.fieldValue, color: color.charcoal },
});
