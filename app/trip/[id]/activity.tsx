import { Alert } from "../../../src/components/Alert";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";
import { Card } from "../../../src/components/Card";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeedResult, lastSeen, loadFeed, markSeen } from "../../../src/api/feed";
import { TextButton } from "../../../src/components/Buttons";
import { describeEvent, isNew, whenLabel } from "../../../src/domain/feed";
import { useTripRealtime } from "../../../src/hooks/useTripRealtime";
import { color, radius, space, type } from "../../../src/theme/tokens";

// What changed in this trip, newest first: joins, itinerary additions, new expenses. Entries since the last visit are marked New.
export default function Activity() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const [state, setState] = useState<FeedResult | null>(null);
  const [since, setSince] = useState<string | null>(null);
  const visited = useRef(false);

  const load = useCallback(async () => {
    const [feed, seen] = await Promise.all([loadFeed(id), visited.current ? Promise.resolve(undefined) : lastSeen(id)]);
    setState(feed);
    // The marker is read once, when the screen opens, so entries that were new at the start stay marked while others arrive live.
    if (!visited.current && seen !== undefined) { setSince(seen); visited.current = true; }
    if (feed.ok && feed.events.length) markSeen(id, feed.events[0].created_at);
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = usePullToRefresh(load);
  useTripRealtime(id, ["activity_events"], load);

  const now = new Date();
  return (
    <ScrollView style={s.screen} refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Activity</Text>
      {state === null ? (
        <ActivityIndicator accessibilityLabel="Loading activity" color={color.forestInk} />
      ) : !state.ok ? (
        <View style={s.gap}>
          <Alert variant="negative">{state.message}</Alert>
          <TextButton label="Retry" onPress={load} />
        </View>
      ) : state.events.length === 0 ? (
        <Text maxFontSizeMultiplier={1.4} style={s.body}>Nothing yet. When people join, add plans or log expenses, it shows up here.</Text>
      ) : (
        state.events.map((e) => (
          <Card key={e.id} accessible selected={isNew(e.created_at, since)}>
            <Text maxFontSizeMultiplier={1.4} style={s.line}>{isNew(e.created_at, since) ? "New · " : ""}{describeEvent(e)}</Text>
            <Text maxFontSizeMultiplier={1.4} style={s.when}>{whenLabel(e.created_at, now)}</Text>
          </Card>
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
  line: { ...type.body, color: color.obsidian },
  when: { ...type.label, color: color.charcoal },
  body: { ...type.body, color: color.charcoal },
  error: { ...type.label, color: color.alarmRed },
});
