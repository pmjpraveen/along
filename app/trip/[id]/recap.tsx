import { makeImageFromView } from "@shopify/react-native-skia";
import { useIsFocused, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BalanceRow, BalancesResult, loadBalances } from "../../../src/api/balances";
import { loadExpenseExport } from "../../../src/api/expenses";
import { listMemories, Memory } from "../../../src/api/memories";
import { loadTripSummary, SummaryResult } from "../../../src/api/passport";
import { loadTripStatus } from "../../../src/api/trips";
import { Alert } from "../../../src/components/Alert";
import { PrimaryButton, TextButton } from "../../../src/components/Buttons";
import { ListItem } from "../../../src/components/ListItem";
import { PinnedBack, useContentTop, useScrollY } from "../../../src/components/PinnedBack";
import { CARD_RATIO, FlipCard, RecapCardFace, TiltCard } from "../../../src/components/RecapCard";
import { Skeleton } from "../../../src/components/Skeleton";
import { FactExpense, recapCard, recapSummary, tripFacts } from "../../../src/domain/recap";
import { CARD_COLORS } from "../../../src/domain/trip";
import { haptic } from "../../../src/haptics";
import { useReducedMotion } from "../../../src/hooks/useReducedMotion";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";
import { shareRecapImage } from "../../../src/shareRecap";
import { toast } from "../../../src/stores/toast";
import { color, space, type } from "../../../src/theme/tokens";

// The trip as a postcard to post: highlights and a postage stamp on the front, the total spent and each person's share on the back. Tilting the phone tilts the card; the picture that gets
// shared is a flat copy of it, photographed on demand.
export default function Recap() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bottom } = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const { scrollY, onScroll } = useScrollY();
  const contentTop = useContentTop();
  const router = useRouter();
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const [data, setData] = useState<{ summary: SummaryResult; bal: BalancesResult; band: string; expenses: FactExpense[]; memories: Memory[] } | null>(null);
  const [side, setSide] = useState<"front" | "back">("front");
  const [showAmounts, setShowAmounts] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const flat = useRef<View>(null);

  const load = useCallback(async () => {
    const [summary, bal, status, ex, mem] = await Promise.all([loadTripSummary(id), loadBalances(id), loadTripStatus(id), loadExpenseExport(id, false), listMemories(id)]);
    setData({ summary, bal, expenses: ex.ok ? ex.expenses : [], memories: mem.ok ? mem.memories : [], band: status.ok ? CARD_COLORS[status.cardColor] ?? CARD_COLORS[2] : CARD_COLORS[2] });
  }, [id]);
  useEffect(() => { load(); }, [load]);
  const pull = usePullToRefresh(load);

  const sm = data?.summary.ok ? data.summary.summary : null;
  const rows: BalanceRow[] = data?.bal.ok ? data.bal.rows : [];
  const card = useMemo(() => sm && recapCard({
    tripId: sm.trip_id, name: sm.name, destination: sm.destination_name, start: sm.start_date, end: sm.end_date, completed: sm.status === "completed" || sm.status === "archived",
    currency: { code: sm.currency, exponent: sm.exponent }, totalMinor: sm.total_spend_minor, showAmounts,
    people: rows.map((r) => ({ id: r.memberId, name: r.name.split(" ")[0], guest: r.guest, shareMinor: r.costMinor })),
  }), [sm, rows, showAmounts]);   // eslint-disable-line react-hooks/exhaustive-deps
  const facts = useMemo(() => sm && data && tripFacts({
    expenses: data.expenses, start: sm.start_date, end: sm.end_date, people: sm.people, activities: sm.activities,
    photos: data.memories.filter((m) => m.type === "photo").length, memories: data.memories.length, places: data.memories.filter((m) => m.type === "favorite_place" && m.place_name).map((m) => m.place_name as string),
  }), [sm, data]);
  const avatars = useMemo(() => new Map(rows.map((r) => [r.memberId, r.avatarUrl ?? null])), [rows]);

  const width = Math.min(screenW - space.s20 * 2, 360);
  const cur = sm ? { code: sm.currency, exponent: sm.exponent } : { code: "INR", exponent: 2 };
  const face = (which: "front" | "back", fx?: Parameters<typeof RecapCardFace>[0]["fx"]) => sm && card && facts && data && (
    <RecapCardFace card={card} facts={facts} side={which} cur={cur} bg={data.band} width={width} tripId={sm.trip_id} destination={sm.destination_name} start={sm.start_date} end={sm.end_date} people={avatars} members={rows.map((r) => ({ name: r.name, uri: r.avatarUrl ?? null, guest: r.guest }))} fx={fx} />
  );
  const both = (fx?: Parameters<typeof RecapCardFace>[0]["fx"]) => <FlipCard side={side} reduced={reduced} width={width} front={face("front", fx)} back={face("back", fx)} />;

  const share = async () => {
    if (capturing || !sm) return;
    setCapturing(true);   // mounts the flat copy; give its avatars a moment to load before it is photographed
    await new Promise((r) => setTimeout(r, 400));
    const image = flat.current ? await makeImageFromView(flat).catch(() => null) : null;
    setCapturing(false);
    if (!image) { haptic.warn(); return toast("Couldn't make the picture. Try again."); }
    const r = await shareRecapImage(image, sm.name, side);
    if (!r.ok) toast(r.message);
  };

  const failed = data && !sm ? (data.summary.ok ? "" : data.summary.message) : null;
  return (
    <View style={s.screen}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} refreshControl={pull} contentInsetAdjustmentBehavior="never" contentContainerStyle={[s.content, { paddingTop: contentTop, paddingBottom: 160 + bottom }]}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Trip recap</Text>
        {data === null ? (
          <Skeleton label="Loading recap" variant="summaryCards" />
        ) : failed !== null || !card ? (
          <View style={s.gap}>
            <Alert variant="negative" persist>{failed || "Couldn't load the recap. Try again."}</Alert>
            <TextButton label="Retry" onPress={load} />
          </View>
        ) : (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel={side === "front" ? `${card.title}, ${facts?.tagline}. Tap to flip the card and see the total.` : `${recapSummary(card, cur)} Tap to flip the card back.`}
              onPress={() => { haptic.tap(); setSide((v) => (v === "front" ? "back" : "front")); }} style={{ width, height: width * CARD_RATIO, alignSelf: "center" }}>
              {capturing && <View ref={flat} collapsable={false} style={StyleSheet.absoluteFill}>{face(side)}</View>}
              <View style={StyleSheet.absoluteFill}>
                {reduced || !focused ? both() : <TiltCard width={width}>{(fx) => both(fx)}</TiltCard>}
              </View>
            </Pressable>
            <Text maxFontSizeMultiplier={1.4} style={s.hint}>Tap the card to flip it</Text>
            <View style={s.list}>
              <ListItem title="Show what each person spent" subtitle="Names and amounts are visible to anyone who sees the picture" trailing="switch" checked={showAmounts} onPress={() => setShowAmounts((v) => !v)} />
            </View>
          </>
        )}
      </Animated.ScrollView>
      <PinnedBack onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} scrollY={scrollY} />
      {card && <View style={[s.footer, { paddingBottom: bottom + space.s12 }]}><PrimaryButton label={capturing ? "Making the picture…" : side === "front" ? "Share the front" : "Share the back"} onPress={share} /></View>}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s24 },
  heading: { ...type.pageTitle, color: color.brandBlack },
  gap: { gap: space.s8 },
  hint: { ...type.fieldMessage, color: color.charcoal, textAlign: "center" },
  list: { borderRadius: 28, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, overflow: "hidden" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, gap: space.s4, paddingHorizontal: space.s20, paddingTop: space.s12, backgroundColor: color.paper, borderTopWidth: 1, borderTopColor: color.borderNeutral },
});
