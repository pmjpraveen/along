import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { color, font, space, track } from "../theme/tokens";

const R = 8;
// Home uses the regular size; the Completed trips cards use the smaller one from their design.
const REGULAR = { padX: 12, padY: 4, text: { fontSize: 17, lineHeight: 24, letterSpacing: track(17) } } as const;
const SMALL = { padX: 8, padY: 3, text: { fontSize: 15, lineHeight: 20, letterSpacing: track(15) } } as const;

// A trip's name on a dark tag (at most two lines; a longer name ends in an ellipsis), tilted by `tilt` degrees (the grid tilts the left column one way and the right the other). When the name is too long for one line it wraps, and the black follows the words as one merged shape: each line's
// band hugs its text and touches the next, and only the corners that stick out are rounded. Lines are measured with a hidden copy of the text.
export function TripNameTag({ name, maxWidth, tilt, small }: { name: string; maxWidth: number; tilt: number; small?: boolean }) {
  const size = small ? SMALL : REGULAR;
  const [lines, setLines] = useState<string[] | null>(null);
  const [widths, setWidths] = useState<number[]>([]);
  // Two lines at most: when there are more, the rest of the name is folded into line two, which then ends in an ellipsis.
  const cut = !!lines && lines.length > 2;
  const shown = lines && lines.length > 1 ? (cut ? [lines[0], lines.slice(1).join(" ")] : lines) : [name];
  return (
    <View style={[s.wrap, { transform: [{ rotate: `${tilt}deg` }] }]}>
      <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" maxFontSizeMultiplier={1.3}
        onTextLayout={(e) => setLines(e.nativeEvent.lines.map((l) => l.text.trim()).filter(Boolean))}
        style={[s.text, size.text, s.measure, { width: maxWidth - size.padX * 2 }]}>{name}</Text>
      {shown.map((line, i) => {
        // A corner is rounded only where this band is wider than its neighbour (or has none), so joined bands read as one shape.
        const top = i === 0 || widths[i] > (widths[i - 1] ?? 0) + 1 ? R : 0;
        const bottom = i === shown.length - 1 || widths[i] > (widths[i + 1] ?? 0) + 1 ? R : 0;
        return (
          <View key={`${i}-${line}`} onLayout={(e) => { const w = e.nativeEvent.layout.width; setWidths((p) => (p[i] === w ? p : Object.assign([...p], { [i]: w }))); }}
            style={[s.tag, { paddingHorizontal: size.padX }, i > 0 && { marginTop: -0.5 }, { paddingTop: i === 0 ? size.padY : 0, paddingBottom: i === shown.length - 1 ? size.padY : 0 }, { borderTopLeftRadius: top, borderTopRightRadius: top, borderBottomLeftRadius: bottom, borderBottomRightRadius: bottom }]}>
            <Text numberOfLines={cut && i === 1 ? 1 : undefined} ellipsizeMode="tail" maxFontSizeMultiplier={1.3} style={[s.text, size.text, s.shrink]}>{line}</Text>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: "center" },
  tag: { maxWidth: "100%", borderCurve: "continuous", backgroundColor: color.brandBlack },
  text: { fontFamily: font.medium, textAlign: "center", color: color.paper },
  shrink: { flexShrink: 1 },
  measure: { position: "absolute", opacity: 0 },
});
