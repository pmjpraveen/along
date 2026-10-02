import { StyleSheet, View } from "react-native";
import { color, radius, space } from "../theme/tokens";

type Variant = "list" | "cards" | "block";

// The loading state of a data screen: grey shapes where the content will land, so the page does not jump when it arrives. Static on
// purpose (no looping motion); the label tells screen readers what is loading.
export function Skeleton({ label, variant = "list" }: { label: string; variant?: Variant }) {
  return (
    <View accessible accessibilityLabel={label} accessibilityRole="progressbar" accessibilityState={{ busy: true }} style={s.wrap}>
      {variant === "list" && [0, 1, 2, 3, 4].map((n) => (
        <View key={n} style={s.row}>
          <View style={s.avatar} />
          <View style={s.lines}>
            <View style={[s.line, { width: "60%" }]} />
            <View style={[s.line, s.short, { width: "35%" }]} />
          </View>
        </View>
      ))}
      {variant === "cards" && [0, 1, 2].map((n) => <View key={n} style={s.card} />)}
      {variant === "block" && <View style={s.card} />}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: space.s16, alignSelf: "stretch" },
  row: { flexDirection: "row", alignItems: "center", gap: space.s16, minHeight: 72 },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey },
  lines: { flex: 1, gap: space.s8 },
  line: { height: 16, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey },
  short: { height: 12 },
  card: { minHeight: 140, borderRadius: radius.card, borderCurve: "continuous", backgroundColor: color.softGrey },
});
