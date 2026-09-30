import { useFocusEffect, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadStamps, StampsResult } from "../src/api/passport";
import { loadMyProfile, MyProfile } from "../src/api/profile";
import { Alert } from "../src/components/Alert";
import { Avatar } from "../src/components/Avatar";
import { TextButton } from "../src/components/Buttons";
import { Stamp } from "../src/components/Stamp";
import { compactDate, formatDate } from "../src/domain/trip";
import { usePullToRefresh } from "../src/hooks/usePullToRefresh";
import { color, font, mix, radius, space, type } from "../src/theme/tokens";

// Me: a big avatar, my details, and my Travel Passport (a count of trips and one stamp per completed trip, most recent first).
// Tap a stamp to reopen that trip's summary.
export default function Profile() {
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<StampsResult | null>(null);
  const [me, setMe] = useState<MyProfile | null>(null);
  const load = useCallback(async () => { setState(await loadStamps()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { loadMyProfile().then(setMe); }, []);
  const pull = usePullToRefresh(load);
  const stamps = state?.ok ? state.stamps : [];
  const mrzName = (me?.name ?? "").toUpperCase().replace(/[^A-Z]/g, "");

  return (
    <View style={s.screen}>
      <ScrollView style={s.scroll} refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: top + space.s16, paddingBottom: bottom + space.s24 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={space.s4} style={s.round}>
          <ChevronLeft size={22} color={color.forestInk} strokeWidth={1.75} />
        </Pressable>

        <View style={s.avatar}><Avatar name={me?.name ?? ""} size={72} /></View>

        <View accessible style={s.card}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={s.name}>{me?.name ?? "Profile"}</Text>
          {me && (
            <>
              <View style={s.line} />
              <View style={s.row}><Text maxFontSizeMultiplier={1.4} style={s.label}>Email</Text><Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={s.value}>{me.email}</Text></View>
              <View style={s.line} />
              <View style={s.row}><Text maxFontSizeMultiplier={1.4} style={s.label}>Member since</Text><Text maxFontSizeMultiplier={1.4} style={s.value}>{formatDate(me.since)}</Text></View>
            </>
          )}
        </View>

        <View style={s.card}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.section}>Passport</Text>
          {state === null ? (
            <ActivityIndicator accessibilityLabel="Loading your passport" color={color.forestInk} />
          ) : !state.ok ? (
            <View style={s.gap}>
              <Alert variant="negative">{state.message}</Alert>
              <TextButton label="Retry" onPress={load} />
            </View>
          ) : (
            <View accessible accessibilityLabel={`Passport, total trips ${stamps.length}`} style={s.cover}>
              {/* A vertical gradient from pale to bright blue, drawn as thin strips (a gradient view would need another native module). */}
              <View style={StyleSheet.absoluteFill}>
                {Array.from({ length: 24 }, (_, i) => <View key={i} style={{ flex: 1, backgroundColor: mix("#e3f5f5", color.brightBlue, i / 23) }} />)}
              </View>
              <View style={s.inset}>
              {/* The passport's page: two machine-readable lines, then the trip count; it runs off the bottom like a page in a cover. */}
              <View style={s.page}>
                <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={s.mrz}>{`<<ALONG<<${mrzName}<<MEMBERSINCE${compactDate(me?.since ?? "")}<<`}</Text>
                <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={s.mrz}>{`TRIPS${String(stamps.length).padStart(3, "0")}<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<`}</Text>
                <Text maxFontSizeMultiplier={1.3} style={s.label}>Total trips</Text>
                <Text maxFontSizeMultiplier={1.2} style={s.count}>{stamps.length}</Text>
              </View>
              </View>
            </View>
          )}
        </View>

        {stamps.length > 0 && (
          <View style={s.card}>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.section}>Stamps</Text>
            {stamps.map((st) => (
              <Stamp key={st.id} destination={st.destination_name} start={st.start_date} end={st.end_date}
                onPress={() => router.push({ pathname: "/trip/[id]/summary", params: { id: st.trip_id } })} />
            ))}
          </View>
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
  avatar: { alignItems: "center", marginVertical: space.s8 },
  card: { padding: space.s20, gap: space.s12, borderRadius: radius.sheet, borderCurve: "continuous", backgroundColor: color.neutralWash },
  name: { ...type.sheetTitle, fontSize: 26, lineHeight: 32, letterSpacing: -0.4, color: color.obsidian },
  line: { height: 1, backgroundColor: color.borderNeutral },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.s16, minHeight: 32 },
  label: { ...type.fieldValue, color: color.charcoal },
  value: { ...type.fieldValue, flexShrink: 1, color: color.obsidian },
  section: { ...type.fieldValue, color: color.obsidian },
  cover: { height: 150, borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden" },
  inset: { flex: 1, paddingHorizontal: space.s20, paddingTop: 17 },
  page: { flex: 1, paddingHorizontal: space.s16, paddingTop: space.s16, borderTopLeftRadius: radius.tile, borderTopRightRadius: radius.tile, borderCurve: "continuous", backgroundColor: color.paper, gap: 2 },
  mrz: { fontFamily: font.regular, fontSize: 12, lineHeight: 18, letterSpacing: 0.2, color: color.slate },
  count: { ...type.display, fontSize: 56, lineHeight: 60, color: color.obsidian, fontVariant: ["tabular-nums"] },
  gap: { gap: space.s8 },
  body: { ...type.fieldValue, color: color.charcoal },
});
