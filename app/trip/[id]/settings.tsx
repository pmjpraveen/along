import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useCallback, useDeferredValue, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "../../../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadTripSettings, setTripCardColor, setTripCurrency, SettingsResult, updateTripDates, updateTripDetails } from "../../../src/api/trips";
import { SearchField } from "../../../src/components/SearchField";
import { Alert } from "../../../src/components/Alert";
import { Button, TextButton } from "../../../src/components/Buttons";
import { RangeCalendar } from "../../../src/components/Calendar";
import { matches } from "../../../src/domain/search";
import { Range } from "../../../src/domain/calendar";
import { BottomSheet, SheetRows } from "../../../src/components/BottomSheet";
import { haptic } from "../../../src/haptics";
import { toast } from "../../../src/stores/toast";
import { ListItem } from "../../../src/components/ListItem";
import { PlaceSearchField } from "../../../src/components/PlaceSearchField";
import { FieldLabel, TextField } from "../../../src/components/TextField";
import { CARD_COLORS, formatDate, formatRange } from "../../../src/domain/trip";
import { color, radius, space, type } from "../../../src/theme/tokens";

type Draft = { name: string; destination: string; description: string; cardColor: number };

// Trip details, for the trip's owner, as one plain list of fields: the name, a comment, the card colour, the dates, the currency (until money is
// involved) and where the trip is going. Text and colour are edited in place and saved together with the one Save button, which only
// lights up when something changed. Dates and currency act at once. (Ending and deleting a trip are not on this page for now.)
export default function TripSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<SettingsResult | null>(null);
  const [form, setForm] = useState<Draft | null>(null);
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [datesOpen, setDatesOpen] = useState(false);
  const [range, setRange] = useState<Range>({ start: "", end: "" });
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const r = await loadTripSettings(id);
    setState(r);
    if (r.ok) setForm({ name: r.settings.name, destination: r.settings.destination, description: r.settings.description, cardColor: r.settings.cardColor });
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const x = state?.ok ? state.settings : null;
  const over = x ? x.status === "completed" || x.status === "archived" : false;
  const owner = !!x?.isOwner;
  const editable = owner && !over;
  const textDirty = !!x && !!form && (form.name !== x.name || form.destination !== x.destination || form.description !== x.description);
  const colorDirty = !!x && !!form && form.cardColor !== x.cardColor;
  const dirty = textDirty || colorDirty;

  const save = async () => {
    if (!x || !form || saving || !dirty) return;
    setError(null);
    setNameError(null);
    if (textDirty && !form.name.trim()) { setNameError("Give the trip a name."); return; }
    if (textDirty && !form.destination.trim()) { setError("A trip needs a location."); return; }
    setSaving(true);
    // The text goes first: it checks the version that was read, and picking a colour changes the version.
    const text = textDirty ? await updateTripDetails(id, x.version, { name: form.name, destination: form.destination, description: form.description }) : { ok: true as const };
    const colour = text.ok && colorDirty ? await setTripCardColor(id, form.cardColor) : { ok: true as const };
    setSaving(false);
    if (!text.ok) { haptic.warn(); setError(text.message); return; }
    if (!colour.ok) { haptic.warn(); setError(colour.message); await load(); return; }
    haptic.success();
    toast("Trip updated");
    await load();
  };
  const dates = async () => {
    setDatesOpen(false);
    setError(null);
    const res = await updateTripDates(id, range.start, range.end);
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
  const currencyName = x?.currencies.find((c) => c.code === x.currency)?.name;
  const canPickCurrency = editable && !x?.hasMoney;

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never" contentContainerStyle={[s.content, { paddingTop: top + space.s12, paddingBottom: space.s32 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={space.s4} style={s.round}>
          <ChevronLeft size={22} color={color.brandBlack} strokeWidth={1.75} />
        </Pressable>
        <View style={s.head}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Trip details</Text>
          {!!x && <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={s.subtitle}>{x.name}</Text>}
        </View>

        {state === null ? (
          <ActivityIndicator accessibilityLabel="Loading settings" color={color.forestInk} />
        ) : !x || !form ? (
          <View style={s.gap}>
            <Alert variant="negative">{(state as { message: string }).message}</Alert>
            <TextButton label="Retry" onPress={load} />
          </View>
        ) : (
          <>
            {!owner && <Alert variant="neutral">Only the trip owner can change these.</Alert>}
            {over && <Alert variant="neutral">This trip has ended, so its name and location are locked.</Alert>}
            {error && <Alert variant="negative">{error}</Alert>}

            <TextField label="Trip name" placeholder="Trip name" value={form.name} onChangeText={(v) => { setForm({ ...form, name: v }); setNameError(null); }}
              disabled={!editable} autoCapitalize="words" maxLength={80} status={nameError ? "error" : undefined} message={nameError ?? undefined} />
            <TextField label="Trip comment" placeholder="A note for the group" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })}
              disabled={!editable} autoCapitalize="sentences" maxLength={200} />
            <View style={s.colourRow}>
              <Text maxFontSizeMultiplier={1.3} style={s.colourLabel}>Card colour</Text>
              <View accessibilityRole="radiogroup" accessibilityLabel="Card colour" style={s.swatches}>
                {CARD_COLORS.map((c, i) => {
                  const on = form.cardColor === i;
                  return (
                    <Pressable key={c} accessibilityRole="radio" accessibilityLabel={`Colour ${i + 1}`} accessibilityState={{ selected: on, disabled: !owner }} disabled={!owner}
                      hitSlop={space.s4} onPress={() => { if (!on) { haptic.select(); setForm({ ...form, cardColor: i }); } }}
                      style={[s.swatch, { backgroundColor: c }, on && s.swatchOn]} />
                  );
                })}
              </View>
            </View>

            <View style={s.field}>
              <FieldLabel disabled={!editable}>Trip dates</FieldLabel>
              <Pressable accessibilityRole="button" accessibilityLabel={`Trip dates, ${formatDate(x.start)} to ${formatDate(x.end)}`} disabled={!editable}
                onPress={() => { setRange({ start: x.start, end: x.end }); setDatesOpen(true); }} style={[s.pick, !editable && s.pickOff]}>
                <Text maxFontSizeMultiplier={1.4} style={[s.pickValue, s.pickFlex]}>{formatRange(x.start, x.end)}</Text>
                {editable && <ChevronRight size={20} color={color.brandBlack} strokeWidth={1.75} />}
              </Pressable>
            </View>

            <View style={s.field}>
              <FieldLabel disabled={!canPickCurrency}>Trip currency</FieldLabel>
              <Pressable accessibilityRole="button" accessibilityLabel={`Trip currency, ${x.currency}${x.hasMoney ? ", locked once expenses are added" : ""}`} disabled={!canPickCurrency}
                onPress={() => { setQuery(""); setPicker(true); }} style={[s.pick, !canPickCurrency && s.pickOff]}>
                <Text maxFontSizeMultiplier={1.4} style={[s.pickValue, s.pickFlex]}>{currencyName ? `${x.currency} · ${currencyName}` : x.currency}</Text>
                {canPickCurrency && <ChevronRight size={20} color={color.brandBlack} strokeWidth={1.75} />}
              </Pressable>
              {x.hasMoney && <Text maxFontSizeMultiplier={1.4} style={s.hint}>Locked once expenses are added, so amounts always stay in one currency.</Text>}
            </View>

            {editable ? (
              <PlaceSearchField label="Location" placeholder="Search a city or place" value={form.destination} autoCapitalize="words"
                onChangeText={(v) => setForm({ ...form, destination: v })}
                onPick={(p) => setForm({ ...form, destination: p.subtitle ? `${p.title}, ${p.subtitle.split(", ").pop()}` : p.title })} />
            ) : (
              <TextField label="Location" value={form.destination} onChangeText={() => {}} disabled />
            )}


            <BottomSheet visible={datesOpen} onClose={() => setDatesOpen(false)} title="Modify dates" actionLabel="Confirm" actionType="secondaryNeutral" actionDisabled={!range.end} onAction={dates}>
              <RangeCalendar value={range} onChange={setRange} />
            </BottomSheet>
            <BottomSheet visible={picker} onClose={() => setPicker(false)} title="Currency" tall header={<SearchField placeholder="Search currencies" value={query} onChangeText={setQuery} />} body="Amounts aren't converted, so choose this before adding any expenses.">
              <SheetRows>
                {x.currencies.filter((c) => matches(deferred, c.name, c.code)).map((c) => (
                  <ListItem key={c.code} title={c.name} subtitle={c.code} trailing="radio" checked={c.code === x.currency} onPress={() => currency(c.code)} />
                ))}
              </SheetRows>
            </BottomSheet>
          </>
        )}
      </ScrollView>
      {!!x && owner && (
        <View style={[s.footer, { paddingBottom: bottom + space.s12 }]}>
          <Button label={saving ? "Saving…" : "Save changes"} onPress={save} type={dirty ? "primary" : "secondaryNeutral"} disabled={!dirty && !saving} busy={saving} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s20 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  head: { gap: space.s4, marginBottom: space.s8 },
  heading: { fontFamily: type.sheetTitle.fontFamily, fontSize: 32, lineHeight: 38, letterSpacing: -0.8, color: color.brandBlack },
  subtitle: { ...type.fieldValue, color: color.slate },
  gap: { gap: space.s8 },
  colourRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.s12, minHeight: 44 },
  colourLabel: { ...type.fieldLabel, color: color.obsidian },   // the same label as the fields above it
  swatches: { flexDirection: "row", gap: space.s8 },
  swatch: { width: 34, height: 34, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 2, borderColor: "transparent" },
  swatchOn: { borderColor: color.brandBlack },
  field: { gap: space.s8 },
  pick: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: space.s8, paddingHorizontal: space.s16, paddingVertical: 12, borderRadius: radius.card, borderCurve: "continuous", borderWidth: 1, borderColor: color.inputBorder, backgroundColor: color.paper },
  pickOff: { borderColor: color.borderNeutral },
  pickValue: { ...type.fieldValue, color: color.obsidian },
  pickFlex: { flex: 1 },
  hint: { ...type.fieldMessage, color: color.slate },
  footer: { paddingHorizontal: space.s20, paddingTop: space.s12, borderTopWidth: 1, borderTopColor: color.borderNeutral, backgroundColor: color.paper },
});
