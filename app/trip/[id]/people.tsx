import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createInviteLink } from "../../../src/api/invites";
import { addGuest, listMembers, Member } from "../../../src/api/members";
import { OutlinedButton, PrimaryButton, TextButton } from "../../../src/components/Buttons";
import { color, radius, space, type } from "../../../src/theme/tokens";

const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

// Guests get a dashed Slate ring and a Guest tag, at the same size as everyone else.
function Row({ m, onClaim }: { m: Member; onClaim: (m: Member) => void }) {
  const guest = m.membership_type === "guest";
  return (
    <View>
      <View style={s.row}>
        <View style={[s.avatar, guest && s.guestRing]}><Text style={s.initials}>{initials(m.display_name)}</Text></View>
        <Text maxFontSizeMultiplier={1.4} style={s.name}>{m.display_name}</Text>
        {guest && <Text style={s.tag}>Guest</Text>}
        {m.role === "owner" && <Text style={s.tag}>Owner</Text>}
      </View>
      {guest && <TextButton label={`Send claim link to ${m.display_name}`} onPress={() => onClaim(m)} />}
    </View>
  );
}

export default function People() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    const r = await listMembers(id);
    if (r.ok) setMembers(r.members);
    else setLoadError(r.message);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (busy) return;
    if (!name.trim()) return setAddError("Enter a name.");
    setBusy(true);
    setAddError(null);
    const r = await addGuest(id, name);
    setBusy(false);
    if (!r.ok) return setAddError(r.message);
    setName("");
    load();
  };

  const [inviteError, setInviteError] = useState<string | null>(null);
  const invite = async (guest?: Member) => {
    setInviteError(null);
    const r = await createInviteLink(id, guest?.id);
    if (!r.ok) return setInviteError(r.message);
    await Share.share({ message: guest ? `${guest.display_name}, claim your spot on my trip on along: ${r.url}` : `Join my trip on along: ${r.url}` });
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={s.screen} contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>People</Text>
      {loadError ? (
        <View style={s.gap}>
          <Text accessibilityRole="alert" style={s.error}>⚠ {loadError}</Text>
          <TextButton label="Retry" onPress={load} />
        </View>
      ) : members === null ? (
        <ActivityIndicator accessibilityLabel="Loading people" color={color.forestInk} />
      ) : (
        members.map((m) => <Row key={m.id} m={m} onClaim={invite} />)
      )}
      <View style={s.gap}>
        {inviteError && <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {inviteError}</Text>}
        <PrimaryButton label="Invite with a link" onPress={() => invite()} />
      </View>
      <View style={s.gap}>
        <Text maxFontSizeMultiplier={1.4} style={s.label}>Add a guest</Text>
        <Text maxFontSizeMultiplier={1.4} style={s.hint}>For friends without the app. They can claim their spot later.</Text>
        <TextInput accessibilityLabel="Guest name" placeholder="Rahul" placeholderTextColor={color.slate} value={name}
          onChangeText={setName} autoCapitalize="words" maxLength={60} style={[s.input, addError ? s.inputError : null]} />
        {addError && <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {addError}</Text>}
        <OutlinedButton label={busy ? "Adding…" : "Add guest"} onPress={add} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  heading: { ...type.display, fontSize: 40, lineHeight: 40, letterSpacing: -1.4, color: color.obsidian },
  row: { flexDirection: "row", alignItems: "center", gap: space.s12, minHeight: 56 },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: color.fog, borderWidth: 1.5, borderColor: color.fog },
  guestRing: { borderStyle: "dashed", borderColor: color.slate },
  initials: { ...type.label, color: color.forestInk },
  name: { ...type.body, flex: 1, color: color.obsidian },
  tag: { ...type.label, color: color.charcoal },
  gap: { gap: space.s8 },
  label: { ...type.label, color: color.charcoal },
  hint: { ...type.body, color: color.slate },
  input: { minHeight: 48, paddingHorizontal: space.s16, borderRadius: radius.input, borderWidth: 1.5, borderColor: color.fog, ...type.body, color: color.obsidian },
  inputError: { borderColor: color.alarmRed },
  error: { ...type.label, color: color.alarmRed },
});
