import type { Share } from "../domain/split";
import { signAvatars } from "./profile";
import { supabase } from "./supabase";

const OFFLINE = "You're offline. Check your connection and try again.";
const isOffline = (m: string) => /network|fetch/i.test(m);

export type Currency = { code: string; exponent: number };
export type PayerOption = { id: string; name: string; guest: boolean; isMe: boolean; uri?: string | null };
export type FormData = { currency: Currency; members: PayerOption[] };
export type FormResult = { ok: true; data: FormData } | { ok: false; message: string };
export type ExpenseRow = {
  id: string; title: string; amount_minor: number; expense_date: string; paidBy: string; addedBy: string; canEdit: boolean;
  category?: string; paidById?: string; addedById?: string; myShareMinor?: number;
};
export type ExpensesResult =
  | { ok: true; currency: Currency; expenses: ExpenseRow[]; meId?: string | null; trip?: { name: string; destination: string; cardColor: number }; members?: { name: string; guest: boolean; uri?: string | null }[] }
  | { ok: false; message: string };
export type CreateExpenseInput = { tripId: string; title: string; amountMinor: number; date: string; split: Share[]; key: string; paidBy?: string; method?: "equal" | "custom" | "percentage" | "shares"; values?: Record<string, number> };
// retry: the request could not be completed for a reason that is not the data (no connection, server hiccup), so it is safe to send again.
export type CreateExpenseResult = { ok: true } | { ok: false; message: string; retry?: boolean };

async function tripCurrency(tripId: string) {
  const { data, error } = await supabase.from("trips").select("primary_currency, name, destination_name, card_color, currencies(minor_unit_exponent)").eq("id", tripId).single();
  if (error) return { error };
  const cur = data.currencies as unknown as { minor_unit_exponent: number };
  return { currency: { code: data.primary_currency as string, exponent: cur.minor_unit_exponent }, trip: { name: data.name as string, destination: data.destination_name as string, cardColor: data.card_color as number } };
}

// Once a trip is completed only its owner can add expenses (the server enforces it too); everyone can still see them. True when I may add one.
export async function loadExpenseAccess(tripId: string): Promise<boolean> {
  try {
    const [trip, session] = await Promise.all([supabase.from("trips").select("status").eq("id", tripId).single(), supabase.auth.getSession()]);
    if (!trip.data || (trip.data.status !== "completed" && trip.data.status !== "archived")) return true;
    const me = session.data.session?.user.id;
    const { data } = await supabase.from("trip_members").select("role").eq("trip_id", tripId).eq("user_id", me ?? "").eq("status", "active").maybeSingle();
    return data?.role === "owner";
  } catch {
    return true;   // can't tell: let the server decide
  }
}

// What Add Expense needs: the trip's currency and who can be in the split (active members, guests included).
export async function loadExpenseForm(tripId: string): Promise<FormResult> {
  try {
    const [cur, members, session] = await Promise.all([
      tripCurrency(tripId),
      supabase.from("trip_members").select("id, user_id, display_name, membership_type, avatar_url").eq("trip_id", tripId).eq("status", "active").order("created_at"),
      supabase.auth.getSession(),
    ]);
    const err = cur.error ?? members.error;
    const me = session.data.session?.user.id;
    if (err || !cur.currency) return { ok: false, message: isOffline(err?.message ?? "") ? OFFLINE : "Couldn't load the trip. Try again." };
    const urls = await signAvatars((members.data ?? []).map((m) => m.avatar_url));
    return { ok: true, data: {
      currency: cur.currency,
      members: (members.data ?? []).map((m) => ({ id: m.id, name: m.display_name, guest: m.membership_type === "guest", isMe: !!me && m.user_id === me, uri: urls.get(m.avatar_url) ?? null })),
    } };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export async function listExpenses(tripId: string): Promise<ExpensesResult> {
  try {
    const [cur, rows, names, mine, session] = await Promise.all([
      tripCurrency(tripId),
      supabase.from("expenses").select("id, title, amount_minor, expense_date, category, paid_by_member_id, created_by_member_id")
        .eq("trip_id", tripId).is("deleted_at", null).order("expense_date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("trip_members").select("id, user_id, display_name, role, membership_type, status, avatar_url").eq("trip_id", tripId),
      supabase.from("expense_participants").select("expense_id, trip_member_id, owed_amount_minor").eq("trip_id", tripId),
      supabase.auth.getSession(),
    ]);
    const err = cur.error ?? rows.error ?? names.error;
    if (err || !cur.currency) return { ok: false, message: isOffline(err?.message ?? "") ? OFFLINE : "Couldn't load expenses. Try again." };
    const nameOf = new Map((names.data ?? []).map((m) => [m.id as string, m.display_name as string]));
    // Only the person who added an expense, or the trip owner, can edit it (the server enforces the same rule).
    const me = (names.data ?? []).find((m) => m.user_id === session.data.session?.user.id);
    const share = new Map<string, number>();
    for (const p of mine.data ?? []) if (me && p.trip_member_id === me.id) share.set(p.expense_id as string, Number(p.owed_amount_minor));
    const expenses = (rows.data ?? []).map((e) => ({
      id: e.id, title: e.title, amount_minor: Number(e.amount_minor), expense_date: e.expense_date, category: e.category as string,
      paidBy: nameOf.get(e.paid_by_member_id) ?? "Someone", addedBy: nameOf.get(e.created_by_member_id) ?? "Someone",
      paidById: e.paid_by_member_id as string, addedById: e.created_by_member_id as string, myShareMinor: share.get(e.id) ?? 0,
      canEdit: !!me && (me.role === "owner" || me.id === e.created_by_member_id),
    }));
    const urls = await signAvatars((names.data ?? []).map((m) => m.avatar_url));
    return {
      ok: true, currency: cur.currency, expenses, meId: me?.id ?? null, trip: cur.trip,
      members: (names.data ?? []).filter((m) => m.status === "active").map((m) => ({ name: m.display_name as string, guest: m.membership_type === "guest", uri: urls.get(m.avatar_url) ?? null })),
    };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}

export type ExpenseView = {
  id: string; version: number; title: string; amountMinor: number; date: string; category: string; paidBy: string; addedBy: string; canEdit: boolean;
  method: "equal" | "custom" | "percentage" | "shares"; currency: Currency;
  people: { name: string; uri?: string | null; guest: boolean; isMe: boolean; owedMinor: number; value: number | null }[];
};
export type ExpenseViewResult = { ok: true; expense: ExpenseView } | { ok: false; message: string };

// Everything the expense page shows: the total, who paid and who added it, and each person's share with how it was split.
export async function loadExpenseView(tripId: string, expenseId: string): Promise<ExpenseViewResult> {
  try {
    const [cur, exp, names, session] = await Promise.all([
      tripCurrency(tripId),
      supabase.from("expenses").select("id, version, title, amount_minor, expense_date, category, split_method, paid_by_member_id, created_by_member_id, expense_participants(trip_member_id, owed_amount_minor, split_value)")
        .eq("id", expenseId).single(),
      supabase.from("trip_members").select("id, user_id, display_name, role, membership_type, avatar_url").eq("trip_id", tripId),
      supabase.auth.getSession(),
    ]);
    if (cur.error || !cur.currency || exp.error || !exp.data || names.error) return { ok: false, message: isOffline(exp.error?.message ?? cur.error?.message ?? "") ? OFFLINE : "Couldn't load the expense. Try again." };
    const members = new Map((names.data ?? []).map((m) => [m.id as string, m]));
    const me = (names.data ?? []).find((m) => m.user_id === session.data.session?.user.id);
    const e = exp.data;
    const urls = await signAvatars((names.data ?? []).map((m) => m.avatar_url));
    const people = (e.expense_participants as { trip_member_id: string; owed_amount_minor: number; split_value: number | null }[]).map((p) => {
      const m = members.get(p.trip_member_id);
      return { name: (m?.display_name as string) ?? "Someone", uri: urls.get(m?.avatar_url as string) ?? null, guest: m?.membership_type === "guest", isMe: !!me && p.trip_member_id === me.id,
        owedMinor: Number(p.owed_amount_minor), value: p.split_value === null ? null : Number(p.split_value) };
    });
    people.sort((a, b) => b.owedMinor - a.owedMinor || a.name.localeCompare(b.name));
    return { ok: true, expense: {
      id: e.id, version: e.version, title: e.title, amountMinor: Number(e.amount_minor), date: e.expense_date, category: e.category as string,
      paidBy: (members.get(e.paid_by_member_id)?.display_name as string) ?? "Someone", addedBy: (members.get(e.created_by_member_id)?.display_name as string) ?? "Someone",
      canEdit: !!me && (me.role === "owner" || me.id === e.created_by_member_id), method: e.split_method as ExpenseView["method"], currency: cur.currency, people,
    } };
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
    const { error, status } = await supabase.rpc("create_expense", {
      p_trip: i.tripId, p_title: i.title, p_amount_minor: i.amountMinor, p_expense_date: i.date,
      p_split: splitPayload(i),
      ...(i.method && i.method !== "equal" && { p_split_method: i.method }),
      p_idempotency_key: i.key, ...(i.paidBy && { p_paid_by: i.paidBy }),
    });
    if (!error) return { ok: true };
    if (isOffline(error.message)) return { ok: false, message: OFFLINE, retry: true };
    const transient = status >= 500 || status === 408 || status === 429 || status === 401 || error.code === "28000";
    return { ok: false, message: "Couldn't save the expense. Try again.", ...(transient && { retry: true }) };
  } catch {
    return { ok: false, message: OFFLINE, retry: true };
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
