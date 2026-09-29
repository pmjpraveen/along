import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { acceptInvite, claimGuestProfile, InvitePreview, previewInvite } from "../../src/api/invites";
import { PrimaryButton, TextButton } from "../../src/components/Buttons";
import { formatDate } from "../../src/domain/trip";
import { useSession } from "../../src/stores/session";
import { color, radius, space, type } from "../../src/theme/tokens";

// Signed-out visitors keep the token and go through sign-in; Home sends them back here. The trip preview is story 2.4.
export default function Join() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const status = useSession((s) => s.status);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setPreviewError(null);
    const r = await previewInvite(token);
    if (r.ok) setPreview(r.preview);
    else setPreviewError(r.message);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (status === "out") useSession.setState({ pendingInvite: token });
  }, [status, token]);

  const join = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await (preview?.claims_name ? claimGuestProfile(token) : acceptInvite(token));
    setBusy(false);
    if (!r.ok) return setError(r.message);
    useSession.setState({ pendingInvite: null });
    router.replace({ pathname: "/trip/[id]/people", params: { id: r.tripId } });
  };

  return (
    <View style={[s.screen, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
      <View style={s.hero}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>{preview?.claims_name ? "Claim your spot" : "You're invited"}</Text>
        {preview?.claims_name && (
          <Text maxFontSizeMultiplier={1.4} style={s.body}>
            Are you {preview.claims_name}? Claiming links this trip's history for {preview.claims_name} to your account.
          </Text>
        )}
        {preview ? (
          <View accessible style={s.card}>
            <Text maxFontSizeMultiplier={1.3} style={s.tripName}>{preview.name}</Text>
            <Text maxFontSizeMultiplier={1.4} style={s.body}>{preview.destination}</Text>
            <Text maxFontSizeMultiplier={1.4} style={s.body}>{formatDate(preview.start_date)} → {formatDate(preview.end_date)}</Text>
            <Text maxFontSizeMultiplier={1.4} style={s.body}>{preview.participant_count} {preview.participant_count === 1 ? "person" : "people"} going</Text>
          </View>
        ) : previewError ? (
          <View style={s.gap}>
            <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {previewError}</Text>
            <TextButton label="Retry" onPress={load} />
          </View>
        ) : (
          <ActivityIndicator accessibilityLabel="Loading invite" color={color.forestInk} />
        )}
        {error && <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {error}</Text>}
      </View>
      {!preview ? null : status === "in" ? (
        <PrimaryButton label={busy ? "Joining…" : preview.claims_name ? "Yes, that's me" : "Join trip"} onPress={join} />
      ) : (
        <PrimaryButton label="Sign in to join" onPress={() => router.push("/sign-in")} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: space.s20, backgroundColor: color.paper },
  hero: { flex: 1, gap: space.s16 },
  heading: { ...type.display, fontSize: 40, lineHeight: 40, letterSpacing: -1.4, color: color.obsidian },
  gap: { gap: space.s8 },
  card: { gap: space.s4, padding: space.s16, borderRadius: radius.card, borderWidth: 1.5, borderColor: color.fog },
  tripName: { ...type.display, fontSize: 28, lineHeight: 30, color: color.obsidian },
  body: { ...type.body, color: color.charcoal },
  error: { ...type.label, color: color.alarmRed },
});
