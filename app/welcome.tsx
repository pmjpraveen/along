import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton, TextButton } from "../src/components/Buttons";
import { color, space, type } from "../src/theme/tokens";

// Pure navigation: nothing is written until sign-in, so no trip data exists before onboarding completes.
// "I have an invite" also goes to sign-in for now; invite handling arrives with Join Trip (Sprint 2).
export default function Welcome() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  return (
    <View style={[s.screen, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
      <View style={s.hero}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.display}>Trips, together.</Text>
        <Text maxFontSizeMultiplier={1.4} style={s.body}>Plan the days, split the costs, keep the memories.</Text>
      </View>
      <PrimaryButton label="Get Started" onPress={() => router.push("/sign-in")} />
      <TextButton label="I have an invite" onPress={() => router.push("/sign-in")} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: space.s20, backgroundColor: color.paper, gap: space.s8 },
  hero: { flex: 1, gap: space.s16 },
  display: { ...type.display, color: color.obsidian },
  body: { ...type.body, color: color.charcoal },
});
