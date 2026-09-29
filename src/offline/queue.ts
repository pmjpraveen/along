// A durable, ordered outbox for writes made without a connection. Each item carries the idempotency key it was created
// with, and a key is never regenerated, so re-sending an item (after a lost response, a crash, a retry) can never create a
// second copy: the server returns the first one. An item leaves the queue only after the server confirms it.

export type Outcome = { ok: true } | { ok: false; retry: true } | { ok: false; retry: false; message: string };
export type Item<T> = { key: string; payload: T; queuedAt: number; status: "pending" | "failed"; error?: string };
export type Storage = { get: () => Promise<string | null>; set: (value: string) => Promise<void> };

export function createQueue<T>(deps: { storage: Storage; send: (key: string, payload: T) => Promise<Outcome>; now: () => number }) {
  let items: Item<T>[] = [];
  let loaded = false;
  let flushing: Promise<void> | null = null;
  const listeners = new Set<(items: Item<T>[]) => void>();

  const persist = async () => {
    await deps.storage.set(JSON.stringify(items));
    listeners.forEach((l) => l(items));
  };

  async function load() {
    if (loaded) return;
    try {
      items = JSON.parse((await deps.storage.get()) ?? "[]");
    } catch {
      items = [];
    }
    loaded = true;
    listeners.forEach((l) => l(items));
  }

  async function enqueue(key: string, payload: T) {
    await load();
    if (items.some((i) => i.key === key)) return; // the same form submitted twice queues once
    items = [...items, { key, payload, queuedAt: deps.now(), status: "pending" }];
    await persist();
  }

  // Oldest first. Stops at the first item that cannot be sent right now, so order is kept and nothing is skipped.
  // Calls made while a flush is running share it instead of starting a second one.
  function flush(): Promise<void> {
    if (flushing) return flushing;
    flushing = (async () => {
      await load();
      for (const item of items.filter((i) => i.status === "pending")) {
        const outcome = await deps.send(item.key, item.payload);
        if (outcome.ok) {
          items = items.filter((i) => i.key !== item.key);
        } else if (outcome.retry) {
          return;
        } else {
          items = items.map((i) => (i.key === item.key ? { ...i, status: "failed", error: outcome.message } : i));
        }
        await persist();
      }
    })().finally(() => { flushing = null; });
    return flushing;
  }

  async function discard(key: string) {
    await load();
    items = items.filter((i) => i.key !== key);
    await persist();
  }

  return {
    load, enqueue, flush, discard,
    list: () => items,
    subscribe(l: (items: Item<T>[]) => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  };
}
