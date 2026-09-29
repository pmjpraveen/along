// Expands a Google Maps short link (maps.app.goo.gl, goo.gl/maps) to its full URL. Requires a signed-in caller
// (verify_jwt is on by default). Only Google hosts are ever fetched, so it cannot be pointed at other servers.
const SHORT = /^(maps\.app\.goo\.gl|goo\.gl)$/i;
const GOOGLE = /^(www\.)?(google\.[a-z.]+|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl)$/i;
const MAX_HOPS = 5;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  let url: URL;
  try {
    url = new URL((await req.json()).url);
  } catch {
    return json({ error: "invalid_url" }, 400);
  }
  if (url.protocol !== "https:" || !SHORT.test(url.hostname)) return json({ error: "not_a_short_link" }, 400);

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const res = await fetch(url, { redirect: "manual" }).catch(() => null);
    if (!res) return json({ error: "unreachable" }, 502);
    const next = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !next) return json({ final_url: url.toString() });
    url = new URL(next, url);
    if (url.protocol !== "https:" || !GOOGLE.test(url.hostname)) return json({ error: "unexpected_redirect" }, 502);
    if (!SHORT.test(url.hostname)) return json({ final_url: url.toString() });
  }
  return json({ error: "too_many_redirects" }, 502);
});
