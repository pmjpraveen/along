import { useState } from "react";
import { Image, Linking, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signInWithGoogle } from "../src/api/auth";
import { Alert } from "../src/components/Alert";
import { DEV_PEOPLE, devLoginEnabled, signInAsDev } from "../src/api/devAuth";
import { OutlinedButton, PrimaryButton } from "../src/components/Buttons";
import { color, radius, space, type } from "../src/theme/tokens";

const FRIENDS = require("../assets/illustrations/friends.jpg");

// Success needs no navigation here: the session store flips and the route guard moves to Home.
// Any error keeps the user on this screen with a specific inline message and a retry.
export default function SignIn() {
  const { top, bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const photoH = Math.round(((width - space.s20 * 2) * 3) / 4);   // an explicit height: the photo is tall, so it is cropped to a calm 4:3 card
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await signInWithGoogle();
    setBusy(false);
    if (!r.ok && !r.cancelled) setError(r.message);
  };

  const devSignIn = async (email: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await signInAsDev(email);
    setBusy(false);
    if (!r.ok) setError(r.message);
  };

  return (
    <View style={[s.screen, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
      <View style={s.hero}>
        <Image accessible accessibilityRole="image" accessibilityLabel="A group of friends with their luggage, ready to travel" accessibilityIgnoresInvertColors source={FRIENDS} resizeMode="cover" style={[s.friends, { height: photoH }]} />
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Welcome to along</Text>
        <Text maxFontSizeMultiplier={1.4} style={s.body}>Plan the days, split the costs and keep the memories, together with your group. Sign in with Google to start.</Text>
        {error && <Alert variant="negative">{error}</Alert>}
      </View>
      <Text maxFontSizeMultiplier={1.4} style={s.privacy}>We only use your name and email to set up your account. We never post anything.</Text>
      <PrimaryButton label="Continue with Google" busy={busy} onPress={onPress} />
      <Text maxFontSizeMultiplier={1.4} style={s.legal}>
        By continuing you agree to the{" "}
        <Text accessibilityRole="link" onPress={() => Linking.openURL("https://getalong.xyz/terms")} style={s.link}>Terms of use</Text>
        {" "}and the{" "}
        <Text accessibilityRole="link" onPress={() => Linking.openURL("https://getalong.xyz/privacy")} style={s.link}>Privacy policy</Text>.
      </Text>
      {devLoginEnabled() && (
        <View style={s.dev}>
          <Text maxFontSizeMultiplier={1.3} style={s.devLabel}>Development only: sign in as a test person</Text>
          {DEV_PEOPLE.map((p) => <OutlinedButton key={p.email} label={`Sign in as ${p.name}`} onPress={() => devSignIn(p.email)} />)}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: space.s20, backgroundColor: color.paper },
  friends: { width: "100%", borderRadius: radius.tile, borderCurve: "continuous", backgroundColor: color.neutralWash },
  hero: { flex: 1, gap: space.s16 },
  heading: { ...type.display, fontSize: 40, lineHeight: 40, letterSpacing: -1.4, color: color.obsidian },
  body: { ...type.body, color: color.charcoal },
  privacy: { ...type.fieldMessage, textAlign: "center", color: color.slate, marginBottom: space.s12 },
  legal: { ...type.fieldMessage, textAlign: "center", color: color.slate, marginTop: space.s12 },
  link: { color: color.forestInk, textDecorationLine: "underline" },
  dev: { gap: space.s8, marginTop: space.s16 },
  devLabel: { ...type.label, color: color.charcoal },
});
