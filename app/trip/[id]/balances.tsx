import { Alert } from "../../../src/components/Alert";
import { PinnedBack, useContentTop, useScrollY } from "../../../src/components/PinnedBack";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { haptic } from "../../../src/haptics";
import { useReducedMotion } from "../../../src/hooks/useReducedMotion";
import { motion } from "../../../src/theme/motion";
import { Skeleton } from "../../../src/components/Skeleton";
import { Avatar } from "../../../src/components/Avatar";
import { Check } from "../../../src/icons";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "../../../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BalancesResult, loadBalances } from "../../../src/api/balances";
import { Button, TextButton } from "../../../src/components/Buttons";
import { describeBalance, describeTransfer } from "../../../src/domain/balance";
import { useTripRealtime } from "../../../src/hooks/useTripRealtime";
import { color, font, radius, space, type, track } from "../../../src/theme/tokens";

// Shown once the last payment is recorded: a check settles in with a gentle spring and a fade (just a fade with Reduce Motion).
function AllSettled() {
  const reduced = useReducedMotion();   // read here, not in the worklet: the UI thread cannot call plain JS functions
  const p = useSharedValue(0);
  useEffect(() => {
    haptic.success();
    p.value = reduced ? withTiming(1, { duration: motion.fadeMs }) : withSpring(1, motion.settle);
  }, [p, reduced]);
  const from = reduced ? 1 : motion.settledFrom;
  const badge = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 2), transform: [{ scale: from + (1 - from) * p.value }] }));
  return (
    <View accessible accessibilityLiveRegion="polite" style={s.settled}>
      <Animated.View style={[s.badge, badge]}><Check size={20} color={color.iconInk} strokeWidth={2} /></Animated.View>
      <Text maxFontSizeMultiplier={1.4} style={s.line}>Everyone's settled up</Text>
    </View>
  );
}

// My net balance first, then who owes whom as it was added, then everyone else's net position. All derived on read.
export default function Balances() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const { scrollY, onScroll } = useScrollY();
  const contentTop = useContentTop();
  const router = useRouter();
  const [state, setState] = useState<BalancesResult | null>(null);
  const load = useCallback(async () => setState(await loadBalances(id)), [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = usePullToRefresh(load);
  // Live: another member's expense, split or payment refreshes this screen without a pull.
  useTripRealtime(id, ["expenses", "expense_participants", "settlements"], load);
  const mine = state?.ok ? state.rows.find((r) => r.isMe) : undefined;
  const others = state?.ok ? state.rows.filter((r) => !r.isMe) : [];
  // Who owes whom exactly as the expenses and payments say (not rearranged into fewer payments).
  const transfers = state?.ok ? state.transfers : [];
  // I can record a payment I am part of; the trip owner (the organiser) can record any payment, so they can settle up for anyone and guests who have no
  // account. The server allows exactly the same people, and a recorded payment shows who recorded it.
  const canSettle = (t: { from: string; to: string }) => {
    if (!state?.ok) return false;
    return !!mine?.isOwner || t.from === mine?.memberId || t.to === mine?.memberId;
  };
  // Payments that involve me come first.
  const ordered = [...transfers].sort((a, b) => Number(b.from === mine?.memberId || b.to === mine?.memberId) - Number(a.from === mine?.memberId || a.to === mine?.memberId));

  // Only a trip that had payments to make and now has none earns the moment; a trip that never owed anything does not.
  const hadDebts = useRef(false);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!state?.ok) return;
    if (ordered.length > 0) { hadDebts.current = true; setSettled(false); }
    else if (hadDebts.current) setSettled(true);
  }, [state, ordered.length]);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const whoIs = (m: string) => (state?.ok ? state.rows.find((r) => r.memberId === m) : undefined);
  const nameOf = (m: string) => state?.ok ? state.rows.find((r) => r.memberId === m)?.name ?? "Someone" : "Someone";

  return (
    <View style={s.screen}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} style={s.scroll} contentInsetAdjustmentBehavior="never" refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: contentTop, paddingBottom: bottom + space.s24 }]}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Balances</Text>
        {state === null ? (
          <Skeleton label="Loading balances" variant="balances" />
        ) : !state.ok ? (
          <View style={s.gap}>
            <Alert variant="negative" persist>{state.message}</Alert>
            <TextButton label="Retry" onPress={load} />
          </View>
        ) : (
          <>
            {mine && (
              <View accessible style={s.mine}>
                <Text maxFontSizeMultiplier={1.3} style={s.mineLabel}>Your balance</Text>
                <Text maxFontSizeMultiplier={1.3} style={s.mineText}>{describeBalance(mine.net, mine.name, true, state.currency.exponent, state.currency.code)}</Text>
              </View>
            )}

            {ordered.length > 0 && (
              <>
                <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.section}>To settle up</Text>
                <View>
                  {ordered.map((t) => (
                    <View key={`${t.from}-${t.to}`} style={s.row}>
                      <Avatar name={nameOf(t.from)} uri={whoIs(t.from)?.avatarUrl} guest={whoIs(t.from)?.guest} size={40} />
                      <Text maxFontSizeMultiplier={1.4} style={s.line}>{describeTransfer(t, nameOf, mine?.memberId ?? null, state.currency.exponent, state.currency.code)}</Text>
                      {canSettle(t) && (
                        <Button label="Settle up" type="secondaryNeutral" size="small" onPress={() => router.push({ pathname: "/trip/[id]/settle", params: { id, from: t.from, to: t.to, amount: String(t.amountMinor) } })} />
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}

            {settled && <AllSettled />}

            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.section}>Everyone</Text>
            <View>
              {others.map((r) => (
                <View key={r.memberId} accessible style={s.row}>
                  <Avatar name={r.name} uri={r.avatarUrl} guest={r.guest} size={40} />
                  <Text maxFontSizeMultiplier={1.4} style={s.line}>{describeBalance(r.net, r.name, false, state.currency.exponent, state.currency.code)}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </Animated.ScrollView>
      <PinnedBack onPress={back} scrollY={scrollY} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  scroll: { flex: 1 },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  heading: { ...type.pageTitle, color: color.brandBlack, marginVertical: space.s8 },
  gap: { gap: space.s8 },
  mine: { gap: space.s4, padding: space.s20, borderRadius: radius.sheet, borderCurve: "continuous", backgroundColor: color.softGrey },
  mineLabel: { ...type.fieldValue, color: color.charcoal },
  mineText: { ...type.display, fontSize: 30, lineHeight: 36, letterSpacing: track(30), color: color.brandBlack, fontVariant: ["tabular-nums"] },
  section: { ...type.fieldValue, fontFamily: font.medium, color: color.obsidian, marginTop: space.s16 },
  row: { flexDirection: "row", alignItems: "center", gap: space.s16, minHeight: 72, paddingVertical: space.s12, borderBottomWidth: 1, borderBottomColor: color.borderNeutral },
  settled: { flexDirection: "row", alignItems: "center", gap: space.s16, paddingVertical: space.s8 },
  badge: { width: 40, height: 40, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey, alignItems: "center", justifyContent: "center" },
  body: { ...type.fieldValue, color: color.charcoal },
  line: { ...type.fieldValue, flex: 1, color: color.obsidian, fontVariant: ["tabular-nums"] },
});
