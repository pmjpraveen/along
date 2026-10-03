import { StyleSheet, Text, View } from "react-native";
import type { TripSummary } from "../api/passport";
import { formatMinor } from "../domain/money";
import { color, radius, space, type } from "../theme/tokens";

// The trip at a glance: who came, what was planned, what was spent, what is still to settle. Shared by the trip summary
// and the confirmation before completing a trip, so both say the same thing.
export function TripSummaryCards({ summary }: { summary: TripSummary }) {
  const money = (minor: number) => formatMinor(minor, summary.exponent, summary.currency);
  return (
    <>
      <View accessible style={s.card}>
        <Text maxFontSizeMultiplier={1.3} style={s.big}>{summary.people} {summary.people === 1 ? "person" : "people"}</Text>
        <Text maxFontSizeMultiplier={1.4} style={s.body}>{summary.activities} {summary.activities === 1 ? "activity" : "activities"} planned</Text>
      </View>
      <View accessible style={s.card}>
        <Text maxFontSizeMultiplier={1.4} style={s.label}>Total spent</Text>
        <Text maxFontSizeMultiplier={1.3} style={s.big}>{money(summary.total_spend_minor)}</Text>
        <Text maxFontSizeMultiplier={1.4} style={s.body}>
          {summary.outstanding_minor === 0 ? "Everyone's settled up." : `${money(summary.outstanding_minor)} still to settle`}
        </Text>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  card: { gap: space.s4, padding: space.s20, borderRadius: radius.sheet, borderCurve: "continuous", backgroundColor: color.softGrey },
  big: { ...type.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.7, color: color.brandBlack, fontVariant: ["tabular-nums"] },
  label: { ...type.fieldValue, color: color.charcoal },
  body: { ...type.fieldValue, color: color.charcoal },
});
