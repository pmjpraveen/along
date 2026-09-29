const mockGetSession = jest.fn();
const mockOnChange = jest.fn();
jest.mock("../api/supabase", () => ({
  supabase: { auth: { getSession: () => mockGetSession(), onAuthStateChange: (cb: unknown) => mockOnChange(cb) } },
}));

const load = () => {
  let m!: typeof import("./session");
  jest.isolateModules(() => { m = require("./session"); });
  return m;
};
const flush = () => new Promise<void>((r) => setImmediate(() => r()));

beforeEach(() => jest.clearAllMocks());

test("US-02 a stored valid session restores straight to signed-in", async () => {
  mockGetSession.mockResolvedValue({ data: { session: { access_token: "t" } } });
  const { initSession, useSession } = load();
  expect(useSession.getState().status).toBe("loading");
  initSession();
  await flush();
  expect(useSession.getState().status).toBe("in");
});

test("US-02 no stored session resolves to signed-out", async () => {
  mockGetSession.mockResolvedValue({ data: { session: null } });
  const { initSession, useSession } = load();
  initSession();
  await flush();
  expect(useSession.getState().status).toBe("out");
});

test("US-02 a failing restore never leaves the app loading", async () => {
  mockGetSession.mockRejectedValue(new Error("boom"));
  const { initSession, useSession } = load();
  initSession();
  await flush();
  expect(useSession.getState().status).toBe("out");
});

test("US-02 repeated mounts make one request and one subscription", async () => {
  mockGetSession.mockResolvedValue({ data: { session: null } });
  const { initSession } = load();
  initSession(); initSession(); initSession();
  await flush();
  expect(mockGetSession).toHaveBeenCalledTimes(1);
  expect(mockOnChange).toHaveBeenCalledTimes(1);
});

test("US-02 a later auth event updates the status", async () => {
  mockGetSession.mockResolvedValue({ data: { session: null } });
  const { initSession, useSession } = load();
  initSession();
  await flush();
  mockOnChange.mock.calls[0][0]("SIGNED_IN", { access_token: "t" });
  expect(useSession.getState().status).toBe("in");
});
