import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { color, font, space } from "../theme/tokens";

const R = 8;

// A trip's name on a dark tag (at most two lines; a longer name ends in an ellipsis), tilted by `tilt` degrees (the grid tilts the left column one way and the right the other). When the name is too long for one line it wraps, and the black follows the words as one merged shape: each line's
// band hugs its text and touches the next, and only the corners that stick out are rounded. Lines are measured with a hidden copy of the text.
export function TripNameTag({ name, maxWidth, tilt }: { name: string; maxWidth: number; tilt: number }) {
  const [lines, setLines] = useState<string[] | null>(null);
  const [widths, setWidths] = useState<number[]>([]);
  // Two lines at most: when there are more, the rest of the name is folded into line two, which then ends in an ellipsis.
  const cut = !!lines && lines.length > 2;
  const shown = lines && lines.length > 1 ? (cut ? [lines[0], lines.slice(1).join(" ")] : lines) : [name];
  return (
    <View style={[s.wrap, { transform: [{ rotate: `${tilt}deg` }] }]}>
      <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" maxFontSizeMultiplier={1.3}
        onTextLayout={(e) => setLines(e.nativeEvent.lines.map((l) => l.text.trim()).filter(Boolean))}
        style={[s.text, s.measure, { width: maxWidth - space.s12 * 2 }]}>{name}</Text>
      {shown.map((line, i) => {
        // A corner is rounded only where this band is wider than its neighbour (or has none), so joined bands read as one shape.
        const top = i === 0 || widths[i] > (widths[i - 1] ?? 0) + 1 ? R : 0;
        const bottom = i === shown.length - 1 || widths[i] > (widths[i + 1] ?? 0) + 1 ? R : 0;
        return (
          <View key={`${i}-${line}`} onLayout={(e) => { const w = e.nativeEvent.layout.width; setWidths((p) => (p[i] === w ? p : Object.assign([...p], { [i]: w }))); }}
            style={[s.tag, i > 0 && { marginTop: -0.5 }, { paddingTop: i === 0 ? space.s4 : 0, paddingBottom: i === shown.length - 1 ? space.s4 : 0 }, { borderTopLeftRadius: top, borderTopRightRadius: top, borderBottomLeftRadius: bottom, borderBottomRightRadius: bottom }]}>
            <Text numberOfLines={cut && i === 1 ? 1 : undefined} ellipsizeMode="tail" maxFontSizeMultiplier={1.3} style={[s.text, s.shrink]}>{line}</Text>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: "center" },
  tag: { maxWidth: "100%", paddingHorizontal: space.s12, borderCurve: "continuous", backgroundColor: color.brandBlack },
  text: { fontFamily: font.medium, fontSize: 17, lineHeight: 24, letterSpacing: -0.1, textAlign: "center", color: color.paper },
  shrink: { flexShrink: 1 },
  measure: { position: "absolute", opacity: 0 },
});
