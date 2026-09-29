import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createExpense, FormData, loadExpenseForm } from "../../../src/api/expenses";
import { PrimaryButton, TextButton } from "../../../src/components/Buttons";
import { ParticipantPicker } from "../../../src/components/ParticipantPicker";
import { PayerPicker } from "../../../src/components/PayerPicker";
import { AmountInput } from "../../../src/components/AmountInput";
import { formatMinor, parseMinor } from "../../../src/domain/money";
import { shareSummary, splitEqual } from "../../../src/domain/split";
import { toIso } from "../../../src/domain/trip";
import { color, radius, space, type } from "../../../src/theme/tokens";

// Default path: amount + title + Save. Payer is me and everyone in the trip shares equally; the payer picker is opt-in, the participant picker is opt-in too.
export default function AddExpense() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const key = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`).current;
  const [form, setForm] = useState<FormData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [errors, setErrors] = useState<{ amount?: string; title?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payerId, setPayerId] = useState<string | null>(null);
  const [pickingPayer, setPickingPayer] = useState(false);
  const [splitWith, setSplitWith] = useState<string[] | null>(null);
  const [pickingSplit, setPickingSplit] = useState(false);

  const load = async () => {
    setLoadError(null);
    const r = await loadExpenseForm(id);
    if (r.ok) { setForm(r.data); setPayerId((p) => p ?? r.data.members.find((m) => m.isMe)?.id ?? null); setSplitWith((w) => w ?? r.data.members.map((m) => m.id)); }
    else setLoadError(r.message);
  };
  useEffect(() => { load(); }, [id]);

  const save = async () => {
    if (busy || !form) return;
    const minor = parseMinor(amount, form.currency.exponent);
    const e = { ...(minor ? {} : { amount: "Enter an amount greater than zero." }), ...(title.trim() ? {} : { title: "What was it for?" }) };
    setErrors(e);
    setFormError(null);
    if (!minor || Object.keys(e).length) return;
    if (!splitWith?.length) return setFormError("Pick at least one person to split with.");
    setBusy(true);
    const r = await createExpense({ tripId: id, title, amountMinor: minor, date: toIso(new Date()), split: splitEqual(minor, splitWith), key,
      ...(payerId && payerId !== me?.id && { paidBy: payerId }) });
    setBusy(false);
    if (r.ok) router.back();
    else setFormError(r.message);
  };

  // Live equal split: recomputed on every amount or participant change, so the numbers are never stale.
  const liveMinor = form ? parseMinor(amount, form.currency.exponent) : null;
  const shares = liveMinor && splitWith?.length ? splitEqual(liveMinor, splitWith) : null;
  const amounts = form && shares ? Object.fromEntries(shares.map((x) => [x.memberId, formatMinor(x.owedMinor, form.currency.exponent, form.currency.code)])) : undefined;
  const me = form?.members.find((m) => m.isMe);
  const payer = form?.members.find((m) => m.id === payerId);
  const symbol = form ? formatMinor(0, form.currency.exponent, form.currency.code).replace(/[\d.,]/g, "") : "";
  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Add expense</Text>
        {loadError ? (
          <View style={s.field}>
            <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {loadError}</Text>
            <TextButton label="Retry" onPress={load} />
          </View>
        ) : !form ? (
          <Text accessibilityLabel="Loading" style={s.hint}>Loading…</Text>
        ) : (
          <>
            <View style={s.field}>
              <Text maxFontSizeMultiplier={1.4} style={s.label}>Amount</Text>
              <AmountInput label="Amount" value={amount} onChange={setAmount} exponent={form.currency.exponent} symbol={symbol} invalid={!!errors.amount} />
              {errors.amount && <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {errors.amount}</Text>}
            </View>
            <View style={s.field}>
              <Text maxFontSizeMultiplier={1.4} style={s.label}>What was it for?</Text>
              <TextInput accessibilityLabel="Title" placeholder="Lunch" placeholderTextColor={color.slate} value={title}
                onChangeText={setTitle} autoCapitalize="sentences" style={[s.input, errors.title ? s.inputError : null]} />
              {errors.title && <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {errors.title}</Text>}
            </View>
            <View style={s.field}>
              <Text maxFontSizeMultiplier={1.4} style={s.label}>Paid by</Text>
              {pickingPayer ? (
                <PayerPicker members={form.members} selected={payerId ?? ""} onChange={(id) => { setPayerId(id); setPickingPayer(false); }} />
              ) : (
                <TextButton label={`${payer?.isMe || !payer ? "You" : payer.name} paid. Change who paid`} onPress={() => setPickingPayer(true)} />
              )}
            </View>
            <View style={s.field}>
              <Text maxFontSizeMultiplier={1.4} style={s.label}>Split equally among</Text>
              {pickingSplit ? (
                <>
                  <ParticipantPicker selected={splitWith ?? []} onChange={setSplitWith} amounts={amounts}
                    members={form.members.map((m) => ({ id: m.id, display_name: m.isMe ? `${m.name} (you)` : m.name, membership_type: m.guest ? "guest" : "registered" }))} />
                  <TextButton label="Done" onPress={() => setPickingSplit(false)} />
                </>
              ) : (
                <TextButton label={`${!splitWith || splitWith.length === form.members.length ? "Everyone" : `${splitWith.length} of ${form.members.length} people`}. Change who's in`}
                  onPress={() => setPickingSplit(true)} />
              )}
              {shares && form && <Text maxFontSizeMultiplier={1.4} style={s.hint}>{shareSummary(shares, form.currency.exponent, form.currency.code)}</Text>}
            </View>
            {formError && <Text accessibilityRole="alert" maxFontSizeMultiplier={1.4} style={s.error}>⚠ {formError}</Text>}
            <PrimaryButton label={busy ? "Saving…" : "Save"} onPress={save} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  heading: { ...type.display, fontSize: 40, lineHeight: 40, letterSpacing: -1.4, color: color.obsidian },
  field: { gap: space.s8 },
  label: { ...type.label, color: color.charcoal },
  hint: { ...type.body, color: color.slate },
  input: { minHeight: 48, paddingHorizontal: space.s16, borderRadius: radius.input, borderWidth: 1.5, borderColor: color.fog, ...type.body, color: color.obsidian },
  inputError: { borderColor: color.alarmRed },
  error: { ...type.label, color: color.alarmRed },
});
