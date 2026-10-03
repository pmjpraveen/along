import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";
import { Skeleton } from "../../../src/components/Skeleton";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createInviteLink } from "../../../src/api/invites";
import { listMembers, Member } from "../../../src/api/members";
import { loadTripSettings } from "../../../src/api/trips";
import { Avatar } from "../../../src/components/Avatar";
import { Button, PrimaryButton } from "../../../src/components/Buttons";
import { ListItem } from "../../../src/components/ListItem";
import { Pressable } from "../../../src/components/Pressable";
import { guestInviteMessage } from "../../../src/domain/guestInvite";
import { toast } from "../../../src/stores/toast";
import { color, radius, space, type } from "../../../src/theme/tokens";

// Guests are friends added by name. Each can be sent a personal invite to join the trip in the app.
export default function Guests() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    return listMembers(id).then((r) => { if (r.ok) { setMembers(r.members); setError(null); } else setError(r.message); });
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = usePullToRefresh(load);

  const guests = (members ?? []).filter((m) => m.membership_type === "guest");
  const isOwner = (members ?? []).some((m) => m.isMe && m.role === "owner");
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const add = () => router.push({ pathname: "/trip/[id]/add-guest", params: { id } });

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
    <View style={s.screen}>
      <ScrollView refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: top + space.s16, paddingBottom: bottom + 120 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={space.s4} style={s.round}>
          <ChevronLeft size={22} color={color.brandBlack} strokeWidth={1.75} />
        </Pressable>
        <View style={s.head}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={s.heading}>Guests</Text>
          <Text style={s.sub}>Friends who aren't on along yet. Send an invite so they can join the trip.</Text>
        </View>
        {error ? (
          <View style={s.gap}><Text accessibilityRole="alert" style={s.sub}>{error}</Text><Button label="Retry" type="secondary" size="small" onPress={load} /></View>
        ) : members === null ? (
          <Skeleton label="Loading guests" variant="guestRows" />
        ) : guests.length === 0 ? (
          <Text style={s.sub}>No guests yet.</Text>
        ) : (
          <View style={s.list}>{guests.map((g, i) => (
            <View key={g.id}>
              {i > 0 && <View style={s.divider} />}
              <ListItem title={g.display_name} leading={<Avatar name={g.display_name} guest size={40} />}
              trailing={isOwner ? "button" : "none"} buttonLabel={busyId === g.id ? "Inviting…" : "Invite"} onPress={() => invite(g)} />
            </View>
          ))}</View>
        )}
      </ScrollView>
      {isOwner && (
        <View style={[s.footer, { paddingBottom: bottom + space.s12 }]}>
          <PrimaryButton label="Add guest" onPress={add} />
        </View>
      )}
    </View>
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
  divider: { height: 1, marginHorizontal: space.s16, backgroundColor: color.borderNeutral },
  gap: { gap: space.s12, alignItems: "flex-start" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.s20, paddingTop: space.s12, backgroundColor: color.paper, borderTopWidth: 1, borderTopColor: color.borderNeutral },
});
