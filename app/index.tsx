import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { Bell, History } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Pressable } from "../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { unreadCount } from "../src/api/notifications";
import { loadMyName } from "../src/api/profile";
import { listTrips, TripCard, TripListResult } from "../src/api/trips";
import { Alert } from "../src/components/Alert";
import { ProgressiveBlur } from "../src/components/ProgressiveBlur";
import { Avatar } from "../src/components/Avatar";
import { Badge, BadgeVariant } from "../src/components/Badge";
import { Button, TextButton } from "../src/components/Buttons";
import { TripCover } from "../src/components/TripCover";
import { TripNameTag } from "../src/components/TripNameTag";
import { formatRange, ongoingFirst } from "../src/domain/trip";
import { usePullToRefresh } from "../src/hooks/usePullToRefresh";
import { useMyNotificationsRealtime } from "../src/hooks/useTripRealtime";
import { useSession } from "../src/stores/session";
import { color, font, radius, space, type } from "../src/theme/tokens";

const PHASE: Record<TripCard["phase"], string> = { draft: "Draft", upcoming: "Upcoming", active: "Ongoing", completed: "Completed", archived: "Archived" };
const PHASE_BADGE: Record<TripCard["phase"], BadgeVariant> = { draft: "info", upcoming: "info", active: "neutral", completed: "info", archived: "info" };
const NO_TRIPS = require("../assets/illustrations/no-trips.png");
const GAP = space.s12;

// Home: a greeting with notifications and profile on top, then the trips I'm planning (history sits beside the title), and the one primary
// action pinned at the bottom. Sign-in leaves invite links waiting; this sends me back to them.
// The button's glint plays once each time the app opens, not on every return to Home.
let shineShown = false;

export default function Home() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pending = useSession((s) => s.pendingInvite);
  const [trips, setTrips] = useState<TripListResult | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [shine] = useState(() => { const first = !shineShown; shineShown = true; return first ? 2 : 0; });
  const [unread, setUnread] = useState(0);
  const refresh = useCallback(() => {
    listTrips().then(setTrips);
    unreadCount().then(setUnread);
  }, []);
  useFocusEffect(refresh);
  useEffect(() => { loadMyName().then(setName); }, []);
  useMyNotificationsRealtime(() => { unreadCount().then(setUnread); });
  const pull = usePullToRefresh(() => Promise.all([listTrips().then(setTrips), unreadCount().then(setUnread)]));
  if (pending) return <Redirect href={{ pathname: "/join/[token]", params: { token: pending } }} />;

  const empty = trips?.ok === true && trips.trips.length === 0;
  const firstName = name?.trim().split(/\s+/)[0];
  const planning = trips?.ok ? ongoingFirst(trips.trips.filter((t) => t.phase !== "completed" && t.phase !== "archived")) : [];
  const tile = (width - space.s20 * 2 - GAP) / 2;   // one column of the two

  return (
    <View style={s.screen}>
      <ScrollView style={s.scroll} refreshControl={pull} contentContainerStyle={[s.content, empty && s.contentEmpty, { paddingTop: top + space.s8, paddingBottom: empty ? bottom + space.s16 : bottom + space.s64 + space.s48 }]}>
        <View style={s.top}>
          <View style={s.greeting}>
            <Text maxFontSizeMultiplier={1.3} style={s.hi}>Hi,</Text>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.name}>{firstName || "traveller"}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"} onPress={() => router.push("/notifications")} style={s.round}>
            <Bell size={20} color={color.forestInk} strokeWidth={1.75} />
            {unread > 0 && <View style={s.dot} />}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Profile and travel passport" onPress={() => router.push("/profile")} hitSlop={space.s4}>
            <Avatar name={name ?? ""} size={40} />
          </Pressable>
        </View>

        {!empty && (        <View style={s.sectionRow}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.section}>Planning</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Trip history" onPress={() => router.push("/history")} style={s.roundSmall} hitSlop={space.s8}>
            <History size={18} color={color.forestInk} strokeWidth={1.75} />
          </Pressable>
        </View>
        )}

        {trips === null ? (
          <ActivityIndicator accessibilityLabel="Loading your trips" color={color.forestInk} />
        ) : !trips.ok ? (
          <View style={s.gap}>
            <Alert variant="negative">{trips.message}</Alert>
            <TextButton label="Retry" onPress={refresh} />
          </View>
        ) : empty ? (
          <View style={s.empty}>
            <Image accessible accessibilityRole="image" accessibilityLabel="A traveller sitting on a bag, reading a map" accessibilityIgnoresInvertColors source={NO_TRIPS} style={s.emptyImage} resizeMode="contain" />
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.emptyTitle}>No trips planned</Text>
            <Text maxFontSizeMultiplier={1.4} style={s.emptyBody}>Plan new trip now with your friends</Text>
            <View style={s.emptyAction}><Button label="Start new trip" type="dark" shine={shine} onPress={() => router.push("/create-trip")} /></View>
          </View>
        ) : (
          <View style={s.grid}>
            {planning.map((t, i) => (
              <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`${t.name}, ${t.destination_name}, ${formatRange(t.start_date, t.end_date)}, ${PHASE[t.phase]}`} style={{ width: tile, gap: space.s8 }}
                onPress={() => router.push({ pathname: "/trip/[id]", params: { id: t.id } })}>
                <View>
                  <TripCover uri={t.coverUrl} destination={t.destination_name} ratio={1} />
                  <View style={s.badge}><Badge variant={PHASE_BADGE[t.phase]} label={PHASE[t.phase]} /></View>
                </View>
                <View style={s.meta}>
                  <View style={s.datePill}><Text maxFontSizeMultiplier={1.3} style={s.dateText}>{formatRange(t.start_date, t.end_date)}</Text></View>
                  <TripNameTag key={t.name} name={t.name} maxWidth={tile} tilt={i % 2 === 0 ? -2 : 2} />
                  <Text maxFontSizeMultiplier={1.3} style={s.place}>{t.destination_name}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

      </ScrollView>
      {!empty && trips?.ok && (
      <>
      {/* The one primary action stays in reach however many trips there are. */}
      {/* The bar floats over the list; a blur that thins out toward the top lets it melt into the page. */}
      <View pointerEvents="box-none" style={[s.footer, { paddingBottom: bottom + space.s12 }]}>
        <ProgressiveBlur edge="bottom" />
        <Button label="Start new trip" type="dark" shine={shine} onPress={() => router.push("/create-trip")} />
      </View>
      </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  scroll: { flex: 1 },
  content: { paddingHorizontal: space.s20, gap: space.s12 },
  top: { flexDirection: "row", alignItems: "center", gap: space.s8, marginBottom: space.s8 },
  greeting: { flex: 1 },
  hi: { ...type.fieldMessage, color: color.obsidian },
  name: { ...type.sheetTitle, fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: color.obsidian },
  round: { width: 40, height: 40, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.paper, borderWidth: 1, borderColor: color.borderNeutral, alignItems: "center", justifyContent: "center" },
  roundSmall: { width: 32, height: 32, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.paper, borderWidth: 1, borderColor: color.borderNeutral, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 8, right: 10, width: 9, height: 9, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.alarmRed },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.s8 },
  section: { ...type.fieldMessage, color: color.charcoal },
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: GAP, rowGap: space.s32 },
  badge: { position: "absolute", bottom: space.s12, left: space.s12, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.paper },
  meta: { alignItems: "center", gap: space.s8 },
  datePill: { paddingHorizontal: space.s8, paddingVertical: 2, borderRadius: 6, borderCurve: "continuous", backgroundColor: color.neutralSolid },
  dateText: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.charcoal, fontVariant: ["tabular-nums"] },
  place: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, textAlign: "center", color: color.obsidian },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.s20, paddingTop: space.s48 },
  blurStep: { position: "absolute", left: 0, right: 0, bottom: 0 },
  gap: { gap: space.s8 },
  contentEmpty: { flexGrow: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.s8 },
  emptyImage: { width: 150, height: 150, marginBottom: space.s4 },
  emptyTitle: { ...type.sheetTitle, fontSize: 24, lineHeight: 30, letterSpacing: -0.4, textAlign: "center", color: color.obsidian },
  emptyBody: { ...type.fieldValue, textAlign: "center", color: color.slate },
  emptyAction: { alignSelf: "stretch", marginTop: space.s16 },
});
