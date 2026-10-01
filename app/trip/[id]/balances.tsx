import { Alert } from "../../../src/components/Alert";
import { Avatar } from "../../../src/components/Avatar";
import { ChevronLeft } from "lucide-react-native";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "../../../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BalancesResult, loadBalances } from "../../../src/api/balances";
import { Button, TextButton } from "../../../src/components/Buttons";
import { describeBalance, describeTransfer, simplifyDebts } from "../../../src/domain/balance";
import { useTripRealtime } from "../../../src/hooks/useTripRealtime";
import { color, font, radius, space, type } from "../../../src/theme/tokens";

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

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const nameOf = (m: string) => state?.ok ? state.rows.find((r) => r.memberId === m)?.name ?? "Someone" : "Someone";

  return (
    <View style={s.screen}>
      <ScrollView style={s.scroll} contentInsetAdjustmentBehavior="never" refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: top + space.s16, paddingBottom: bottom + space.s24 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={space.s4} style={s.round}>
          <ChevronLeft size={22} color={color.brandBlack} strokeWidth={1.75} />
        </Pressable>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Balances</Text>
        {state === null ? (
          <ActivityIndicator accessibilityLabel="Loading balances" color={color.brandBlack} />
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
                      <Avatar name={nameOf(t.from)} size={40} />
                      <Text maxFontSizeMultiplier={1.4} style={s.line}>{describeTransfer(t, nameOf, mine?.memberId ?? null, state.currency.exponent, state.currency.code)}</Text>
                      {canSettle(t) && (
                        <Button label="Settle up" type="secondaryNeutral" size="small" onPress={() => router.push({ pathname: "/trip/[id]/settle", params: { id, from: t.from, to: t.to, amount: String(t.amountMinor) } })} />
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.section}>Everyone</Text>
            <View>
              {others.map((r) => (
                <View key={r.memberId} accessible style={s.row}>
                  <Avatar name={r.name} guest={r.guest} size={40} />
                  <Text maxFontSizeMultiplier={1.4} style={s.line}>{describeBalance(r.net, r.name, false, state.currency.exponent, state.currency.code)}</Text>
                </View>
              ))}
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
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  heading: { fontFamily: type.sheetTitle.fontFamily, fontSize: 32, lineHeight: 38, letterSpacing: -0.8, color: color.brandBlack, marginVertical: space.s8 },
  gap: { gap: space.s8 },
  mine: { gap: space.s4, padding: space.s20, borderRadius: radius.sheet, borderCurve: "continuous", backgroundColor: color.softGrey },
  mineLabel: { ...type.fieldValue, color: color.charcoal },
  mineText: { ...type.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: color.brandBlack, fontVariant: ["tabular-nums"] },
  section: { ...type.fieldValue, fontFamily: font.medium, color: color.obsidian, marginTop: space.s16 },
  row: { flexDirection: "row", alignItems: "center", gap: space.s16, minHeight: 72, paddingVertical: space.s12, borderBottomWidth: 1, borderBottomColor: color.borderNeutral },
  body: { ...type.fieldValue, color: color.charcoal },
  line: { ...type.fieldValue, flex: 1, color: color.obsidian, fontVariant: ["tabular-nums"] },
});
