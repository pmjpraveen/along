import { Alert } from "../../src/components/Alert";
import { TripNameTag } from "../../src/components/TripNameTag";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { acceptInvite, claimGuestProfile, InvitePreview, previewInvite } from "../../src/api/invites";
import { PrimaryButton, TextButton } from "../../src/components/Buttons";
import { CARD_COLORS, formatRange } from "../../src/domain/trip";
import { useSession } from "../../src/stores/session";
import { color, font, mix, radius, space, type } from "../../src/theme/tokens";

// Signed-out visitors keep the token and go through sign-in; Home sends them back here. The trip preview is story 2.4.
export default function Join() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
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
    router.replace({ pathname: "/trip/[id]", params: { id: r.tripId } });
  };

  const band = CARD_COLORS[preview?.card_color ?? 2];
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
          <View accessible style={[s.card, { backgroundColor: band }]}>
            <View style={[s.datePill, { backgroundColor: mix(band, "#000000", 0.105) }]}>
              <Text maxFontSizeMultiplier={1.3} style={s.dateText}>{formatRange(preview.start_date, preview.end_date)}</Text>
            </View>
            <TripNameTag name={preview.name} maxWidth={width - space.s20 * 2 - space.s24 * 2} tilt={-2} />
            <Text maxFontSizeMultiplier={1.4} style={s.place}>{preview.destination}</Text>
            <Text maxFontSizeMultiplier={1.4} style={s.body}>{preview.participant_count} {preview.participant_count === 1 ? "person" : "people"} going</Text>
            {preview.invited_by ? <Text maxFontSizeMultiplier={1.4} style={s.body}>Invited by {preview.invited_by}</Text> : null}
          </View>
        ) : previewError ? (
          <View style={s.gap}>
            <Alert variant="negative" persist>{previewError}</Alert>
            <TextButton label="Retry" onPress={load} />
          </View>
        ) : (
          <ActivityIndicator accessibilityLabel="Loading invite" color={color.brandBlack} />
        )}
        {preview && <Text maxFontSizeMultiplier={1.4} style={s.note}>This is a preview. Join to see the plan, the expenses and everyone on the trip.</Text>}
        {error && <Alert variant="negative">{error}</Alert>}
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
  heading: { fontFamily: type.sheetTitle.fontFamily, fontSize: 32, lineHeight: 38, letterSpacing: -0.8, color: color.brandBlack },
  gap: { gap: space.s8 },
  card: { alignItems: "center", gap: space.s8, padding: space.s24, borderRadius: radius.sheet, borderCurve: "continuous" },
  datePill: { paddingHorizontal: space.s8, paddingVertical: 2, borderRadius: 6, borderCurve: "continuous" },
  dateText: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.obsidian, fontVariant: ["tabular-nums"] },
  place: { ...type.fieldValue, color: color.brandBlack },
  note: { ...type.fieldMessage, color: color.charcoal, textAlign: "center" },
  body: { ...type.fieldValue, color: color.charcoal },
  error: { ...type.label, color: color.alarmRed },
});
