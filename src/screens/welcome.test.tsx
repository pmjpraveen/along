import { fireEvent, render, screen } from "@testing-library/react-native";
import Welcome from "../../app/welcome";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("../api/supabase", () => { throw new Error("Welcome must not touch the backend"); });

beforeEach(() => mockPush.mockClear());

test("US-03 welcome offers Get Started and I have an invite", async () => {
  await render(<Welcome />);
  expect(screen.getByRole("button", { name: "Get Started" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "I have an invite" })).toBeTruthy();
});

test("US-03 Get Started goes to sign-in and creates no data", async () => {
  await render(<Welcome />);
  await fireEvent.press(screen.getByRole("button", { name: "Get Started" }));
  expect(mockPush).toHaveBeenCalledWith("/sign-in");
});
