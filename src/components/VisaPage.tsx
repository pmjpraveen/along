import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { waveLine } from "../domain/passportPage";
import { color, font, mix, radius, space } from "../theme/tokens";

// A visa page in the style of a real passport: warm security paper, a fine wavy guilloche pattern and a faint globe watermark printed in
// the tint of the passport's cover, a "VISAS" heading with the page number, and room for stamps. It is a souvenir page, not a document.
export function VisaPage({ cover, number, children }: { cover: string; number: number; children: ReactNode }) {
  const paper = mix("#fbf6e9", cover, 0.06);
  const line = mix(cover, "#ffffff", 0.35);
  const W = 340;
  const H = 540;
  return (
    <View accessible={false} style={[s.page, { backgroundColor: paper, borderColor: mix(cover, "#ffffff", 0.7) }]}>
      <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: 34 }, (_, i) => <Path key={i} d={waveLine(W, 10 + i * 15, 5, 14)} stroke={line} strokeWidth={0.7} fill="none" opacity={0.32} />)}
        <Circle cx={W / 2} cy={H / 2} r={110} stroke={line} strokeWidth={1.2} fill="none" opacity={0.4} />
        <Circle cx={W / 2} cy={H / 2} r={78} stroke={line} strokeWidth={0.8} fill="none" opacity={0.4} />
        <Path d={`M${W / 2 - 110} ${H / 2} H${W / 2 + 110} M${W / 2} ${H / 2 - 110} V${H / 2 + 110}`} stroke={line} strokeWidth={0.8} opacity={0.4} />
      </Svg>
      <View style={s.head}>
        <Text maxFontSizeMultiplier={1.2} style={[s.title, { color: cover }]}>VISAS</Text>
        <Text maxFontSizeMultiplier={1.2} style={[s.number, { color: cover }]}>{String(number).padStart(2, "0")}</Text>
      </View>
      <View style={s.body}>{children}</View>
      <Text maxFontSizeMultiplier={1.2} style={[s.foot, { color: mix(cover, "#ffffff", 0.3) }]}>SOUVENIR PAGE · NOT AN OFFICIAL DOCUMENT</Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { minHeight: 540, padding: space.s12, borderRadius: radius.card, borderCurve: "continuous", borderWidth: 1, overflow: "hidden" },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingBottom: space.s8 },
  title: { fontFamily: font.medium, fontSize: 14, letterSpacing: 6 },
  number: { fontFamily: font.medium, fontSize: 14, letterSpacing: 2 },
  body: { flex: 1, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignContent: "space-around", rowGap: 4 },
  foot: { fontFamily: font.regular, fontSize: 8, letterSpacing: 1.6, textAlign: "center", paddingTop: space.s8 },
});
