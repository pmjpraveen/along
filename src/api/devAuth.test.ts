const mockSignIn = jest.fn();
jest.mock("./supabase", () => ({ supabase: { auth: { signInWithPassword: (...a: unknown[]) => mockSignIn(...a) } } }));

const load = () => {
  let m!: typeof import("./devAuth");
  jest.isolateModules(() => { m = require("./devAuth"); });
  return m;
};
const g = globalThis as unknown as { __DEV__: boolean };
const env = process.env;
beforeEach(() => { jest.clearAllMocks(); g.__DEV__ = true; process.env = { ...env, EXPO_PUBLIC_DEV_LOGIN: "1", EXPO_PUBLIC_DEV_PASSWORD: "pw" }; });
afterAll(() => { process.env = env; });

test("dev sign-in is available only in a dev build with the flag on", () => {
  expect(load().devLoginEnabled()).toBe(true);
  process.env.EXPO_PUBLIC_DEV_LOGIN = "0";
  expect(load().devLoginEnabled()).toBe(false);
  process.env.EXPO_PUBLIC_DEV_LOGIN = "1";
  g.__DEV__ = false;
  expect(load().devLoginEnabled()).toBe(false);
});

test("a production build refuses even if called directly, and never contacts the backend", async () => {
  g.__DEV__ = false;
  expect(await load().signInAsDev("asha@along.test")).toEqual({ ok: false, message: "Dev sign-in is turned off." });
  expect(mockSignIn).not.toHaveBeenCalled();
});

test("signing in sends the seeded person's email with the password from the environment", async () => {
  mockSignIn.mockResolvedValue({ error: null });
  expect(await load().signInAsDev("asha@along.test")).toEqual({ ok: true });
  expect(mockSignIn).toHaveBeenCalledWith({ email: "asha@along.test", password: "pw" });
});

test("a missing password and a failed sign-in each say what to do", async () => {
  process.env.EXPO_PUBLIC_DEV_PASSWORD = "";
  expect((await load().signInAsDev("asha@along.test")).ok).toBe(false);
  expect(mockSignIn).not.toHaveBeenCalled();
  process.env.EXPO_PUBLIC_DEV_PASSWORD = "pw";
  mockSignIn.mockResolvedValue({ error: { message: "Invalid login credentials" } });
  const r = await load().signInAsDev("asha@along.test");
  expect(r.ok === false && r.message).toMatch(/supabase db reset/);
});
