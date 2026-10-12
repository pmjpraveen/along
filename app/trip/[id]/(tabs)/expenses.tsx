import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import { PINNED_BACK_H, PinnedBack, useScrollY } from "../../../../src/components/PinnedBack";
import Animated from "react-native-reanimated";
import { Skeleton } from "../../../../src/components/Skeleton";
import { Backpack } from "../../../../src/icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SwipeToDelete } from "../../../../src/components/SwipeToDelete";
import { Dialog } from "../../../../src/components/Dialog";
import { haptic } from "../../../../src/haptics";
import { toast } from "../../../../src/stores/toast";
import { BalancesView } from "../../../../src/components/BalancesView";
import { SegmentedControl } from "../../../../src/components/SegmentedControl";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Pressable } from "../../../../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BalancesResult, loadBalances } from "../../../../src/api/balances";
import { deleteExpense, ExpensesResult, listExpenses, loadExpenseAccess } from "../../../../src/api/expenses";
import { Alert } from "../../../../src/components/Alert";
import { AvatarGroup } from "../../../../src/components/Avatar";
import { PrimaryButton, TextButton } from "../../../../src/components/Buttons";
import { CategoryIcon } from "../../../../src/components/CategoryIcon";
import { CARD_COLORS, short } from "../../../../src/domain/trip";
import { groupByDay } from "../../../../src/domain/expenseDays";
import { describeBalance } from "../../../../src/domain/balance";
import { expenseLine } from "../../../../src/domain/expense";
import { formatMinor, moneyParts } from "../../../../src/domain/money";
import { useTripRealtime } from "../../../../src/hooks/useTripRealtime";
import { usePullToRefresh } from "../../../../src/hooks/usePullToRefresh";
import { discardQueued, useQueue } from "../../../../src/offline/sync";
import { color, mix, radius, shadow, space, type, track } from "../../../../src/theme/tokens";
import { Card } from "../../../../src/components/Card";

// The trip's money: what the trip has cost in total and who is in it, then every expense as a row (category, name, what it means for
// me, amount). Tapping a row opens the expense with its split.
export default function Expenses() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const { scrollY, onScroll } = useScrollY();
  const barH = top + space.s16 + PINNED_BACK_H + space.s8;   // the pinned back button's strip: the list scrolls below it, so a sticky day band parks under it
  const router = useRouter();
  const [state, setState] = useState<ExpensesResult | null>(null);
  const [bal, setBal] = useState<BalancesResult | null>(null);
  const [canAdd, setCanAdd] = useState(true);
  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [view, setView] = useState<"transactions" | "balances">("transactions");
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
  const closeDelete = () => { setDeleting(null); setDeleteError(null); };
  const confirmDelete = async () => {
    if (!deleting || deleteBusy) return;
    setDeleteBusy(true);
    const r = await deleteExpense(deleting.id);
    setDeleteBusy(false);
    if (!r.ok) { haptic.warn(); return setDeleteError(r.message); }
    haptic.success();
    toast("Expense deleted");
    setDeleting(null);
    load();
  };
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

  // Everything under the page title as direct children of the scroll view, so each day's band can be a sticky header: it parks just under the back
  // button while that day's transactions scroll beneath it, and the next day's band pushes it away when it arrives.
  const items: ReactNode[] = [];
  const sticky: number[] = [];
  if (state === null) {
    items.push(<Skeleton key="skeleton" label="Loading expenses" variant="expenses" />);
  } else if (!ok) {
    items.push(
      <View key="error" style={s.gap}>
        <Alert variant="negative" persist>{(state as { message: string }).message}</Alert>
        <TextButton label="Retry" onPress={load} />
      </View>);
  } else {
    items.push(
      <View key="summary-wrap">
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
                {!!ok.members?.length && <AvatarGroup people={ok.members} size={40} max={4} onPress={() => router.push({ pathname: "/trip/[id]/guests", params: { id } })} />}
              </View>
            </View>

      </View>);
    if (ok.expenses.length === 0 && queuedCount === 0) {
      items.push(
              <View key="empty" style={s.gap}>
                <Text maxFontSizeMultiplier={1.4} style={s.body}>{canAdd ? "No expenses yet. Add what you paid and split it in seconds." : "No expenses were added. This trip is completed, so only the owner can add one."}</Text>
                {canAdd && <PrimaryButton label="Add an expense" onPress={add} />}
              </View>
      );
    } else {
      items.push(
        <SegmentedControl key="switch" accessibilityLabel="Show" value={view} onChange={setView}
          options={[{ value: "transactions", label: "Transactions" }, { value: "balances", label: "Balances" }]} />);
      if (view === "balances") {
        items.push(<View key="balances"><BalancesView state={bal} tripId={id} onRetry={load} showMine={false} /></View>);
      } else {
        items.push(...queuedRows);
        for (const g of groupByDay(ok.expenses, ok.trip?.start, ok.trip?.end)) {
          const heading = g.outside === "before" ? "Before the trip" : g.outside === "after" ? "After the trip" : g.dayNumber ? `Day ${g.dayNumber} · ${short(g.date!)}` : short(g.date!);
          const dayTotal = formatMinor(g.totalMinor, ok.currency.exponent, ok.currency.code);
          sticky.push(items.length + 1);   // +1: the page title is the first child
          items.push(
            <View key={`day-${g.key}`} accessible accessibilityRole="header" accessibilityLabel={`${heading}, ${dayTotal}`} style={[s.dayBand, { width: screenW }]}>
              <View style={s.dayInner}>
                <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={s.dayTitle}>{heading}</Text>
                <Text maxFontSizeMultiplier={1.3} style={s.dayTotal}>{dayTotal}</Text>
              </View>
            </View>);
          items.push(
            <View key={`rows-${g.key}`} style={s.dayRows}>
              {g.expenses.map((e) => {
                    const line = expenseLine({ meId: ok.meId ?? null, paidById: e.paidById ?? "", addedById: e.addedById ?? "", paidBy: e.paidBy, addedBy: e.addedBy, myShareMinor: e.myShareMinor ?? 0 });
                    const amount = formatMinor(e.amount_minor, ok.currency.exponent, ok.currency.code);
                    const row = (
                      <Pressable accessibilityRole="button" accessibilityLabel={`${e.title}, ${line}, ${amount}`}
                        accessibilityActions={e.canEdit ? [{ name: "delete", label: `Delete ${e.title}` }] : undefined}
                        onAccessibilityAction={() => { if (e.canEdit) { setDeleteError(null); setDeleting({ id: e.id, title: e.title }); } }}
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
                    // Only the person who added an expense, or the trip owner, can swipe a row to delete it (the server enforces the same rule).
                    return (<View key={e.id}>{e.canEdit ? (
                      <SwipeToDelete label={`Delete ${e.title}`} onDelete={() => { setDeleteError(null); setDeleting({ id: e.id, title: e.title }); }}>{row}</SwipeToDelete>
                    ) : row}<View style={s.divider} /></View>);
                  })}
            </View>);
        }
      }
    }
  }

  return (
    <GestureHandlerRootView style={s.screen}>
      <Animated.ScrollView testID="expenses-scroll" onScroll={onScroll} scrollEventThrottle={16} style={[s.scroll, { marginTop: barH }]} contentInsetAdjustmentBehavior="never" refreshControl={pull}
        stickyHeaderIndices={sticky} contentContainerStyle={[s.content, { paddingTop: space.s8, paddingBottom: bottom + space.s64 + space.s32 }]}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Expenses</Text>
        {items}
      </Animated.ScrollView>
      <PinnedBack onPress={back} scrollY={scrollY} />
      <Dialog visible={!!deleting} onClose={closeDelete} title={`Delete ${deleting?.title ?? "expense"}?`} subheader="It's removed for everyone on the trip"
        body={deleteError ?? "Everyone's balances will update. Payments already recorded stay as they are. This can't be undone."}
        actionLabel={deleteBusy ? "Deleting…" : "Delete"} actionType="destructive" onAction={confirmDelete} actionBusy={deleteBusy}
        secondaryLabel="Keep" onSecondary={closeDelete} />
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  scroll: { flex: 1 },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  heading: { ...type.display, fontSize: 30, lineHeight: 36, letterSpacing: track(30), color: color.obsidian, marginTop: 0 },
  gap: { gap: space.s8 },
  divider: { height: 1, marginHorizontal: space.s20, backgroundColor: color.borderNeutral },   // inset, like the guest list
  dayRows: { marginHorizontal: -space.s20, marginTop: -space.s16 },   // up against the day band above, cancelling the page gap   // transaction rows run edge to edge, so a swiped row and its Delete button use the full width
  // The day band, a sticky header. React Native gives a sticky header's own style to a wrapper and replaces the header's style with a plain flex: 1, so
  // the band holds only its colour and size, and one inner view that fills it holds the row (that is what centres the texts vertically). It has no
  // margin (a negative one would crop it); the day's rows pull themselves up against it instead.
  dayBand: { minHeight: 48, marginLeft: -space.s20, paddingHorizontal: space.s20, backgroundColor: color.softGrey },
  dayInner: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.s12 },
  dayTitle: { ...type.fieldValue, flex: 1, lineHeight: 24, color: color.charcoal, fontVariant: ["tabular-nums"] },   // the same style as the total
  dayTotal: { ...type.fieldValue, lineHeight: 24, textAlign: "right", color: color.charcoal, fontVariant: ["tabular-nums"] },
  strips: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  summary: { borderRadius: radius.xLarge, borderCurve: "continuous", overflow: "hidden", paddingBottom: space.s8, paddingHorizontal: space.s8, ...shadow.itemLight },
  tripRow: { flexDirection: "row", alignItems: "center", gap: space.s8, paddingHorizontal: space.s16, paddingVertical: space.s16 },
  tripName: { ...type.label, flex: 1, fontSize: 16, letterSpacing: track(16), lineHeight: 22, color: color.obsidian },
  inner: { gap: space.s8, padding: space.s16, borderRadius: radius.sheet, borderCurve: "continuous", backgroundColor: color.paper },
  innerLabel: { ...type.fieldValue, color: color.charcoal },
  total: { ...type.display, fontSize: 40, lineHeight: 48, letterSpacing: track(40), color: color.obsidian, fontVariant: ["tabular-nums"] },
  frac: { color: color.slate },
  balance: { ...type.fieldMessage, color: color.charcoal },
  section: { ...type.fieldValue, color: color.charcoal, marginTop: space.s16 },
  // Opaque, so the red Delete behind a swiped row stays hidden until the row is moved.
  tx: { flexDirection: "row", alignItems: "center", gap: space.s16, minHeight: 72, paddingVertical: space.s16, paddingHorizontal: space.s20, backgroundColor: color.paper },
  pressed: { backgroundColor: color.softGrey },
  txText: { flex: 1, gap: 2 },
  title: { ...type.label, fontSize: 17, letterSpacing: track(17), lineHeight: 24, color: color.obsidian },
  sub: { ...type.fieldMessage, color: color.slate },
  amount: { ...type.label, fontSize: 17, letterSpacing: track(17), color: color.obsidian, fontVariant: ["tabular-nums"] },
  queued: { borderStyle: "dashed", borderColor: color.slate },
  queuedRow: { flexDirection: "row", justifyContent: "space-between", gap: space.s12 },
  body: { ...type.fieldValue, color: color.charcoal },
});
