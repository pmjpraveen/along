import { ReactNode, useRef } from "react";
import { StyleSheet, Text } from "react-native";
import ReanimatedSwipeable, { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { Trash2 } from "../icons";
import { color, space, type } from "../theme/tokens";
import { Pressable } from "./Pressable";

// A row that is swiped left to reveal a red Delete button; tapping it asks to delete (the caller shows its confirmation) and the row closes again.
// Put it on rows that run the full width of the screen (no side margin around them) with an opaque background, so the button sits at the screen's
// edge and does not show through the row.
export function SwipeToDelete({ children, label, onDelete }: { children: ReactNode; label: string; onDelete: () => void }) {
  const ref = useRef<SwipeableMethods>(null);
  return (
    <ReanimatedSwipeable ref={ref} overshootRight={false} rightThreshold={40}
      renderRightActions={() => (
        <Pressable accessibilityRole="button" accessibilityLabel={label} dip={false} onPress={() => { onDelete(); ref.current?.close(); }} style={s.button}>
          <Trash2 size={18} color={color.paper} strokeWidth={1.75} />
          <Text maxFontSizeMultiplier={1.3} style={s.text}>Delete</Text>
        </Pressable>
      )}>
      {children}
    </ReanimatedSwipeable>
  );
}

const s = StyleSheet.create({
  button: { width: 96, alignItems: "center", justifyContent: "center", gap: space.s4, backgroundColor: color.alarmRed },
  text: { ...type.buttonSmall, color: color.paper },
});
