import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, ImageIcon, Receipt, Scale } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "../../../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { loadTripSummary, SummaryResult } from "../../../src/api/passport";
import { Alert } from "../../../src/components/Alert";
import { Badge } from "../../../src/components/Badge";
import { TextButton } from "../../../src/components/Buttons";
import { ListItem } from "../../../src/components/ListItem";
import { TripSummaryCards } from "../../../src/components/TripSummaryCards";
import { formatRange } from "../../../src/domain/trip";
import { color, radius, space, type } from "../../../src/theme/tokens";

// A finished trip at a glance: where and when, who came, what was planned, what was spent, what is still to settle, and the way into its
// memories, balances and expenses. Read-only, and it works for any trip status.
export default function Summary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<SummaryResult | null>(null);
  const load = useCallback(async () => setState(await loadTripSummary(id)), [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const go = (screen: "memories" | "balances" | "expenses") =>
    router.push({ pathname: `/trip/[id]/${screen}` as "/trip/[id]/memories", params: { id } });
  const icon = (I: typeof Receipt) => <View style={s.icon}><I size={20} color={color.forestInk} strokeWidth={1.75} /></View>;
  const done = state?.ok && (state.summary.status === "completed" || state.summary.status === "archived");

  return (
    <View style={s.screen}>
      {/* A soft green glow behind the header, for a trip that has been completed. */}
      <Svg style={s.glow} width="100%" height={260} pointerEvents="none">
        <Defs>
          <RadialGradient id="done" cx="50%" cy="0%" rx="90%" ry="85%" fx="50%" fy="0%">
            <Stop offset="0" stopColor={color.brightGreen} stopOpacity={0.4} />
            <Stop offset="1" stopColor={color.brightGreen} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#done)" />
      </Svg>
      <ScrollView style={s.scroll} contentInsetAdjustmentBehavior="never" contentContainerStyle={[s.content, { paddingTop: top + space.s16, paddingBottom: bottom + space.s24 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={space.s4} style={s.round}>
          <ChevronLeft size={22} color={color.forestInk} strokeWidth={1.75} />
        </Pressable>
        {state === null ? (
          <ActivityIndicator accessibilityLabel="Loading trip summary" color={color.forestInk} />
        ) : !state.ok ? (
          <View style={s.gap}>
            <Alert variant="negative">{state.message}</Alert>
            <TextButton label="Retry" onPress={load} />
          </View>
        ) : (
          <>
            <View style={s.head}>
              {done && <Badge variant="success" label="Completed" />}
              <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>{state.summary.destination_name}</Text>
              <Text maxFontSizeMultiplier={1.4} style={s.body}>{state.summary.name} · {formatRange(state.summary.start_date, state.summary.end_date)}</Text>
            </View>
            <TripSummaryCards summary={state.summary} />
            <View style={s.list}>
              <ListItem title="Memories" subtitle="Photos and notes from the trip" leading={icon(ImageIcon)} trailing="chevron" onPress={() => go("memories")} />
              <View style={s.hair} />
              <ListItem title="Balances" subtitle="Who owes whom" leading={icon(Scale)} trailing="chevron" onPress={() => go("balances")} />
              <View style={s.hair} />
              <ListItem title="Expenses" subtitle="Everything that was paid for" leading={icon(Receipt)} trailing="chevron" onPress={() => go("expenses")} />
            </View>
          </>
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
  head: { gap: space.s8, alignItems: "flex-start" },
  heading: { ...type.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: color.obsidian },
  gap: { gap: space.s8 },
  body: { ...type.fieldValue, color: color.charcoal },
  list: { borderRadius: radius.sheet, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, overflow: "hidden" },
  hair: { height: 1, backgroundColor: color.borderNeutral, marginHorizontal: space.s16 },
  icon: { width: 40, height: 40, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.neutralSolid, alignItems: "center", justifyContent: "center" },
});
