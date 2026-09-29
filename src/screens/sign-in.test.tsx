import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import SignIn from "../../app/sign-in";

const mockSignIn = jest.fn();
const mockPush = jest.fn();
let mockDev = false;
const mockDevSignIn = jest.fn();
jest.mock("../api/auth", () => ({ signInWithGoogle: () => mockSignIn() }));
jest.mock("../api/devAuth", () => ({
  DEV_PEOPLE: [{ name: "Asha", email: "asha@along.test" }, { name: "Ben", email: "ben@along.test" }],
  devLoginEnabled: () => mockDev, signInAsDev: (...a: unknown[]) => mockDevSignIn(...a),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, replace: mockPush }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const press = async () => fireEvent.press(screen.getByRole("button", { name: "Continue with Google" }));
beforeEach(() => { jest.clearAllMocks(); mockDev = false; });

test("US-04 a failed sign-in shows the specific error inline and does not navigate", async () => {
  mockSignIn.mockResolvedValue({ ok: false, message: "No connection. Check your internet and try again." });
  await render(<SignIn />);
  await press();
  expect(await screen.findByRole("alert")).toHaveTextContent(/No connection/);
  expect(mockPush).not.toHaveBeenCalled();
});

test("US-04 the user can retry after an error and the old error clears", async () => {
  mockSignIn.mockResolvedValueOnce({ ok: false, message: "Something went wrong." }).mockResolvedValueOnce({ ok: false, cancelled: true });
  await render(<SignIn />);
  await press();
  await screen.findByRole("alert");
  await press();
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  expect(mockSignIn).toHaveBeenCalledTimes(2);
});

test("US-04 dismissing the Google picker shows no error", async () => {
  mockSignIn.mockResolvedValue({ ok: false, cancelled: true });
  await render(<SignIn />);
  await press();
  await waitFor(() => expect(mockSignIn).toHaveBeenCalled());
  expect(screen.queryByRole("alert")).toBeNull();
});

test("dev sign-in buttons are not shown unless dev login is on", async () => {
  await render(<SignIn />);
  expect(screen.queryByRole("button", { name: /Sign in as/ })).toBeNull();
  expect(screen.getByRole("button", { name: "Continue with Google" })).toBeTruthy();
});

test("with dev login on, a test person can be picked, and a failure shows what to do", async () => {
  mockDev = true;
  mockDevSignIn.mockResolvedValue({ ok: false, message: "Dev sign-in failed: nope. Did you run supabase db reset?" });
  await render(<SignIn />);
  await fireEvent.press(screen.getByRole("button", { name: "Sign in as Ben" }));
  expect(mockDevSignIn).toHaveBeenCalledWith("ben@along.test");
  expect(await screen.findByRole("alert")).toHaveTextContent(/supabase db reset/);
});
