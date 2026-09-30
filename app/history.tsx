import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Pressable } from "../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { listTrips, TripListResult } from "../src/api/trips";
import { Alert } from "../src/components/Alert";
import { Badge } from "../src/components/Badge";
import { TextButton } from "../src/components/Buttons";
import { TripCover } from "../src/components/TripCover";
import { formatRange } from "../src/domain/trip";
import { usePullToRefresh } from "../src/hooks/usePullToRefresh";
import { color, radius, space, type } from "../src/theme/tokens";

// Trips that are over, most recent first, each with its cover, name, place and dates. Opens the trip's summary.
export default function TripHistory() {
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const tile = (width - space.s20 * 2 - space.s24) / 2;   // two tiles across, like Home
  const [state, setState] = useState<TripListResult | null>(null);
  const load = useCallback(async () => setState(await listTrips()), []);
  useEffect(() => { load(); }, [load]);
  const pull = usePullToRefresh(load);
  const past = state?.ok ? state.trips.filter((t) => t.phase === "completed" || t.phase === "archived") : [];

  return (
    <View style={s.screen}>
      {/* A soft lilac glow behind the header. */}
      <Svg style={s.glow} width="100%" height={260} pointerEvents="none">
        <Defs>
          <RadialGradient id="lilac" cx="50%" cy="0%" rx="90%" ry="85%" fx="50%" fy="0%">
            <Stop offset="0" stopColor={color.brightPink} stopOpacity={0.55} />
            <Stop offset="1" stopColor={color.brightPink} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#lilac)" />
      </Svg>
      <ScrollView style={s.scroll} contentInsetAdjustmentBehavior="never" refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: top + space.s16, paddingBottom: bottom + space.s24 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={space.s4} style={s.round}>
          <ChevronLeft size={22} color={color.forestInk} strokeWidth={1.75} />
        </Pressable>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Trip history</Text>
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
            {past.map((t) => (
              <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`${t.name}, ${t.destination_name}, ${formatRange(t.start_date, t.end_date)}`}
                onPress={() => router.push({ pathname: "/trip/[id]/summary", params: { id: t.id } })} style={({ pressed }) => [{ width: tile, gap: space.s8 }, pressed && s.pressed]}>
                <View>
                  <TripCover uri={t.coverUrl} destination={t.destination_name} ratio={1} />
                  <View style={s.badge}><Badge variant="success" label="Completed" /></View>
                </View>
                <View>
                  <Text maxFontSizeMultiplier={1.3} style={s.name}>{t.name}</Text>
                  <Text maxFontSizeMultiplier={1.4} style={s.sub}>{formatRange(t.start_date, t.end_date)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  scroll: { flex: 1 },
  glow: { position: "absolute", top: 0, left: 0, right: 0 },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  heading: { ...type.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: color.obsidian },
  gap: { gap: space.s8 },
  list: { flexDirection: "row", flexWrap: "wrap", columnGap: space.s24, rowGap: space.s24 },
  pressed: { opacity: 0.8 },
  badge: { position: "absolute", top: space.s12, left: space.s12, borderRadius: radius.pill, backgroundColor: color.paper },
  name: { ...type.label, color: color.obsidian },
  sub: { ...type.fieldMessage, color: color.charcoal },
  body: { ...type.fieldValue, color: color.charcoal },
});
