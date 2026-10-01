import { useState } from "react";
import { ActivityIndicator, Image, Linking, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { signInWithGoogle } from "../src/api/auth";
import { Alert } from "../src/components/Alert";
import { AlongLogo } from "../src/components/AlongLogo";
import { DEV_PEOPLE, devLoginEnabled, signInAsDev } from "../src/api/devAuth";
import { OutlinedButton } from "../src/components/Buttons";
import { Pressable } from "../src/components/Pressable";
import { color, font, radius, space, type } from "../src/theme/tokens";

const FRIENDS = require("../assets/illustrations/friends.jpg");   // 1200 x 800

// Google's four-colour "G" mark, as its sign-in guidelines ask for.
function GoogleG({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" />
      <Path fill="#34A853" d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.3441 0-4.3282-1.5831-5.0359-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z" />
      <Path fill="#FBBC05" d="M3.9641 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.9641 10.71z" />
      <Path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9641 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z" />
    </Svg>
  );
}

// Success needs no navigation here: the session store flips and the route guard moves to Home.
// Any error keeps the user on this screen with a specific inline message and a retry.
export default function SignIn() {
  const { top, bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const photoW = width - space.s20 * 2;
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

  const open = (path: string) => Linking.openURL(`https://getalong.xyz/${path}`);
  return (
    <View style={[s.screen, { paddingTop: top + space.s16, paddingBottom: bottom + space.s16 }]}>
      <View style={s.hero}>
        <View accessible accessibilityRole="image" accessibilityLabel="along" style={s.logo}><AlongLogo width={125} fill={color.brandBlack} /></View>
        <Image accessible accessibilityRole="image" accessibilityLabel="A group of friends with their luggage, ready to travel" accessibilityIgnoresInvertColors
          source={FRIENDS} resizeMode="contain" style={{ width: photoW, height: photoW * (2 / 3) }} />
        <View style={s.copy}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={s.heading}>Welcome to Along</Text>
          <Text maxFontSizeMultiplier={1.4} style={s.body}>Plan the trips, split the costs and keep the memories, together with your group.</Text>
        </View>
        {error && <Alert variant="negative">{error}</Alert>}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Login with Google" accessibilityState={{ busy }} onPress={onPress} style={s.google}>
        {busy ? <ActivityIndicator color={color.paper} /> : (
          <>
            <GoogleG size={24} />
            <Text maxFontSizeMultiplier={1.3} style={s.googleLabel}>Login with Google</Text>
          </>
        )}
      </Pressable>
      <Text maxFontSizeMultiplier={1.4} style={s.legal}>
        By continuing you agree to the{" "}
        <Text accessibilityRole="link" onPress={() => open("terms")} style={s.link}>Terms of use</Text>
        {" "}and the{" "}
        <Text accessibilityRole="link" onPress={() => open("privacy")} style={s.link}>Privacy policy.</Text>
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
  hero: { flex: 1, alignItems: "center", gap: space.s32 },
  logo: { marginTop: space.s8 },
  copy: { alignItems: "center", gap: space.s8, paddingHorizontal: space.s12, marginTop: space.s24 },
  heading: { fontFamily: font.medium, fontSize: 24, lineHeight: 30, letterSpacing: -0.4, textAlign: "center", color: color.brandBlack },
  body: { ...type.body, fontSize: 17, lineHeight: 24, textAlign: "center", color: color.slate },
  google: {
    minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.s12,
    borderRadius: radius.card, borderCurve: "continuous", backgroundColor: color.brandBlack,
  },
  googleLabel: { ...type.buttonLarge, fontSize: 17, color: color.paper },
  legal: { ...type.fieldMessage, textAlign: "center", color: color.slate, marginTop: space.s12 },
  link: { color: color.brandBlack, textDecorationLine: "underline" },
  dev: { gap: space.s8, marginTop: space.s16 },
  devLabel: { ...type.label, color: color.charcoal },
});
