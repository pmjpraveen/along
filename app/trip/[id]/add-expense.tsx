import { Alert } from "../../../src/components/Alert";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createExpense, ExpenseDetail, FormData, loadExpense, loadExpenseForm, updateExpense } from "../../../src/api/expenses";
import { queueExpense } from "../../../src/offline/sync";
import { FieldLabel, FieldMessage, TextField } from "../../../src/components/TextField";
import { PrimaryButton, TextButton } from "../../../src/components/Buttons";
import { CustomAmounts } from "../../../src/components/CustomAmounts";
import { ParticipantPicker } from "../../../src/components/ParticipantPicker";
import { PayerPicker } from "../../../src/components/PayerPicker";
import { AmountInput } from "../../../src/components/AmountInput";
import { formatMinor, parseMinor } from "../../../src/domain/money";
import { customError, customRemaining, customShares, formatPercent, percentError, shareSummary, sharesError, splitEqual, splitPercentage, splitShares } from "../../../src/domain/split";
import { toIso } from "../../../src/domain/trip";
import { color, radius, space, type } from "../../../src/theme/tokens";

type Method = "equal" | "custom" | "percentage" | "shares";
const METHODS: { key: Method; label: string }[] = [
  { key: "equal", label: "Equally" }, { key: "custom", label: "Custom amounts" }, { key: "percentage", label: "Percent" }, { key: "shares", label: "Shares" },
];

// Add and edit share this screen: with an expenseId it loads that expense, and Save sends the version it opened.
// Default path: amount + title + Save. Payer is me and everyone in the trip shares equally; the payer picker is opt-in, the participant picker is opt-in too.
export default function AddExpense() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId?: string }>();
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
  const [method, setMethod] = useState<Method>("equal");
  const [customText, setCustomText] = useState<Record<string, string>>({});
  const [percentText, setPercentText] = useState<Record<string, string>>({});
  const [sharesText, setSharesText] = useState<Record<string, string>>({});
  const [date, setDate] = useState(() => toIso(new Date()));
  const [editing, setEditing] = useState<ExpenseDetail | null>(null);

  const load = async () => {
    setLoadError(null);
    const r = await loadExpenseForm(id);
    if (!r.ok) return setLoadError(r.message);
    const { currency } = r.data;
    setForm(r.data);
    if (!expenseId) {
      setPayerId((p) => p ?? r.data.members.find((m) => m.isMe)?.id ?? null);
      setSplitWith((w) => w ?? r.data.members.map((m) => m.id));
      return;
    }
    const e = await loadExpense(expenseId);
    if (!e.ok) return setLoadError(e.message);
    const x = e.expense;
    const plain = (minor: number) => formatMinor(minor, currency.exponent, currency.code).replace(/[^\d.]/g, "");
    setEditing(x);
    setTitle(x.title);
    setAmount(plain(x.amountMinor));
    setDate(x.date);
    setPayerId(x.paidBy);
    setMethod(x.method);
    setSplitWith(x.people.map((p) => p.memberId));
    setCustomText(Object.fromEntries(x.people.map((p) => [p.memberId, plain(p.owedMinor)])));
    setPercentText(Object.fromEntries(x.people.map((p) => [p.memberId, formatPercent(p.value ?? 0)])));
    setSharesText(Object.fromEntries(x.people.map((p) => [p.memberId, String(p.value ?? 1)])));
  };
  useEffect(() => { load(); }, [id]);

  const save = async () => {
    if (busy || !form) return;
    const minor = parseMinor(amount, form.currency.exponent);
    const e = { ...(minor ? {} : { amount: "Enter an amount greater than zero." }), ...(title.trim() ? {} : { title: "Enter what this was for." }) };
    setErrors(e);
    setFormError(null);
    if (!minor || Object.keys(e).length) return;
    if (!splitWith?.length) return setFormError("Pick at least one person to split with.");
    const custom = method === "custom" ? customShares(enteredMinor) : null;
    const customProblem = custom ? customError(minor, custom, form.currency.exponent, form.currency.code) : null;
    if (customProblem) return setFormError(customProblem);
    const percentProblem = method === "percentage" ? percentError(enteredBp) : null;
    if (percentProblem) return setFormError(percentProblem);
    const sharesProblem = method === "shares" ? sharesError(enteredShares) : null;
    if (sharesProblem) return setFormError(sharesProblem);
    setBusy(true);
    const common = {
      title, amountMinor: minor, date, method,
      split: custom ?? (method === "percentage" ? splitPercentage(minor, enteredBp) : method === "shares" ? splitShares(minor, enteredShares) : splitEqual(minor, splitWith)),
      ...(method === "percentage" && { values: enteredBp }), ...(method === "shares" && { values: enteredShares }),
    };
    const r = editing
      ? await updateExpense({ ...common, expenseId: editing.id, version: editing.version, paidBy: payerId ?? editing.paidBy })
      : await createExpense({ ...common, tripId: id, key, ...(payerId && payerId !== me?.id && { paidBy: payerId }) });
    // No connection: keep the expense on this phone with its idempotency key; it syncs once when the connection returns.
    if (!editing && !r.ok && r.retry) await queueExpense({ ...common, tripId: id, key, ...(payerId && payerId !== me?.id && { paidBy: payerId }) });
    setBusy(false);
    if (r.ok || (!editing && !r.ok && r.retry)) router.back();
    else setFormError(r.message);
  };

  // Live equal split: recomputed on every amount or participant change, so the numbers are never stale.
  const liveMinor = form ? parseMinor(amount, form.currency.exponent) : null;
  const shares = liveMinor && splitWith?.length ? splitEqual(liveMinor, splitWith) : null;
  const amounts = form && shares ? Object.fromEntries(shares.map((x) => [x.memberId, formatMinor(x.owedMinor, form.currency.exponent, form.currency.code)])) : undefined;
  // Custom mode: what each selected person was typed, in minor units (blank = 0).
  const enteredMinor: Record<string, number> = Object.fromEntries((splitWith ?? []).map((id) => [id, form ? parseMinor(customText[id] ?? "", form.currency.exponent) ?? 0 : 0]));
  const customLeft = liveMinor ? customRemaining(liveMinor, Object.values(enteredMinor)) : null;
  const customStatus = customLeft === null || !form ? null
    : customLeft === 0 ? "Fully assigned"
    : customError(liveMinor!, customShares(enteredMinor), form.currency.exponent, form.currency.code);
  // Percent mode: basis points typed per selected person (33.33 -> 3333); blank = 0.
  const enteredBp: Record<string, number> = Object.fromEntries((splitWith ?? []).map((id) => [id, parseMinor(percentText[id] ?? "", 2) ?? 0]));
  const bpTotal = Object.values(enteredBp).reduce((t, x) => t + x, 0);
  const percentStatus = bpTotal === 0 ? null : percentError(enteredBp) ?? "Totals 100%";
  // Shares mode: whole-number shares per selected person (blank = 0 = left out); amounts follow live.
  const enteredShares: Record<string, number> = Object.fromEntries((splitWith ?? []).map((id) => [id, parseMinor(sharesText[id] ?? "", 0) ?? 0]));
  const shareTotal = Object.values(enteredShares).reduce((t, x) => t + x, 0);
  const shareAmounts = form && liveMinor && shareTotal > 0
    ? Object.fromEntries(splitShares(liveMinor, enteredShares).map((x) => [x.memberId, formatMinor(x.owedMinor, form.currency.exponent, form.currency.code)])) : undefined;
  const switchMethod = (m: Method) => {
    setMethod(m);
    if (m === "shares" && splitWith?.length) setSharesText(Object.fromEntries(splitWith.map((id) => [id, "1"])));
    if (m === "percentage" && splitWith?.length) {
      setPercentText(Object.fromEntries(splitEqual(10000, splitWith).map((x) => [x.memberId, formatPercent(x.owedMinor)])));
    }
    if (m === "custom" && shares && form) {
      setCustomText(Object.fromEntries(shares.map((x) => [x.memberId, formatMinor(x.owedMinor, form.currency.exponent, form.currency.code).replace(/[^\d.]/g, "")])));
    }
  };
  const me = form?.members.find((m) => m.isMe);
  const payer = form?.members.find((m) => m.id === payerId);
  const symbol = form ? formatMinor(0, form.currency.exponent, form.currency.code).replace(/[\d.,]/g, "") : "";
  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { paddingTop: top + space.s32, paddingBottom: bottom + space.s16 }]}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>{expenseId ? "Edit expense" : "Add expense"}</Text>
        {loadError ? (
          <View style={s.field}>
            <Alert variant="negative">{loadError}</Alert>
            <TextButton label="Retry" onPress={load} />
          </View>
        ) : !form ? (
          <Text accessibilityLabel="Loading" style={s.hint}>Loading…</Text>
        ) : (
          <>
            <View style={s.field}>
              <FieldLabel>Amount</FieldLabel>
              <AmountInput label="Amount" value={amount} onChange={setAmount} exponent={form.currency.exponent} symbol={symbol} invalid={!!errors.amount} />
              {errors.amount && <FieldMessage status="error">{errors.amount}</FieldMessage>}
            </View>
            <View style={s.field}>
              <TextField label="What was it for?" accessibilityLabel="Title" placeholder="Lunch" value={title} onChangeText={setTitle}
                autoCapitalize="sentences" status={errors.title ? "error" : undefined} message={errors.title} />
            </View>
            <View style={s.field}>
              <FieldLabel>Paid by</FieldLabel>
              {pickingPayer ? (
                <PayerPicker members={form.members} selected={payerId ?? ""} onChange={(id) => { setPayerId(id); setPickingPayer(false); }} />
              ) : (
                <TextButton label={`${payer?.isMe || !payer ? "You" : payer.name} paid. Change who paid`} onPress={() => setPickingPayer(true)} />
              )}
            </View>
            <View style={s.field}>
              <FieldLabel>Split</FieldLabel>
              <View style={s.chips}>
                {METHODS.map((m) => (
                  <Pressable key={m.key} accessibilityRole="radio" accessibilityLabel={m.label} accessibilityState={{ selected: method === m.key }}
                    onPress={() => switchMethod(m.key)} style={[s.chip, method === m.key && s.chipOn]}>
                    <Text maxFontSizeMultiplier={1.3} style={s.chipText}>{m.label}</Text>
                  </Pressable>
                ))}
              </View>
              {pickingSplit ? (
                <>
                  <ParticipantPicker selected={splitWith ?? []} onChange={setSplitWith} amounts={method === "equal" ? amounts : undefined}
                    members={form.members.map((m) => ({ id: m.id, display_name: m.isMe ? `${m.name} (you)` : m.name, membership_type: m.guest ? "guest" : "registered" }))} />
                  <TextButton label="Done" onPress={() => setPickingSplit(false)} />
                </>
              ) : (
                <TextButton label={`${!splitWith || splitWith.length === form.members.length ? "Everyone" : `${splitWith.length} of ${form.members.length} people`}. Change who's in`}
                  onPress={() => setPickingSplit(true)} />
              )}
              {method === "custom" && form && (
                <CustomAmounts people={form.members.filter((m) => splitWith?.includes(m.id)).map((m) => ({ id: m.id, name: m.isMe ? "You" : m.name }))}
                  values={customText} onChange={(id, t) => setCustomText({ ...customText, [id]: t })}
                  exponent={form.currency.exponent} symbol={symbol} remaining={customStatus} ok={customLeft === 0} />
              )}
              {method === "percentage" && form && (
                <CustomAmounts noun="Percent" people={form.members.filter((m) => splitWith?.includes(m.id)).map((m) => ({ id: m.id, name: m.isMe ? "You" : m.name }))}
                  values={percentText} onChange={(id, t) => setPercentText({ ...percentText, [id]: t })}
                  exponent={2} symbol="%" remaining={percentStatus} ok={percentStatus === "Totals 100%"} />
              )}
              {method === "shares" && form && (
                <CustomAmounts noun="Shares" people={form.members.filter((m) => splitWith?.includes(m.id)).map((m) => ({ id: m.id, name: m.isMe ? "You" : m.name }))}
                  values={sharesText} onChange={(id, t) => setSharesText({ ...sharesText, [id]: t })} hints={shareAmounts}
                  exponent={0} symbol="×" remaining={shareTotal > 0 ? `${shareTotal} ${shareTotal === 1 ? "share" : "shares"} in total` : null} ok={shareTotal > 0} />
              )}
              {method === "equal" && shares && form && <Text maxFontSizeMultiplier={1.4} style={s.hint}>{shareSummary(shares, form.currency.exponent, form.currency.code)}</Text>}
            </View>
            {formError && <Alert variant="negative">{formError}</Alert>}
            <PrimaryButton label={busy ? "Saving…" : editing ? "Save changes" : "Save"} onPress={save} />
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
  input: { minHeight: 48, paddingHorizontal: space.s16, borderRadius: radius.input, borderWidth: 1.5, borderColor: color.borderNeutral, ...type.body, color: color.obsidian },
  inputError: { borderColor: color.alarmRed },
  error: { ...type.label, color: color.alarmRed },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.s8 },
  chip: { minHeight: 48, paddingHorizontal: space.s16, justifyContent: "center", borderRadius: radius.pill, borderWidth: 1.5, borderColor: color.borderNeutral },
  chipOn: { borderColor: color.forestInk, backgroundColor: color.brightGreen },
  chipText: { ...type.label, color: color.forestInk },
});
