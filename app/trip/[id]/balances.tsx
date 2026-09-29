import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BalancesResult, loadBalances } from "../../../src/api/balances";
import { TextButton } from "../../../src/components/Buttons";
import { describeBalance } from "../../../src/domain/balance";
import { color, radius, space, type } from "../../../src/theme/tokens";

// Net position per person, in words. Who pays whom (simplified debts) arrives with settlements in Sprint 5.
export default function Balances() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const [state, setState] = useState<BalancesResult | null>(null);
  const load = useCallback(async () => setState(await loadBalances(id)), [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const rows = state?.ok ? [...state.rows].sort((a, b) => Number(b.isMe) - Number(a.isMe)) : [];

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Balances</Text>
      {state === null ? (
        <ActivityIndicator accessibilityLabel="Loading balances" color={color.forestInk} />
      ) : !state.ok ? (
        <View style={s.gap}>
          <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {state.message}</Text>
          <TextButton label="Retry" onPress={load} />
        </View>
      ) : (
        rows.map((r) => (
          <View key={r.memberId} accessible style={[s.card, r.isMe && s.me]}>
            <Text maxFontSizeMultiplier={1.4} style={s.line}>{describeBalance(r.net, r.name, r.isMe, state.currency.exponent, state.currency.code)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s12 },
  heading: { ...type.display, fontSize: 40, lineHeight: 40, letterSpacing: -1.4, color: color.obsidian },
  gap: { gap: space.s8 },
  card: { padding: space.s16, borderRadius: radius.card, borderWidth: 1.5, borderColor: color.fog },
  me: { borderColor: color.forestInk },
  line: { ...type.body, color: color.obsidian, fontVariant: ["tabular-nums"] },
  error: { ...type.label, color: color.alarmRed },
});
