import { Image, Linking, Pressable, StyleSheet, Text } from "react-native";
import { mapsOpenUrl, Place, staticMapUrl } from "../domain/maps";
import { color, radius, space, type } from "../theme/tokens";

const KEY = process.env.EXPO_PUBLIC_GOOGLE_STATIC_MAPS_KEY;

// Tappable place preview. Shows a static map when a Maps Static API key is configured, otherwise just the place details.
export function MapPreview({ place, address }: { place: Place; address?: string | null }) {
  const label = place.name ?? address ?? `${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`;
  const img = staticMapUrl(place, KEY);
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`Open ${label} in Maps`} onPress={() => Linking.openURL(mapsOpenUrl(place))} style={s.card}>
      {img && <Image accessibilityIgnoresInvertColors source={{ uri: img }} style={s.image} />}
      <Text maxFontSizeMultiplier={1.4} style={s.name}>📍 {label}</Text>
      <Text maxFontSizeMultiplier={1.4} style={s.hint}>Open in Maps</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { minHeight: 48, gap: space.s4, padding: space.s12, borderRadius: radius.input, borderWidth: 1.5, borderColor: color.fog },
  image: { width: "100%", aspectRatio: 2, borderRadius: radius.input, backgroundColor: color.fog },
  name: { ...type.body, color: color.obsidian },
  hint: { ...type.label, color: color.charcoal },
});
