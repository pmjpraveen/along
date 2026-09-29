import { create } from "zustand";
import { supabase } from "../api/supabase";

type Status = "loading" | "in" | "out";
// pendingInvite survives sign-in so a recipient lands back on the invite they opened.
export const useSession = create<{ status: Status; pendingInvite: string | null }>(() => ({ status: "loading", pendingInvite: null }));

let started = false;

// Idempotent: repeated mounts never re-query or re-subscribe. The navigation decision is made once, when status leaves "loading".
export function initSession() {
  if (started) return;
  started = true;
  supabase.auth.onAuthStateChange((_e, session) => useSession.setState({ status: session ? "in" : "out" }));
  supabase.auth.getSession().then(
    ({ data }) => useSession.setState({ status: data.session ? "in" : "out" }),
    () => useSession.setState({ status: "out" }),
  );
}
