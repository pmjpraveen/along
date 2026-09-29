import { Alert } from "../../../src/components/Alert";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { Divider } from "../../../src/components/Divider";
import { Card } from "../../../src/components/Card";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BalancesResult, loadBalances } from "../../../src/api/balances";
import { TextButton } from "../../../src/components/Buttons";
import { describeBalance, describeTransfer, simplifyDebts } from "../../../src/domain/balance";
import { useTripRealtime } from "../../../src/hooks/useTripRealtime";
import { color, radius, space, type } from "../../../src/theme/tokens";

// My net balance first, then the fewest payments that settle the group, then everyone else's net position. All derived on read.
export default function Balances() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<BalancesResult | null>(null);
  const load = useCallback(async () => setState(await loadBalances(id)), [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = usePullToRefresh(load);
  // Live: another member's expense, split or payment refreshes this screen without a pull.
  useTripRealtime(id, ["expenses", "expense_participants", "settlements"], load);
  const mine = state?.ok ? state.rows.find((r) => r.isMe) : undefined;
  const others = state?.ok ? state.rows.filter((r) => !r.isMe) : [];
  const transfers = state?.ok ? simplifyDebts(state.rows.map((r) => ({ memberId: r.memberId, net: r.net }))) : [];
  // I can record a payment I am part of; the owner can also record one that involves a guest, who has no account to do it.
  const canSettle = (t: { from: string; to: string }) => {
    if (!state?.ok) return false;
    if (t.from === mine?.memberId || t.to === mine?.memberId) return true;
    const guestInvolved = state.rows.some((r) => r.guest && (r.memberId === t.from || r.memberId === t.to));
    return !!mine?.isOwner && guestInvolved;
  };
  // Payments that involve me come first.
  const ordered = [...transfers].sort((a, b) => Number(b.from === mine?.memberId || b.to === mine?.memberId) - Number(a.from === mine?.memberId || a.to === mine?.memberId));

  return (
    <ScrollView style={s.screen} refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Balances</Text>
      {state === null ? (
        <ActivityIndicator accessibilityLabel="Loading balances" color={color.forestInk} />
      ) : !state.ok ? (
        <View style={s.gap}>
          <Alert variant="negative">{state.message}</Alert>
          <TextButton label="Retry" onPress={load} />
        </View>
      ) : (
        <>
          {mine && (
            <View accessible style={s.mine}>
              <Text maxFontSizeMultiplier={1.3} style={s.mineText}>{describeBalance(mine.net, mine.name, true, state.currency.exponent, state.currency.code)}</Text>
            </View>
          )}
          <SectionHeader title="To settle up" />
          {ordered.length === 0 ? (
            <Text maxFontSizeMultiplier={1.4} style={s.body}>Everyone is settled up.</Text>
          ) : (
            ordered.map((t) => (
              <Card key={`${t.from}-${t.to}`}>
                <Text maxFontSizeMultiplier={1.4} style={s.line}>
                  {describeTransfer(t, (m) => state.rows.find((r) => r.memberId === m)?.name ?? "Someone", mine?.memberId ?? null, state.currency.exponent, state.currency.code)}
                </Text>
                {canSettle(t) && (
                  <TextButton label="Settle up" onPress={() => router.push({ pathname: "/trip/[id]/settle", params: { id, from: t.from, to: t.to, amount: String(t.amountMinor) } })} />
                )}
              </Card>
            ))
          )}
          <Divider kind="section" />
          <SectionHeader title="Everyone" />
          {others.map((r) => (
            <Card key={r.memberId} accessible>
              <Text maxFontSizeMultiplier={1.4} style={s.line}>{describeBalance(r.net, r.name, false, state.currency.exponent, state.currency.code)}</Text>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s12 },
  heading: { ...type.display, fontSize: 40, lineHeight: 40, letterSpacing: -1.4, color: color.obsidian },
  gap: { gap: space.s8 },
  mine: { padding: space.s16, borderRadius: radius.card, borderCurve: "continuous", backgroundColor: color.neutralWash },
  mineText: { ...type.display, fontSize: 28, lineHeight: 32, color: color.forestInk, fontVariant: ["tabular-nums"] },
  body: { ...type.body, color: color.charcoal },
  line: { ...type.body, color: color.obsidian, fontVariant: ["tabular-nums"] },
  error: { ...type.label, color: color.alarmRed },
});
