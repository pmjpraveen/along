import { Alert } from "../../../src/components/Alert";
import { toast } from "../../../src/stores/toast";
import { haptic } from "../../../src/haptics";
import { playChime } from "../../../src/sound";
import { useReducedMotion } from "../../../src/hooks/useReducedMotion";
import { motion } from "../../../src/theme/motion";
import { Confetti } from "../../../src/components/Confetti";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowRight, Info, X } from "../../../src/icons";
import { Pressable } from "../../../src/components/Pressable";
import { Avatar } from "../../../src/components/Avatar";
import { Skeleton } from "../../../src/components/Skeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BalancesResult, loadBalances } from "../../../src/api/balances";
import { createSettlement } from "../../../src/api/settlements";
import { AmountInput } from "../../../src/components/AmountInput";
import { PrimaryButton, TextButton } from "../../../src/components/Buttons";
import { formatMinor, parseMinor } from "../../../src/domain/money";
import { color, radius, space, type, track } from "../../../src/theme/tokens";

// Confirm who pays whom and how much (pre-filled from the suggested payment), then record it. Records are permanent.
export default function Settle() {
  const { id, from, to, amount } = useLocalSearchParams<{ id: string; from: string; to: string; amount: string }>();
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  const key = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`).current;
  const [bal, setBal] = useState<BalancesResult | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const reduced = useReducedMotion();
  const leave = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (leave.current) clearTimeout(leave.current); }, []);

  const load = async () => {
    const r = await loadBalances(id);
    setBal(r);
    if (r.ok) setText((t) => t || formatMinor(Number(amount), r.currency.exponent, r.currency.code).replace(/[^\d.]/g, ""));
  };
  useEffect(() => { load(); }, [id]);

  const nameOf = (m: string) => (bal?.ok ? bal.rows.find((r) => r.memberId === m) : undefined);
  const label = (m: string) => (nameOf(m)?.isMe ? "You" : nameOf(m)?.name ?? "Someone");

  const save = async () => {
    if (busy || !bal?.ok) return;
    const minor = parseMinor(text, bal.currency.exponent);
    if (!minor) return setError("Enter an amount greater than zero.");
    setBusy(true);
    setError(null);
    const r = await createSettlement({ tripId: id, fromMemberId: from, toMemberId: to, amountMinor: minor, key });
    if (!r.ok) { setBusy(false); return setError(r.message); }
    // Recorded: a chime and a short confetti fall, then back to the balances. Reduce Motion skips the fall and leaves at once; the button stays
    // busy meanwhile so a second tap cannot record it twice.
    haptic.success();
    playChime();
    toast("Payment recorded");
    if (reduced) return router.back();
    setCelebrate(true);
    leave.current = setTimeout(() => router.back(), motion.confetti.ms);
  };

  const symbol = bal?.ok ? formatMinor(0, bal.currency.exponent, bal.currency.code).replace(/[\d.,]/g, "") : "";
  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={space.s4} style={s.close}>
          <X size={22} color={color.iconInk} strokeWidth={2} />
        </Pressable>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Record a payment</Text>
        {!bal ? (
          <Skeleton label="Loading" variant="settle" />
        ) : !bal.ok ? (
          <View style={s.gap}>
            <Alert variant="negative" persist>{bal.message}</Alert>
            <TextButton label="Retry" onPress={load} />
          </View>
        ) : (
          <>
            <View accessible style={s.hero}>
              <View style={s.pair}>
                <View style={s.ring}><Avatar name={nameOf(from)?.name ?? ""} uri={nameOf(from)?.avatarUrl} guest={nameOf(from)?.guest} size={72} /></View>
                <ArrowRight size={24} color={color.slate} strokeWidth={2} />
                <View style={s.ring}><Avatar name={nameOf(to)?.name ?? ""} uri={nameOf(to)?.avatarUrl} guest={nameOf(to)?.guest} size={72} /></View>
              </View>
              <Text maxFontSizeMultiplier={1.4} style={s.who}>{label(from)} paid {label(to) === "You" ? "you" : label(to)}</Text>
            </View>
            <View style={s.gap}>
              <Text maxFontSizeMultiplier={1.4} style={s.label}>Amount paid</Text>
              <AmountInput label="Amount" value={text} onChange={setText} exponent={bal.currency.exponent} symbol={symbol} invalid={!!error} />
              <Text maxFontSizeMultiplier={1.4} style={s.hint}>Paid less? Change the amount.</Text>
            </View>
            <View accessible style={s.note}>
              <Info size={20} color={color.slate} strokeWidth={2} />
              <Text maxFontSizeMultiplier={1.4} style={s.noteText}>This only records a payment that already happened. It can't be changed once saved.</Text>
            </View>
            {error && <Alert variant="negative">{error}</Alert>}
          </>
        )}
      </ScrollView>
      {bal?.ok && (
        <View style={[s.footer, { paddingBottom: bottom + space.s12 }]}>
          <PrimaryButton label={busy ? "Recording…" : "Record payment"} onPress={save} />
        </View>
      )}
      {celebrate && <Confetti />}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, paddingTop: space.s20, paddingBottom: space.s24, gap: space.s20 },
  close: { width: 44, height: 44, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey, alignItems: "center", justifyContent: "center" },
  heading: { ...type.sheetTitle, color: color.obsidian },
  footer: { paddingHorizontal: space.s20, paddingTop: space.s12, borderTopWidth: 1, borderTopColor: color.borderNeutral, backgroundColor: color.paper },
  hero: { alignItems: "center", gap: space.s16, paddingTop: space.s64 },
  pair: { flexDirection: "row", alignItems: "center", gap: space.s16 },
  ring: { borderWidth: 3, borderColor: color.paper, borderRadius: radius.pill, borderCurve: "continuous" },
  gap: { gap: space.s8 },
  who: { ...type.display, fontSize: 30, lineHeight: 36, letterSpacing: track(30), color: color.brandBlack, textAlign: "center" },
  label: { ...type.label, color: color.charcoal },
  hint: { ...type.fieldMessage, color: color.slate },
  note: { flexDirection: "row", alignItems: "center", gap: space.s12, paddingVertical: space.s12, paddingHorizontal: space.s16, borderRadius: radius.card, borderCurve: "continuous", backgroundColor: color.softGrey },
  noteText: { ...type.fieldMessage, flex: 1, color: color.charcoal },
});
