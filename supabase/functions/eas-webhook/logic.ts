// Pure helpers for the EAS webhook, kept apart from Deno so they can be unit-tested.

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

// EAS signs the raw request body with HMAC-SHA1 (hex) in the `expo-signature` header, using the shared secret.
export async function sign(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
}

// Compared in constant time, so the check does not leak how much of a guess was right.
export async function validSignature(body: string, header: string | null, secret: string): Promise<boolean> {
  if (!header || secret.length < 16) return false;
  const expected = await sign(body, secret);
  // EAS sends the digest as "sha1=<hex>"; a bare hex digest is accepted too.
  const got = header.trim().toLowerCase().replace(/^sha1=/, "");
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

export type Action = { kind: "built"; platform: "ios" | "android"; build: number } | { kind: "released"; platform: "ios" | "android" } | { kind: "ignore"; reason: string };

// What an EAS event means for us. A finished production build records its build number; a finished store submission makes the newest recorded build
// the one users are told about. Everything else (failed, cancelled, other profiles, unknown shapes) is ignored.
export function interpret(event: unknown): Action {
  const e = (event ?? {}) as Record<string, any>;
  const platform = String(e.platform ?? "").toLowerCase();
  if (platform !== "ios" && platform !== "android") return { kind: "ignore", reason: "unknown platform" };
  if (e.status !== "finished") return { kind: "ignore", reason: "not finished" };
  if (e.metadata !== undefined) {   // a build event
    const profile = e.metadata?.buildProfile;
    if (profile !== undefined && profile !== "production") return { kind: "ignore", reason: "not a production build" };
    const build = Number(String(e.metadata?.appBuildVersion ?? "").trim());
    if (!Number.isInteger(build) || build <= 0) return { kind: "ignore", reason: "no build number" };
    return { kind: "built", platform, build };
  }
  if ("archiveUrl" in e || "submissionInfo" in e) return { kind: "released", platform };   // a submission event
  return { kind: "ignore", reason: "unknown event" };
}
