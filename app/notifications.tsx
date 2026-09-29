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
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<InboxResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => setState(await loadInbox()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
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
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Notifications</Text>
      {state === null ? (
        <ActivityIndicator accessibilityLabel="Loading notifications" color={color.forestInk} />
      ) : !state.ok ? (
        <View style={s.gap}>
          <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {state.message}</Text>
          <TextButton label="Retry" onPress={load} />
        </View>
      ) : (
        <>
          {state.items.length === 0 ? (
            <Text maxFontSizeMultiplier={1.4} style={s.body}>Nothing yet. You'll see joins, plan changes, new expenses and payments from your trips here.</Text>
          ) : (
            state.items.map((n) => (
              <Pressable key={n.id} accessibilityRole="button" accessibilityLabel={`${n.read_at ? "" : "Unread. "}${describeNotification(n)}`}
                onPress={() => open(n)} style={[s.card, !n.read_at && s.unread]}>
                {!n.read_at && <Text maxFontSizeMultiplier={1.3} style={s.new}>New</Text>}
                <Text maxFontSizeMultiplier={1.4} style={s.line}>{describeNotification(n)}</Text>
              </Pressable>
            ))
          )}
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.section}>What to tell me about</Text>
          {error && <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {error}</Text>}
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
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s12 },
  heading: { ...type.display, fontSize: 40, lineHeight: 40, letterSpacing: -1.4, color: color.obsidian },
  gap: { gap: space.s8 },
  card: { minHeight: 48, gap: space.s4, padding: space.s16, borderRadius: radius.card, borderWidth: 1.5, borderColor: color.fog },
  unread: { borderColor: color.forestInk },
  new: { ...type.label, color: color.forestInk },
  line: { ...type.body, color: color.obsidian },
  section: { ...type.label, color: color.charcoal, marginTop: space.s16 },
  pref: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.s12 },
  prefLabel: { ...type.body, flex: 1, color: color.obsidian },
  body: { ...type.body, color: color.charcoal },
  error: { ...type.label, color: color.alarmRed },
});
