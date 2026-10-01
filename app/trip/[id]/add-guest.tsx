import { useGlobalSearchParams, useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Pressable } from "../../../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addGuest } from "../../../src/api/members";
import { PrimaryButton } from "../../../src/components/Buttons";
import { TextField } from "../../../src/components/TextField";
import { color, radius, space, type } from "../../../src/theme/tokens";

// For friends without the app: the owner adds them by name so they can be included in the plan and expenses, and they can claim
// their spot later from an invite link.
export default function AddGuest() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (busy) return;
    if (!name.trim()) return setError("Enter a name.");
    setBusy(true);
    setError(null);
    const r = await addGuest(id, name);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    router.back();
  };

  return (
    <View style={s.screen}>
      <View style={s.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={space.s4} style={s.close}>
          <X size={22} color={color.iconInk} strokeWidth={2} />
        </Pressable>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={s.heading}>Add a guest</Text>
        <TextField label="Guest name" placeholder="Rahul" value={name} onChangeText={setName} autoCapitalize="words" maxLength={60} autoFocus
          status={error ? "error" : undefined} message={error ?? "For friends without the app. They can claim their spot later."} />
      </View>
      <View style={[s.footer, { paddingBottom: bottom + space.s12 }]}>
        <PrimaryButton label={busy ? "Adding…" : "Add guest"} onPress={add} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { flex: 1, paddingHorizontal: space.s20, paddingTop: space.s20, gap: space.s20 },
  close: { width: 44, height: 44, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey, alignItems: "center", justifyContent: "center" },
  heading: { ...type.sheetTitle, color: color.obsidian },
  footer: { paddingHorizontal: space.s20, paddingTop: space.s12, borderTopWidth: 1, borderTopColor: color.borderNeutral, backgroundColor: color.paper },
});
