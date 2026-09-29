import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";
import { create } from "zustand";
import { createExpense, CreateExpenseInput, CreateExpenseResult } from "../api/expenses";
import { createQueue, Item, Outcome } from "./queue";

const STORAGE_KEY = "along.queue.v1";
const RETRY_EVERY_MS = 30_000;

// Maps a create_expense result to what the queue needs: sent, try again later, or rejected for good.
export const toOutcome = (r: CreateExpenseResult): Outcome =>
  r.ok ? { ok: true } : r.retry ? { ok: false, retry: true } : { ok: false, retry: false, message: r.message };

const queue = createQueue<CreateExpenseInput>({
  storage: { get: () => AsyncStorage.getItem(STORAGE_KEY), set: (v) => AsyncStorage.setItem(STORAGE_KEY, v) },
  send: async (key, payload) => toOutcome(await createExpense({ ...payload, key })),
  now: Date.now,
});

export const useQueue = create<{ items: Item<CreateExpenseInput>[] }>(() => ({ items: [] }));
queue.subscribe((items) => useQueue.setState({ items }));

export const queueExpense = (input: CreateExpenseInput) => queue.enqueue(input.key, input);
export const discardQueued = (key: string) => queue.discard(key);
export const flushQueue = () => queue.flush();

let started = false;

// Flushes when the connection returns, when the app comes to the foreground, and every 30s while something is waiting.
// Idempotent: repeated calls never add listeners. The queue itself guarantees one flush at a time.
export function startSync() {
  if (started) return;
  started = true;
  queue.load().then(() => queue.flush());
  NetInfo.addEventListener((s) => { if (s.isConnected && s.isInternetReachable !== false) queue.flush(); });
  AppState.addEventListener("change", (s) => { if (s === "active") queue.flush(); });
  setInterval(() => { if (queue.list().some((i) => i.status === "pending")) queue.flush(); }, RETRY_EVERY_MS);
}
