import { useFocusEffect, useRouter } from "expo-router";
import { Bell, ChevronLeft, FileText, Globe, LogOut, Shield, Trash2 } from "lucide-react-native";

const GOLD = "#e8cf8a";   // the gold used for embossing on a passport cover
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadStamps, StampsResult } from "../src/api/passport";
import { loadPreferences, setPreference } from "../src/api/notifications";
import { deleteMyAccount, loadMyProfile, MyProfile, setMyCountry, signOut } from "../src/api/profile";
import { Alert } from "../src/components/Alert";
import { Avatar } from "../src/components/Avatar";
import { BottomSheet } from "../src/components/BottomSheet";
import { Dialog } from "../src/components/Dialog";
import { ListItem } from "../src/components/ListItem";
import { COUNTRIES, countryName, flagOf, PASSPORTS } from "../src/domain/countries";
import { NotificationType, TYPE_LABEL, TYPES } from "../src/domain/notifications";
import { TextButton } from "../src/components/Buttons";
import { PassportShine } from "../src/components/PassportShine";
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
  const [sheet, setSheet] = useState<"country" | "notifications" | null>(null);
  const [prefs, setPrefs] = useState<Record<NotificationType, boolean> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openNotifications = async () => {
    setSheet("notifications");
    const r = await loadPreferences();
    if (r.ok) setPrefs(r.enabled); else setError(r.message);
  };
  const toggle = async (type: NotificationType, on: boolean) => {
    setPrefs((p) => (p ? { ...p, [type]: on } : p));
    const r = await setPreference(type, on);
    if (!r.ok) { setPrefs((p) => (p ? { ...p, [type]: !on } : p)); setError(r.message); }
  };
  const pickCountry = async (code: string) => {
    setSheet(null);
    setError(null);
    const r = await setMyCountry(code);
    if (r.ok) setMe((m) => (m ? { ...m, country: code } : m)); else setError(r.message);
  };
  const logOut = async () => { setError(null); const r = await signOut(); if (!r.ok) setError(r.message); };
  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await deleteMyAccount();
    setBusy(false);
    setConfirmDelete(false);
    if (!r.ok) setError(r.message);
  };
  const icon = (I: typeof Globe, danger?: boolean) => <View style={s.icon}><I size={20} color={danger ? color.alarmRed : color.forestInk} strokeWidth={1.75} /></View>;
  // The cover takes its colour from the passport of my country (teal until one is chosen).
  const passport = me?.country ? PASSPORTS[me.country] : undefined;
  const cover = passport?.cover ?? "#1f6f78";
  const coverTop = mix(cover, "#ffffff", 0.14);      // the cover is a touch lighter at the top and darker at the bottom, like a lit leather cover
  const coverBottom = mix(cover, "#000000", 0.28);
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

        <View style={[s.card, s.passportCard]}>
          {/* The whole card is the passport cover: colour of my country's passport, a faint grain, and a gold embossed frame and title. */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {Array.from({ length: 32 }, (_, i) => <View key={i} style={{ flex: 1, backgroundColor: mix(coverTop, coverBottom, i / 31) }} />)}
            <View style={s.grain}>{Array.from({ length: 14 }, (_, i) => <View key={i} style={[s.grainLine, { top: `${(i + 1) * 6.6}%` }]} />)}</View>
            {/* The shine: a glint that sweeps across the cover, rests, and repeats. */}
            <PassportShine />
            <View style={s.frame} />
          </View>
          <View style={[s.passportTitleRow]}>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.passportTitle}>Passport</Text>
            <Globe size={22} color={GOLD} strokeWidth={1.5} />
          </View>
          {state === null ? (
            <ActivityIndicator accessibilityLabel="Loading your passport" color={color.forestInk} />
          ) : !state.ok ? (
            <View style={s.gap}>
              <Alert variant="negative">{state.message}</Alert>
              <TextButton label="Retry" onPress={load} />
            </View>
          ) : (
            <>
            <Pressable accessibilityRole="button" accessibilityLabel={`Passport, total trips ${stamps.length}`} accessibilityHint="Opens your stamps" onPress={() => router.push("/passport")} style={s.cover}>
              <View style={s.inset}>
              {/* The passport's page: two machine-readable lines, then the trip count; it runs off the bottom like a page in a cover. */}
              <View style={s.page}>
                <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={s.mrz}>{`<<${passport?.iso3 ?? "ALONG"}<<${mrzName}<<MEMBERSINCE${compactDate(me?.since ?? "")}<<`}</Text>
                <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={s.mrz}>{`TRIPS${String(stamps.length).padStart(3, "0")}<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<`}</Text>
                <Text maxFontSizeMultiplier={1.3} style={s.label}>Total trips</Text>
                <Text maxFontSizeMultiplier={1.2} style={s.count}>{stamps.length}</Text>
              </View>
              </View>
            </Pressable>
            </>
          )}
        </View>

        {error && <Alert variant="negative">{error}</Alert>}

        <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.group}>Settings</Text>
        <View style={s.list}>
          <ListItem title="Country" subtitle={countryName(me?.country ?? null)} leading={icon(Globe)} trailing="chevron" onPress={() => setSheet("country")} />
          <View style={s.hair} />
          <ListItem title="Notifications" subtitle="Choose what you hear about" leading={icon(Bell)} trailing="chevron" onPress={openNotifications} />
        </View>

        <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.group}>Support</Text>
        <View style={s.list}>
          <ListItem title="Privacy policy" leading={icon(Shield)} trailing="chevron" onPress={() => router.push("/privacy")} />
          <View style={s.hair} />
          <ListItem title="Terms of use" leading={icon(FileText)} trailing="chevron" onPress={() => router.push("/terms")} />
        </View>

        <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.group}>Account</Text>
        <View style={s.list}>
          <ListItem title="Log out" leading={icon(LogOut)} trailing="chevron" onPress={logOut} />
          <View style={s.hair} />
          <ListItem title="Delete account" subtitle="Shared expenses stay on trips" leading={icon(Trash2, true)} destructive trailing="chevron" onPress={() => setConfirmDelete(true)} />
        </View>
      </ScrollView>
      <BottomSheet visible={sheet === "country"} onClose={() => setSheet(null)} title="Country">
        {COUNTRIES.map((c) => (
          <ListItem key={c.code} title={c.name} leading={<Text style={s.flag}>{flagOf(c.code)}</Text>} trailing="radio" checked={c.code === me?.country} onPress={() => pickCountry(c.code)} />
        ))}
      </BottomSheet>
      <BottomSheet visible={sheet === "notifications"} onClose={() => setSheet(null)} title="Notifications" body="Choose what you want to hear about.">
        {prefs === null ? <ActivityIndicator accessibilityLabel="Loading your choices" color={color.forestInk} /> : TYPES.map((tp) => (
          <ListItem key={tp} title={TYPE_LABEL[tp]} trailing="switch" checked={prefs[tp]} onPress={() => toggle(tp, !prefs[tp])} />
        ))}
      </BottomSheet>
      <Dialog visible={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete your account?" subheader="This can't be undone"
        body="Your name will show as Deleted user, and you'll be signed out for good. Expenses and payments you shared stay on the trip so everyone else's balances remain correct."
        actionLabel={busy ? "Deleting…" : "Delete account"} actionType="destructive" onAction={remove} actionBusy={busy} secondaryLabel="Keep my account" onSecondary={() => setConfirmDelete(false)} />
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
  cover: { height: 140, borderRadius: radius.card, borderCurve: "continuous", overflow: "hidden" },
  inset: { flex: 1, paddingHorizontal: space.s12, paddingTop: space.s8 },
  page: { flex: 1, paddingHorizontal: space.s16, paddingTop: space.s16, borderTopLeftRadius: radius.tile, borderTopRightRadius: radius.tile, borderCurve: "continuous", backgroundColor: color.paper, gap: 2 },
  mrz: { fontFamily: font.regular, fontSize: 12, lineHeight: 18, letterSpacing: 0.2, color: color.slate },
  count: { ...type.display, fontSize: 56, lineHeight: 60, color: color.obsidian, fontVariant: ["tabular-nums"] },
  // The passport card is inset 8 on the left, right and bottom, so its cover sits close to the edge; the title keeps the usual text margin.
  passportCard: { paddingTop: space.s20, paddingHorizontal: space.s8, paddingBottom: space.s8, backgroundColor: "transparent", overflow: "hidden" },
  passportTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.s12 },
  passportTitle: { ...type.fieldValue, fontFamily: font.medium, letterSpacing: 2, textTransform: "uppercase", color: GOLD },
  frame: { position: "absolute", top: 6, left: 6, right: 6, bottom: 6, borderRadius: radius.tile, borderCurve: "continuous", borderWidth: 1, borderColor: "rgba(232,207,138,0.35)" },
  grain: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  grainLine: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.05)" },
  gap: { gap: space.s8 },
  group: { ...type.fieldValue, color: color.charcoal, marginTop: space.s8 },
  list: { borderRadius: radius.sheet, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, overflow: "hidden" },
  hair: { height: 1, backgroundColor: color.borderNeutral, marginHorizontal: space.s16 },
  icon: { width: 40, height: 40, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.neutralSolid, alignItems: "center", justifyContent: "center" },
  flag: { fontSize: 28, width: 40, textAlign: "center" },
  body: { ...type.fieldValue, color: color.charcoal },
});
