import { MapPin } from "lucide-react-native";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { mapsOpenUrl, Place } from "../domain/maps";
import { color, radius, space, type } from "../theme/tokens";

// The place a Maps link points at: a small real map with a pin (Apple Maps on iOS, Google Maps on Android; no API key needed in
// development), the place name, and a tap to open it in the user's maps app. The map itself is not interactive, so it never
// steals a scroll; the whole card is the tap target.
export function MapPreview({ place, address }: { place: Place; address?: string | null }) {
  const label = place.name ?? address ?? `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`Open ${label} in Maps`} onPress={() => Linking.openURL(mapsOpenUrl(place))} style={s.card}>
      <View style={s.map} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <MapView style={StyleSheet.absoluteFill} liteMode scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
          toolbarEnabled={false} region={{ latitude: place.lat, longitude: place.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
          <Marker coordinate={{ latitude: place.lat, longitude: place.lng }} />
        </MapView>
      </View>
      <View style={s.line}>
        <MapPin size={16} color={color.forestInk} strokeWidth={1.75} />
        <Text maxFontSizeMultiplier={1.4} numberOfLines={2} style={s.name}>{label}</Text>
      </View>
      <Text maxFontSizeMultiplier={1.4} style={s.hint}>Open in Maps</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { minHeight: 48, gap: space.s8, padding: space.s8, borderRadius: radius.card, borderCurve: "continuous", backgroundColor: color.neutralWash },
  map: { height: 150, borderRadius: radius.input, borderCurve: "continuous", overflow: "hidden", backgroundColor: color.neutralWash },
  line: { flexDirection: "row", alignItems: "center", gap: space.s4, paddingHorizontal: space.s4 },
  name: { ...type.label, flexShrink: 1, color: color.obsidian },
  hint: { ...type.fieldMessage, paddingHorizontal: space.s4, color: color.charcoal },
});
