import { supabase } from "./supabase";

const OFFLINE = "No connection. Check your internet and try again.";
const isOffline = (m: string) => /network|fetch/i.test(m);

export type BalanceRow = { memberId: string; name: string; guest: boolean; isMe: boolean; net: number };
export type BalancesResult = { ok: true; currency: { code: string; exponent: number }; rows: BalanceRow[] } | { ok: false; message: string };

// Balances come only from the ledger view; members with no entries yet are shown as settled (0).
export async function loadBalances(tripId: string): Promise<BalancesResult> {
  try {
    const [trip, members, nets, session] = await Promise.all([
      supabase.from("trips").select("primary_currency, currencies(minor_unit_exponent)").eq("id", tripId).single(),
      supabase.from("trip_members").select("id, user_id, display_name, membership_type").eq("trip_id", tripId).eq("status", "active").order("created_at"),
      supabase.from("trip_member_balances").select("member_id, net_minor").eq("trip_id", tripId),
      supabase.auth.getSession(),
    ]);
    const err = trip.error ?? members.error ?? nets.error;
    if (err || !trip.data) return { ok: false, message: isOffline(err?.message ?? "") ? OFFLINE : "Couldn't load balances. Try again." };
    const netOf = new Map((nets.data ?? []).map((n) => [n.member_id as string, Number(n.net_minor)]));
    const me = session.data.session?.user.id;
    const cur = trip.data.currencies as unknown as { minor_unit_exponent: number };
    return {
      ok: true,
      currency: { code: trip.data.primary_currency as string, exponent: cur.minor_unit_exponent },
      rows: (members.data ?? []).map((m) => ({
        memberId: m.id, name: m.display_name, guest: m.membership_type === "guest", isMe: !!me && m.user_id === me, net: netOf.get(m.id) ?? 0,
      })),
    };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}
