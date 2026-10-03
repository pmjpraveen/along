import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import { PinnedBack, useContentTop, useScrollY } from "../../../../src/components/PinnedBack";
import Animated from "react-native-reanimated";
import { Skeleton } from "../../../../src/components/Skeleton";
import { ChevronLeft } from "../../../../src/icons";
import { useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "../../../../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeedResult, lastSeen, loadFeed, markSeen } from "../../../../src/api/feed";
import { Alert } from "../../../../src/components/Alert";
import { Avatar } from "../../../../src/components/Avatar";
import { Badge } from "../../../../src/components/Badge";
import { TextButton } from "../../../../src/components/Buttons";
import { clock12, describeEvent, describeParts, groupByDayHeading, isNew } from "../../../../src/domain/feed";
import { usePullToRefresh } from "../../../../src/hooks/usePullToRefresh";
import { useTripRealtime } from "../../../../src/hooks/useTripRealtime";
import { color, font, radius, space, type } from "../../../../src/theme/tokens";

// What changed in this trip, newest first, under a heading per day: joins, plans added, new expenses. Entries since the last visit are
// marked New.
export default function Activity() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const { scrollY, onScroll } = useScrollY();
  const contentTop = useContentTop();
  const router = useRouter();
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
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const now = new Date();
  const days = state?.ok ? groupByDayHeading(state.events, now) : [];
  return (
    <View style={s.screen}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} style={s.scroll} contentInsetAdjustmentBehavior="never" refreshControl={pull}
        contentContainerStyle={[s.content, { paddingTop: contentTop, paddingBottom: bottom + space.s64 + space.s32 }]}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Activity</Text>

        {state === null ? (
          <Skeleton label="Loading history" />
        ) : !state.ok ? (
          <View style={s.gap}>
            <Alert variant="negative" persist>{state.message}</Alert>
            <TextButton label="Retry" onPress={load} />
          </View>
        ) : state.events.length === 0 ? (
          <Text maxFontSizeMultiplier={1.4} style={s.body}>Nothing yet. Joins, plans and expenses will show up here as they happen.</Text>
        ) : (
          days.map((d) => (
            <View key={d.heading}>
              <View style={s.dayRow} accessibilityRole="header" accessible accessibilityLabel={d.heading}>
                <View style={s.rule} />
                <Text maxFontSizeMultiplier={1.3} style={s.day}>{d.heading}</Text>
                <View style={s.rule} />
              </View>
              {d.events.map((e, i) => {
                const fresh = isNew(e.created_at, since);
                return (
                  <View key={e.id} accessible accessibilityLabel={`${fresh ? "New. " : ""}${describeEvent(e)}, ${clock12(e.created_at)}`} style={[s.item, i === d.events.length - 1 && s.itemLast]}>
                    <Avatar name={e.actor ?? "?"} size={40} />
                    <View style={s.text}>
                      <Text maxFontSizeMultiplier={1.4} style={s.line}>
                        {describeParts(e).map((p, i) => <Text key={i} style={p.bold ? s.bold : undefined}>{p.text}</Text>)}
                      </Text>
                      {fresh && <Badge label="New" variant="success" />}
                    </View>
                    <Text maxFontSizeMultiplier={1.4} style={s.time}>{clock12(e.created_at)}</Text>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </Animated.ScrollView>
      <PinnedBack onPress={back} scrollY={scrollY} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  scroll: { flex: 1 },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  heading: { ...type.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: color.obsidian },
  gap: { gap: space.s8 },
  dayRow: { flexDirection: "row", alignItems: "center", gap: space.s16, marginTop: space.s8, marginBottom: space.s8 },
  rule: { flex: 1, height: 1, backgroundColor: color.borderNeutral },
  day: { ...type.fieldMessage, color: color.slate },
  itemLast: { borderBottomWidth: 0 },   // no divider under the last entry of a day (or of the page)
  item: { flexDirection: "row", alignItems: "flex-start", gap: space.s16, paddingVertical: space.s16, borderBottomWidth: 1, borderBottomColor: color.borderNeutral },
  text: { flex: 1, gap: space.s8, alignItems: "flex-start" },
  line: { ...type.fieldValue, color: color.charcoal },
  bold: { fontFamily: font.medium, color: color.obsidian },
  time: { ...type.fieldMessage, color: color.slate, fontVariant: ["tabular-nums"] },
  body: { ...type.fieldValue, color: color.charcoal },
});
