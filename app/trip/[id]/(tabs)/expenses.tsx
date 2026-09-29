import { Alert } from "../../../../src/components/Alert";
import { usePullToRefresh } from "../../../../src/hooks/usePullToRefresh";
import { Card } from "../../../../src/components/Card";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExpensesResult, listExpenses } from "../../../../src/api/expenses";
import { BalancesResult, loadBalances } from "../../../../src/api/balances";
import { describeBalance } from "../../../../src/domain/balance";
import { discardQueued, useQueue } from "../../../../src/offline/sync";
import { PrimaryButton, TextButton } from "../../../../src/components/Buttons";
import { formatMinor } from "../../../../src/domain/money";
import { formatDate } from "../../../../src/domain/trip";
import { useTripRealtime } from "../../../../src/hooks/useTripRealtime";
import { color, radius, space, type } from "../../../../src/theme/tokens";

export default function Expenses() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<ExpensesResult | null>(null);
  const [bal, setBal] = useState<BalancesResult | null>(null);
  const load = useCallback(async () => {
    const [e, b] = await Promise.all([listExpenses(id), loadBalances(id)]);
    setState(e);
    setBal(b);
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = usePullToRefresh(load);
  // Live: another member's expense, split or payment refreshes this screen without a pull.
  useTripRealtime(id, ["expenses", "expense_participants", "settlements"], load);
  // Expenses saved on this phone while offline, shown where they will land, until the server confirms them.
  const queued = useQueue((s) => s.items).filter((i) => i.payload.tripId === id);
  const queuedCount = queued.length;
  useEffect(() => { if (queuedCount >= 0) load(); }, [queuedCount, load]);
  const add = () => router.push({ pathname: "/trip/[id]/add-expense", params: { id } });

  // A queued expense that the server refused for good is a critical banner: it says what failed, why, and offers Discard.
  const queuedRows = queued.map((q) => q.status === "failed" ? (
    <Alert key={q.key} variant="critical" title={`Couldn't sync ${q.payload.title}`} actionLabel={`Discard ${q.payload.title}`}
      onAction={() => discardQueued(q.key)}>
      {q.error ?? "The server refused it."}
    </Alert>
  ) : (
    <Card key={q.key} accessible style={s.queued}>
      <View style={s.row}>
        <Text maxFontSizeMultiplier={1.4} style={s.title}>{q.payload.title}</Text>
        <Text maxFontSizeMultiplier={1.4} style={s.amount}>{state?.ok ? formatMinor(q.payload.amountMinor, state.currency.exponent, state.currency.code) : ""}</Text>
      </View>
      <Text maxFontSizeMultiplier={1.4} style={s.meta}>Saved on this phone. Will sync when you're back online.</Text>
    </Card>
  ));

  return (
    <ScrollView style={s.screen} refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s64 + space.s32 }]}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Expenses</Text>
      {state === null ? (
        <ActivityIndicator accessibilityLabel="Loading expenses" color={color.forestInk} />
      ) : !state.ok ? (
        <View style={s.gap}>
          <Alert variant="negative">{state.message}</Alert>
          <TextButton label="Retry" onPress={load} />
        </View>
      ) : state.expenses.length === 0 && queuedCount === 0 ? (
        <View style={s.gap}>
          <Text maxFontSizeMultiplier={1.4} style={s.body}>No expenses yet. Add what you paid and split it in seconds.</Text>
          <PrimaryButton label="Add an expense" onPress={add} />
        </View>
      ) : (
        <>
          {bal?.ok && (() => {
            const mine = bal.rows.find((r) => r.isMe);
            return mine ? (
              <View accessible style={s.balance}>
                <Text maxFontSizeMultiplier={1.3} style={s.balanceText}>{describeBalance(mine.net, mine.name, true, bal.currency.exponent, bal.currency.code)}</Text>
              </View>
            ) : null;
          })()}
          {queuedRows}
          {state.expenses.map((e) => (
            <Card key={e.id} accessible accessibilityLabel={e.canEdit ? `Edit ${e.title}` : undefined}
              disabled={!e.canEdit} onPress={e.canEdit ? () => router.push({ pathname: "/trip/[id]/add-expense", params: { id, expenseId: e.id } }) : undefined}>
              <View style={s.row}>
                <Text maxFontSizeMultiplier={1.4} style={s.title}>{e.title}</Text>
                <Text maxFontSizeMultiplier={1.4} style={s.amount}>{formatMinor(e.amount_minor, state.currency.exponent, state.currency.code)}</Text>
              </View>
              <Text maxFontSizeMultiplier={1.4} style={s.meta}>
                Paid by {e.paidBy}{e.addedBy !== e.paidBy ? ` · added by ${e.addedBy}` : ""} · {formatDate(e.expense_date)}
              </Text>
            </Card>
          ))}
          <PrimaryButton label="Add an expense" onPress={add} />
          <TextButton label="See everyone's balances" onPress={() => router.push({ pathname: "/trip/[id]/balances", params: { id } })} />
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
  balance: { padding: space.s16, borderRadius: radius.card, borderCurve: "continuous", backgroundColor: color.neutralWash },
  balanceText: { ...type.display, fontSize: 24, lineHeight: 28, color: color.forestInk, fontVariant: ["tabular-nums"] },
  queued: { borderStyle: "dashed", borderColor: color.slate },
  row: { flexDirection: "row", justifyContent: "space-between", gap: space.s12 },
  title: { ...type.body, flex: 1, color: color.obsidian },
  amount: { ...type.body, color: color.obsidian, fontVariant: ["tabular-nums"] },
  meta: { ...type.label, color: color.charcoal },
  body: { ...type.body, color: color.charcoal },
  error: { ...type.label, color: color.alarmRed },
});
