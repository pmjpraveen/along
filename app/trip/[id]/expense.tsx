import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "../../../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExpenseViewResult, loadExpenseView } from "../../../src/api/expenses";
import { Alert } from "../../../src/components/Alert";
import { Avatar } from "../../../src/components/Avatar";
import { Badge } from "../../../src/components/Badge";
import { PrimaryButton, TextButton } from "../../../src/components/Buttons";
import { CategoryIcon } from "../../../src/components/CategoryIcon";
import { METHOD_LABEL, shareBp } from "../../../src/domain/expense";
import { formatMinor, moneyParts } from "../../../src/domain/money";
import { formatPercent } from "../../../src/domain/split";
import { formatDate } from "../../../src/domain/trip";
import { color, radius, space, type } from "../../../src/theme/tokens";

// One expense: the total, who paid and who added it, and how it was split: each person's share, its percentage of the total, and (for
// percentage and share splits) the value that was entered. The person who added it, or the trip owner, can edit it.
export default function ExpenseDetail() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<ExpenseViewResult | null>(null);
  const load = useCallback(async () => setState(await loadExpenseView(id, expenseId)), [id, expenseId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const x = state?.ok ? state.expense : null;
  const parts = x ? moneyParts(x.amountMinor, x.currency.exponent, x.currency.code) : null;

  return (
    <ScrollView style={s.screen} contentInsetAdjustmentBehavior="never" contentContainerStyle={[s.content, { paddingTop: top + space.s16, paddingBottom: bottom + space.s24 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={space.s4} style={s.round}>
        <ChevronLeft size={22} color={color.brandBlack} strokeWidth={1.75} />
      </Pressable>
      {state === null ? (
        <ActivityIndicator accessibilityLabel="Loading expense" color={color.forestInk} />
      ) : !x ? (
        <View style={s.gap}>
          <Alert variant="negative" persist>{(state as { message: string }).message}</Alert>
          <TextButton label="Retry" onPress={load} />
        </View>
      ) : (
        <>
          <View style={s.head}>
            <CategoryIcon category={x.category} size={56} />
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={s.title}>{x.title}</Text>
            {parts && <Text maxFontSizeMultiplier={1.2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={s.total}>{parts.prefix} {parts.whole}<Text style={s.frac}>{parts.frac}</Text></Text>}
            <Text maxFontSizeMultiplier={1.4} style={s.meta}>{formatDate(x.date)}</Text>
          </View>

          <View style={s.card}>
            <View style={s.row}><Text maxFontSizeMultiplier={1.4} style={s.label}>Paid by</Text><Text maxFontSizeMultiplier={1.4} style={s.value}>{x.paidBy}</Text></View>
            <View style={s.line} />
            <View style={s.row}><Text maxFontSizeMultiplier={1.4} style={s.label}>Added by</Text><Text maxFontSizeMultiplier={1.4} style={s.value}>{x.addedBy}</Text></View>
          </View>

          <View style={s.split}>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.section}>Split with</Text>
            <Badge label={METHOD_LABEL[x.method]} />
          </View>
          <View>
            {x.people.map((p, i) => {
              const bp = shareBp(p.owedMinor, x.amountMinor);
              const entered = x.method === "shares" && p.value !== null ? `${p.value} ${p.value === 1 ? "share" : "shares"}` : null;
              return (
                <View key={`${p.name}-${i}`} accessible accessibilityLabel={`${p.isMe ? "You" : p.name}, ${formatMinor(p.owedMinor, x.currency.exponent, x.currency.code)}, ${formatPercent(bp)} percent`} style={s.person}>
                  <Avatar name={p.name} uri={p.uri} guest={p.guest} size={40} />
                  <View style={s.personText}>
                    <Text maxFontSizeMultiplier={1.4} style={s.name}>{p.isMe ? "You" : p.name}</Text>
                    <Text maxFontSizeMultiplier={1.4} style={s.sub}>{[`${formatPercent(bp)}%`, entered].filter(Boolean).join(" · ")}</Text>
                  </View>
                  <Text maxFontSizeMultiplier={1.4} style={s.share}>{formatMinor(p.owedMinor, x.currency.exponent, x.currency.code)}</Text>
                </View>
              );
            })}
          </View>

          {x.canEdit && <PrimaryButton label="Edit expense" onPress={() => router.push({ pathname: "/trip/[id]/add-expense", params: { id, expenseId: x.id } })} />}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  head: { alignItems: "center", gap: space.s8 },
  title: { ...type.sheetTitle, fontSize: 24, lineHeight: 30, letterSpacing: -0.4, textAlign: "center", color: color.obsidian },
  total: { ...type.display, fontSize: 40, lineHeight: 48, letterSpacing: -1.2, color: color.obsidian, fontVariant: ["tabular-nums"] },
  frac: { color: color.slate },
  meta: { ...type.fieldValue, color: color.charcoal },
  card: { padding: space.s20, gap: space.s12, borderRadius: radius.sheet, borderCurve: "continuous", backgroundColor: color.neutralWash },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.s16 },
  line: { height: 1, backgroundColor: color.borderNeutral },
  label: { ...type.fieldValue, color: color.slate },
  value: { ...type.fieldValue, color: color.obsidian },
  split: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.s8 },
  section: { ...type.fieldValue, color: color.charcoal },
  person: { flexDirection: "row", alignItems: "center", gap: space.s16, minHeight: 64, paddingVertical: space.s12, borderBottomWidth: 1, borderBottomColor: color.borderNeutral },
  personText: { flex: 1, gap: 2 },
  name: { ...type.label, fontSize: 17, color: color.obsidian },
  sub: { ...type.fieldMessage, color: color.slate },
  share: { ...type.label, fontSize: 17, color: color.obsidian, fontVariant: ["tabular-nums"] },
  gap: { gap: space.s8 },
});
