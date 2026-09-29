import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatDate } from "../domain/trip";
import { color, font, space } from "../theme/tokens";

type Props = { destination: string; start: string; end: string; onPress?: () => void };

// The collectible: a Forest Ink double-ring stamp, destination in caps, dates, a Daylight dot, at a slight fixed tilt.
export function Stamp({ destination, start, end, onPress }: Props) {
  const dates = start === end ? formatDate(start) : `${formatDate(start)} → ${formatDate(end)}`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${destination}, ${dates}`} onPress={onPress} style={s.wrap}>
      <View style={s.outer}>
        <View style={s.inner}>
          <View style={s.dot} />
          <Text maxFontSizeMultiplier={1.2} style={s.destination}>{destination.toUpperCase()}</Text>
          <Text maxFontSizeMultiplier={1.3} style={s.dates}>{dates}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { minHeight: 48, alignItems: "center", paddingVertical: space.s12 },
  outer: { width: "100%", padding: 6, borderRadius: 28, borderWidth: 2, borderColor: color.forestInk, transform: [{ rotate: "-2deg" }] },
  inner: { alignItems: "center", gap: space.s8, paddingVertical: space.s24, paddingHorizontal: space.s16, borderRadius: 22, borderWidth: 1.5, borderColor: color.forestInk },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.brightGreen, borderWidth: 1, borderColor: color.forestInk },
  destination: { fontFamily: font.medium, fontSize: 28, lineHeight: 30, letterSpacing: 1.2, textAlign: "center", color: color.forestInk },
  dates: { fontFamily: font.medium, fontSize: 16, lineHeight: 20, color: color.forestInk, fontVariant: ["tabular-nums"] },
});
