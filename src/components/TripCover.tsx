import { Image, StyleSheet, View } from "react-native";
import { color, radius } from "../theme/tokens";

type Props = { uri: string | null; destination: string; ratio?: number };

// The trip's own photo, in a rounded mask. With no photo yet it shows the app's default travel illustration, so a trip never looks empty.
const DEFAULT_COVER = require("../../assets/illustrations/default-cover.jpg");
export function TripCover({ uri, destination, ratio = 16 / 9 }: Props) {
  return uri ? (
    <Image accessible accessibilityRole="image" accessibilityLabel={`Cover photo of ${destination}`} accessibilityIgnoresInvertColors source={{ uri }} style={[s.box, { aspectRatio: ratio }]} />
  ) : (
    // A bundled image reports its own size, so it is put in a sized box and made to fill it.
    <View accessible accessibilityRole="image" accessibilityLabel={`${destination}, default cover`} style={[s.box, { aspectRatio: ratio }]}>
      <Image accessibilityIgnoresInvertColors source={DEFAULT_COVER} resizeMode="cover" style={s.fill} />
    </View>
  );
}

const s = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  box: { width: "100%", borderRadius: radius.sheet, borderCurve: "continuous", overflow: "hidden", backgroundColor: color.neutralWash },
});
