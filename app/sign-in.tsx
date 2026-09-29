import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signInWithGoogle } from "../src/api/auth";
import { color, radius, space, type } from "../src/theme/tokens";

// Success needs no navigation here: the session store flips and the route guard moves to Home.
// Any error keeps the user on this screen with a specific inline message and a retry.
export default function SignIn() {
  const { top, bottom } = useSafeAreaInsets();
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

  return (
    <View style={[s.screen, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
      <View style={s.hero}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Sign in</Text>
        <Text maxFontSizeMultiplier={1.4} style={s.body}>Continue with your Google account to start.</Text>
        {error && (
          <View accessible accessibilityRole="alert" style={s.error}>
            <Text style={s.errorIcon}>⚠</Text>
            <Text maxFontSizeMultiplier={1.4} style={s.errorText}>{error}</Text>
          </View>
        )}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Continue with Google" accessibilityState={{ busy }}
        onPress={onPress} style={({ pressed }) => [s.button, pressed && s.pressed]}>
        {busy ? <ActivityIndicator color={color.forestInk} /> : <Text maxFontSizeMultiplier={1.3} style={s.label}>Continue with Google</Text>}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: space.s20, backgroundColor: color.paper },
  hero: { flex: 1, gap: space.s16 },
  heading: { ...type.display, fontSize: 40, lineHeight: 40, letterSpacing: -1.4, color: color.obsidian },
  body: { ...type.body, color: color.charcoal },
  error: { flexDirection: "row", gap: space.s8, padding: space.s12, borderRadius: radius.input, borderWidth: 1.5, borderColor: color.alarmRed },
  errorIcon: { color: color.alarmRed, fontSize: 16, lineHeight: 20 },
  errorText: { ...type.label, flex: 1, color: color.alarmRed },
  button: {
    minHeight: 56, paddingHorizontal: space.s24, alignItems: "center", justifyContent: "center",
    borderRadius: radius.pill, backgroundColor: color.daylight, borderWidth: 1, borderColor: color.forestInk,
  },
  pressed: { opacity: 0.8 },
  label: { ...type.label, color: color.forestInk },
});
