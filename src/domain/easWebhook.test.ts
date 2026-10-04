import { interpret, sign, validSignature } from "../../supabase/functions/eas-webhook/logic";

const SECRET = "a-shared-secret-of-16+";

test("US-30 a request signed with the shared secret is accepted; a wrong, missing or short-secret one is refused", async () => {
  const body = JSON.stringify({ platform: "ios" });
  const good = await sign(body, SECRET);
  expect(await validSignature(body, good, SECRET)).toBe(true);
  expect(await validSignature(body, good.toUpperCase(), SECRET)).toBe(true);
  expect(await validSignature(body + " ", good, SECRET)).toBe(false);          // body changed
  expect(await validSignature(body, await sign(body, "another-secret-xxxxxxx"), SECRET)).toBe(false);
  expect(await validSignature(body, null, SECRET)).toBe(false);
  expect(await validSignature(body, "", SECRET)).toBe(false);
  expect(await validSignature(body, good.slice(0, -2), SECRET)).toBe(false);   // wrong length
  expect(await validSignature(body, await sign(body, "short"), "short")).toBe(false);   // a secret under 16 characters is never trusted
});

test("US-30 the signature matches a known HMAC-SHA1 value", async () => {
  // HMAC-SHA1 of "hello" with key "0123456789abcdef", computed independently.
  expect(await sign("hello", "0123456789abcdef")).toBe(require("crypto").createHmac("sha1", "0123456789abcdef").update("hello").digest("hex"));
});

test("US-30 a finished production build records its number for that platform", () => {
  expect(interpret({ platform: "android", status: "finished", metadata: { appBuildVersion: "12", buildProfile: "production" } })).toEqual({ kind: "built", platform: "android", build: 12 });
  expect(interpret({ platform: "IOS", status: "finished", metadata: { appBuildVersion: "7" } })).toEqual({ kind: "built", platform: "ios", build: 7 });
});

test("US-30 a finished store submission means the newest build is now released", () => {
  expect(interpret({ platform: "ios", status: "finished", archiveUrl: "https://x", submissionInfo: {} })).toEqual({ kind: "released", platform: "ios" });
});

test("US-30 failed, cancelled, preview or malformed events change nothing", () => {
  const ignored = (e: unknown) => expect(interpret(e).kind).toBe("ignore");
  ignored({ platform: "ios", status: "errored", metadata: { appBuildVersion: "7" } });
  ignored({ platform: "ios", status: "canceled", archiveUrl: "x" });
  ignored({ platform: "ios", status: "finished", metadata: { appBuildVersion: "7", buildProfile: "preview" } });
  ignored({ platform: "ios", status: "finished", metadata: { appBuildVersion: "abc" } });
  ignored({ platform: "ios", status: "finished", metadata: { appBuildVersion: "0" } });
  ignored({ platform: "web", status: "finished", metadata: { appBuildVersion: "7" } });
  ignored({ platform: "ios", status: "finished" });
  ignored(null);
  ignored("nope");
});
