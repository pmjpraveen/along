import { View } from "react-native";
import { color, space } from "../theme/tokens";

// Figma "Divider": a thick full-width rule between sections, a hairline between sub-sections that is inset to match content.
// Purely decorative, so it is hidden from assistive tech.
export function Divider({ kind = "sub" }: { kind?: "section" | "sub" }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID={`divider-${kind}`}
      style={kind === "section" ? { height: 4, backgroundColor: color.neutralWash, marginHorizontal: -space.s20 } : { height: 1, backgroundColor: color.borderNeutral }} />
  );
}
