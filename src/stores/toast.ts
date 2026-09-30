import { create } from "zustand";

// A short confirmation ("Expense saved") that outlives the screen that raised it. `n` changes on every call so the same words can repeat.
export const useToast = create<{ message: string; n: number }>(() => ({ message: "", n: 0 }));
export const toast = (message: string) => useToast.setState((s) => ({ message, n: s.n + 1 }));
