import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { BalancesResult } from "../api/balances";
import { describeBalance } from "../domain/balance";
import { formatMinor } from "../domain/money";
import { haptic } from "../haptics";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { Check, ChevronDown, ChevronRight, FileText } from "../icons";
import { motion } from "../theme/motion";
import { color, font, radius, space, type, track } from "../theme/tokens";
import { exportBalancesPdf } from "../exportBalances";
import { toast } from "../stores/toast";
import { Alert } from "./Alert";
import { Avatar } from "./Avatar";
import { BottomSheet } from "./BottomSheet";
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
  const transfers = state?.ok ? state.transfers : [];
  // I can record a payment I am part of; the trip owner (the organiser) can record any payment, so they can settle up for anyone and guests who have no
  // account. The server allows exactly the same people, and a recorded payment shows who recorded it.
  const canSettle = (t: { from: string; to: string }) => !!state?.ok && (!!mine?.isOwner || t.from === mine?.memberId || t.to === mine?.memberId);

  // Only a trip that had payments to make and now has none earns the moment; a trip that never owed anything does not.
  const hadDebts = useRef(false);
  const [settled, setSettled] = useState(false);
  const [sheetFor, setSheetFor] = useState<string | null>(null);   // whose payments the Record a payment sheet lists
  const [sheet, setSheet] = useState(false);
  const [exporting, setExporting] = useState(false);
  const goTo = useRef<{ from: string; to: string; amountMinor: number } | null>(null);   // the payment picked in the sheet, opened once the sheet has left
  const [open, setOpen] = useState<string | null | undefined>(undefined);   // whose payments are showing: undefined = me, null = none
  useEffect(() => {
    if (!state?.ok) return;
    if (transfers.length > 0) { hadDebts.current = true; setSettled(false); }
    else if (hadDebts.current) setSettled(true);
  }, [state, transfers.length]);

  // The payments I can record for one person's card: theirs only, so the list never turns into everyone's. One of them goes straight to confirm.
  const recordable = (id: string) => transfers.filter((x) => (x.from === id || x.to === id) && canSettle(x));
  const open_ = (x: { from: string; to: string; amountMinor: number }) => router.push({ pathname: "/trip/[id]/settle", params: { id: tripId, from: x.from, to: x.to, amount: String(x.amountMinor) } });
  const whoIs = (m: string) => (state?.ok ? state.rows.find((r) => r.memberId === m) : undefined);
  const nameOf = (m: string) => whoIs(m)?.name ?? "Someone";

  if (state === null) return <Skeleton label="Loading balances" variant={showMine ? "balances" : "balanceCards"} />;
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

      <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[s.section, !showMine && s.sectionFirst]}>Everyone's totals</Text>
      <View style={s.cards}>
        {[...state.rows].sort((x, y) => Number(y.isMe) - Number(x.isMe) || y.net - x.net || x.name.localeCompare(y.name)).map((r) => {
          const money = (n: number) => formatMinor(n, state.currency.exponent, state.currency.code);
          const status = r.net > 0 ? `Gets back ${money(r.net)}` : r.net < 0 ? `Owes ${money(-r.net)}` : "Settled up";
          const isOpen = r.memberId === (open === undefined ? mine?.memberId : open);
          const owes = transfers.filter((x) => x.from === r.memberId);       // payments they make
          const owed = transfers.filter((x) => x.to === r.memberId);         // payments they receive
          const signed = (n: number) => `${n < 0 ? "−" : "+"}${money(Math.abs(n))}`;
          const recorded = r.net - (r.paidMinor - r.costMinor);   // payments already recorded: the ledger moves a balance, the expenses alone do not
          const sum = (list: typeof transfers) => list.reduce((n, x) => n + x.amountMinor, 0);
          const person = (m: string) => whoIs(m);
          const you = r.isMe ? "You" : r.name;
          const mineToRecord = recordable(r.memberId);
          const lines = (list: typeof transfers, head: string, other: "from" | "to", showTotal: boolean) => list.length > 0 && (
            <View style={s.group}>
              <View style={s.fact}>
                <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={s.groupHead}>{head}</Text>
                {showTotal && <Text maxFontSizeMultiplier={1.4} style={s.groupTotal}>{money(sum(list))}</Text>}
              </View>
              {list.map((x) => {
                const name = x[other] === mine?.memberId ? "You" : nameOf(x[other]);
                const content = (
                  <>
                    <View style={s.ring}><Avatar name={nameOf(x[other])} uri={person(x[other])?.avatarUrl} guest={person(x[other])?.guest} size={32} /></View>
                    <Text maxFontSizeMultiplier={1.4} style={s.rowName}>{name}</Text>
                    <Text maxFontSizeMultiplier={1.4} style={s.rowAmount}>{money(x.amountMinor)}</Text>
                    {canSettle(x) && <ChevronRight size={18} color={color.slate} strokeWidth={2} />}
                  </>
                );
                // Where I can record the payment, tapping the person does it too (the same as the button).
                return canSettle(x) ? (
                  <Pressable key={`${x.from}-${x.to}`} accessibilityRole="button" accessibilityLabel={`Record a payment: ${head.toLowerCase()} ${name}, ${money(x.amountMinor)}`}
                    onPress={() => open_(x)} style={({ pressed }) => [s.row, pressed && s.pressed]}>{content}</Pressable>
                ) : (
                  <View key={`${x.from}-${x.to}`} style={s.row}>{content}</View>
                );
              })}
            </View>
          );
          return (
            <View key={r.memberId} style={s.card}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }}
                accessibilityLabel={`${you}. ${status}. Share ${money(r.costMinor)}, paid ${money(r.paidMinor)}`}
                onPress={() => setOpen(isOpen ? null : r.memberId)} style={({ pressed }) => pressed && s.pressed}>
                <View style={s.head}>
                  <View style={s.ring}><Avatar name={r.name} uri={r.avatarUrl} guest={r.guest} size={48} /></View>
                  <Text maxFontSizeMultiplier={1.4} style={s.personName}>{you}</Text>
                  <View style={s.statusCol}>
                    <Text maxFontSizeMultiplier={1.4} style={s.statusLabel}>{r.net > 0 ? "Gets back" : r.net < 0 ? "Owes" : "Settled up"}</Text>
                    {r.net !== 0 && <Text maxFontSizeMultiplier={1.4} style={s.statusAmount}>{money(Math.abs(r.net))}</Text>}
                  </View>
                  <View style={isOpen && s.flip}><ChevronDown size={20} color={color.slate} strokeWidth={2} /></View>
                </View>
                {!isOpen && (   // an open card gives the same two numbers in its breakdown below
                <View style={s.stats}>
                  <View style={s.stat}><Text maxFontSizeMultiplier={1.4} style={s.statName}>Paid</Text><Text maxFontSizeMultiplier={1.4} style={s.statValue}>{money(r.paidMinor)}</Text></View>
                  <View style={s.stat}><Text maxFontSizeMultiplier={1.4} style={s.statName}>{r.isMe ? "Your share" : "Share"}</Text><Text maxFontSizeMultiplier={1.4} style={s.statValue}>{money(r.costMinor)}</Text></View>
                </View>
                )}
              </Pressable>
              {isOpen && (
                <View style={s.body}>
                  <View style={s.panel}>
                    <View style={s.fact}><Text maxFontSizeMultiplier={1.4} style={s.factLabel}>{r.isMe ? "You paid" : `${r.name} paid`}</Text><Text maxFontSizeMultiplier={1.4} style={s.factValue}>{money(r.paidMinor)}</Text></View>
                    <View style={s.fact}><Text maxFontSizeMultiplier={1.4} style={s.factLabel}>{r.isMe ? "Your share" : `${r.name}'s share`}</Text><Text maxFontSizeMultiplier={1.4} style={s.factValue}>{signed(-r.costMinor)}</Text></View>
                    {recorded !== 0 && <View style={s.fact}><Text maxFontSizeMultiplier={1.4} style={s.factLabel}>Payments already recorded</Text><Text maxFontSizeMultiplier={1.4} style={s.factValue}>{signed(recorded)}</Text></View>}
                    <View style={[s.fact, s.total]}>
                      <Text maxFontSizeMultiplier={1.4} style={s.groupHead}>{r.net > 0 ? (r.isMe ? "You get back" : `${r.name} gets back`) : r.net < 0 ? (r.isMe ? "You owe" : `${r.name} owes`) : "All settled up"}</Text>
                      {r.net !== 0 && <Text maxFontSizeMultiplier={1.4} style={s.groupTotal}>{money(Math.abs(r.net))}</Text>}
                    </View>
                  </View>
                  {lines(owes, r.isMe ? "You need to pay" : `${r.name} needs to pay`, "to", owed.length > 0)}
                  {lines(owed, r.isMe ? "You'll get back from" : `${r.name} gets back from`, "from", owes.length > 0)}
                  {mineToRecord.length > 0 && <Button label="Record a payment" onPress={() => (mineToRecord.length === 1 ? open_(mineToRecord[0]) : (setSheetFor(r.memberId), setSheet(true)))} />}
                </View>
              )}
            </View>
          );
        })}
      </View>

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} onClosed={() => { const x = goTo.current; goTo.current = null; if (x) open_(x); }}
        title="Record a payment" body={sheetFor === mine?.memberId ? "Which of your payments was made?" : `Which payment was made for ${nameOf(sheetFor ?? "")}?`}>
        {recordable(sheetFor ?? "").map((x) => {
          const text = x.from === mine?.memberId ? `You owe ${nameOf(x.to)}` : x.to === mine?.memberId ? `${nameOf(x.from)} owes you` : `${nameOf(x.from)} owes ${nameOf(x.to)}`;
          const amount = formatMinor(x.amountMinor, state.currency.exponent, state.currency.code);
          const payer = whoIs(x.from);
          return (
            <Pressable key={`${x.from}-${x.to}`} accessibilityRole="button" accessibilityLabel={`${text}, ${amount}`}
              onPress={() => { goTo.current = x; setSheet(false); }} style={({ pressed }) => [s.pick, pressed && s.pressed]}>
              <Avatar name={payer?.name ?? ""} uri={payer?.avatarUrl} guest={payer?.guest} size={40} />
              <Text maxFontSizeMultiplier={1.4} style={s.rowName}>{text}</Text>
              <Text maxFontSizeMultiplier={1.4} style={s.rowAmount}>{amount}</Text>
            </Pressable>
          );
        })}
      </BottomSheet>

      <View style={s.export}>
        <Button label={exporting ? "Making PDF…" : "Export as PDF"} type="secondaryNeutral" size="large" disabled={exporting} icon={<FileText size={20} color={color.brandBlack} strokeWidth={2} />}
          onPress={async () => {
            setExporting(true);
            const r = await exportBalancesPdf({ tripName: state.tripName ?? "Trip", currency: state.currency, rows: state.rows, transfers: state.transfers }, new Date());
            setExporting(false);
            if (!r.ok) toast(r.message);
          }} />
      </View>

      {settled && <AllSettled />}
    </>
  );
}

const s = StyleSheet.create({
  gap: { gap: space.s8 },
  mine: { gap: space.s4, padding: space.s20, borderRadius: radius.sheet, borderCurve: "continuous", backgroundColor: color.softGrey },
  mineLabel: { ...type.fieldValue, color: color.charcoal },
  mineText: { ...type.display, fontSize: 30, lineHeight: 36, letterSpacing: track(30), color: color.brandBlack, fontVariant: ["tabular-nums"] },
  section: { ...type.fieldValue, fontFamily: font.medium, color: color.obsidian, marginTop: space.s16 },
  cards: { gap: space.s12 },
  card: { padding: space.s16, borderRadius: radius.card, borderCurve: "continuous", backgroundColor: color.softGrey },
  head: { flexDirection: "row", alignItems: "center", gap: space.s12, minHeight: 48 },
  personName: { ...type.label, flex: 1, color: color.obsidian },
  statusCol: { alignItems: "flex-end" },
  statusLabel: { ...type.fieldMessage, color: color.slate },
  statusAmount: { ...type.label, fontFamily: font.medium, color: color.obsidian, fontVariant: ["tabular-nums"] },
  flip: { transform: [{ rotate: "180deg" }] },
  stats: { flexDirection: "row", gap: space.s8, marginTop: space.s12 },
  stat: { flex: 1, gap: 2, padding: space.s12, borderRadius: radius.small, borderCurve: "continuous", backgroundColor: color.paper },
  statName: { ...type.fieldMessage, color: color.slate },
  statValue: { ...type.label, color: color.obsidian, fontVariant: ["tabular-nums"] },
  body: { marginTop: space.s12, gap: space.s16 },
  panel: { gap: space.s4, padding: space.s12, borderRadius: radius.small, borderCurve: "continuous", backgroundColor: color.paper },
  fact: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.s12, minHeight: 28 },
  factLabel: { ...type.fieldMessage, color: color.slate, flexShrink: 1 },
  factValue: { ...type.label, color: color.obsidian, fontVariant: ["tabular-nums"] },
  total: { borderTopWidth: 1, borderTopColor: color.borderNeutral, marginTop: space.s4, paddingTop: space.s8 },
  group: { gap: space.s4, padding: space.s12, borderRadius: radius.small, borderCurve: "continuous", backgroundColor: color.paper },
  groupHead: { ...type.fieldValue, fontFamily: font.medium, color: color.obsidian, flexShrink: 1 },
  groupTotal: { ...type.label, fontFamily: font.medium, color: color.obsidian, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", alignItems: "center", gap: space.s12, minHeight: 48, paddingVertical: space.s4 },
  rowName: { ...type.fieldValue, flex: 1, color: color.obsidian },
  rowAmount: { ...type.label, color: color.obsidian, fontVariant: ["tabular-nums"], textAlign: "right" },
  pressed: { opacity: 0.7 },
  export: { marginTop: space.s16 },
  ring: { padding: 2, borderRadius: radius.pill, backgroundColor: color.paper },   // white ring so a photo-less avatar does not blend into the grey card
  pick: { flexDirection: "row", alignItems: "center", gap: space.s12, minHeight: 56, paddingVertical: space.s8 },
  line: { ...type.fieldValue, flex: 1, color: color.obsidian },
  settled: { flexDirection: "row", alignItems: "center", gap: space.s16, paddingVertical: space.s8 },
  badge: { width: 40, height: 40, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey, alignItems: "center", justifyContent: "center" },
  sectionFirst: { marginTop: 0 },
});
