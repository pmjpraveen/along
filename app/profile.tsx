import { Alert } from "../src/components/Alert";
import { usePullToRefresh } from "../src/hooks/usePullToRefresh";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadStamps, StampsResult } from "../src/api/passport";
import { loadMyName } from "../src/api/profile";
import { Avatar } from "../src/components/Avatar";
import { SectionHeader } from "../src/components/SectionHeader";
import { TextButton } from "../src/components/Buttons";
import { Stamp } from "../src/components/Stamp";
import { color, space, type } from "../src/theme/tokens";

// Who I am, and my travel passport: every trip I completed, most recent first. Tap a stamp to reopen that trip's summary.
export default function Profile() {
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<StampsResult | null>(null);
  const load = useCallback(async () => setState(await loadStamps()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = usePullToRefresh(load);
  const [name, setName] = useState<string | null>(null);
  useEffect(() => { loadMyName().then(setName); }, []);

  return (
    <View style={s.screen}>
    <ScrollView style={s.scroll} refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: space.s16 }]}>
      <View style={s.who}>
        <Avatar name={name ?? ""} size={72} />
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>{name ?? "Profile"}</Text>
      </View>
      <SectionHeader title="Travel Passport" />
      {state === null ? (
        <ActivityIndicator accessibilityLabel="Loading your passport" color={color.forestInk} />
      ) : !state.ok ? (
        <View style={s.gap}>
          <Alert variant="negative">{state.message}</Alert>
          <TextButton label="Retry" onPress={load} />
        </View>
      ) : state.stamps.length === 0 ? (
        <Text maxFontSizeMultiplier={1.4} style={s.body}>No stamps yet. Complete a trip you've been on and it lands here.</Text>
      ) : (
        state.stamps.map((st) => (
          <Stamp key={st.id} destination={st.destination_name} start={st.start_date} end={st.end_date}
            onPress={() => router.push({ pathname: "/trip/[id]/summary", params: { id: st.trip_id } })} />
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
  who: { gap: space.s12 },
  heading: { ...type.display, fontSize: 40, lineHeight: 40, letterSpacing: -1.4, color: color.obsidian },
  gap: { gap: space.s8 },
  body: { ...type.body, color: color.charcoal },
  error: { ...type.label, color: color.alarmRed },
});
