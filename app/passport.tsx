import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadStamps, StampsResult } from "../src/api/passport";
import { TextButton } from "../src/components/Buttons";
import { Stamp } from "../src/components/Stamp";
import { color, space, type } from "../src/theme/tokens";

// Every trip you completed, most recent first. Tap a stamp to reopen that trip's summary.
export default function Passport() {
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<StampsResult | null>(null);
  const load = useCallback(async () => setState(await loadStamps()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Travel Passport</Text>
      {state === null ? (
        <ActivityIndicator accessibilityLabel="Loading your passport" color={color.forestInk} />
      ) : !state.ok ? (
        <View style={s.gap}>
          <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {state.message}</Text>
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
