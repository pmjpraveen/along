import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";
import { Skeleton } from "../../../src/components/Skeleton";
import { ChevronLeft, ImageIcon, MapPin, Receipt, Scale, Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Pressable } from "../../../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadTripSummary, SummaryResult } from "../../../src/api/passport";
import { Alert } from "../../../src/components/Alert";
import { AvatarGroup } from "../../../src/components/Avatar";
import { Badge } from "../../../src/components/Badge";
import { TextButton } from "../../../src/components/Buttons";
import { ListItem } from "../../../src/components/ListItem";
import { Stamp } from "../../../src/components/Stamp";
import { placement } from "../../../src/domain/passportPage";
import { shapeFor } from "../../../src/domain/stampShape";
import { TripCover } from "../../../src/components/TripCover";
import { TripNameTag } from "../../../src/components/TripNameTag";
import { listMembers, Member } from "../../../src/api/members";
import { deleteTrip, loadTripStatus } from "../../../src/api/trips";
import { Dialog } from "../../../src/components/Dialog";
import { haptic } from "../../../src/haptics";
import { toast } from "../../../src/stores/toast";
import { formatMinor } from "../../../src/domain/money";
import { CARD_COLORS, formatRange } from "../../../src/domain/trip";
import { color, font, mix, radius, space, type, pillOn } from "../../../src/theme/tokens";

// A finished trip at a glance: where and when, who came, what was planned, what was spent, what is still to settle, and the way into its
// memories, balances and expenses. Read-only, and it works for any trip status.
const STAMP_W = 200;   // half of this shows; the other half is cut off by the edge

export default function Summary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [state, setState] = useState<SummaryResult | null>(null);
  const [look, setLook] = useState<{ cover: string | null; band: string | null }>({ cover: null, band: null });
  const [members, setMembers] = useState<Member[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isOwner = members.some((m) => m.isMe && m.role === "owner");
  const [extras, setExtras] = useState({ look: false, people: false });   // the header waits for its colour, cover and people, so it does not pop in piece by piece
  const load = useCallback(async () => {
    loadTripStatus(id).then((t) => { if (t.ok) setLook({ cover: t.coverUrl, band: CARD_COLORS[t.cardColor] ?? null }); }).finally(() => setExtras((e) => ({ ...e, look: true })));
    listMembers(id).then((r) => { if (r.ok) setMembers(r.members); }).finally(() => setExtras((e) => ({ ...e, people: true })));
    setState(await loadTripSummary(id));
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = usePullToRefresh(load);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const go = (screen: "memories" | "balances" | "expense-list") =>
    router.push({ pathname: `/trip/[id]/${screen}` as "/trip/[id]/memories", params: { id } });
  const remove = async () => {
    if (deleting) return;
    setDeleting(true);
    const r = await deleteTrip(id);
    setDeleting(false);
    if (!r.ok) { haptic.warn(); setDeleteError(r.message); return; }
    setConfirming(false);
    haptic.success();
    toast("Trip deleted");
    router.replace("/");
  };
  const icon = (I: typeof Receipt, danger?: boolean) => <View style={s.icon}><I size={20} color={danger ? color.alarmRed : color.iconInk} strokeWidth={1.75} /></View>;
  const sm = state?.ok ? state.summary : null;
  const money = (minor: number) => (sm ? formatMinor(minor, sm.exponent, sm.currency) : "");
  const { band } = look;
  const navH = top + space.s16 + 48 + space.s12;

  // The top is the trip page's: the trip's colour behind the cover photo, the date pill, the name tag, the place and who came.
  return (
    <View style={s.screen}>
      <ScrollView refreshControl={pull} style={s.scroll} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingBottom: bottom + space.s24 }}>
        <View style={[s.head, { paddingTop: navH }, band ? { backgroundColor: band, paddingBottom: space.s24 } : null]}>
          {/* The two stamps the trip earned, arrival top right and departure bottom left, faint behind the content and half pressed off the edge
              (same shapes and inks as in the passport). */}
          {sm && (["arrival", "departure"] as const).map((kind, k) => (
            <View key={kind} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
              style={[s.stamp, { width: STAMP_W }, k === 0 ? { top: navH + space.s4, right: -STAMP_W / 2 } : { bottom: space.s8, left: -STAMP_W / 2 }]}>
              <Stamp compact destination={sm.destination_name.split(",")[0].trim()} date={kind === "arrival" ? sm.start_date : sm.end_date} kind={kind}
                shape={shapeFor(sm.trip_id, kind)} ink={placement(sm.trip_id, k).ink} tilt={k === 0 ? -8 : 6} />
            </View>
          ))}
          {state === null || (state.ok && !(extras.look && extras.people)) ? (
            <Skeleton label="Loading trip summary" variant="tripHeader" />
          ) : !sm ? (
            <View style={s.gap}>
              <Alert variant="negative" persist>{state.ok ? "" : state.message}</Alert>
              <TextButton label="Retry" onPress={load} />
            </View>
          ) : (
            <View style={s.title}>
              <View style={s.cover}><TripCover uri={look.cover} destination={sm.name} ratio={1} ring /></View>
              <View style={[s.datePill, { backgroundColor: band ? pillOn(band) : color.neutralSolid }]}>
                <Text maxFontSizeMultiplier={1.3} style={s.dateText}>{formatRange(sm.start_date, sm.end_date)}</Text>
              </View>
              <View accessibilityRole="header" accessibilityLabel={sm.name}><TripNameTag name={sm.name} maxWidth={width - space.s20 * 2} tilt={-2} /></View>
              <View style={s.place}>
                <MapPin size={16} color={color.brandBlack} strokeWidth={1.75} />
                <Text maxFontSizeMultiplier={1.4} style={s.placeText}>{sm.destination_name}</Text>
              </View>
              {(sm.status === "completed" || sm.status === "archived") && <View style={s.badge}><Badge variant="success" label="Completed" /></View>}
              {members.length > 0 && <AvatarGroup people={members.map((m) => ({ name: m.display_name, uri: m.avatarUrl, guest: m.membership_type === "guest" }))} size={48} max={4} />}
            </View>
          )}
        </View>

        {state === null && <View style={s.content}><Skeleton label="Loading trip summary details" variant="summaryBody" /></View>}
        {sm && (
          <View style={s.content}>
            <View accessible style={s.total}>
              <Text maxFontSizeMultiplier={1.4} style={s.label}>Total spent</Text>
              <Text maxFontSizeMultiplier={1.3} style={s.big}>{money(sm.total_spend_minor)}</Text>
              <Text maxFontSizeMultiplier={1.4} style={s.body}>
                {sm.outstanding_minor === 0 ? "Everyone's settled up." : `${money(sm.outstanding_minor)} still to settle`}
              </Text>
              <View style={s.line} />
              <Text maxFontSizeMultiplier={1.4} style={s.body}>{sm.people} {sm.people === 1 ? "person" : "people"}</Text>
              <Text maxFontSizeMultiplier={1.4} style={s.body}>{sm.activities} {sm.activities === 1 ? "activity" : "activities"} planned</Text>
            </View>
            <View style={s.list}>
              <ListItem title="Memories" subtitle="Photos and notes from the trip" leading={icon(ImageIcon)} trailing="chevron" onPress={() => go("memories")} />
              <View style={s.hair} />
              <ListItem title="Balances" subtitle="Who owes whom" leading={icon(Scale)} trailing="chevron" onPress={() => go("balances")} />
              <View style={s.hair} />
              <ListItem title="Expenses" subtitle="Everything that was paid for" leading={icon(Receipt)} trailing="chevron" onPress={() => go("expense-list")} />
            </View>
            {isOwner && (
              <View style={s.list}>
                <ListItem title="Delete trip" subtitle="Removes it for everyone" leading={icon(Trash2, true)} destructive trailing="chevron" onPress={() => { setDeleteError(null); setConfirming(true); }} />
              </View>
            )}
          </View>
        )}
      </ScrollView>
      <Dialog visible={confirming} onClose={() => setConfirming(false)} title="Delete this trip?" subheader="This can't be undone"
        body={deleteError ?? "The trip and everything on it, its plans, expenses, payments and photos, will be erased for everyone. This can't be recovered."}
        actionLabel={deleting ? "Deleting…" : "Delete trip"} actionType="destructive" onAction={remove} actionBusy={deleting}
        secondaryLabel="Keep the trip" onSecondary={() => setConfirming(false)} />
      {/* The back button stays put on the trip's colour while the rest scrolls under it. */}
      <View style={[s.nav, { height: navH, paddingTop: top + space.s16, backgroundColor: band ?? color.paper }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={space.s4} style={s.round}>
          <ChevronLeft size={22} color={color.brandBlack} strokeWidth={1.75} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  scroll: { flex: 1 },
  nav: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 5, paddingHorizontal: space.s20 },
  head: { paddingHorizontal: space.s20, gap: space.s16, overflow: "hidden" },
  stamp: { position: "absolute", opacity: 0.55 },
  content: { paddingHorizontal: space.s20, paddingTop: space.s24, gap: space.s16 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  title: { alignItems: "center", gap: space.s8 },
  cover: { width: 104 },
  datePill: { paddingHorizontal: space.s8, paddingVertical: 2, borderRadius: 6, borderCurve: "continuous" },
  dateText: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.obsidian, fontVariant: ["tabular-nums"] },
  placeText: { ...type.fieldValue, color: color.brandBlack },
  badge: { alignSelf: "center" },
  place: { flexDirection: "row", alignItems: "center", gap: space.s4 },
  gap: { gap: space.s8 },
  body: { ...type.fieldValue, color: color.charcoal },
  total: { gap: space.s4, padding: space.s20, borderRadius: radius.sheet, borderCurve: "continuous", backgroundColor: color.softGrey },
  label: { ...type.fieldValue, color: color.charcoal },
  big: { ...type.display, fontSize: 40, lineHeight: 46, letterSpacing: -1, color: color.brandBlack, fontVariant: ["tabular-nums"] },
  line: { height: 1, backgroundColor: color.borderNeutral, marginVertical: space.s8 },
  list: { borderRadius: radius.sheet, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, overflow: "hidden" },
  hair: { height: 1, backgroundColor: color.borderNeutral, marginHorizontal: space.s16 },
  icon: { width: 40, height: 40, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey, alignItems: "center", justifyContent: "center" },
});
