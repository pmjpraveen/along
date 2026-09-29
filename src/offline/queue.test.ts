import { createQueue, Outcome, Storage } from "./queue";

const memory = (initial: string | null = null): Storage & { value: string | null } => {
  const s = { value: initial, get: async () => s.value, set: async (v: string) => { s.value = v; } };
  return s;
};
const make = (send: (key: string, p: { n: number }) => Promise<Outcome>, storage = memory()) =>
  ({ storage, q: createQueue<{ n: number }>({ storage, send, now: () => 1000 }) });

test("6.2 an expense queues locally and is sent, in order, once the connection is back", async () => {
  const sent: string[] = [];
  const { q } = make(async (key) => { sent.push(key); return { ok: true }; });
  await q.enqueue("k1", { n: 1 });
  await q.enqueue("k2", { n: 2 });
  expect(q.list().map((i) => i.key)).toEqual(["k1", "k2"]);
  await q.flush();
  expect(sent).toEqual(["k1", "k2"]);
  expect(q.list()).toEqual([]);
});

test("6.2 while offline nothing is lost: the item stays, and is retried with the same key", async () => {
  let online = false;
  const sent: string[] = [];
  const { q } = make(async (key) => { sent.push(key); return online ? { ok: true } : { ok: false, retry: true }; });
  await q.enqueue("k1", { n: 1 });
  await q.flush();
  expect(q.list()).toHaveLength(1);
  online = true;
  await q.flush();
  expect(sent).toEqual(["k1", "k1"]);
  expect(q.list()).toEqual([]);
});

test("6.2 a failure stops the flush so later items are not sent ahead of an earlier one", async () => {
  const sent: string[] = [];
  const { q } = make(async (key) => { sent.push(key); return key === "k1" ? { ok: false, retry: true } : { ok: true }; });
  await q.enqueue("k1", { n: 1 });
  await q.enqueue("k2", { n: 2 });
  await q.flush();
  expect(sent).toEqual(["k1"]);
  expect(q.list().map((i) => i.key)).toEqual(["k1", "k2"]);
});

test("6.2 the queue survives a restart", async () => {
  const storage = memory();
  const a = make(async () => ({ ok: false, retry: true }), storage).q;
  await a.enqueue("k1", { n: 1 });
  const sent: string[] = [];
  const b = make(async (key) => { sent.push(key); return { ok: true }; }, storage).q;
  await b.flush();
  expect(sent).toEqual(["k1"]);
  expect(storage.value).toBe("[]");
});

test("6.2 queuing the same form twice keeps one item", async () => {
  const { q } = make(async () => ({ ok: true }));
  await q.enqueue("k1", { n: 1 });
  await q.enqueue("k1", { n: 1 });
  expect(q.list()).toHaveLength(1);
});

test("6.2 overlapping flushes share one run, so nothing is sent twice at once", async () => {
  let calls = 0;
  const { q } = make(async () => { calls++; await Promise.resolve(); return { ok: true }; });
  await q.enqueue("k1", { n: 1 });
  await Promise.all([q.flush(), q.flush(), q.flush()]);
  expect(calls).toBe(1);
});

test("6.2 a server rejection is kept as failed with its reason, does not block later items, and can be discarded", async () => {
  const sent: string[] = [];
  const { q } = make(async (key) => { sent.push(key); return key === "k1" ? { ok: false, retry: false, message: "You're no longer in this trip." } : { ok: true }; });
  await q.enqueue("k1", { n: 1 });
  await q.enqueue("k2", { n: 2 });
  await q.flush();
  expect(sent).toEqual(["k1", "k2"]);
  expect(q.list()).toEqual([expect.objectContaining({ key: "k1", status: "failed", error: "You're no longer in this trip." })]);
  await q.flush();
  expect(sent).toEqual(["k1", "k2"]);
  await q.discard("k1");
  expect(q.list()).toEqual([]);
});

test("6.2 subscribers hear about every change", async () => {
  const { q } = make(async () => ({ ok: true }));
  const seen: number[] = [];
  q.subscribe((items) => seen.push(items.length));
  await q.enqueue("k1", { n: 1 });
  await q.flush();
  expect(seen).toEqual([0, 1, 0]); // loaded empty, one queued, sent
});

test("6.2 corrupt stored data starts an empty queue instead of crashing", async () => {
  const { q } = make(async () => ({ ok: true }), memory("not json"));
  await q.load();
  expect(q.list()).toEqual([]);
});

// The flaky-network suite: a fake server that dedups by idempotency key, and a network that fails before the request lands,
// or after it lands but before the response arrives. However it fails, each expense must exist on the server exactly once.
test("6.2 across many flaky-network runs every queued expense reaches the server exactly once", async () => {
  let seed = 2024;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let run = 0; run < 200; run++) {
    const server = new Map<string, { n: number }>();
    let inserts = 0;
    const { q } = make(async (key, payload) => {
      const r = rnd();
      if (r < 0.3) return { ok: false, retry: true }; // request never arrived
      if (!server.has(key)) { server.set(key, payload); inserts++; } // the server dedups by key, like create_expense
      if (r < 0.55) return { ok: false, retry: true }; // arrived, but the response was lost
      return { ok: true };
    });
    const count = 1 + Math.floor(rnd() * 6);
    for (let i = 0; i < count; i++) await q.enqueue(`run${run}-k${i}`, { n: i });
    for (let attempt = 0; attempt < 200 && q.list().length; attempt++) await q.flush();
    expect(q.list()).toEqual([]);
    expect(server.size).toBe(count);
    expect(inserts).toBe(count);
  }
});
