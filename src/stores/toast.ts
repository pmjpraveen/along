import { create } from "zustand";

// A short confirmation ("Expense saved") that outlives the screen that raised it. `n` changes on every call so the same words can repeat.
// An action ("Undo") keeps it up longer and makes it tappable.
export type ToastAction = { label: string; onPress: () => void };
export const useToast = create<{ message: string; n: number; action?: ToastAction }>(() => ({ message: "", n: 0 }));
export const toast = (message: string, action?: ToastAction) => useToast.setState((s) => ({ message, n: s.n + 1, action }));
