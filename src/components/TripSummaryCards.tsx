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
          {summary.outstanding_minor === 0 ? "Everyone is settled up." : `${money(summary.outstanding_minor)} still to settle`}
        </Text>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  card: { gap: space.s4, padding: space.s16, borderRadius: radius.card, backgroundColor: color.fog },
  big: { ...type.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.8, color: color.forestInk, fontVariant: ["tabular-nums"] },
  label: { ...type.label, color: color.charcoal },
  body: { ...type.body, color: color.charcoal },
});
