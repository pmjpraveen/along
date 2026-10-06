import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { PinnedBack, useContentTop, useScrollY } from "../src/components/PinnedBack";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signInWithEmail } from "../src/api/auth";
import { Alert } from "../src/components/Alert";
import { PrimaryButton } from "../src/components/Buttons";
import { Pressable } from "../src/components/Pressable";
import { TextField } from "../src/components/TextField";
import { color, radius, space, type } from "../src/theme/tokens";

// Email and password sign-in on a page of its own, for an account made in the Supabase dashboard (the App Store reviewer's). Success needs no
// navigation: the session store flips and the route guard moves to Home.
export default function SignInEmail() {
  const { bottom } = useSafeAreaInsets();
  const { scrollY, onScroll } = useScrollY();
  const contentTop = useContentTop();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError(null);
    setEmailError(email.trim() ? null : "Enter your email address.");
    setPasswordError(password ? null : "Enter your password.");
    if (!email.trim() || !password) return;
    setBusy(true);
    const r = await signInWithEmail(email, password);
    setBusy(false);
    if (!r.ok && !r.cancelled) setError(r.message);
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingTop: contentTop, paddingBottom: space.s24 }]}>
        <View style={s.head}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={s.heading}>Sign in with email</Text>
          <Text maxFontSizeMultiplier={1.4} style={s.body}>Enter the email and password for your account.</Text>
        </View>
        <TextField label="Email" placeholder="you@example.com" value={email} onChangeText={(v) => { setEmail(v); setEmailError(null); }} status={emailError ? "error" : undefined} message={emailError ?? undefined} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" autoFocus />
        <TextField label="Password" value={password} onChangeText={(v) => { setPassword(v); setPasswordError(null); }} status={passwordError ? "error" : undefined} message={passwordError ?? undefined} secureTextEntry autoCapitalize="none" textContentType="password" onSubmitEditing={submit} />
        {error && <Alert variant="negative">{error}</Alert>}
      </Animated.ScrollView>
      <PinnedBack onPress={() => (router.canGoBack() ? router.back() : router.replace("/sign-in"))} scrollY={scrollY} />
      <View style={[s.footer, { paddingBottom: bottom + space.s12 }]}>
        <PrimaryButton label={busy ? "Signing in…" : "Sign in"} onPress={submit} />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  head: { gap: space.s8 },
  footer: { paddingHorizontal: space.s20, paddingTop: space.s12, borderTopWidth: 1, borderTopColor: color.borderNeutral, backgroundColor: color.paper },
  heading: { ...type.pageTitle, color: color.brandBlack },
  body: { ...type.fieldValue, color: color.charcoal },
});
