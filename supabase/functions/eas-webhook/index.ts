// Receives EAS build and submit webhooks and keeps app_releases up to date, so the app's "new update" bar starts by itself when a build reaches a store.
// Not a user endpoint: EAS cannot send a login token, so verify_jwt is off and the request is authenticated by the shared-secret signature instead.
import { interpret, validSignature } from "./logic.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const body = await req.text();
  const secret = Deno.env.get("EAS_WEBHOOK_SECRET") ?? "";
  if (!(await validSignature(body, req.headers.get("expo-signature"), secret))) return json({ error: "bad_signature" }, 401);

  let event: unknown;
  try { event = JSON.parse(body); } catch { return json({ error: "invalid_json" }, 400); }
  const action = interpret(event);
  if (action.kind === "ignore") return json({ ok: true, ignored: action.reason });

  const base = `${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc`;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const call = (fn: string, args: Record<string, unknown>) =>
    fetch(`${base}/${fn}`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  const res = action.kind === "built"
    ? await call("record_built_build", { p_platform: action.platform, p_build: action.build })
    : await call("promote_released_build", { p_platform: action.platform });
  return res.ok ? json({ ok: true, applied: action }) : json({ error: "database_error" }, 502);
});
