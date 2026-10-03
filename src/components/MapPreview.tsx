import { useState } from "react";
import { Image, Linking, StyleSheet, Text, View } from "react-native";
import { Pressable } from "./Pressable";
import { mapsOpenUrl, Place, tilesFor, TILE } from "../domain/maps";
import { MapPin } from "../icons";
import { color, radius, type } from "../theme/tokens";

const HEIGHT = 96;
// OpenStreetMap asks apps to identify themselves and to credit the map.
const HEADERS = { "User-Agent": "along-app/1.0 (https://getalong.xyz)" };
const COPYRIGHT = "https://www.openstreetmap.org/copyright";

// Just the map: a short, wide strip with the pin, in a rounded frame with a white ring, as in the itinerary reference. It is drawn from
// OpenStreetMap tiles with plain images, so it needs no map SDK or API key and looks the same on iOS and Android. The place name is
// written by the caller above it. The map is not interactive (it never steals a scroll); tapping it opens the phone's maps app.
export function MapPreview({ place, address }: { place: Place; address?: string | null }) {
  const [width, setWidth] = useState(0);
  const label = place.name ?? address ?? `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`Open ${label} in Maps`} onPress={() => Linking.openURL(mapsOpenUrl(place))} style={s.frame}>
      <View testID="map-box" style={s.map} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
        {width > 0 && tilesFor(place, width, HEIGHT).map((t) => (
          <Image key={t.key} testID="map-tile" source={{ uri: t.uri, headers: HEADERS }} accessible={false} style={[s.tile, { left: t.left, top: t.top }]} />
        ))}
        <View pointerEvents="none" style={s.pin}><MapPin size={16} color={color.paper} strokeWidth={2} /></View>
        <Pressable accessibilityRole="link" accessibilityLabel="Map data from OpenStreetMap contributors" hitSlop={8} dip={false}
          onPress={() => Linking.openURL(COPYRIGHT)} style={s.credit}>
          <Text maxFontSizeMultiplier={1.2} style={s.creditText}>© OpenStreetMap contributors</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  frame: { padding: 3, borderRadius: radius.card, borderCurve: "continuous", backgroundColor: color.paper },
  map: { height: HEIGHT, borderRadius: radius.input, borderCurve: "continuous", overflow: "hidden", backgroundColor: color.neutralWash },
  tile: { position: "absolute", width: TILE, height: TILE },
  // The pin's tip sits on the place, which is the centre of the box.
  pin: { position: "absolute", left: "50%", top: "50%", width: 32, height: 32, marginLeft: -16, marginTop: -16, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.brandBlack, borderWidth: 2, borderColor: color.paper, alignItems: "center", justifyContent: "center" },
  credit: { position: "absolute", right: 4, bottom: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.8)" },
  creditText: { fontFamily: type.fieldMessage.fontFamily, fontSize: 10, lineHeight: 14, color: color.charcoal },
});
