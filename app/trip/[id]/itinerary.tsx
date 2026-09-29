import { Alert } from "../../../src/components/Alert";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { Card } from "../../../src/components/Card";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ItineraryResult, loadItinerary, moveItem } from "../../../src/api/itinerary";
import { Badge } from "../../../src/components/Badge";
import { DateField } from "../../../src/components/DateField";
import { MapPreview } from "../../../src/components/MapPreview";
import { PrimaryButton, TextButton } from "../../../src/components/Buttons";
import { formatDate } from "../../../src/domain/trip";
import { groupByDay, TYPE_LABEL } from "../../../src/domain/itinerary";
import { color, radius, space, type } from "../../../src/theme/tokens";

export default function Itinerary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<ItineraryResult | null>(null);

  const load = useCallback(async () => setState(await loadItinerary(id)), [id]);
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

  return (
    <ScrollView style={s.screen} refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Itinerary</Text>
      {state === null ? (
        <ActivityIndicator accessibilityLabel="Loading itinerary" color={color.forestInk} />
      ) : !state.ok ? (
        <View style={s.gap}>
          <Alert variant="negative">{state.message}</Alert>
          <TextButton label="Retry" onPress={load} />
        </View>
      ) : state.items.length === 0 ? (
        <View style={s.gap}>
          <Text maxFontSizeMultiplier={1.4} style={s.body}>Nothing planned yet. Add the first thing your group will do.</Text>
          <PrimaryButton label="Add an item" onPress={() => add(state.trip.start_date)} />
        </View>
      ) : (
        <>
          {moveError && <Alert variant="negative">{moveError}</Alert>}
          {groupByDay(state.items).map((d) => (
            <View key={d.date} style={s.gap}>
              <SectionHeader kind="group" title={formatDate(d.date)} />
              {d.items.map((i) => (
                <Card key={i.id} accessible>
                  <Text maxFontSizeMultiplier={1.4} style={s.title}>{i.title}</Text>
                  <Text maxFontSizeMultiplier={1.4} style={s.meta}>
                    {[i.start_time?.slice(0, 5), TYPE_LABEL[i.type]].filter(Boolean).join(" · ")}
                  </Text>
                  {i.is_outside_trip_range && <Badge variant="warning" label="Outside trip dates" />}
                  {i.latitude !== null && i.longitude !== null ? (
                    <MapPreview place={{ lat: i.latitude, lng: i.longitude, name: i.formatted_address }} />
                  ) : i.location_text ? (
                    <Text maxFontSizeMultiplier={1.4} style={s.meta}>📍 {i.location_text}</Text>
                  ) : null}
                  {i.participants.length > 0 && (
                    <Text maxFontSizeMultiplier={1.4} style={s.meta}>With {i.participants.join(", ")}</Text>
                  )}
                  {moving === i.id ? (
                    <DateField label={`New day for ${i.title}`} value={i.day_date} onChange={(day) => move(i.id, i.version, day)} />
                  ) : (
                    <TextButton label={`Move ${i.title} to another day`} onPress={() => setMoving(i.id)} />
                  )}
                </Card>
              ))}
            </View>
          ))}
          <PrimaryButton label="Add an item" onPress={() => add()} />
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  heading: { ...type.display, fontSize: 40, lineHeight: 40, letterSpacing: -1.4, color: color.obsidian },
  gap: { gap: space.s8 },
  title: { ...type.body, color: color.obsidian },
  meta: { ...type.label, color: color.charcoal },
  body: { ...type.body, color: color.charcoal },
  error: { ...type.label, color: color.alarmRed },
});
