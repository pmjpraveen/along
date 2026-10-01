import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import { haptic } from "../../../../src/haptics";
import { TripMenu } from "../../../../src/components/TripMenu";
import { ChevronLeft, MapPin, Settings, UserPlus } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Pressable } from "../../../../src/components/Pressable";
import Animated, { FadeIn } from "react-native-reanimated";
import { useReducedMotion } from "../../../../src/hooks/useReducedMotion";
import { motion } from "../../../../src/theme/motion";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ItineraryResult, loadItinerary, moveItem } from "../../../../src/api/itinerary";
import { listMembers, Member } from "../../../../src/api/members";
import { loadTripStatus } from "../../../../src/api/trips";
import { Alert } from "../../../../src/components/Alert";
import { AvatarGroup } from "../../../../src/components/Avatar";
import { Badge } from "../../../../src/components/Badge";
import { PrimaryButton, TextButton } from "../../../../src/components/Buttons";
import { DateField } from "../../../../src/components/DateField";
import { MapPreview } from "../../../../src/components/MapPreview";
import { TripCover } from "../../../../src/components/TripCover";
import { groupByDay, Item, tripDays, TYPE_LABEL } from "../../../../src/domain/itinerary";
import { CARD_COLORS, formatDate, formatRange } from "../../../../src/domain/trip";
import { parseMapsUrl, Place } from "../../../../src/domain/maps";
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

  const load = useCallback(async () => {
    loadTripStatus(id).then((t) => { if (t.ok) { setCover(t.coverUrl); setBand(t.cardColor !== null && t.cardColor !== undefined ? CARD_COLORS[t.cardColor] ?? null : null); } });
    listMembers(id).then((r) => { if (r.ok) setMembers(r.members); });
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
  const add = (day?: string) => router.push({ pathname: "/trip/[id]/add-item", params: { id, ...(day && { day }) } });
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const ok = state?.ok ? state : null;
  const grouped = useMemo(() => (ok ? groupByDay(ok.items) : []), [ok]);
  const days = useMemo(() => (ok ? tripDays(ok.trip.start_date, ok.trip.end_date, grouped.map((d) => d.date)) : []), [ok, grouped]);
  // Opens on Day 1.
  const selected = picked && days.includes(picked) ? picked : days[0] ?? "";
  const items: Item[] = grouped.find((d) => d.date === selected)?.items ?? [];

  // The day bar is the scroller's second child. Once it reaches the top it sticks, and grows by the status-bar height so its chips
  // sit below the clock instead of under it.
  const barY = useRef(0);
  const [stuck, setStuck] = useState(false);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const now = e.nativeEvent.contentOffset.y >= barY.current - 1;
    setStuck((was) => (was === now ? was : now));
  };

  const round = (label: string, onPress: () => void, icon: React.ReactNode) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={space.s4} style={s.round}>{icon}</Pressable>
  );
  const ic = { size: 22, color: color.brandBlack, strokeWidth: 1.75 } as const;

  return (
    <View style={s.screen}>
    <ScrollView style={s.scroll} contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} refreshControl={pull} stickyHeaderIndices={ok && ok.items.length > 0 ? [1] : []} scrollEventThrottle={16} onScroll={onScroll}
      contentContainerStyle={{ paddingBottom: bottom + space.s64 + space.s32 }}>
      <View style={[s.head, { paddingTop: top + space.s16 }, band ? { backgroundColor: band, paddingBottom: space.s24 } : null]}>
        <View style={s.actions}>
          {round("Back", back, <ChevronLeft {...ic} />)}
          <View style={s.grow} />
          {round("Add guest", () => router.push({ pathname: "/trip/[id]/add-guest", params: { id } }), <UserPlus {...ic} />)}
          {round("Trip options", () => setMenu(true), <Settings {...ic} />)}
        </View>
        {state === null ? (
          <ActivityIndicator accessibilityLabel="Loading itinerary" color={color.forestInk} />
        ) : !ok ? (
          <View style={s.gap}>
            <Alert variant="negative">{(state as { message: string }).message}</Alert>
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
            {members.length > 0 && <AvatarGroup people={members.map((m) => ({ name: m.display_name, guest: m.membership_type === "guest" }))} size={48} max={4} />}
          </View>
        )}
      </View>

      {/* Child 1 (sticky): the "Plans" label and the day chips. */}
      <View onLayout={(e) => { barY.current = e.nativeEvent.layout.y; }} style={[s.bar, stuck && { paddingTop: top + space.s8 }, stuck && s.barStuck]}>
        {ok && ok.items.length > 0 && (
          <>
            {!stuck && <Text maxFontSizeMultiplier={1.3} style={s.plans}>Plans</Text>}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={s.chips} accessibilityRole="tablist" accessibilityLabel="Days">
              {days.map((d, n) => {
                const on = d === selected;
                return (
                  <Pressable key={d} accessibilityRole="tab" accessibilityLabel={`Day ${n + 1}, ${formatDate(d)}`} accessibilityState={{ selected: on }}
                    onPress={() => { if (!on) haptic.select(); setPicked(d); }} style={[s.chip, on && s.chipOn]}>
                    <Text maxFontSizeMultiplier={1.3} style={[s.chipText, on && s.chipTextOn]}>Day {n + 1}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}
      </View>

      <View style={s.body}>
        {ok && ok.items.length === 0 && (
          <View style={s.gap}>
            <Text maxFontSizeMultiplier={1.4} style={s.text}>Nothing planned yet. Add the first thing your group will do.</Text>
            <PrimaryButton label="Add a plan" onPress={() => add(ok.trip.start_date)} />
          </View>
        )}
        {ok && ok.items.length > 0 && (
          <>
            {moveError && <Alert variant="negative">{moveError}</Alert>}
            <Animated.View key={selected} entering={reduced ? undefined : FadeIn.duration(motion.fadeMs)} style={s.dayList}>
            {items.length === 0 ? (
              <View style={s.gap}>
                <Text maxFontSizeMultiplier={1.4} style={s.text}>Nothing planned for this day.</Text>
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
                    <View style={s.head4}>
                      <View style={s.titleRow}>
                      <Text maxFontSizeMultiplier={1.4} style={s.itemTitle}>{i.title}</Text>
                      <Text maxFontSizeMultiplier={1.4} style={s.kind}>{TYPE_LABEL[i.type]}</Text>
                      </View>
                    {i.is_outside_trip_range && <Badge variant="warning" label="Outside trip dates" />}
                    {placeLabel(i) ? (
                      <View style={s.place}>
                        <MapPin size={18} color={color.slate} strokeWidth={1.75} />
                        <Text maxFontSizeMultiplier={1.4} numberOfLines={2} style={s.placeText}>{placeLabel(i)}</Text>
                      </View>
                    ) : null}
                    </View>
                    {placeOf(i) && <MapPreview place={placeOf(i)!} />}
                    {moving === i.id && <DateField label={`New day for ${i.title}`} value={i.day_date} onChange={(day) => move(i.id, i.version, day)} />}
                  </Pressable>
                </View>
              ))
            )}
            </Animated.View>
          </>
        )}
      </View>
    </ScrollView>
    <TripMenu tripId={id} isOwner={isOwner} visible={menu} onClose={() => setMenu(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  scroll: { flex: 1 },
  head: { paddingHorizontal: space.s20, gap: space.s16 },
  actions: { flexDirection: "row", alignItems: "center", gap: space.s8 },
  grow: { flex: 1 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  title: { alignItems: "center", gap: space.s8 },
  cover: { width: 104 },   // the white border is on the photo itself
  datePill: { paddingHorizontal: space.s8, paddingVertical: 2, borderRadius: 6, borderCurve: "continuous" },
  dateText: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.obsidian, fontVariant: ["tabular-nums"] },
  summary: { ...type.fieldValue, color: color.charcoal },
  bar: { paddingHorizontal: space.s20, paddingTop: space.s24, paddingBottom: space.s12, backgroundColor: color.paper },
  barStuck: { borderBottomWidth: 1, borderBottomColor: color.borderNeutral },
  plans: { ...type.fieldValue, color: color.charcoal },
  // A margin, not a gap on the bar: `gap` had no effect on the bar, which is a sticky child of the ScrollView.
  chipScroll: { flexGrow: 0, marginTop: space.s16 },
  chips: { gap: space.s8 },
  chip: { minHeight: 44, paddingHorizontal: space.s20, borderRadius: radius.pill, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: color.buttonGrey },
  chipOn: { backgroundColor: color.darkMaroon },
  chipText: { ...type.buttonLarge, color: color.forestInk },
  chipTextOn: { color: color.brightOrange },
  body: { paddingHorizontal: space.s20, paddingTop: space.s8, gap: space.s16 },
  date: { ...type.label, color: color.charcoal },
  row: { flexDirection: "row", gap: space.s12 },
  time: { width: 64, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingTop: space.s16 },
  timeText: { ...type.fieldMessage, color: color.obsidian, fontVariant: ["tabular-nums"] },
  tick: { width: 12, height: 1, marginTop: 11, backgroundColor: color.borderNeutral },
  card: { flex: 1, gap: space.s12, padding: space.s16, borderRadius: radius.tile, borderCurve: "continuous", backgroundColor: color.neutralWash },
  head4: { gap: space.s4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.s8 },
  itemTitle: { ...type.label, flex: 1, fontSize: 17, color: color.obsidian },
  kind: { ...type.fieldMessage, color: color.slate },
  place: { flexDirection: "row", alignItems: "center", gap: space.s4 },
  placeText: { ...type.fieldMessage, flexShrink: 1, color: color.charcoal },
  gap: { gap: space.s8 },
  dayList: { gap: space.s16 },
  text: { ...type.fieldValue, color: color.charcoal },
});
