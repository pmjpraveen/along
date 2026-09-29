import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listTrips, TripListResult } from "../src/api/trips";
import { Alert } from "../src/components/Alert";
import { Card } from "../src/components/Card";
import { TextButton } from "../src/components/Buttons";
import { formatRange } from "../src/domain/trip";
import { usePullToRefresh } from "../src/hooks/usePullToRefresh";
import { color, space, type } from "../src/theme/tokens";

// Trips that are over, most recent first. Opens a trip's summary.
export default function History() {
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<TripListResult | null>(null);
  const load = useCallback(async () => setState(await listTrips()), []);
  useEffect(() => { load(); }, [load]);
  const pull = usePullToRefresh(load);
  const past = state?.ok ? state.trips.filter((t) => t.phase === "completed" || t.phase === "archived") : [];

  return (
    <View style={s.screen}>
      <ScrollView style={s.scroll} refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Trip history</Text>
        {state === null ? (
          <ActivityIndicator accessibilityLabel="Loading your trips" color={color.forestInk} />
        ) : !state.ok ? (
          <View style={s.gap}>
            <Alert variant="negative">{state.message}</Alert>
            <TextButton label="Retry" onPress={load} />
          </View>
        ) : past.length === 0 ? (
          <Text maxFontSizeMultiplier={1.4} style={s.body}>No finished trips yet. Once you complete one, it lands here.</Text>
        ) : (
          past.map((t) => (
            <Card key={t.id} accessibilityLabel={`${t.name}, ${t.destination_name}`} onPress={() => router.push({ pathname: "/trip/[id]/summary", params: { id: t.id } })}>
              <Text maxFontSizeMultiplier={1.3} style={s.name}>{t.name}</Text>
              <Text maxFontSizeMultiplier={1.4} style={s.body}>{t.destination_name} · {formatRange(t.start_date, t.end_date)}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  scroll: { flex: 1 },
  content: { paddingHorizontal: space.s20, gap: space.s12 },
  heading: { ...type.display, fontSize: 40, lineHeight: 40, letterSpacing: -1.4, color: color.obsidian },
  gap: { gap: space.s8 },
  name: { ...type.label, color: color.obsidian },
  body: { ...type.fieldValue, color: color.charcoal },
});
