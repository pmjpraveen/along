import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "./Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LegalDoc } from "../domain/legal";
import { formatDate } from "../domain/trip";
import { color, radius, space, type } from "../theme/tokens";

// A plain reading page: back button, title, the date it was last updated, then headed paragraphs.
export function LegalPage({ doc }: { doc: LegalDoc }) {
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  return (
    <ScrollView style={s.screen} contentInsetAdjustmentBehavior="never" contentContainerStyle={[s.content, { paddingTop: top + space.s16, paddingBottom: bottom + space.s24 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={space.s4} style={s.round}>
        <ChevronLeft size={22} color={color.brandBlack} strokeWidth={1.75} />
      </Pressable>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>{doc.title}</Text>
      <Text maxFontSizeMultiplier={1.4} style={s.updated}>Last updated {formatDate(doc.updated)}</Text>
      {doc.sections.map((sec) => (
        <View key={sec.heading} style={s.section}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.h}>{sec.heading}</Text>
          <Text maxFontSizeMultiplier={1.4} style={s.body}>{sec.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  heading: { ...type.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: color.obsidian },
  updated: { ...type.fieldMessage, color: color.slate },
  section: { gap: space.s8 },
  h: { ...type.label, color: color.obsidian },
  body: { ...type.fieldValue, color: color.charcoal },
});
