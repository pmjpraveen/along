import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import { Skeleton } from "../../../../src/components/Skeleton";
import { Chip } from "../../../../src/components/Chip";
import { TripMenu } from "../../../../src/components/TripMenu";
import { ChevronLeft, MapPin, MoreHorizontal, Trash2, Users } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Pressable } from "../../../../src/components/Pressable";
import Animated, { Extrapolation, FadeIn, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useReducedMotion } from "../../../../src/hooks/useReducedMotion";
import { motion } from "../../../../src/theme/motion";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { deleteItem, ItineraryResult, loadItinerary, moveItem, restoreItem } from "../../../../src/api/itinerary";
import { listMembers, Member } from "../../../../src/api/members";
import { loadTripStatus } from "../../../../src/api/trips";
import { toast } from "../../../../src/stores/toast";
import { haptic } from "../../../../src/haptics";
import { Alert } from "../../../../src/components/Alert";
import { AvatarGroup } from "../../../../src/components/Avatar";
import { Badge } from "../../../../src/components/Badge";
import { PrimaryButton, TextButton } from "../../../../src/components/Buttons";
import { DateField } from "../../../../src/components/DateField";
import { MapPreview } from "../../../../src/components/MapPreview";
import { TripCover } from "../../../../src/components/TripCover";
import { groupByDay, Item, tripDays } from "../../../../src/domain/itinerary";
import { CARD_COLORS, formatDate, formatRange } from "../../../../src/domain/trip";
import { mapsOpenUrl, mapsSearchUrl, parseMapsUrl, Place } from "../../../../src/domain/maps";
import { usePullToRefresh } from "../../../../src/hooks/usePullToRefresh";
import { TripNameTag } from "../../../../src/components/TripNameTag";
import { color, font, mix, radius, space, type } from "../../../../src/theme/tokens";

// The pin for an item: its stored coordinates, or, for items saved before the link could be read, whatever the saved link says.
const placeOf = (i: Item): Place | null =>
  i.latitude !== null && i.longitude !== null ? { lat: i.latitude, lng: i.longitude, name: i.formatted_address }
  : parseMapsUrl(i.location_url ?? i.location_text ?? "");

// The line under the title: the place's name; else, when there is no map, the location as typed (a link that never resolved is still shown).
const placeLabel = (i: Item): string | null => {
  const p = placeOf(i);
  return p ? p.name : i.location_text;
};

// The trip's first page: back, add guests and settings on top; the trip header; then the plan, with a chip per day that sticks to the
// top as you scroll so the day's items pass beneath it.
export default function Trip() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const router = useRouter();
  const [state, setState] = useState<ItineraryResult | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [cover, setCover] = useState<string | null>(null);
  const [band, setBand] = useState<string | null>(null);   // the card colour picked in the trip's settings, shown behind the header
  const [picked, setPicked] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const isOwner = members.some((m) => m.isMe && m.role === "owner");

  // The header appears once its colour, cover and people have all come back, so it does not pop in piece by piece.
  const [extras, setExtras] = useState({ look: false, people: false });
  const load = useCallback(async () => {
    loadTripStatus(id).then((t) => { if (t.ok) { setCover(t.coverUrl); setBand(CARD_COLORS[t.cardColor] ?? null); } }).finally(() => setExtras((e) => ({ ...e, look: true })));
    listMembers(id).then((r) => { if (r.ok) setMembers(r.members); }).finally(() => setExtras((e) => ({ ...e, people: true })));
    setState(await loadItinerary(id));
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = usePullToRefresh(load);

  const [moving, setMoving] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const move = async (itemId: string, version: number, day: string) => {
    setMoving(null);
    setMoveError(null);
    const r = await moveItem(itemId, day, version);
    if (!r.ok) setMoveError(r.message);
    await load();
  };
  // Deleting a plan is instant and can be undone: a plan is only hidden, so the toast offers to bring it straight back (no "are you sure").
  const removePlan = async (item: Item) => {
    setMoving(null);
    setMoveError(null);
    const r = await deleteItem(item.id);
    if (!r.ok) { haptic.warn(); setMoveError(r.message); return; }
    haptic.success();
    toast("Plan deleted", { label: "Undo", onPress: async () => { const u = await restoreItem(item.id); if (!u.ok) setMoveError(u.message); await load(); } });
    await load();
  };
  const add = (day?: string) => router.push({ pathname: "/trip/[id]/add-item", params: { id, ...(day && { day }) } });
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const ok = state?.ok ? state : null;
  const grouped = useMemo(() => (ok ? groupByDay(ok.items) : []), [ok]);
  const days = useMemo(() => (ok ? tripDays(ok.trip.start_date, ok.trip.end_date, grouped.map((d) => d.date)) : []), [ok, grouped]);
  // Opens on Day 1.
  const selected = picked && days.includes(picked) ? picked : days[0] ?? "";
  const items: Item[] = grouped.find((d) => d.date === selected)?.items ?? [];

  // The trip's top is built in layers, so the header can fold away while the plans stay in reach:
  //   1. the navigation row (back, add guest, options) is pinned over the status bar, on the trip's colour, and never moves;
  //   2. the trip details (photo, dates, name, people) are the first thing in the scroller, so they scroll up under the navigation row;
  //   3. the "Plans" label and day chips ride along with the content until they reach the navigation row, then stay there (pinned);
  //   4. the plans scroll beneath. Scrolling back to the top unfolds the details again.
  // The chips are drawn outside the scroller and moved by the scroll position on the UI thread, so pinning them never changes the layout.
  const navH = top + space.s16 + 48 + space.s12;
  // The chips pin with the "Plans" label slid up under the navigation row (which covers it), so only the chips stay visible: the label block above
  // them (top padding, the label, the gap) is 16 + 22 + 12 = 50 tall, and the chips sit 8 below the row.
  const pinY = navH + space.s8 - (space.s16 + 22 + space.s12);
  const scrollY = useSharedValue(0);
  const barY = useSharedValue(0);          // where the chips would sit in the content
  const [barH, setBarH] = useState(0);     // how tall they are, so the content keeps a gap of that size
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const barStyle = useAnimatedStyle(() => ({ transform: [{ translateY: Math.max(barY.value - scrollY.value, pinY) }] }));
  const edgeStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [barY.value - pinY - 12, barY.value - pinY], [0, 1], Extrapolation.CLAMP) }));
  // With the pull-to-refresh stretch, the navigation row goes down with the content instead of covering the spinner.
  const navStyle = useAnimatedStyle(() => ({ transform: [{ translateY: Math.max(-scrollY.value, 0) }] }));

  const round = (label: string, onPress: () => void, icon: React.ReactNode) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={space.s4} style={s.round}>{icon}</Pressable>
  );
  const ic = { size: 22, color: color.brandBlack, strokeWidth: 1.75 } as const;

  const hasPlans = !!ok && ok.items.length > 0;
  return (
    <View style={s.screen}>
    <Animated.ScrollView style={s.scroll} contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} refreshControl={pull} scrollEventThrottle={16} onScroll={onScroll}
      contentContainerStyle={{ paddingBottom: bottom + space.s64 + space.s32 }}>
      <View style={[s.head, { paddingTop: navH + space.s4 }, band ? { backgroundColor: band, paddingBottom: space.s24 } : null]}>
        {state === null || (state.ok && !(extras.look && extras.people)) ? (
          <Skeleton label="Loading itinerary" variant="tripHeader" />
        ) : !ok ? (
          <View style={s.gap}>
            <Alert variant="negative" persist>{(state as { message: string }).message}</Alert>
            <TextButton label="Retry" onPress={load} />
          </View>
        ) : (
          <View style={s.title}>
            <View style={s.cover}><TripCover uri={cover} destination={ok.trip.name} ratio={1} ring /></View>
            <View style={[s.datePill, { backgroundColor: band ? mix(band, "#000000", 0.105) : color.neutralSolid }]}>
              <Text maxFontSizeMultiplier={1.3} style={s.dateText}>{formatRange(ok.trip.start_date, ok.trip.end_date)}</Text>
            </View>
            <View accessibilityRole="header" accessibilityLabel={ok.trip.name}><TripNameTag name={ok.trip.name} maxWidth={width - space.s20 * 2} tilt={-2} /></View>
            <Text maxFontSizeMultiplier={1.4} style={s.summary}>
              {ok.items.length} {ok.items.length === 1 ? "activity" : "activities"} · {days.length} {days.length === 1 ? "day" : "days"}
            </Text>
            {members.length > 0 && <AvatarGroup people={members.map((m) => ({ name: m.display_name, uri: m.avatarUrl, guest: m.membership_type === "guest" }))} size={48} max={4} />}
          </View>
        )}
      </View>

      {/* Where the Plans label and chips sit in the content; the real ones are drawn on top of this gap. */}
      {hasPlans && <View onLayout={(e) => { barY.value = e.nativeEvent.layout.y; }} style={{ height: barH }} />}

      <View style={s.body}>
        {state === null && <Skeleton label="Loading plans" variant="planRows" />}
        {ok && ok.items.length === 0 && (
          <View style={s.gap}>
            <Text maxFontSizeMultiplier={1.4} style={s.text}>No plans yet. Add the first thing your group will do.</Text>
            <PrimaryButton label="Add a plan" onPress={() => add(ok.trip.start_date)} />
          </View>
        )}
        {ok && ok.items.length > 0 && (
          <>
            {moveError && <Alert variant="negative">{moveError}</Alert>}
            <Animated.View key={selected} entering={reduced ? undefined : FadeIn.duration(motion.fadeMs)} style={s.dayList}>
            {items.length === 0 ? (
              <View style={s.gap}>
                <Text maxFontSizeMultiplier={1.4} style={s.text}>Nothing planned for this day yet.</Text>
                <PrimaryButton label="Add a plan" onPress={() => add(selected)} />
              </View>
            ) : (
              items.map((i) => (
                <View key={i.id} style={s.row}>
                  <View style={s.time}>
                    <Text maxFontSizeMultiplier={1.3} style={s.timeText}>{i.start_time ? i.start_time.slice(0, 5) : "Any time"}</Text>
                    <View style={s.tick} />
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={i.title} accessibilityHint="Long press to move to another day"
                    accessibilityActions={[{ name: "move", label: `Move ${i.title} to another day` }]} onAccessibilityAction={() => setMoving(i.id)}
                    onLongPress={() => setMoving(i.id)} delayLongPress={350} style={s.card}>
                    <View style={[s.head4, placeOf(i) && s.head4Map, moving === i.id && !placeOf(i) && s.head4Open]}>
                      <View style={s.titleRow}>
                      <Text maxFontSizeMultiplier={1.4} style={[s.itemTitle, s.grow]}>{i.title}</Text>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Options for ${i.title}`} accessibilityState={{ expanded: moving === i.id }} hitSlop={space.s8}
                        onPress={() => setMoving(moving === i.id ? null : i.id)} style={s.more}>
                        <MoreHorizontal size={18} color={color.iconInk} strokeWidth={2} />
                      </Pressable>
                      </View>
                    {i.is_outside_trip_range && <Badge variant="warning" label="Outside trip dates" />}
                    {placeLabel(i) ? (
                      <Pressable accessibilityRole="link" accessibilityLabel={`Open ${placeLabel(i)} in Maps`} hitSlop={space.s8}
                        onPress={() => Linking.openURL(placeOf(i) ? mapsOpenUrl(placeOf(i)!) : mapsSearchUrl(placeLabel(i)!))} style={s.place}>
                        <MapPin size={18} color={color.slate} strokeWidth={1.75} />
                        <Text maxFontSizeMultiplier={1.4} numberOfLines={2} style={s.placeText}>{placeLabel(i)}</Text>
                      </Pressable>
                    ) : null}
                    </View>
                    {placeOf(i) && <View style={s.map}><MapPreview place={placeOf(i)!} /></View>}
                    {moving === i.id && (
                      <View style={[s.move, placeOf(i) && s.moveAfterMap]}>
                        <DateField compact dark label={`New day for ${i.title}`} value={i.day_date} onChange={(day) => move(i.id, i.version, day)} />
                        <Pressable accessibilityRole="button" accessibilityLabel="Delete plan" onPress={() => removePlan(i)} hitSlop={space.s4} style={s.trash}>
                          <Trash2 size={18} color={color.paper} strokeWidth={1.75} />
                        </Pressable>
                      </View>
                    )}
                  </Pressable>
                </View>
              ))
            )}
            </Animated.View>
          </>
        )}
      </View>
    </Animated.ScrollView>

    {/* The navigation row: pinned over the top, on the trip's colour. */}
    <Animated.View style={[s.nav, { height: navH, paddingTop: top + space.s16, backgroundColor: band ?? color.paper }, navStyle]}>
      {round("Back", back, <ChevronLeft {...ic} />)}
      <View style={s.grow} />
      {round("Guests", () => router.push({ pathname: "/trip/[id]/guests", params: { id } }), <Users {...ic} />)}
      {round("Trip options", () => setMenu(true), <MoreHorizontal {...ic} />)}
    </Animated.View>

    {/* The "Plans" label and the day chips: they travel with the content, then pin under the navigation row. */}
    {hasPlans && (
      <Animated.View onLayout={(e) => setBarH(Math.round(e.nativeEvent.layout.height))} style={[s.bar, barStyle]}>
        <Text maxFontSizeMultiplier={1.3} style={s.plans}>Plans</Text>
        <ScrollView horizontal contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={s.chips} accessibilityRole="tablist" accessibilityLabel="Days">
          {days.map((d, n) => {
            const on = d === selected;
            return (
              <Chip key={d} role="tab" label={`Day ${n + 1}`} accessibilityLabel={`Day ${n + 1}, ${formatDate(d)}`} selected={on} onPress={() => setPicked(d)} />
            );
          })}
        </ScrollView>
        <Animated.View pointerEvents="none" style={[s.edge, edgeStyle]} />
      </Animated.View>
    )}

    <TripMenu tripId={id} isOwner={isOwner} visible={menu} onClose={() => setMenu(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  scroll: { flex: 1 },
  head: { paddingHorizontal: space.s20, gap: space.s16 },
  nav: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 5, flexDirection: "row", alignItems: "flex-start", gap: space.s8, paddingHorizontal: space.s20 },
  grow: { flex: 1 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  title: { alignItems: "center", gap: space.s8 },
  cover: { width: 104 },   // the white border is on the photo itself
  datePill: { paddingHorizontal: space.s8, paddingVertical: 2, borderRadius: 6, borderCurve: "continuous" },
  dateText: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.obsidian, fontVariant: ["tabular-nums"] },
  summary: { ...type.fieldValue, color: color.charcoal },
  bar: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 4, paddingHorizontal: space.s20, paddingTop: space.s16, paddingBottom: space.s12, backgroundColor: color.paper },
  edge: { position: "absolute", left: 0, right: 0, bottom: 0, height: 1, backgroundColor: color.borderNeutral },
  plans: { ...type.fieldValue, color: color.charcoal },
  // A margin, not a gap on the bar: `gap` had no effect on the bar, which is a sticky child of the ScrollView.
  chipScroll: { flexGrow: 0, marginTop: space.s12 },
  chips: { gap: space.s8 },
  body: { paddingHorizontal: space.s20, paddingTop: space.s8, gap: space.s16 },
  date: { ...type.label, color: color.charcoal },
  row: { flexDirection: "row", gap: space.s12 },
  time: { width: 64, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingTop: space.s16 },
  timeText: { ...type.fieldMessage, color: color.obsidian, fontVariant: ["tabular-nums"] },
  tick: { width: 12, height: 1, marginTop: 11, backgroundColor: color.borderNeutral },
  card: { flex: 1, overflow: "hidden", borderRadius: radius.tile, borderCurve: "continuous", backgroundColor: color.softGrey },
  head4: { gap: space.s4, padding: space.s16 },
  head4Open: { paddingBottom: 0 },   // the panel below brings its own 8pt
  head4Map: { paddingBottom: space.s12 },   // 12 between the location text and the map; the map sits 8 in from the card's left, right and bottom
  map: { margin: space.s8, marginTop: 0 },
  move: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: space.s8, paddingTop: space.s8, paddingHorizontal: space.s8, paddingBottom: space.s16 },   // pushed to the right, 8pt from the card's edges
  moveAfterMap: { paddingTop: 0 },   // the map above already leaves its own 8pt
  more: { width: 32, height: 32, borderRadius: radius.pill, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  trash: { width: 40, height: 40, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.alarmRed, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.s8 },
  itemTitle: { ...type.label, flex: 1, fontSize: 17, color: color.obsidian },
  place: { flexDirection: "row", alignItems: "center", gap: space.s4 },
  placeText: { ...type.fieldMessage, flexShrink: 1, color: color.charcoal },
  gap: { gap: space.s8 },
  dayList: { gap: space.s16 },
  text: { ...type.fieldValue, color: color.charcoal },
});
