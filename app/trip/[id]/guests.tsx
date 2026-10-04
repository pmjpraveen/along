import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { PinnedBack, useContentTop, useScrollY } from "../../../src/components/PinnedBack";
import Animated, { FadeIn } from "react-native-reanimated";
import { useReducedMotion } from "../../../src/hooks/useReducedMotion";
import { motion } from "../../../src/theme/motion";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";
import { Skeleton } from "../../../src/components/Skeleton";
import { Trash2 } from "../../../src/icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ReanimatedSwipeable, { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { Dialog } from "../../../src/components/Dialog";
import { useCallback, useRef, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createInviteLink } from "../../../src/api/invites";
import { listMembers, Member, removeGuest } from "../../../src/api/members";
import { loadTripSettings } from "../../../src/api/trips";
import { Avatar } from "../../../src/components/Avatar";
import { Button, PrimaryButton } from "../../../src/components/Buttons";
import { ListItem } from "../../../src/components/ListItem";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import { Pressable } from "../../../src/components/Pressable";
import { guestInviteMessage } from "../../../src/domain/guestInvite";
import { toast } from "../../../src/stores/toast";
import { color, radius, space, type } from "../../../src/theme/tokens";

// Everyone on the trip in two lists, switched with a segmented control: Joined (has an account, including a guest who claimed their spot) and Yet to join (guests added by name).
// Each person yet to join can be sent a personal invite to join the trip in the app, and the owner can swipe a guest left to delete them. Someone
// who has joined is never removed from here.
export default function Guests() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const { scrollY, onScroll } = useScrollY();
  const contentTop = useContentTop();
  const router = useRouter();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<"joined" | "pending">("joined");
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const rows = useRef<Record<string, SwipeableMethods | null>>({});

  const load = useCallback(() => {
    return listMembers(id).then((r) => { if (r.ok) { setMembers(r.members); setError(null); } else setError(r.message); });
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = usePullToRefresh(load);

  const guests = (members ?? []).filter((m) => m.membership_type === "guest");
  const joined = (members ?? []).filter((m) => m.membership_type === "registered");
  const isOwner = (members ?? []).some((m) => m.isMe && m.role === "owner");
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const add = () => router.push({ pathname: "/trip/[id]/add-guest", params: { id } });

  const closeDelete = () => { if (deleting) rows.current[deleting.id]?.close(); setDeleting(null); setDeleteError(null); };
  const confirmDelete = async () => {
    if (!deleting || deleteBusy) return;
    setDeleteBusy(true);
    const r = await removeGuest(deleting.id);
    setDeleteBusy(false);
    if (!r.ok) return setDeleteError(r.message);
    setDeleting(null);
    toast("Guest deleted");
    load();
  };

  const invite = async (g: Member) => {
    if (busyId) return;
    setBusyId(g.id);
    const [link, trip] = await Promise.all([createInviteLink(id, g.id), loadTripSettings(id)]);
    setBusyId(null);
    if (!link.ok) return toast(link.message);
    if (!trip.ok) return toast(trip.message);
    const { name, start, end } = trip.settings;
    await Share.share({ message: guestInviteMessage({ guest: g.display_name, trip: name, start, end, guests: guests.length, token: link.token }) });
  };

  return (
    <GestureHandlerRootView style={s.screen}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: contentTop, paddingBottom: bottom + 120 }]}>
        <View style={s.head}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={s.heading}>Guests</Text>
          <Text style={s.sub}>Who is on the trip, and who still needs to join. Send an invite to a guest so they can join in the app.</Text>
        </View>
        {error ? (
          <View style={s.gap}><Text accessibilityRole="alert" style={s.sub}>{error}</Text><Button label="Retry" type="secondary" size="small" onPress={load} /></View>
        ) : members === null ? (
          <Skeleton label="Loading guests" variant="guestRows" />
        ) : (
          <>
            <SegmentedControl accessibilityLabel="Show people" value={tab} onChange={setTab}
              options={[{ value: "joined", label: `Joined (${joined.length})` }, { value: "pending", label: `Yet to join (${guests.length})` }]} />
            <Animated.View key={tab} entering={reduced ? undefined : FadeIn.duration(motion.slideMs)}>
            {tab === "joined" ? (
              <View style={s.list}>{joined.map((m, i) => (
                <View key={m.id}>
                  {i > 0 && <View style={s.divider} />}
                  <ListItem title={m.isMe ? `${m.display_name} (you)` : m.display_name} subtitle={m.role === "owner" ? "Owner" : undefined}
                    leading={<Avatar name={m.display_name} uri={m.avatarUrl} size={40} />} />
                </View>
              ))}</View>
            ) : guests.length === 0 ? (
              <Text style={s.sub}>Everyone has joined.</Text>
            ) : (
              <View style={s.list}>{guests.map((g, i) => (
                <View key={g.id}>
                  {i > 0 && <View style={s.divider} />}
                  {isOwner ? (
                    <ReanimatedSwipeable ref={(r) => { rows.current[g.id] = r; }} overshootRight={false} rightThreshold={40}
                      renderRightActions={() => (
                        <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${g.display_name}`} dip={false} onPress={() => setDeleting(g)} style={s.delete}>
                          <Trash2 size={18} color={color.paper} strokeWidth={1.75} />
                          <Text maxFontSizeMultiplier={1.3} style={s.deleteText}>Delete</Text>
                        </Pressable>
                      )}>
                      <ListItem title={g.display_name} subtitle="Hasn't joined yet" leading={<Avatar name={g.display_name} guest size={40} />}
                        trailing="button" buttonLabel={busyId === g.id ? "Inviting…" : "Invite"} onPress={() => invite(g)}
                        actions={[{ name: "delete", label: `Delete ${g.display_name}` }]} onAction={(a) => { if (a === "delete") setDeleting(g); }} />
                    </ReanimatedSwipeable>
                  ) : (
                    <ListItem title={g.display_name} subtitle="Hasn't joined yet" leading={<Avatar name={g.display_name} guest size={40} />} />
                  )}
                </View>
              ))}</View>
            )}
            </Animated.View>
          </>
        )}
      </Animated.ScrollView>
      <PinnedBack onPress={back} scrollY={scrollY} />
      <Dialog visible={!!deleting} onClose={closeDelete} title={`Delete ${deleting?.display_name ?? "guest"}?`} subheader="They haven't joined yet"
        body={deleteError ?? "They'll be removed from the trip and their invite link stops working. Expenses and payments they're part of stay in the trip's history."}
        actionLabel={deleteBusy ? "Deleting…" : "Delete"} actionType="destructive" onAction={confirmDelete} actionBusy={deleteBusy}
        secondaryLabel="Keep" onSecondary={closeDelete} />
      {isOwner && (
        <View style={[s.footer, { paddingBottom: bottom + space.s12 }]}>
          <PrimaryButton label="Add guest" onPress={add} />
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s24 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  heading: { ...type.pageTitle, color: color.brandBlack },
  sub: { ...type.body, color: color.charcoal },
  head: { gap: space.s8, marginTop: space.s8 },
  list: { marginHorizontal: -space.s16 },
  delete: { width: 96, alignItems: "center", justifyContent: "center", gap: space.s4, backgroundColor: color.alarmRed },
  deleteText: { ...type.buttonSmall, color: color.paper },
  divider: { height: 1, marginHorizontal: space.s16, backgroundColor: color.borderNeutral },
  gap: { gap: space.s12, alignItems: "flex-start" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.s20, paddingTop: space.s12, backgroundColor: color.paper, borderTopWidth: 1, borderTopColor: color.borderNeutral },
});
