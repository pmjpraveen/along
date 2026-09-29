import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExpensesResult, listExpenses } from "../../../src/api/expenses";
import { BalancesResult, loadBalances } from "../../../src/api/balances";
import { describeBalance } from "../../../src/domain/balance";
import { discardQueued, useQueue } from "../../../src/offline/sync";
import { PrimaryButton, TextButton } from "../../../src/components/Buttons";
import { formatMinor } from "../../../src/domain/money";
import { formatDate } from "../../../src/domain/trip";
import { useTripRealtime } from "../../../src/hooks/useTripRealtime";
import { color, radius, space, type } from "../../../src/theme/tokens";

export default function Expenses() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
  // Live: another member's expense, split or payment refreshes this screen without a pull.
  useTripRealtime(id, ["expenses", "expense_participants", "settlements"], load);
  // Expenses saved on this phone while offline, shown where they will land, until the server confirms them.
  const queued = useQueue((s) => s.items).filter((i) => i.payload.tripId === id);
  const queuedCount = queued.length;
  useEffect(() => { if (queuedCount >= 0) load(); }, [queuedCount, load]);
  const add = () => router.push({ pathname: "/trip/[id]/add-expense", params: { id } });

  const queuedRows = queued.map((q) => (
    <View key={q.key} accessible style={[s.card, s.queued]}>
      <View style={s.row}>
        <Text maxFontSizeMultiplier={1.4} style={s.title}>{q.payload.title}</Text>
        <Text maxFontSizeMultiplier={1.4} style={s.amount}>{state?.ok ? formatMinor(q.payload.amountMinor, state.currency.exponent, state.currency.code) : ""}</Text>
      </View>
      <Text maxFontSizeMultiplier={1.4} style={s.meta}>
        {q.status === "failed" ? `Couldn't sync: ${q.error}` : "Saved on this phone. Will sync when you're back online."}
      </Text>
      {q.status === "failed" && <TextButton label={`Discard ${q.payload.title}`} onPress={() => discardQueued(q.key)} />}
    </View>
  ));

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Expenses</Text>
      {state === null ? (
        <ActivityIndicator accessibilityLabel="Loading expenses" color={color.forestInk} />
      ) : !state.ok ? (
        <View style={s.gap}>
          <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {state.message}</Text>
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
            <Pressable key={e.id} accessible accessibilityRole={e.canEdit ? "button" : undefined} accessibilityLabel={e.canEdit ? `Edit ${e.title}` : undefined}
              disabled={!e.canEdit} onPress={() => router.push({ pathname: "/trip/[id]/add-expense", params: { id, expenseId: e.id } })} style={s.card}>
              <View style={s.row}>
                <Text maxFontSizeMultiplier={1.4} style={s.title}>{e.title}</Text>
                <Text maxFontSizeMultiplier={1.4} style={s.amount}>{formatMinor(e.amount_minor, state.currency.exponent, state.currency.code)}</Text>
              </View>
              <Text maxFontSizeMultiplier={1.4} style={s.meta}>
                Paid by {e.paidBy}{e.addedBy !== e.paidBy ? ` · added by ${e.addedBy}` : ""} · {formatDate(e.expense_date)}
              </Text>
            </Pressable>
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
  balance: { padding: space.s16, borderRadius: radius.card, backgroundColor: color.fog },
  balanceText: { ...type.display, fontSize: 24, lineHeight: 28, color: color.forestInk, fontVariant: ["tabular-nums"] },
  queued: { borderStyle: "dashed", borderColor: color.slate },
  card: { gap: space.s4, padding: space.s16, borderRadius: radius.card, borderWidth: 1.5, borderColor: color.fog },
  row: { flexDirection: "row", justifyContent: "space-between", gap: space.s12 },
  title: { ...type.body, flex: 1, color: color.obsidian },
  amount: { ...type.body, color: color.obsidian, fontVariant: ["tabular-nums"] },
  meta: { ...type.label, color: color.charcoal },
  body: { ...type.body, color: color.charcoal },
  error: { ...type.label, color: color.alarmRed },
});
