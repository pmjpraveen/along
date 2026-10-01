import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import SignInEmail from "../../app/sign-in-email";

const mockEmail = jest.fn();
jest.mock("../api/auth", () => ({ signInWithEmail: (...a: unknown[]) => mockEmail(...a) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn(), canGoBack: () => true, replace: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
beforeEach(() => jest.clearAllMocks());

test("it asks for both, shows a wrong password plainly, keeps what was typed, and signs in once with the right one", async () => {
  mockEmail.mockResolvedValueOnce({ ok: false, message: "That email and password don't match. Check them and try again." }).mockResolvedValueOnce({ ok: true });
  await render(<SignInEmail />);
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText("Enter your email address.")).toBeTruthy();
  expect(screen.getByText("Enter your password.")).toBeTruthy();
  expect(mockEmail).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText("Email"), "review@example.com");
  await fireEvent.changeText(screen.getByLabelText("Password"), "wrong");
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText("That email and password don't match. Check them and try again.")).toBeTruthy();
  expect(screen.getByLabelText("Email").props.value).toBe("review@example.com");
  await fireEvent.changeText(screen.getByLabelText("Password"), "right");
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(mockEmail).toHaveBeenLastCalledWith("review@example.com", "right"));
  expect(mockEmail).toHaveBeenCalledTimes(2);
});
