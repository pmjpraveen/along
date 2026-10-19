const { parseArgs, projectRef, isCandidate, worthKeeping, applyProblems, listAll, EDGE } = require("../../scripts/shrink-stored-photos.cjs");

const env = { SUPABASE_SERVICE_ROLE_KEY: "k", EXPO_PUBLIC_SUPABASE_URL: "https://abcd1234.supabase.co" };
const file = (size: number, mimetype = "image/jpeg") => ({ name: "a", metadata: { size, mimetype } });

test("the script's limits are the same as the app's", () => {
  expect(EDGE).toEqual({ avatars: 256, covers: 1280, memories: 1600 });
});

test("by default nothing is applied, and every bucket is considered", () => {
  expect(parseArgs([])).toMatchObject({ apply: false, buckets: ["avatars", "covers", "memories"] });
  expect(applyProblems(parseArgs([]), env)).toEqual([]);
});

test("applying needs the project ref typed again and a backup folder", () => {
  expect(applyProblems(parseArgs(["--apply"]), env)).toHaveLength(2);
  expect(applyProblems(parseArgs(["--apply", "--confirm=wrong", "--backup=./b"]), env)[0]).toContain("--confirm=abcd1234");
  expect(applyProblems(parseArgs(["--apply", "--confirm=abcd1234", "--backup=./b"]), env)).toEqual([]);
});

test("a missing service key or URL stops the script before it reads or changes anything", () => {
  expect(applyProblems(parseArgs([]), {})).toHaveLength(2);
});

test("an unknown option or bucket is refused rather than ignored", () => {
  expect(() => parseArgs(["--aply"])).toThrow(/Unknown option/);
  expect(() => parseArgs(["--bucket=receipts"])).toThrow(/Unknown bucket/);
});

test("the project ref is the first part of the host", () => {
  expect(projectRef("https://abcd1234.supabase.co")).toBe("abcd1234");
});

test("only images above the bucket's size threshold are shrunk", () => {
  expect(isCandidate(file(3_000_000), "memories")).toBe(true);
  expect(isCandidate(file(200_000), "memories")).toBe(false);          // already small
  expect(isCandidate(file(100_000), "avatars")).toBe(true);            // avatars should be tiny
  expect(isCandidate(file(3_000_000, "application/pdf"), "memories")).toBe(false);
  expect(isCandidate({ name: "folder" }, "memories")).toBe(false);
  expect(isCandidate(file(100_000), "memories", 50)).toBe(true);       // --min-kb overrides
});

test("a replacement must be at least 20% smaller", () => {
  expect(worthKeeping(1000, 800)).toBe(true);
  expect(worthKeeping(1000, 900)).toBe(false);
});

test("listing walks into folders and pages through large ones", async () => {
  const tree: Record<string, { name: string; id: string | null }[]> = {
    "": [{ name: "u1", id: null }, { name: "u2", id: null }],
    u1: Array.from({ length: 1000 }, (_, i) => ({ name: `${i}.jpg`, id: `id${i}` })),
    "u1#1000": [{ name: "last.jpg", id: "idl" }],
    u2: [{ name: "x.jpg", id: "idx" }],
  };
  const storage = { list: async (prefix: string, o: { offset: number }) => ({ data: tree[o.offset ? `${prefix}#${o.offset}` : prefix] ?? [], error: null }) };
  const files = await listAll(storage);
  expect(files).toHaveLength(1002);
  expect(files.map((f: { path: string }) => f.path)).toContain("u1/last.jpg");
  expect(files.map((f: { path: string }) => f.path)).toContain("u2/x.jpg");
});
