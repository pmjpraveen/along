import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BalancesResult, loadBalances } from "../../../src/api/balances";
import { createSettlement } from "../../../src/api/settlements";
import { AmountInput } from "../../../src/components/AmountInput";
import { PrimaryButton, TextButton } from "../../../src/components/Buttons";
import { formatMinor, parseMinor } from "../../../src/domain/money";
import { color, radius, space, type } from "../../../src/theme/tokens";

// Confirm who pays whom and how much (pre-filled from the suggested payment), then record it. Records are permanent.
export default function Settle() {
  const { id, from, to, amount } = useLocalSearchParams<{ id: string; from: string; to: string; amount: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const key = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`).current;
  const [bal, setBal] = useState<BalancesResult | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    setBusy(false);
    if (r.ok) router.back();
    else setError(r.message);
  };

  const symbol = bal?.ok ? formatMinor(0, bal.currency.exponent, bal.currency.code).replace(/[\d.,]/g, "") : "";
  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={s.screen} contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Settle up</Text>
      {!bal ? (
        <Text accessibilityLabel="Loading" style={s.body}>Loading…</Text>
      ) : !bal.ok ? (
        <View style={s.gap}>
          <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {bal.message}</Text>
          <TextButton label="Retry" onPress={load} />
        </View>
      ) : (
        <>
          <View accessible style={s.card}>
            <Text maxFontSizeMultiplier={1.4} style={s.who}>{label(from)} {label(from) === "You" ? "pay" : "pays"} {label(to)}</Text>
          </View>
          <View style={s.gap}>
            <Text maxFontSizeMultiplier={1.4} style={s.label}>Amount</Text>
            <AmountInput label="Amount" value={text} onChange={setText} exponent={bal.currency.exponent} symbol={symbol} invalid={!!error} />
          </View>
          <Text maxFontSizeMultiplier={1.4} style={s.body}>This records a payment that already happened. It can't be edited afterwards.</Text>
          {error && <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {error}</Text>}
          <PrimaryButton label={busy ? "Recording…" : "Confirm payment"} onPress={save} />
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  heading: { ...type.display, fontSize: 40, lineHeight: 40, letterSpacing: -1.4, color: color.obsidian },
  gap: { gap: space.s8 },
  card: { padding: space.s16, borderRadius: radius.card, backgroundColor: color.fog },
  who: { ...type.display, fontSize: 24, lineHeight: 28, color: color.forestInk },
  label: { ...type.label, color: color.charcoal },
  body: { ...type.body, color: color.slate },
  error: { ...type.label, color: color.alarmRed },
});
