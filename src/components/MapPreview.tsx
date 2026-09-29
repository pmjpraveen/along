import { Linking, Pressable, StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { mapsOpenUrl, Place } from "../domain/maps";
import { color, radius } from "../theme/tokens";

// Just the map: a short, wide strip with the pin, in a rounded frame with a white ring, as in the itinerary reference. The place name
// is written by the caller above it. The map is not interactive (it never steals a scroll); tapping it opens the phone's maps app.
export function MapPreview({ place, address }: { place: Place; address?: string | null }) {
  const label = place.name ?? address ?? `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`Open ${label} in Maps`} onPress={() => Linking.openURL(mapsOpenUrl(place))} style={s.frame}>
      <View style={s.map} pointerEvents="none">
        <MapView style={StyleSheet.absoluteFill} liteMode scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
          toolbarEnabled={false} region={{ latitude: place.lat, longitude: place.lng, latitudeDelta: 0.008, longitudeDelta: 0.008 }}>
          <Marker coordinate={{ latitude: place.lat, longitude: place.lng }} />
        </MapView>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  frame: { padding: 3, borderRadius: radius.card, borderCurve: "continuous", backgroundColor: color.paper },
  map: { height: 96, borderRadius: radius.input, borderCurve: "continuous", overflow: "hidden", backgroundColor: color.neutralWash },
});
