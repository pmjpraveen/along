import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "./Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LegalDoc } from "../domain/legal";
import { longDate } from "../domain/trip";
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
      <Text accessibilityRole="header" style={s.heading}>{doc.title}</Text>
      <Text style={s.updated}>Last updated {longDate(doc.updated)}</Text>
      <Text style={s.body}>{doc.intro}</Text>
      {doc.sections.map((sec) => (
        <View key={sec.heading} style={s.section}>
          <Text accessibilityRole="header" style={s.h}>{sec.heading}</Text>
          {sec.body.map((p) => <Text key={p} style={s.body}>{p}</Text>)}
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  heading: { fontFamily: type.sheetTitle.fontFamily, fontSize: 32, lineHeight: 38, letterSpacing: -0.8, color: color.brandBlack },
  updated: { ...type.fieldMessage, color: color.charcoal },
  section: { gap: space.s8, marginTop: space.s8 },
  h: { ...type.sheetTitle, fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: color.brandBlack },
  body: { ...type.fieldValue, color: color.charcoal },
});
