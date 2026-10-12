// Turns pasted text (a reel caption, a blog itinerary, a chat message) into draft plans. Nothing is saved here: the app shows the drafts for review first.
// Calls a free model through OpenRouter. Needs the OPENROUTER_API_KEY secret; IMPORT_MODELS (comma-separated) overrides the models, tried in order. A signed-in trip member only (verify_jwt is on), and each person has a daily allowance (claim_itinerary_import).
import { buildRequest, cleanItems, MAX_TEXT, parseReply } from "./logic.ts";

const MODELS = (Deno.env.get("IMPORT_MODELS") ?? "google/gemma-4-31b-it:free,nvidia/nemotron-3-super-120b-a12b:free,openrouter/free").split(",").map((m) => m.trim()).filter(Boolean);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  let body: { tripId?: string; text?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!body.tripId || text.length < 10) return json({ error: "too_short" }, 400);
  if (text.length > MAX_TEXT) return json({ error: "too_long" }, 400);

  // Reads and claims run as the caller, so RLS and the member check apply to them.
  const base = Deno.env.get("SUPABASE_URL");
  const headers = { apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "", Authorization: auth, "Content-Type": "application/json" };
  const trips = await fetch(`${base}/rest/v1/trips?id=eq.${encodeURIComponent(body.tripId)}&select=name,start_date,end_date`, { headers });
  const trip = trips.ok ? (await trips.json())[0] : null;
  if (!trip) return json({ error: "not_found" }, 404);
  const claim = await fetch(`${base}/rest/v1/rpc/claim_itinerary_import`, { method: "POST", headers, body: JSON.stringify({ p_trip: body.tripId }) });
  if (!claim.ok) return json({ error: (await claim.text()).includes("import_limit") ? "limit" : "forbidden" }, claim.status === 400 ? 429 : 403);

  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) return json({ error: "not_configured" }, 503);
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "along" },
    body: JSON.stringify(buildRequest(text, { name: trip.name, start: trip.start_date, end: trip.end_date }, MODELS)),
  }).catch(() => null);
  if (res?.status === 429) return json({ error: "busy" }, 503);
  if (!res?.ok) return json({ error: "model_failed" }, 502);
  const out = await res.json();
  return json({ items: cleanItems(parseReply(out.choices?.[0]?.message?.content)) });
});
