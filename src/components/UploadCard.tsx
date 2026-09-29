import { StyleSheet, Text, View } from "react-native";
import { ArrowUpToLine } from "lucide-react-native";
import { color, radius, space, type } from "../theme/tokens";
import { Button } from "./Buttons";

// Figma "Upload": a centred Neutral Wash card for when uploading one file is the point of the screen. Icon circle, title,
// a size/format hint, and one primary button. Phones have no drag and drop, so the hint names the limit, not the gesture.
type Props = { title: string; hint: string; buttonLabel?: string; onSelect: () => void; busy?: boolean };

export function UploadCard({ title, hint, buttonLabel = "Select file", onSelect, busy }: Props) {
  return (
    <View style={s.card}>
      <View style={s.icon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <ArrowUpToLine size={28} color={color.forestInk} strokeWidth={2} />
      </View>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.title}>{title}</Text>
      <Text maxFontSizeMultiplier={1.4} style={s.hint}>{hint}</Text>
      <Button label={buttonLabel} onPress={onSelect} busy={busy} type="primary" size="medium" />
    </View>
  );
}

const s = StyleSheet.create({
  card: { alignItems: "center", gap: space.s12, padding: space.s32, borderRadius: radius.xLarge, backgroundColor: color.neutralWash },
  icon: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  title: { ...type.label, fontSize: 18, lineHeight: 26, textAlign: "center", color: color.obsidian },
  hint: { ...type.fieldValue, textAlign: "center", color: color.charcoal },
});
