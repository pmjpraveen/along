import type { Share } from "../domain/split";
import { supabase } from "./supabase";

const OFFLINE = "No connection. Check your internet and try again.";
const isOffline = (m: string) => /network|fetch/i.test(m);

export type Currency = { code: string; exponent: number };
export type PayerOption = { id: string; name: string; guest: boolean; isMe: boolean };
export type FormData = { currency: Currency; members: PayerOption[] };
export type FormResult = { ok: true; data: FormData } | { ok: false; message: string };
export type ExpenseRow = { id: string; title: string; amount_minor: number; expense_date: string; paidBy: string; addedBy: string; canEdit: boolean };
export type ExpensesResult = { ok: true; currency: Currency; expenses: ExpenseRow[] } | { ok: false; message: string };
export type CreateExpenseInput = { tripId: string; title: string; amountMinor: number; date: string; split: Share[]; key: string; paidBy?: string; method?: "equal" | "custom" | "percentage" | "shares"; values?: Record<string, number> };
export type CreateExpenseResult = { ok: true } | { ok: false; message: string };

async function tripCurrency(tripId: string) {
  const { data, error } = await supabase.from("trips").select("primary_currency, currencies(minor_unit_exponent)").eq("id", tripId).single();
  if (error) return { error };
  const cur = data.currencies as unknown as { minor_unit_exponent: number };
  return { currency: { code: data.primary_currency as string, exponent: cur.minor_unit_exponent } };
}

// What Add Expense needs: the trip's currency and who can be in the split (active members, guests included).
export async function loadExpenseForm(tripId: string): Promise<FormResult> {
  try {
    const [cur, members, session] = await Promise.all([
      tripCurrency(tripId),
      supabase.from("trip_members").select("id, user_id, display_name, membership_type").eq("trip_id", tripId).eq("status", "active").order("created_at"),
      supabase.auth.getSession(),
    ]);
    const err = cur.error ?? members.error;
    const me = session.data.session?.user.id;
    if (err || !cur.currency) return { ok: false, message: isOffline(err?.message ?? "") ? OFFLINE : "Couldn't load the trip. Try again." };
    return { ok: true, data: {
      currency: cur.currency,
      members: (members.data ?? []).map((m) => ({ id: m.id, name: m.display_name, guest: m.membership_type === "guest", isMe: !!me && m.user_id === me })),
    } };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export async function listExpenses(tripId: string): Promise<ExpensesResult> {
  try {
    const [cur, rows, names, session] = await Promise.all([
      tripCurrency(tripId),
      supabase.from("expenses").select("id, title, amount_minor, expense_date, paid_by_member_id, created_by_member_id")
        .eq("trip_id", tripId).is("deleted_at", null).order("expense_date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("trip_members").select("id, user_id, display_name, role").eq("trip_id", tripId),
      supabase.auth.getSession(),
    ]);
    const err = cur.error ?? rows.error ?? names.error;
    if (err || !cur.currency) return { ok: false, message: isOffline(err?.message ?? "") ? OFFLINE : "Couldn't load expenses. Try again." };
    const nameOf = new Map((names.data ?? []).map((m) => [m.id as string, m.display_name as string]));
    // Only the person who added an expense, or the trip owner, can edit it (the server enforces the same rule).
    const me = (names.data ?? []).find((m) => m.user_id === session.data.session?.user.id);
    const expenses = (rows.data ?? []).map((e) => ({
      id: e.id, title: e.title, amount_minor: e.amount_minor, expense_date: e.expense_date,
      paidBy: nameOf.get(e.paid_by_member_id) ?? "Someone", addedBy: nameOf.get(e.created_by_member_id) ?? "Someone",
      canEdit: !!me && (me.role === "owner" || me.id === e.created_by_member_id),
    }));
    return { ok: true, currency: cur.currency, expenses };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

const splitPayload = (i: { split: Share[]; method?: string; values?: Record<string, number> }) =>
  i.split.map((s) => ({
    member_id: s.memberId, owed_minor: s.owedMinor,
    ...(i.method === "custom" && { split_value: s.owedMinor }),
    ...((i.method === "percentage" || i.method === "shares") && { split_value: i.values?.[s.memberId] }),
  }));

// The key is minted once per form, so a retried tap returns the first expense instead of adding another.
export async function createExpense(i: CreateExpenseInput): Promise<CreateExpenseResult> {
  try {
    const { error } = await supabase.rpc("create_expense", {
      p_trip: i.tripId, p_title: i.title, p_amount_minor: i.amountMinor, p_expense_date: i.date,
      p_split: splitPayload(i),
      ...(i.method && i.method !== "equal" && { p_split_method: i.method }),
      p_idempotency_key: i.key, ...(i.paidBy && { p_paid_by: i.paidBy }),
    });
    if (!error) return { ok: true };
    return { ok: false, message: isOffline(error.message) ? OFFLINE : "Couldn't save the expense. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export type ExpenseDetail = {
  id: string; version: number; title: string; amountMinor: number; date: string; paidBy: string;
  method: "equal" | "custom" | "percentage" | "shares"; people: { memberId: string; owedMinor: number; value: number | null }[];
};
export type ExpenseResult = { ok: true; expense: ExpenseDetail } | { ok: false; message: string };

export async function loadExpense(expenseId: string): Promise<ExpenseResult> {
  try {
    const { data, error } = await supabase.from("expenses")
      .select("id, version, title, amount_minor, expense_date, paid_by_member_id, split_method, expense_participants(trip_member_id, owed_amount_minor, split_value)")
      .eq("id", expenseId).single();
    if (error || !data) return { ok: false, message: isOffline(error?.message ?? "") ? OFFLINE : "Couldn't load the expense. Try again." };
    return {
      ok: true,
      expense: {
        id: data.id, version: data.version, title: data.title, amountMinor: Number(data.amount_minor), date: data.expense_date,
        paidBy: data.paid_by_member_id, method: data.split_method,
        people: (data.expense_participants as { trip_member_id: string; owed_amount_minor: number; split_value: number | null }[])
          .map((p) => ({ memberId: p.trip_member_id, owedMinor: Number(p.owed_amount_minor), value: p.split_value === null ? null : Number(p.split_value) })),
      },
    };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export type UpdateExpenseInput = Omit<CreateExpenseInput, "tripId" | "key" | "paidBy"> & { expenseId: string; version: number; paidBy: string };

// The version is the one the user opened; the server rejects the edit if someone changed the expense since.
export async function updateExpense(i: UpdateExpenseInput): Promise<CreateExpenseResult> {
  try {
    const { error } = await supabase.rpc("update_expense", {
      p_expense: i.expenseId, p_version: i.version, p_title: i.title, p_amount_minor: i.amountMinor, p_expense_date: i.date,
      p_split: splitPayload(i), p_paid_by: i.paidBy, p_split_method: i.method ?? "equal",
    });
    if (!error) return { ok: true };
    if (isOffline(error.message)) return { ok: false, message: OFFLINE };
    if (error.message === "stale_version") return { ok: false, message: "Someone else just changed this expense. Go back and reopen it to see the latest." };
    if (error.code === "42501") return { ok: false, message: "Only the person who added this expense or the trip owner can edit it." };
    return { ok: false, message: "Couldn't save your changes. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}
