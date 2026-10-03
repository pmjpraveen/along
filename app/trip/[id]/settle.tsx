import { Alert } from "../../../src/components/Alert";
import { toast } from "../../../src/stores/toast";
import { haptic } from "../../../src/haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "../../../src/components/Pressable";
import { Avatar } from "../../../src/components/Avatar";
import { Skeleton } from "../../../src/components/Skeleton";
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
    if (r.ok) { haptic.success(); toast("Payment recorded"); router.back(); }
    else setError(r.message);
  };

  const symbol = bal?.ok ? formatMinor(0, bal.currency.exponent, bal.currency.code).replace(/[\d.,]/g, "") : "";
  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={s.screen} contentContainerStyle={[s.content, { paddingTop: top + space.s16, paddingBottom: bottom + space.s24 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={space.s4} style={s.round}>
        <ChevronLeft size={22} color={color.brandBlack} strokeWidth={1.75} />
      </Pressable>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Settle up</Text>
      {!bal ? (
        <Skeleton label="Loading" variant="fields" />
      ) : !bal.ok ? (
        <View style={s.gap}>
          <Alert variant="negative" persist>{bal.message}</Alert>
          <TextButton label="Retry" onPress={load} />
        </View>
      ) : (
        <>
          <View accessible style={s.card}>
            <View style={s.pair}>
              <Avatar name={nameOf(from)?.name ?? ""} guest={nameOf(from)?.guest} size={48} />
              <Avatar name={nameOf(to)?.name ?? ""} guest={nameOf(to)?.guest} size={48} />
            </View>
            <Text maxFontSizeMultiplier={1.4} style={s.who}>{label(from)} {label(from) === "You" ? "pay" : "pays"} {label(to)}</Text>
          </View>
          <View style={s.gap}>
            <Text maxFontSizeMultiplier={1.4} style={s.label}>Amount</Text>
            <AmountInput label="Amount" value={text} onChange={setText} exponent={bal.currency.exponent} symbol={symbol} invalid={!!error} />
          </View>
          <Text maxFontSizeMultiplier={1.4} style={s.body}>This records money that's already been paid. Once saved, it can't be changed.</Text>
          {error && <Alert variant="negative">{error}</Alert>}
          <PrimaryButton label={busy ? "Recording…" : "Confirm payment"} onPress={save} />
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  heading: { fontFamily: type.sheetTitle.fontFamily, fontSize: 32, lineHeight: 38, letterSpacing: -0.8, color: color.brandBlack, marginVertical: space.s8 },
  pair: { flexDirection: "row", gap: space.s8 },
  gap: { gap: space.s8 },
  card: { gap: space.s12, padding: space.s20, borderRadius: radius.sheet, borderCurve: "continuous", backgroundColor: color.softGrey },
  who: { ...type.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: color.brandBlack },
  label: { ...type.label, color: color.charcoal },
  body: { ...type.body, color: color.slate },
  error: { ...type.label, color: color.alarmRed },
});
