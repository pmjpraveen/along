import { render } from "@testing-library/react-native";
import AuthCallback from "../../app/auth/callback";

const mockRedirect = jest.fn();
jest.mock("expo-router", () => ({ Redirect: (p: { href: string }) => { mockRedirect(p.href); return null; } }));

test("US-01 the Google sign-in return link has a route, and it goes to the start instead of showing Unmatched Route", async () => {
  await render(<AuthCallback />);
  expect(mockRedirect).toHaveBeenCalledWith("/");
});
