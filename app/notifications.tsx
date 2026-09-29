import { Alert } from "../src/components/Alert";
import { usePullToRefresh } from "../src/hooks/usePullToRefresh";
import { SectionHeader } from "../src/components/SectionHeader";
import { NotificationItem } from "../src/components/NotificationItem";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InboxResult, loadInbox, markRead, setPreference } from "../src/api/notifications";
import { TextButton } from "../src/components/Buttons";
import { describeNotification, Notification, NotificationType, routeFor, TYPE_LABEL, TYPES } from "../src/domain/notifications";
import { useMyNotificationsRealtime } from "../src/hooks/useTripRealtime";
import { color, radius, space, type } from "../src/theme/tokens";

// The in-app notification centre. It works without push: push only adds a nudge on top of what is listed here.
export default function Notifications() {
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<InboxResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => setState(await loadInbox()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = usePullToRefresh(load);
  useMyNotificationsRealtime(load);

  const open = async (n: Notification) => {
    if (!n.read_at) {
      setState((s) => (s?.ok ? { ...s, items: s.items.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)) } : s));
      markRead(n.id);
    }
    if (n.trip_id) router.push({ pathname: `/trip/[id]/${routeFor(n.type)}` as "/trip/[id]/people", params: { id: n.trip_id } });
  };

  const toggle = async (t: NotificationType, on: boolean) => {
    setError(null);
    setState((s) => (s?.ok ? { ...s, enabled: { ...s.enabled, [t]: on } } : s));
    const r = await setPreference(t, on);
    if (!r.ok) {
      setError(r.message);
      load();
    }
  };

  return (
    <View style={s.screen}>
    <ScrollView style={s.scroll} refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: space.s16 }]}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Notifications</Text>
      {state === null ? (
        <ActivityIndicator accessibilityLabel="Loading notifications" color={color.forestInk} />
      ) : !state.ok ? (
        <View style={s.gap}>
          <Alert variant="negative">{state.message}</Alert>
          <TextButton label="Retry" onPress={load} />
        </View>
      ) : (
        <>
          {state.items.length === 0 ? (
            <Text maxFontSizeMultiplier={1.4} style={s.body}>Nothing yet. You'll see joins, plan changes, new expenses and payments from your trips here.</Text>
          ) : (
            state.items.map((n) => (
              <NotificationItem key={n.id} unread={!n.read_at} title={describeNotification(n)} onPress={() => open(n)} />
            ))
          )}
          <SectionHeader title="What to tell me about" />
          {error && <Alert variant="negative">{error}</Alert>}
          {TYPES.map((t) => (
            <View key={t} style={s.pref}>
              <Text maxFontSizeMultiplier={1.4} style={s.prefLabel}>{TYPE_LABEL[t]}</Text>
              <Switch accessibilityLabel={TYPE_LABEL[t]} value={state.enabled[t]} onValueChange={(on) => toggle(t, on)}
                trackColor={{ true: color.forestInk, false: color.fog }} />
            </View>
          ))}
        </>
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
  pref: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.s12 },
  prefLabel: { ...type.body, flex: 1, color: color.obsidian },
  body: { ...type.body, color: color.charcoal },
  error: { ...type.label, color: color.alarmRed },
});
