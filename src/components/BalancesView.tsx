import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { BalancesResult } from "../api/balances";
import { describeBalance, describeTransfer } from "../domain/balance";
import { haptic } from "../haptics";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { Check } from "../icons";
import { motion } from "../theme/motion";
import { color, font, radius, space, type, track } from "../theme/tokens";
import { Alert } from "./Alert";
import { Avatar } from "./Avatar";
import { Button, TextButton } from "./Buttons";
import { Skeleton } from "./Skeleton";

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

// Who owes whom as it was added (with Settle up where I can record it), then everyone's net position. It is the content of the Balances page and
// of the Balances view on the Expenses tab, so both always say the same thing. `showMine` adds the big "Your balance" card (the tab already has it).
export function BalancesView({ state, tripId, onRetry, showMine = true }: { state: BalancesResult | null; tripId: string; onRetry: () => void; showMine?: boolean }) {
  const router = useRouter();
  const mine = state?.ok ? state.rows.find((r) => r.isMe) : undefined;
  const others = state?.ok ? state.rows.filter((r) => !r.isMe) : [];
  const transfers = state?.ok ? state.transfers : [];
  // I can record a payment I am part of; the trip owner (the organiser) can record any payment, so they can settle up for anyone and guests who have no
  // account. The server allows exactly the same people, and a recorded payment shows who recorded it.
  const canSettle = (t: { from: string; to: string }) => !!state?.ok && (!!mine?.isOwner || t.from === mine?.memberId || t.to === mine?.memberId);
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

  const whoIs = (m: string) => (state?.ok ? state.rows.find((r) => r.memberId === m) : undefined);
  const nameOf = (m: string) => whoIs(m)?.name ?? "Someone";

  if (state === null) return <Skeleton label="Loading balances" variant="balances" />;
  if (!state.ok) return (
    <View style={s.gap}>
      <Alert variant="negative" persist>{state.message}</Alert>
      <TextButton label="Retry" onPress={onRetry} />
    </View>
  );
  return (
    <>
      {showMine && mine && (
        <View accessible style={s.mine}>
          <Text maxFontSizeMultiplier={1.3} style={s.mineLabel}>Your balance</Text>
          <Text maxFontSizeMultiplier={1.3} style={s.mineText}>{describeBalance(mine.net, mine.name, true, state.currency.exponent, state.currency.code)}</Text>
        </View>
      )}

      {ordered.length > 0 && (
        <>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[s.section, !showMine && s.sectionFirst]}>To settle up</Text>
          <View>
            {ordered.map((t) => (
              <View key={`${t.from}-${t.to}`} style={s.row}>
                <Avatar name={nameOf(t.from)} uri={whoIs(t.from)?.avatarUrl} guest={whoIs(t.from)?.guest} size={40} />
                <Text maxFontSizeMultiplier={1.4} style={s.line}>{describeTransfer(t, nameOf, mine?.memberId ?? null, state.currency.exponent, state.currency.code)}</Text>
                {canSettle(t) && (
                  <Button label="Settle up" type="secondaryNeutral" size="small" onPress={() => router.push({ pathname: "/trip/[id]/settle", params: { id: tripId, from: t.from, to: t.to, amount: String(t.amountMinor) } })} />
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
  );
}

const s = StyleSheet.create({
  gap: { gap: space.s8 },
  mine: { gap: space.s4, padding: space.s20, borderRadius: radius.sheet, borderCurve: "continuous", backgroundColor: color.softGrey },
  mineLabel: { ...type.fieldValue, color: color.charcoal },
  mineText: { ...type.display, fontSize: 30, lineHeight: 36, letterSpacing: track(30), color: color.brandBlack, fontVariant: ["tabular-nums"] },
  section: { ...type.fieldValue, fontFamily: font.medium, color: color.obsidian, marginTop: space.s16 },
  sectionFirst: { marginTop: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: space.s16, minHeight: 72, paddingVertical: space.s12, borderBottomWidth: 1, borderBottomColor: color.borderNeutral },
  settled: { flexDirection: "row", alignItems: "center", gap: space.s16, paddingVertical: space.s8 },
  badge: { width: 40, height: 40, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey, alignItems: "center", justifyContent: "center" },
  line: { ...type.fieldValue, flex: 1, color: color.obsidian, fontVariant: ["tabular-nums"] },
});
