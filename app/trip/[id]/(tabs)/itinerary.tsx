import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import { MapPin } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ItineraryResult, loadItinerary, moveItem } from "../../../../src/api/itinerary";
import { loadTripStatus } from "../../../../src/api/trips";
import { Alert } from "../../../../src/components/Alert";
import { Badge } from "../../../../src/components/Badge";
import { PrimaryButton, TextButton } from "../../../../src/components/Buttons";
import { DateField } from "../../../../src/components/DateField";
import { MapPreview } from "../../../../src/components/MapPreview";
import { TripCover } from "../../../../src/components/TripCover";
import { groupByDay, Item, ItemType, tripDays, TYPE_LABEL } from "../../../../src/domain/itinerary";
import { parseMapsUrl, Place } from "../../../../src/domain/maps";
import { formatDate, toIso } from "../../../../src/domain/trip";
import { usePullToRefresh } from "../../../../src/hooks/usePullToRefresh";
import { color, radius, shadow, space, type } from "../../../../src/theme/tokens";

// The dot before a title says what kind of thing it is; the type is also written on the card, so colour is never the only cue.
const DOT: Record<ItemType, string> = {
  activity: color.brightOrange, place: color.brightBlue, restaurant: color.brightYellow, transport: color.brightPink,
  stay: color.darkPurple, free_time: color.pebble, other: color.slate,
};

// The pin for an item: its stored coordinates, or, for items saved before the link could be read, whatever the saved link says.
const placeOf = (i: Item): Place | null =>
  i.latitude !== null && i.longitude !== null ? { lat: i.latitude, lng: i.longitude, name: i.formatted_address }
  : parseMapsUrl(i.location_url ?? i.location_text ?? "");

// The trip's plan: the trip header, a chip per day, and that day's items on a timeline (time on the left, a card on the right).
export default function Itinerary() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<ItineraryResult | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  const load = useCallback(async () => {
    loadTripStatus(id).then((t) => { if (t.ok) setCover(t.coverUrl); });
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

  const ok = state?.ok ? state : null;
  const grouped = useMemo(() => (ok ? groupByDay(ok.items) : []), [ok]);
  const days = useMemo(() => (ok ? tripDays(ok.trip.start_date, ok.trip.end_date, grouped.map((d) => d.date)) : []), [ok, grouped]);
  // Opens on today when it is a trip day, else the first day that has something planned, else the first day.
  const today = toIso(new Date());
  const selected = picked && days.includes(picked) ? picked : days.includes(today) ? today : grouped[0]?.date ?? days[0] ?? "";
  const items: Item[] = grouped.find((d) => d.date === selected)?.items ?? [];

  return (
    <ScrollView style={s.screen} refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s64 + space.s32 }]}>
      {state === null ? (
        <ActivityIndicator accessibilityLabel="Loading itinerary" color={color.forestInk} />
      ) : !ok ? (
        <View style={s.gap}>
          <Alert variant="negative">{(state as { message: string }).message}</Alert>
          <TextButton label="Retry" onPress={load} />
        </View>
      ) : (
        <>
          <View style={s.head}>
            <View style={s.cover}><TripCover uri={cover} destination={ok.trip.name} ratio={1} /></View>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={s.name}>{ok.trip.name}</Text>
            <Text maxFontSizeMultiplier={1.4} style={s.summary}>
              {ok.items.length} {ok.items.length === 1 ? "activity" : "activities"} · {days.length} {days.length === 1 ? "day" : "days"}
            </Text>
          </View>

          {ok.items.length === 0 ? (
            <View style={s.gap}>
              <Text maxFontSizeMultiplier={1.4} style={s.body}>Nothing planned yet. Add the first thing your group will do.</Text>
              <PrimaryButton label="Add an item" onPress={() => add(ok.trip.start_date)} />
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={s.chips} accessibilityRole="tablist" accessibilityLabel="Days">
                {days.map((d, n) => {
                  const on = d === selected;
                  return (
                    <Pressable key={d} accessibilityRole="tab" accessibilityLabel={`Day ${n + 1}, ${formatDate(d)}`} accessibilityState={{ selected: on }}
                      onPress={() => setPicked(d)} style={[s.chip, on && s.chipOn]}>
                      <Text maxFontSizeMultiplier={1.3} style={[s.chipText, on && s.chipTextOn]}>Day {n + 1}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {moveError && <Alert variant="negative">{moveError}</Alert>}
              <Text maxFontSizeMultiplier={1.4} style={s.date}>{formatDate(selected)}</Text>

              {items.length === 0 ? (
                <View style={s.gap}>
                  <Text maxFontSizeMultiplier={1.4} style={s.body}>Nothing planned for this day.</Text>
                  <PrimaryButton label="Add an item" onPress={() => add(selected)} />
                </View>
              ) : (
                <>
                  {items.map((i) => (
                    <View key={i.id} style={s.row}>
                      <View style={s.time}>
                        <Text maxFontSizeMultiplier={1.3} style={s.timeText}>{i.start_time ? i.start_time.slice(0, 5) : "Any time"}</Text>
                        <View style={s.tick} />
                      </View>
                      <View accessible style={s.card}>
                        <View style={s.titleRow}>
                          <View style={[s.dot, { backgroundColor: DOT[i.type] }]} />
                          <Text maxFontSizeMultiplier={1.4} style={s.title}>{i.title}</Text>
                          <Text maxFontSizeMultiplier={1.4} style={s.kind}>{TYPE_LABEL[i.type]}</Text>
                        </View>
                        {i.is_outside_trip_range && <Badge variant="warning" label="Outside trip dates" />}
                        {placeOf(i) ? (
                          <MapPreview place={placeOf(i)!} />
                        ) : i.location_text ? (
                          <View style={s.place}>
                            <MapPin size={16} color={color.slate} strokeWidth={1.75} />
                            <Text maxFontSizeMultiplier={1.4} style={s.placeText}>{i.location_text}</Text>
                          </View>
                        ) : null}
                        {i.participants.length > 0 && (
                          <View style={s.with}>
                            <Text maxFontSizeMultiplier={1.4} style={s.placeText}>With {i.participants.join(", ")}</Text>
                          </View>
                        )}
                        {moving === i.id ? (
                          <DateField label={`New day for ${i.title}`} value={i.day_date} onChange={(day) => move(i.id, i.version, day)} />
                        ) : (
                          <TextButton label={`Move ${i.title} to another day`} onPress={() => setMoving(i.id)} />
                        )}
                      </View>
                    </View>
                  ))}
                  <PrimaryButton label="Add an item" onPress={() => add(selected)} />
                </>
              )}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  head: { alignItems: "center", gap: space.s8 },
  cover: { width: 148, borderRadius: radius.tile, borderCurve: "continuous", overflow: "hidden" },
  name: { ...type.sheetTitle, fontSize: 26, lineHeight: 32, letterSpacing: -0.4, textAlign: "center", color: color.obsidian },
  summary: { ...type.fieldValue, color: color.charcoal },
  chips: { gap: space.s12 },
  chipScroll: { flexGrow: 0 },
  chip: { minHeight: 44, paddingHorizontal: space.s20, borderRadius: radius.pill, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: color.paper, borderWidth: 1, borderColor: color.borderNeutral },
  chipOn: { backgroundColor: color.forestInk, borderColor: color.forestInk },
  chipText: { ...type.buttonLarge, color: color.obsidian },
  chipTextOn: { color: color.brightGreen },
  date: { ...type.label, color: color.charcoal },
  row: { flexDirection: "row", gap: space.s12 },
  time: { width: 64, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingTop: space.s16 },
  timeText: { ...type.fieldMessage, color: color.slate, fontVariant: ["tabular-nums"] },
  tick: { width: 12, height: 1, marginTop: 11, backgroundColor: color.borderNeutral },
  card: { flex: 1, gap: space.s8, padding: space.s16, borderRadius: radius.tile, borderCurve: "continuous", backgroundColor: color.paper, borderWidth: 1, borderColor: color.borderNeutral, ...shadow.itemLight },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.s8 },
  dot: { width: 12, height: 12, borderRadius: radius.pill },
  title: { ...type.label, flex: 1, fontSize: 17, color: color.obsidian },
  kind: { ...type.fieldMessage, color: color.slate },
  place: { flexDirection: "row", alignItems: "center", gap: space.s4 },
  placeText: { ...type.fieldMessage, flexShrink: 1, color: color.charcoal },
  with: { paddingTop: space.s8, borderTopWidth: 1, borderTopColor: color.borderNeutral, borderStyle: "dashed" },
  gap: { gap: space.s8 },
  body: { ...type.fieldValue, color: color.charcoal },
});
