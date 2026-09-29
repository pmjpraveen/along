import { Alert } from "../../../../src/components/Alert";
import { useTripRealtime } from "../../../../src/hooks/useTripRealtime";
import { usePullToRefresh } from "../../../../src/hooks/usePullToRefresh";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createInviteLink } from "../../../../src/api/invites";
import { addGuest, listMembers, Member } from "../../../../src/api/members";
import { loadTripStatus, uploadCover } from "../../../../src/api/trips";
import { OutlinedButton, PrimaryButton, TextButton } from "../../../../src/components/Buttons";
import { Avatar, AvatarGroup } from "../../../../src/components/Avatar";
import { Badge } from "../../../../src/components/Badge";
import { TextField } from "../../../../src/components/TextField";
import { TripCover } from "../../../../src/components/TripCover";
import { color, radius, space, type } from "../../../../src/theme/tokens";


// Guests get a dashed Slate ring and a Guest tag, at the same size as everyone else.
function Row({ m, onClaim }: { m: Member; onClaim: (m: Member) => void }) {
  const guest = m.membership_type === "guest";
  return (
    <View>
      <View style={s.row}>
        <Avatar name={m.display_name} guest={guest} size={40} />
        <Text maxFontSizeMultiplier={1.4} style={s.name}>{m.display_name}</Text>
        {guest && <Badge label="Guest" align="center" />}
        {m.role === "owner" && <Badge label="Owner" variant="success" align="center" />}
      </View>
      {guest && <TextButton label={`Send claim link to ${m.display_name}`} onPress={() => onClaim(m)} />}
    </View>
  );
}

export default function People() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [completed, setCompleted] = useState(false);
  const [trip, setTrip] = useState<{ destination: string; coverUrl: string | null } | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const load = useCallback(async () => {
    loadTripStatus(id).then((t) => {
      if (!t.ok) return;
      setCompleted(t.status === "completed" || t.status === "archived");
      setTrip({ destination: t.destination, coverUrl: t.coverUrl });
    });
    setLoadError(null);
    const r = await listMembers(id);
    if (r.ok) setMembers(r.members);
    else setLoadError(r.message);
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useTripRealtime(id, ["trip_members"], load);   // a guest added from the + button appears here without a pull
  const pull = usePullToRefresh(load);
  const changeCover = async () => {
    if (coverBusy) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true, aspect: [16, 9] });
    if (res.canceled || !res.assets[0]) return;
    setCoverBusy(true);
    setCoverError(null);
    const r = await uploadCover(id, res.assets[0].uri, res.assets[0].mimeType ?? "image/jpeg");
    setCoverBusy(false);
    if (r.ok) load();
    else setCoverError(r.message);
  };
  const isOwner = members?.some((m) => m.isMe && m.role === "owner") ?? false;

  const [inviteError, setInviteError] = useState<string | null>(null);
  const invite = async (guest?: Member) => {
    setInviteError(null);
    const r = await createInviteLink(id, guest?.id);
    if (!r.ok) return setInviteError(r.message);
    await Share.share({ message: guest ? `${guest.display_name}, claim your spot on my trip on along: ${r.url}` : `Join my trip on along: ${r.url}` });
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={s.screen} refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s64 + space.s32 }]}>
      {trip && <TripCover uri={trip.coverUrl} destination={trip.destination} />}
      {isOwner && (
        <View style={s.gap}>
          <TextButton label={coverBusy ? "Uploading…" : trip?.coverUrl ? "Change cover photo" : "Add a cover photo"} onPress={changeCover} />
          {coverError && <Alert variant="negative">{coverError}</Alert>}
        </View>
      )}
      {members && members.length > 0 && <AvatarGroup people={members.map((m) => ({ name: m.display_name, guest: m.membership_type === "guest" }))} size={40} />}
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>People</Text>
      {completed && (
        <View accessible style={s.completed}>
          <Text maxFontSizeMultiplier={1.4} style={s.completedText}>✓ This trip is completed. Everything is still here to read, and balances can still be settled.</Text>
        </View>
      )}
      <TextButton label="Memories" onPress={() => router.push({ pathname: "/trip/[id]/memories", params: { id } })} />
      {loadError ? (
        <View style={s.gap}>
          <Alert variant="negative">{loadError}</Alert>
          <TextButton label="Retry" onPress={load} />
        </View>
      ) : members === null ? (
        <ActivityIndicator accessibilityLabel="Loading people" color={color.forestInk} />
      ) : (
        members.map((m) => <Row key={m.id} m={m} onClaim={invite} />)
      )}
      {isOwner && !completed && <OutlinedButton label="Complete trip" onPress={() => router.push({ pathname: "/trip/[id]/complete", params: { id } })} />}
      <View style={s.gap}>
        {inviteError && <Alert variant="negative">{inviteError}</Alert>}
        <PrimaryButton label="Invite with a link" onPress={() => invite()} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  heading: { ...type.display, fontSize: 40, lineHeight: 40, letterSpacing: -1.4, color: color.obsidian },
  row: { flexDirection: "row", alignItems: "center", gap: space.s12, minHeight: 56 },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: color.neutralWash, borderWidth: 1.5, borderColor: color.borderNeutral },
  guestRing: { borderStyle: "dashed", borderColor: color.slate },
  initials: { ...type.label, color: color.forestInk },
  name: { ...type.body, flex: 1, color: color.obsidian },
  tag: { ...type.label, color: color.charcoal },
  gap: { gap: space.s8 },
  completed: { padding: space.s16, borderRadius: radius.card, borderCurve: "continuous", backgroundColor: color.neutralWash },
  completedText: { ...type.label, color: color.forestInk },
  label: { ...type.label, color: color.charcoal },
  hint: { ...type.body, color: color.slate },
  input: { minHeight: 48, paddingHorizontal: space.s16, borderRadius: radius.input, borderCurve: "continuous", borderWidth: 1.5, borderColor: color.borderNeutral, ...type.body, color: color.obsidian },
  inputError: { borderColor: color.alarmRed },
  error: { ...type.label, color: color.alarmRed },
});
