import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { Bell, History, Users } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { unreadCount } from "../src/api/notifications";
import { loadMyName } from "../src/api/profile";
import { listTrips, TripCard, TripListResult } from "../src/api/trips";
import { Alert } from "../src/components/Alert";
import { Avatar } from "../src/components/Avatar";
import { Badge, BadgeVariant } from "../src/components/Badge";
import { Card } from "../src/components/Card";
import { PrimaryButton, TextButton } from "../src/components/Buttons";
import { TripCover } from "../src/components/TripCover";
import { formatRange } from "../src/domain/trip";
import { usePullToRefresh } from "../src/hooks/usePullToRefresh";
import { useMyNotificationsRealtime } from "../src/hooks/useTripRealtime";
import { useSession } from "../src/stores/session";
import { color, radius, space, type } from "../src/theme/tokens";

const PHASE: Record<TripCard["phase"], string> = { draft: "Draft", upcoming: "Upcoming", active: "Ongoing", completed: "Completed", archived: "Archived" };
const PHASE_BADGE: Record<TripCard["phase"], BadgeVariant> = { draft: "info", upcoming: "info", active: "success", completed: "neutral", archived: "info" };
const GAP = space.s24;
const TILT = 2;   // degrees; a tilted square is wider than its side by cos+sin, so tiles are shrunk to stay inside the 20 margins

// Home: a greeting with notifications and profile on top, the trips I'm planning (history sits beside the title), a nudge to invite
// friends, and the one primary action pinned at the bottom. Sign-in leaves invite links waiting; this sends me back to them.
export default function Home() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pending = useSession((s) => s.pendingInvite);
  const [trips, setTrips] = useState<TripListResult | null>(null);
  const [name, setName] = useState<string | null>(null);
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

  const planning = trips?.ok ? trips.trips.filter((t) => t.phase !== "completed" && t.phase !== "archived") : [];
  const tile = (width - space.s20 * 2 - GAP) / 2;   // one column
  const rad = (TILT * Math.PI) / 180;
  const cover = Math.floor(tile / (Math.cos(rad) + Math.sin(rad)));

  return (
    <View style={s.screen}>
      <Svg style={s.glow} width="100%" height={280} pointerEvents="none">
        <Defs>
          <LinearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.brightGreen} stopOpacity={0.35} />
            <Stop offset="1" stopColor={color.brightGreen} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#glow)" />
      </Svg>
      <ScrollView style={s.scroll} refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: top + space.s16, paddingBottom: bottom + space.s64 + space.s48 }]}>
        <View style={s.top}>
          <View style={s.greeting}>
            <Text maxFontSizeMultiplier={1.3} style={s.hi}>Hi,</Text>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.name}>{name ?? "traveller"}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"} onPress={() => router.push("/notifications")} style={s.round}>
            <Bell size={22} color={color.forestInk} strokeWidth={1.75} />
            {unread > 0 && <View style={s.dot} />}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Profile and travel passport" onPress={() => router.push("/profile")} hitSlop={space.s4}>
            <Avatar name={name ?? ""} size={48} />
          </Pressable>
        </View>

        <View style={s.sectionRow}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.section}>Planning</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Trip history" onPress={() => router.push("/history")} style={s.roundSmall} hitSlop={space.s8}>
            <History size={18} color={color.forestInk} strokeWidth={1.75} />
          </Pressable>
        </View>

        {trips === null ? (
          <ActivityIndicator accessibilityLabel="Loading your trips" color={color.forestInk} />
        ) : !trips.ok ? (
          <View style={s.gap}>
            <Alert variant="negative">{trips.message}</Alert>
            <TextButton label="Retry" onPress={refresh} />
          </View>
        ) : planning.length === 0 ? (
          <Text maxFontSizeMultiplier={1.4} style={s.body}>No trips yet. Start one, or open a link a friend sent you.</Text>
        ) : (
          <View style={s.grid}>
            {planning.map((t, i) => (
              <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`${t.name}, ${PHASE[t.phase]}`} style={{ width: tile, gap: space.s8 }}
                onPress={() => router.push({ pathname: "/trip/[id]/people", params: { id: t.id } })}>
                {/* A playful tilt, alternating left and right; the words underneath stay level. */}
                <View style={{ width: cover, alignSelf: "center", transform: [{ rotate: `${i % 2 === 0 ? -TILT : TILT}deg` }] }}>
                  <TripCover uri={t.coverUrl} destination={t.destination_name} ratio={1} />
                  <View style={s.badge}><Badge variant={PHASE_BADGE[t.phase]} label={PHASE[t.phase]} /></View>
                </View>
                <View>
                  <Text maxFontSizeMultiplier={1.3} style={s.tripName}>{t.name}</Text>
                  <Text maxFontSizeMultiplier={1.4} style={s.dates}>{formatRange(t.start_date, t.end_date)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {planning.length > 0 && (
          <>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[s.section, { marginTop: space.s24 }]}>Invite friends</Text>
            <Card accessibilityLabel={`Invite friends to ${planning[0].name}`} onPress={() => router.push({ pathname: "/trip/[id]/people", params: { id: planning[0].id } })} style={s.invite}>
              <Users size={28} color={color.forestInk} strokeWidth={1.75} />
              <Text maxFontSizeMultiplier={1.3} style={s.inviteTitle}>Bring people along</Text>
              <Text maxFontSizeMultiplier={1.4} style={s.body}>Share the invite link for {planning[0].name}.</Text>
            </Card>
          </>
        )}
      </ScrollView>
      {/* The one primary action stays in reach however many trips there are. */}
      {/* The bar floats over the list. Blur builds up in steps toward the bottom and a fade to the page colour hides the top edge, so it
          melts into the page instead of starting at a line. */}
      <View pointerEvents="box-none" style={[s.footer, { paddingBottom: bottom + space.s12 }]}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {[10, 20, 30, 45].map((intensity, i) => (
            <BlurView key={intensity} intensity={intensity} tint="extraLight" style={[s.blurStep, { top: `${i * 18}%` }]} />
          ))}
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            <Defs>
              <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color.paper} stopOpacity={0} />
                <Stop offset="1" stopColor={color.paper} stopOpacity={0.55} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#fade)" />
          </Svg>
        </View>
        <PrimaryButton label="Start new trip" onPress={() => router.push("/create-trip")} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  glow: { position: "absolute", top: 0, left: 0, right: 0 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: space.s20, gap: space.s12 },
  top: { flexDirection: "row", alignItems: "center", gap: space.s8, marginBottom: space.s8 },
  greeting: { flex: 1 },
  hi: { ...type.fieldValue, color: color.obsidian },
  name: { ...type.sheetTitle, fontSize: 24, lineHeight: 30, letterSpacing: -0.4, color: color.obsidian },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.paper, borderWidth: 1, borderColor: color.borderNeutral, alignItems: "center", justifyContent: "center" },
  roundSmall: { width: 36, height: 36, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.paper, borderWidth: 1, borderColor: color.borderNeutral, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 10, right: 12, width: 9, height: 9, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.alarmRed },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.s8 },
  section: { ...type.fieldValue, color: color.charcoal },
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: GAP, rowGap: space.s24 },
  badge: { position: "absolute", top: space.s12, left: space.s12, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.paper },
  tripName: { ...type.label, color: color.obsidian },
  dates: { ...type.fieldMessage, color: color.charcoal },
  invite: { minHeight: 128, justifyContent: "center", gap: space.s8, padding: space.s20, borderRadius: radius.sheet , borderCurve: "continuous"},
  inviteTitle: { ...type.label, color: color.obsidian },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.s20, paddingTop: space.s48 },
  blurStep: { position: "absolute", left: 0, right: 0, bottom: 0 },
  gap: { gap: space.s8 },
  body: { ...type.fieldValue, color: color.charcoal },
});
