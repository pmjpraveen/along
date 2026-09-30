import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { CalendarDays, ChevronLeft, Coins, Flag } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadTripSettings, setTripCurrency, SettingsResult, updateTripDates } from "../../../src/api/trips";
import { Alert } from "../../../src/components/Alert";
import { TextButton } from "../../../src/components/Buttons";
import { RangeCalendar } from "../../../src/components/Calendar";
import { Range } from "../../../src/domain/calendar";
import { BottomSheet } from "../../../src/components/BottomSheet";
import { ListItem } from "../../../src/components/ListItem";
import { formatDate } from "../../../src/domain/trip";
import { color, radius, space, type } from "../../../src/theme/tokens";

// Trip settings: three things, all for the trip's owner: change the dates, change the currency (until money is involved), end the trip.
export default function TripSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<SettingsResult | null>(null);
  const [picker, setPicker] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [draft, setDraft] = useState<Range>({ start: "", end: "" });
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => setState(await loadTripSettings(id)), [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const x = state?.ok ? state.settings : null;
  const over = x ? x.status === "completed" || x.status === "archived" : false;
  const editable = !!x && x.isOwner && !over;
  const dates = async () => {
    setDatesOpen(false);
    setError(null);
    const res = await updateTripDates(id, draft.start, draft.end);
    if (!res.ok) setError(res.message);
    await load();
  };
  const currency = async (code: string) => {
    setPicker(false);
    setError(null);
    const res = await setTripCurrency(id, code);
    if (!res.ok) setError(res.message);
    await load();
  };
  const icon = (I: typeof Flag) => <View style={s.icon}><I size={22} color={color.forestInk} strokeWidth={1.75} /></View>;

  return (
    <ScrollView style={s.screen} contentInsetAdjustmentBehavior="never" contentContainerStyle={[s.content, { paddingTop: top + space.s16, paddingBottom: bottom + space.s24 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={space.s4} style={s.round}>
        <ChevronLeft size={22} color={color.forestInk} strokeWidth={1.75} />
      </Pressable>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Trip settings</Text>

      {state === null ? (
        <ActivityIndicator accessibilityLabel="Loading settings" color={color.forestInk} />
      ) : !x ? (
        <View style={s.gap}>
          <Alert variant="negative">{(state as { message: string }).message}</Alert>
          <TextButton label="Retry" onPress={load} />
        </View>
      ) : (
        <>
          {!x.isOwner && <Alert variant="neutral">Only the trip owner can change these.</Alert>}
          {over && <Alert variant="neutral">This trip has ended, so its settings are locked.</Alert>}
          {error && <Alert variant="negative">{error}</Alert>}

          <View style={s.list}>
            <ListItem title="Modify dates" subtitle={`${formatDate(x.start)} → ${formatDate(x.end)}`} leading={icon(CalendarDays)} trailing={editable ? "chevron" : "none"}
              disabled={!editable} onPress={editable ? () => { setDraft({ start: x.start, end: x.end }); setDatesOpen(true); } : undefined} />
            <View style={s.line} />
            <ListItem title="Currency" subtitle={x.hasMoney ? `${x.currency} · locked once expenses are added` : x.currency} leading={icon(Coins)}
              trailing={editable && !x.hasMoney ? "chevron" : "none"} disabled={!editable || x.hasMoney} onPress={editable && !x.hasMoney ? () => setPicker(true) : undefined} />
            <View style={s.line} />
            <ListItem title="End trip" subtitle={over ? "This trip has ended" : "Review it, then mark it complete"} leading={icon(Flag)}
              trailing={editable ? "chevron" : "none"} disabled={!editable} onPress={editable ? () => router.push({ pathname: "/trip/[id]/complete", params: { id } }) : undefined} />
          </View>

          <BottomSheet visible={datesOpen} onClose={() => setDatesOpen(false)} title="Modify dates" actionLabel="Confirm" actionType="secondaryNeutral" actionDisabled={!draft.end} onAction={dates}>
            <RangeCalendar value={draft} onChange={setDraft} />
          </BottomSheet>
          <BottomSheet visible={picker} onClose={() => setPicker(false)} title="Currency" body="Amounts are not converted, so this can only change before any expense is added.">
            {x.currencies.map((c) => (
              <ListItem key={c.code} title={c.name} subtitle={c.code} trailing="radio" checked={c.code === x.currency} onPress={() => currency(c.code)} />
            ))}
          </BottomSheet>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  heading: { ...type.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: color.obsidian },
  gap: { gap: space.s8 },
  list: { borderRadius: radius.sheet, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, overflow: "hidden" },
  line: { height: 1, backgroundColor: color.borderNeutral, marginHorizontal: space.s16 },
  icon: { width: 44, height: 44, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.neutralSolid, alignItems: "center", justifyContent: "center" },
});
