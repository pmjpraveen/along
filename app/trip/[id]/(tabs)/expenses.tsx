import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import { Backpack, ChevronLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "../../../../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BalancesResult, loadBalances } from "../../../../src/api/balances";
import { ExpensesResult, listExpenses, loadExpenseAccess } from "../../../../src/api/expenses";
import { Alert } from "../../../../src/components/Alert";
import { AvatarGroup } from "../../../../src/components/Avatar";
import { PrimaryButton, TextButton } from "../../../../src/components/Buttons";
import { CategoryIcon } from "../../../../src/components/CategoryIcon";
import { CARD_COLORS } from "../../../../src/domain/trip";
import { describeBalance } from "../../../../src/domain/balance";
import { expenseLine } from "../../../../src/domain/expense";
import { formatMinor, moneyParts } from "../../../../src/domain/money";
import { useTripRealtime } from "../../../../src/hooks/useTripRealtime";
import { usePullToRefresh } from "../../../../src/hooks/usePullToRefresh";
import { discardQueued, useQueue } from "../../../../src/offline/sync";
import { color, mix, radius, shadow, space, type } from "../../../../src/theme/tokens";
import { Card } from "../../../../src/components/Card";

// The trip's money: what the trip has cost in total and who is in it, then every expense as a row (category, name, what it means for
// me, amount). Tapping a row opens the expense with its split.
export default function Expenses() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<ExpensesResult | null>(null);
  const [bal, setBal] = useState<BalancesResult | null>(null);
  const [canAdd, setCanAdd] = useState(true);
  const load = useCallback(async () => {
    const [e, b, access] = await Promise.all([listExpenses(id), loadBalances(id), loadExpenseAccess(id)]);
    setState(e);
    setBal(b);
    setCanAdd(access);
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
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  // A queued expense that the server refused for good is a critical banner: it says what failed, why, and offers Discard.
  const queuedRows = queued.map((q) => q.status === "failed" ? (
    <Alert key={q.key} variant="critical" title={`Couldn't sync ${q.payload.title}`} actionLabel={`Discard ${q.payload.title}`}
      onAction={() => discardQueued(q.key)}>
      {q.error ?? "That didn't go through."}
    </Alert>
  ) : (
    <Card key={q.key} accessible style={s.queued}>
      <View style={s.queuedRow}>
        <Text maxFontSizeMultiplier={1.4} style={s.title}>{q.payload.title}</Text>
        <Text maxFontSizeMultiplier={1.4} style={s.amount}>{state?.ok ? formatMinor(q.payload.amountMinor, state.currency.exponent, state.currency.code) : ""}</Text>
      </View>
      <Text maxFontSizeMultiplier={1.4} style={s.sub}>Saved on your phone. It'll sync when you're back online.</Text>
    </Card>
  ));

  const ok = state?.ok ? state : null;
  const total = ok ? ok.expenses.reduce((sum, e) => sum + e.amount_minor, 0) : 0;
  const parts = ok ? moneyParts(total, ok.currency.exponent, ok.currency.code) : null;
  const tint = CARD_COLORS[ok?.trip?.cardColor ?? 2];   // the colour picked for this trip (every trip has one)
  const mine = bal?.ok ? bal.rows.find((r) => r.isMe) : undefined;

  return (
    <View style={s.screen}>
      <ScrollView style={s.scroll} contentInsetAdjustmentBehavior="never" refreshControl={pull}
        contentContainerStyle={[s.content, { paddingTop: top + space.s16, paddingBottom: bottom + space.s64 + space.s32 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={space.s4} style={s.round}>
          <ChevronLeft size={22} color={color.brandBlack} strokeWidth={1.75} />
        </Pressable>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Expenses</Text>

        {state === null ? (
          <ActivityIndicator accessibilityLabel="Loading expenses" color={color.forestInk} />
        ) : !ok ? (
          <View style={s.gap}>
            <Alert variant="negative" persist>{(state as { message: string }).message}</Alert>
            <TextButton label="Retry" onPress={load} />
          </View>
        ) : (
          <>
            <View style={[s.summary, { backgroundColor: tint }]}>
              {/* A soft gradient in the trip's own card colour, easing to a lighter tint of it at the bottom. */}
              <View style={s.strips}>
                {Array.from({ length: 48 }, (_, i) => <View key={i} style={{ flex: 1, backgroundColor: mix(tint, mix(tint, "#ffffff", 0.7), i / 47) }} />)}
              </View>
              <View style={s.tripRow}>
                <Backpack size={20} color={color.iconInk} strokeWidth={1.75} />
                <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={s.tripName}>Trip to {ok.trip?.destination ?? ok.trip?.name ?? ""}</Text>
              </View>
              <View accessible accessibilityLabel={`Total expenses ${formatMinor(total, ok.currency.exponent, ok.currency.code)}`} style={s.inner}>
                <Text maxFontSizeMultiplier={1.3} style={s.innerLabel}>Expenses</Text>
                {parts && (
                  <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={s.total}>
                    <Text style={s.frac}>{parts.prefix}</Text> {parts.whole}<Text style={s.frac}>{parts.frac}</Text>
                  </Text>
                )}
                {mine && bal?.ok && <Text maxFontSizeMultiplier={1.4} style={s.balance}>{describeBalance(mine.net, mine.name, true, bal.currency.exponent, bal.currency.code)}</Text>}
                {!!ok.members?.length && <AvatarGroup people={ok.members} size={40} max={4} />}
              </View>
            </View>

            {ok.expenses.length === 0 && queuedCount === 0 ? (
              <View style={s.gap}>
                <Text maxFontSizeMultiplier={1.4} style={s.body}>{canAdd ? "No expenses yet. Add what you paid and split it in seconds." : "No expenses were added. This trip is completed, so only the owner can add one."}</Text>
                {canAdd && <PrimaryButton label="Add an expense" onPress={add} />}
              </View>
            ) : (
              <>
                <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.section}>Transactions</Text>
                {queuedRows}
                <View>
                  {ok.expenses.map((e) => {
                    const line = expenseLine({ meId: ok.meId ?? null, paidById: e.paidById ?? "", addedById: e.addedById ?? "", paidBy: e.paidBy, addedBy: e.addedBy, myShareMinor: e.myShareMinor ?? 0 });
                    const amount = formatMinor(e.amount_minor, ok.currency.exponent, ok.currency.code);
                    return (
                      <Pressable key={e.id} accessibilityRole="button" accessibilityLabel={`${e.title}, ${line}, ${amount}`}
                        onPress={() => router.push({ pathname: "/trip/[id]/expense", params: { id, expenseId: e.id } })}
                        style={({ pressed }) => [s.tx, pressed && s.pressed]}>
                        <CategoryIcon category={e.category} />
                        <View style={s.txText}>
                          <Text maxFontSizeMultiplier={1.4} style={s.title}>{e.title}</Text>
                          <Text maxFontSizeMultiplier={1.4} style={s.sub}>{line}</Text>
                        </View>
                        <Text maxFontSizeMultiplier={1.4} style={s.amount}>{amount}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextButton label="See everyone's balances" onPress={() => router.push({ pathname: "/trip/[id]/balances", params: { id } })} />
              </>
            )}
          </>
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
  heading: { ...type.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: color.obsidian, marginTop: 0 },
  gap: { gap: space.s8 },
  strips: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  summary: { borderRadius: radius.xLarge, borderCurve: "continuous", overflow: "hidden", paddingBottom: space.s8, paddingHorizontal: space.s8, ...shadow.itemLight },
  tripRow: { flexDirection: "row", alignItems: "center", gap: space.s8, paddingHorizontal: space.s16, paddingVertical: space.s16 },
  tripName: { ...type.label, flex: 1, fontSize: 16, lineHeight: 22, color: color.obsidian },
  inner: { gap: space.s8, padding: space.s16, borderRadius: radius.sheet, borderCurve: "continuous", backgroundColor: color.paper },
  innerLabel: { ...type.fieldValue, color: color.charcoal },
  total: { ...type.display, fontSize: 40, lineHeight: 48, letterSpacing: -1.2, color: color.obsidian, fontVariant: ["tabular-nums"] },
  frac: { color: color.slate },
  balance: { ...type.fieldMessage, color: color.charcoal },
  section: { ...type.fieldValue, color: color.charcoal, marginTop: space.s16 },
  tx: { flexDirection: "row", alignItems: "center", gap: space.s16, minHeight: 72, paddingVertical: space.s16, borderBottomWidth: 1, borderBottomColor: color.borderNeutral },
  pressed: { backgroundColor: color.neutralWash },
  txText: { flex: 1, gap: 2 },
  title: { ...type.label, fontSize: 17, lineHeight: 24, color: color.obsidian },
  sub: { ...type.fieldMessage, color: color.slate },
  amount: { ...type.label, fontSize: 17, color: color.obsidian, fontVariant: ["tabular-nums"] },
  queued: { borderStyle: "dashed", borderColor: color.slate },
  queuedRow: { flexDirection: "row", justifyContent: "space-between", gap: space.s12 },
  body: { ...type.fieldValue, color: color.charcoal },
});
