import { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius, space, type } from "../theme/tokens";
import { Button, ButtonType } from "./Buttons";

type Props = {
  visible: boolean; onClose: () => void; title: string;
  subheader?: string; body?: string; children?: ReactNode;
  actionLabel?: string; onAction?: () => void; actionBusy?: boolean; actionType?: ButtonType;
  secondaryLabel?: string; onSecondary?: () => void;
};

// Figma "Modal": an overlay that interrupts the task for one important message. On a phone it floats above the bottom edge
// as an inset card (unlike BottomSheet, which is full-bleed for browsing content). Header with a close button at the right,
// subheader and body, content, then one primary button. Scrim tap, close button and the back gesture all dismiss it.
export function Dialog({ visible, onClose, title, subheader, body, children, actionLabel, onAction, actionBusy, actionType = "primary", secondaryLabel, onSecondary }: Props) {
  const { bottom } = useSafeAreaInsets();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} accessibilityViewIsModal>
      <View style={[s.root, { paddingBottom: bottom + space.s8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={onClose} style={s.scrim} />
        <View style={s.card}>
          <View style={s.head}>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.title}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={space.s8} style={s.close}>
              <X size={16} color={color.forestInk} strokeWidth={2.5} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            </Pressable>
          </View>
          {(subheader || body) && (
            <View style={s.copy}>
              {subheader && <Text maxFontSizeMultiplier={1.4} style={s.subheader}>{subheader}</Text>}
              {body && <Text maxFontSizeMultiplier={1.4} style={s.body}>{body}</Text>}
            </View>
          )}
          {children}
          {actionLabel && onAction && <Button label={actionLabel} onPress={onAction} busy={actionBusy} type={actionType} size="large" />}
          {secondaryLabel && onSecondary && <Button label={secondaryLabel} onPress={onSecondary} type="tertiary" size="large" align="center" />}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end", paddingHorizontal: space.s8 },
  scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(22,51,0,0.4)" },
  card: { backgroundColor: color.paper, borderRadius: radius.sheet, borderCurve: "continuous", padding: space.s24, gap: space.s16 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.s12 },
  title: { ...type.label, flex: 1, fontSize: 20, lineHeight: 28, color: color.obsidian },
  close: { width: 32, height: 32, borderRadius: radius.pill, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: color.neutralWash },
  copy: { gap: space.s4 },
  subheader: { ...type.label, color: color.obsidian },
  body: { ...type.fieldValue, color: color.obsidian },
});
