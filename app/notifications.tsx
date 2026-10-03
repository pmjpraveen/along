import { useFocusEffect, useRouter } from "expo-router";
import { Skeleton } from "../src/components/Skeleton";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InboxResult, loadInbox, markRead } from "../src/api/notifications";
import { Alert } from "../src/components/Alert";
import { TextButton } from "../src/components/Buttons";
import { NotificationItem } from "../src/components/NotificationItem";
import { clock12, groupByDayHeading } from "../src/domain/feed";
import { describeParts, Notification, notificationActor, routeFor } from "../src/domain/notifications";
import { usePullToRefresh } from "../src/hooks/usePullToRefresh";
import { useMyNotificationsRealtime } from "../src/hooks/useTripRealtime";
import { color, radius, space, type } from "../src/theme/tokens";

// The in-app notification centre, laid out like a trip's History: newest first under a heading per day. It works without push: push only
// adds a nudge on top of what is listed here. What to be told about is chosen in Profile, under Settings.
export default function Notifications() {
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<InboxResult | null>(null);
  const load = useCallback(async () => setState(await loadInbox()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = usePullToRefresh(load);
  useMyNotificationsRealtime(load);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const open = async (n: Notification) => {
    if (!n.read_at) {
      setState((s) => (s?.ok ? { ...s, items: s.items.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)) } : s));
      markRead(n.id);
    }
    if (n.trip_id) {
      const to = routeFor(n.type);
      // People and the itinerary are both the trip's first page now.
      router.push({ pathname: (to === "people" || to === "itinerary" ? "/trip/[id]" : `/trip/[id]/${to}`) as "/trip/[id]", params: { id: n.trip_id } });
    }
  };

  const days = state?.ok ? groupByDayHeading(state.items, new Date()) : [];
  return (
    <View style={s.screen}>
      <ScrollView style={s.scroll} contentInsetAdjustmentBehavior="never" refreshControl={pull}
        contentContainerStyle={[s.content, { paddingTop: top + space.s16, paddingBottom: bottom + space.s24 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={space.s4} style={s.round}>
          <ChevronLeft size={22} color={color.brandBlack} strokeWidth={1.75} />
        </Pressable>
        <Text accessibilityRole="header" style={s.heading}>Notifications</Text>

        {state === null ? (
          <Skeleton label="Loading notifications" />
        ) : !state.ok ? (
          <View style={s.gap}>
            <Alert variant="negative" persist>{state.message}</Alert>
            <TextButton label="Retry" onPress={load} />
          </View>
        ) : state.items.length === 0 ? (
          <Text style={s.body}>All quiet for now. Joins, plan changes, expenses and payments from your trips will show up here.</Text>
        ) : (
          days.map((d) => (
            <View key={d.heading}>
              <View style={s.dayRow} accessibilityRole="header" accessible accessibilityLabel={d.heading}>
                <View style={s.rule} />
                <Text style={s.day}>{d.heading}</Text>
                <View style={s.rule} />
              </View>
              {d.events.map((n) => (
                <NotificationItem key={n.id} actor={notificationActor(n)} parts={describeParts(n)} time={clock12(n.created_at)} unread={!n.read_at} onPress={() => open(n)} />
              ))}
            </View>
          ))
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
  heading: { ...type.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: color.obsidian },
  gap: { gap: space.s8 },
  dayRow: { flexDirection: "row", alignItems: "center", gap: space.s16, marginTop: space.s8, marginBottom: space.s8 },
  rule: { flex: 1, height: 1, backgroundColor: color.borderNeutral },
  day: { ...type.fieldMessage, color: color.slate },
  body: { ...type.fieldValue, color: color.charcoal },
});
