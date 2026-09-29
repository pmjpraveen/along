import { supabase } from "./supabase";

const OFFLINE = "No connection. Check your internet and try again.";
const isOffline = (m: string) => /network|fetch/i.test(m);

export type SettleInput = { tripId: string; fromMemberId: string; toMemberId: string; amountMinor: number; key: string };
export type SettleResult = { ok: true } | { ok: false; message: string };

// Records a real-world payment. The key is minted once per screen, so a retried tap never records it twice.
// Overpayment is never allowed from the app: the server rejects anything above what is still owed.
export async function createSettlement(i: SettleInput): Promise<SettleResult> {
  try {
    const { error } = await supabase.rpc("create_settlement", {
      p_trip: i.tripId, p_from: i.fromMemberId, p_to: i.toMemberId, p_amount_minor: i.amountMinor, p_idempotency_key: i.key,
    });
    if (!error) return { ok: true };
    if (isOffline(error.message)) return { ok: false, message: OFFLINE };
    if (error.message === "exceeds_outstanding_debt") return { ok: false, message: "That's more than is still owed. Enter a smaller amount." };
    if (error.code === "42501") return { ok: false, message: "Only the person paying, the person receiving, or the trip owner can record this." };
    return { ok: false, message: "Couldn't record the payment. Try again." };
  } catch {
    return { ok: false, message: OFFLINE };
  }
}
