import { ExpenseEntry, pairwiseDebts, PaymentEntry, Transfer } from "../domain/balance";
import { signAvatars } from "./profile";
import { supabase } from "./supabase";

const OFFLINE = "You're offline. Check your connection and try again.";
const isOffline = (m: string) => /network|fetch/i.test(m);

export type BalanceRow = { memberId: string; name: string; guest: boolean; isMe: boolean; isOwner: boolean; net: number; avatarUrl?: string | null };
// `transfers` is who owes whom as it was added (per pair, after payments); `rows` is each person's total.
export type BalancesResult = { ok: true; currency: { code: string; exponent: number }; rows: BalanceRow[]; transfers: Transfer[] } | { ok: false; message: string };

// Balances come only from the ledger view; members with no entries yet are shown as settled (0).
export async function loadBalances(tripId: string): Promise<BalancesResult> {
  try {
    const [trip, members, nets, session, expenses, shares, payments] = await Promise.all([
      supabase.from("trips").select("primary_currency, currencies(minor_unit_exponent)").eq("id", tripId).single(),
      supabase.from("trip_members").select("id, user_id, display_name, membership_type, role, avatar_url").eq("trip_id", tripId).eq("status", "active").order("created_at"),
      supabase.from("trip_member_balances").select("member_id, net_minor").eq("trip_id", tripId),
      supabase.auth.getSession(),
      supabase.from("expenses").select("id, paid_by_member_id").eq("trip_id", tripId).is("deleted_at", null),
      supabase.from("expense_participants").select("expense_id, trip_member_id, owed_amount_minor").eq("trip_id", tripId),
      supabase.from("settlements").select("kind, from_member_id, to_member_id, amount_minor").eq("trip_id", tripId),
    ]);
    const err = trip.error ?? members.error ?? nets.error ?? expenses.error ?? shares.error ?? payments.error;
    if (err || !trip.data) return { ok: false, message: isOffline(err?.message ?? "") ? OFFLINE : "Couldn't load balances. Try again." };
    const netOf = new Map((nets.data ?? []).map((n) => [n.member_id as string, Number(n.net_minor)]));
    const me = session.data.session?.user.id;
    const urls = await signAvatars((members.data ?? []).map((m) => m.avatar_url));
    const cur = trip.data.currencies as unknown as { minor_unit_exponent: number };
    const byExpense = new Map<string, ExpenseEntry>((expenses.data ?? []).map((e) => [e.id as string, { payerId: e.paid_by_member_id as string, shares: [] }]));
    for (const s of shares.data ?? []) byExpense.get(s.expense_id as string)?.shares.push({ memberId: s.trip_member_id as string, owedMinor: Number(s.owed_amount_minor) });
    const paid: PaymentEntry[] = (payments.data ?? []).map((p) => ({ fromId: p.from_member_id as string, toId: p.to_member_id as string, amountMinor: Number(p.amount_minor), reversal: p.kind === "reversal" }));
    return {
      ok: true,
      currency: { code: trip.data.primary_currency as string, exponent: cur.minor_unit_exponent },
      transfers: pairwiseDebts([...byExpense.values()], paid),
      rows: (members.data ?? []).map((m) => ({
        memberId: m.id, name: m.display_name, guest: m.membership_type === "guest", isMe: !!me && m.user_id === me, isOwner: m.role === "owner", net: netOf.get(m.id) ?? 0, avatarUrl: urls.get(m.avatar_url) ?? null,
      })),
    };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}
