import { Alert } from "../../../src/components/Alert";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadTripSummary, SummaryResult } from "../../../src/api/passport";
import { OutlinedButton, TextButton } from "../../../src/components/Buttons";
import { TripSummaryCards } from "../../../src/components/TripSummaryCards";
import { formatDate } from "../../../src/domain/trip";
import { color, space, type } from "../../../src/theme/tokens";

// The trip at a glance: who came, what was planned, what was spent, what is still to settle. Read-only, works for any status.
export default function Summary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<SummaryResult | null>(null);
  const load = useCallback(async () => setState(await loadTripSummary(id)), [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const go = (screen: "memories" | "balances" | "expenses") =>
    router.push({ pathname: `/trip/[id]/${screen}` as "/trip/[id]/memories", params: { id } });

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
      {state === null ? (
        <ActivityIndicator accessibilityLabel="Loading trip summary" color={color.forestInk} />
      ) : !state.ok ? (
        <View style={s.gap}>
          <Alert variant="negative">{state.message}</Alert>
          <TextButton label="Retry" onPress={load} />
        </View>
      ) : (
        <>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>{state.summary.destination_name}</Text>
          <Text maxFontSizeMultiplier={1.4} style={s.body}>{state.summary.name} · {formatDate(state.summary.start_date)} → {formatDate(state.summary.end_date)}</Text>
          <TripSummaryCards summary={state.summary} />
          <OutlinedButton label="Memories" onPress={() => go("memories")} />
          <OutlinedButton label="Balances" onPress={() => go("balances")} />
          <OutlinedButton label="Expenses" onPress={() => go("expenses")} />
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
  body: { ...type.body, color: color.charcoal },
  error: { ...type.label, color: color.alarmRed },
});
