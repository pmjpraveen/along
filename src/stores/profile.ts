import { create } from "zustand";
import type { MyProfile } from "../api/profile";

// My profile, kept in memory so the Profile page opens with my name and details already there (Home loads it first), then refreshes them quietly.
type Update = MyProfile | null | ((current: MyProfile | null) => MyProfile | null);
export const useProfile = create<{ me: MyProfile | null; set: (u: Update) => void }>((set) => ({
  me: null,
  set: (u) => set((s) => ({ me: typeof u === "function" ? u(s.me) : u })),
}));
