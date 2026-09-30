import { CalendarPlus, Plus, Receipt, UserPlus } from "lucide-react-native";
import { useRef } from "react";
import { create } from "zustand";
import { Platform, StyleSheet, View } from "react-native";
import { Pressable } from "./Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius } from "../theme/tokens";
import { BottomSheet } from "./BottomSheet";
import { ListItem } from "./ListItem";

// Open state lives in a store so the iOS native "+" tab (a separate screen) can open the sheet that the layout renders.
export const useAddMenu = create<{ open: boolean; set: (o: boolean) => void }>((set) => ({ open: false, set: (open) => set({ open }) }));

export type AddChoice = "item" | "guest" | "expense";

// The one "+" for a trip. On iOS it is the platform's own detached tab-bar button (see add.tsx); on Android a floating button above the
// bar. Either opens a sheet with the three things you add to a trip; choosing one closes the sheet first, then opens that form.
export function TripAddMenu({ onChoose }: { onChoose: (c: AddChoice) => void }) {
  const { bottom } = useSafeAreaInsets();
  const open = useAddMenu((s) => s.open);
  const setOpen = useAddMenu((s) => s.set);
  // The chosen form opens from the sheet's own "fully closed" callback, so it appears the moment the sheet is gone with no fixed wait.
  const chosen = useRef<AddChoice | null>(null);
  const choose = (c: AddChoice) => { chosen.current = c; setOpen(false); };
  const closed = () => { const c = chosen.current; chosen.current = null; if (c) onChoose(c); };
  const icon = (I: typeof Plus) => <View style={s.icon}><I size={22} color={color.forestInk} strokeWidth={1.75} /></View>;
  return (
    <>
      {Platform.OS !== "ios" && (
        <Pressable accessibilityRole="button" accessibilityLabel="Add to trip" onPress={() => setOpen(true)} style={({ pressed }) => [s.plus, { bottom: bottom + 84 }, pressed && s.pressed]}>
          <Plus size={28} color={color.forestInk} strokeWidth={2.5} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        </Pressable>
      )}
      <BottomSheet visible={open} onClose={() => setOpen(false)} onClosed={closed} title="Add to trip">
        <ListItem title="Itinerary item" subtitle="Something your group will do" leading={icon(CalendarPlus)} trailing="chevron" onPress={() => choose("item")} />
        <ListItem title="Guest" subtitle="A friend who isn't on the app" leading={icon(UserPlus)} trailing="chevron" onPress={() => choose("guest")} />
        <ListItem title="Expense" subtitle="Who paid, and who shares it" leading={icon(Receipt)} trailing="chevron" onPress={() => choose("expense")} />
      </BottomSheet>
    </>
  );
}

const s = StyleSheet.create({
  plus: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.brightGreen, alignItems: "center", justifyContent: "center" },
  pressed: { backgroundColor: color.secondaryFill },
  icon: { width: 44, height: 44, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.neutralWash, alignItems: "center", justifyContent: "center" },
});
