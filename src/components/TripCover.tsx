import { Image, StyleSheet, Text, View } from "react-native";
import { color, font, radius, space } from "../theme/tokens";

type Props = { uri: string | null; destination: string; ratio?: number };

// The trip's own photo, in a rounded mask. With no photo yet it is a calm Forest Ink block with the destination in Daylight
// caps (Daylight is fine as text on the dark surface), so a trip never looks empty.
export function TripCover({ uri, destination, ratio = 16 / 9 }: Props) {
  if (uri) {
    return <Image accessible accessibilityRole="image" accessibilityLabel={`Cover photo of ${destination}`} accessibilityIgnoresInvertColors source={{ uri }} style={[s.box, { aspectRatio: ratio }]} />;
  }
  return (
    <View accessible accessibilityLabel={`${destination}, no cover photo yet`} style={[s.box, s.empty, { aspectRatio: ratio }]}>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={2} style={s.text}>{destination.toUpperCase()}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { width: "100%", borderRadius: radius.sheet, overflow: "hidden", backgroundColor: color.neutralWash },
  empty: { alignItems: "center", justifyContent: "center", padding: space.s16, backgroundColor: color.forestInk },
  text: { fontFamily: font.medium, fontSize: 22, lineHeight: 26, letterSpacing: 1.2, textAlign: "center", color: color.brightGreen },
});
