#!/usr/bin/env node
// One-off clean-up: shrinks the photos already in Supabase Storage (avatars, covers, memories) the same way the app now shrinks new ones.
// Step 4 of the egress fix. It OVERWRITES files, so it does nothing unless told to, and it keeps a copy of every original it replaces.
//
//   Dry run (lists what would be shrunk; downloads nothing, so it costs no egress):
//     SUPABASE_SERVICE_ROLE_KEY=... node --env-file=.env scripts/shrink-stored-photos.cjs
//   Apply (needs the project ref typed again, and a folder to keep the originals in):
//     SUPABASE_SERVICE_ROLE_KEY=... node --env-file=.env scripts/shrink-stored-photos.cjs --apply --confirm=<project-ref> --backup=./photo-backup
//   Options: --bucket=avatars,covers,memories   --min-kb=<n> (smaller files are left alone)
//
// Uses macOS `sips` (no extra dependency). A file keeps its path and name and is rewritten as a JPEG with a one-year cache header, so no database row changes;
// a .png or .heic name may now hold JPEG data, which the app and browsers read from the content type, not the name.

const EDGE = { avatars: 256, covers: 1280, memories: 1600 };            // longest side in pixels: the same limits as the app
const MIN_BYTES = { avatars: 60 * 1024, covers: 400 * 1024, memories: 500 * 1024 };   // below these a file is already small
const JPEG_QUALITY = 80;
const KEEP_IF_AT_MOST = 0.8;                                             // only replace a file if the new one is at least 20% smaller
const CACHE = "31536000";

function parseArgs(argv) {
  const out = { apply: false, confirm: null, backup: null, buckets: Object.keys(EDGE), minKb: null };
  for (const a of argv) {
    if (a === "--apply") out.apply = true;
    else if (a.startsWith("--confirm=")) out.confirm = a.slice(10);
    else if (a.startsWith("--backup=")) out.backup = a.slice(9);
    else if (a.startsWith("--bucket=")) out.buckets = a.slice(9).split(",").filter(Boolean);
    else if (a.startsWith("--min-kb=")) out.minKb = Number(a.slice(9));
    else throw new Error(`Unknown option ${a}`);
  }
  for (const b of out.buckets) if (!EDGE[b]) throw new Error(`Unknown bucket ${b}. Use avatars, covers or memories.`);
  return out;
}

const projectRef = (url) => new URL(url).hostname.split(".")[0];
const minBytes = (bucket, minKb) => (minKb != null ? minKb * 1024 : MIN_BYTES[bucket]);
// A stored file is worth shrinking when it is an image and bigger than the bucket's threshold.
const isCandidate = (file, bucket, minKb) => !!file.metadata && /^image\//.test(file.metadata.mimetype ?? "") && (file.metadata.size ?? 0) >= minBytes(bucket, minKb);
const worthKeeping = (oldBytes, newBytes) => newBytes <= oldBytes * KEEP_IF_AT_MOST;
// What the apply step must have before it touches anything.
function applyProblems(args, env) {
  const problems = [];
  if (!env.SUPABASE_SERVICE_ROLE_KEY) problems.push("SUPABASE_SERVICE_ROLE_KEY is not set.");
  if (!env.EXPO_PUBLIC_SUPABASE_URL && !env.SUPABASE_URL) problems.push("The project URL is not set (run with --env-file=.env).");
  if (args.apply) {
    const url = env.SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL;
    if (url && args.confirm !== projectRef(url)) problems.push(`To apply, pass --confirm=${projectRef(url)} (the project you are about to change).`);
    if (!args.backup) problems.push("To apply, pass --backup=<folder>: the originals are saved there before they are replaced.");
  }
  return problems;
}

// Every file in a bucket (folders are listed recursively; Storage pages its results).
async function listAll(storage, prefix = "") {
  const files = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`list ${prefix || "/"}: ${error.message}`);
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) files.push(...(await listAll(storage, path)));
      else files.push({ ...item, path });
    }
    if (data.length < 1000) break;
  }
  return files;
}

const mb = (n) => (n / 1048576).toFixed(1);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const problems = applyProblems(args, process.env);
  if (problems.length) { console.error(problems.map((p) => `- ${p}`).join("\n")); process.exit(1); }
  const { createClient } = require("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  console.log(`${args.apply ? "APPLYING to" : "Dry run on"} project ${projectRef(url)}\n`);

  let total = { files: 0, candidates: 0, before: 0, after: 0, replaced: 0 };
  for (const bucket of args.buckets) {
    const storage = supabase.storage.from(bucket);
    const files = await listAll(storage);
    const candidates = files.filter((f) => isCandidate(f, bucket, args.minKb));
    const bytes = candidates.reduce((n, f) => n + f.metadata.size, 0);
    console.log(`${bucket}: ${files.length} files, ${candidates.length} to shrink (${mb(bytes)} MB of ${mb(files.reduce((n, f) => n + (f.metadata?.size ?? 0), 0))} MB)`);
    total.files += files.length; total.candidates += candidates.length; total.before += bytes;
    if (!args.apply) continue;

    const fs = require("fs"), os = require("os"), path = require("path"), { execFileSync } = require("child_process");
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "shrink-"));
    const queue = [...candidates];
    const worker = async () => {
      for (let f = queue.shift(); f; f = queue.shift()) {
        try {
          const dl = await storage.download(f.path);
          if (dl.error) throw new Error(dl.error.message);
          const original = Buffer.from(await dl.data.arrayBuffer());
          const input = path.join(tmp, `in-${Math.random().toString(36).slice(2)}`);
          const output = `${input}.jpg`;
          fs.writeFileSync(input, original);
          const dims = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", input]).toString();
          const w = Number(/pixelWidth: (\d+)/.exec(dims)?.[1]), h = Number(/pixelHeight: (\d+)/.exec(dims)?.[1]);
          const resize = Math.max(w, h) > EDGE[bucket] ? ["-Z", String(EDGE[bucket])] : [];   // never scale up
          execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", String(JPEG_QUALITY), ...resize, input, "--out", output], { stdio: "ignore" });
          const shrunk = fs.readFileSync(output);
          fs.rmSync(input); fs.rmSync(output);
          if (!worthKeeping(original.length, shrunk.length)) { console.log(`  skip  ${bucket}/${f.path} (${mb(original.length)} -> ${mb(shrunk.length)} MB: not worth it)`); continue; }
          const copy = path.join(args.backup, bucket, f.path);               // the original is saved before it is replaced
          fs.mkdirSync(path.dirname(copy), { recursive: true });
          fs.writeFileSync(copy, original);
          const up = await storage.upload(f.path, shrunk, { upsert: true, contentType: "image/jpeg", cacheControl: CACHE });
          if (up.error) throw new Error(up.error.message);
          total.after += shrunk.length; total.replaced += 1;
          console.log(`  ok    ${bucket}/${f.path}  ${mb(original.length)} -> ${mb(shrunk.length)} MB`);
        } catch (e) {
          console.error(`  FAIL  ${bucket}/${f.path}: ${e.message}`);
        }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`\n${total.files} files checked, ${total.candidates} candidates (${mb(total.before)} MB).`);
  if (args.apply) console.log(`${total.replaced} replaced; their new size is ${mb(total.after)} MB. Originals are in ${args.backup}.`);
  else console.log("Nothing was changed. To apply, run again with --apply --confirm=<project-ref> --backup=<folder>.");
}

module.exports = { parseArgs, projectRef, isCandidate, worthKeeping, applyProblems, listAll, EDGE, MIN_BYTES };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
