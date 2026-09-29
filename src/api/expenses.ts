import type { Share } from "../domain/split";
import { supabase } from "./supabase";

const OFFLINE = "No connection. Check your internet and try again.";
const isOffline = (m: string) => /network|fetch/i.test(m);

export type Currency = { code: string; exponent: number };
export type PayerOption = { id: string; name: string; guest: boolean; isMe: boolean };
export type FormData = { currency: Currency; members: PayerOption[] };
export type FormResult = { ok: true; data: FormData } | { ok: false; message: string };
export type ExpenseRow = { id: string; title: string; amount_minor: number; expense_date: string; paidBy: string; addedBy: string };
export type ExpensesResult = { ok: true; currency: Currency; expenses: ExpenseRow[] } | { ok: false; message: string };
export type CreateExpenseInput = { tripId: string; title: string; amountMinor: number; date: string; split: Share[]; key: string; paidBy?: string };
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
    const [cur, rows, names] = await Promise.all([
      tripCurrency(tripId),
      supabase.from("expenses").select("id, title, amount_minor, expense_date, paid_by_member_id, created_by_member_id")
        .eq("trip_id", tripId).is("deleted_at", null).order("expense_date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("trip_members").select("id, display_name").eq("trip_id", tripId),
    ]);
    const err = cur.error ?? rows.error ?? names.error;
    if (err || !cur.currency) return { ok: false, message: isOffline(err?.message ?? "") ? OFFLINE : "Couldn't load expenses. Try again." };
    const nameOf = new Map((names.data ?? []).map((m) => [m.id as string, m.display_name as string]));
    const expenses = (rows.data ?? []).map((e) => ({
      id: e.id, title: e.title, amount_minor: e.amount_minor, expense_date: e.expense_date,
      paidBy: nameOf.get(e.paid_by_member_id) ?? "Someone", addedBy: nameOf.get(e.created_by_member_id) ?? "Someone",
    }));
    return { ok: true, currency: cur.currency, expenses };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

// The key is minted once per form, so a retried tap returns the first expense instead of adding another.
export async function createExpense(i: CreateExpenseInput): Promise<CreateExpenseResult> {
  try {
    const { error } = await supabase.rpc("create_expense", {
      p_trip: i.tripId, p_title: i.title, p_amount_minor: i.amountMinor, p_expense_date: i.date,
      p_split: i.split.map((s) => ({ member_id: s.memberId, owed_minor: s.owedMinor })),
      p_idempotency_key: i.key, ...(i.paidBy && { p_paid_by: i.paidBy }),
    });
    if (!error) return { ok: true };
    return { ok: false, message: isOffline(error.message) ? OFFLINE : "Couldn't save the expense. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}
