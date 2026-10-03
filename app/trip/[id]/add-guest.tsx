import { useGlobalSearchParams, useRouter } from "expo-router";
import { X } from "../../../src/icons";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Pressable } from "../../../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addGuest, addMemberByEmail } from "../../../src/api/members";
import { Chip } from "../../../src/components/Chip";
import { toast } from "../../../src/stores/toast";
import { PrimaryButton } from "../../../src/components/Buttons";
import { TextField } from "../../../src/components/TextField";
import { useKeyboardHeight } from "../../../src/hooks/useKeyboardHeight";
import { color, radius, space, type } from "../../../src/theme/tokens";

// For friends without the app: the owner adds them by name so they can be included in the plan and expenses, and they can claim
// their spot later from an invite link.
export default function AddGuest() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { bottom } = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const router = useRouter();
  const [mode, setMode] = useState<"guest" | "member">("guest");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (busy) return;
    if (mode === "guest" && !name.trim()) return setError("Enter a name.");
    if (mode === "member" && !/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter their email address.");
    setBusy(true);
    setError(null);
    const r = mode === "guest" ? await addGuest(id, name) : await addMemberByEmail(id, email);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    if (mode === "member" && "name" in r) toast(`${r.name} is on the trip`);
    router.back();
  };

  return (
    <View style={s.screen}>
      <View style={s.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={space.s4} style={s.close}>
          <X size={22} color={color.iconInk} strokeWidth={2} />
        </Pressable>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={s.heading}>Add a guest</Text>
        <View style={s.chips}>
          <Chip role="radio" label="New guest" selected={mode === "guest"} onPress={() => { setMode("guest"); setError(null); }} />
          <Chip role="radio" label="Already on along" selected={mode === "member"} onPress={() => { setMode("member"); setError(null); }} />
        </View>
        {mode === "guest" ? (
          <TextField label="Guest name" placeholder="Rahul" value={name} onChangeText={setName} autoCapitalize="words" maxLength={60} autoFocus
            status={error ? "error" : undefined} message={error ?? "For friends who aren't on along yet. You can invite them to join later."} />
        ) : (
          <TextField label="Their email" placeholder="rahul@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoFocus
            status={error ? "error" : undefined} message={error ?? "The email they signed in to along with. They're added straight to the trip, no invite needed."} />
        )}
      </View>
      <View style={[s.footer, { paddingBottom: (kb || bottom) + space.s12 }]}>
        <PrimaryButton label={busy ? "Adding…" : mode === "guest" ? "Add guest" : "Add to trip"} onPress={add} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { flex: 1, paddingHorizontal: space.s20, paddingTop: space.s20, gap: space.s20 },
  close: { width: 44, height: 44, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey, alignItems: "center", justifyContent: "center" },
  chips: { flexDirection: "row", gap: space.s8 },
  heading: { ...type.sheetTitle, color: color.obsidian },
  footer: { paddingHorizontal: space.s20, paddingTop: space.s12, borderTopWidth: 1, borderTopColor: color.borderNeutral, backgroundColor: color.paper },
});
