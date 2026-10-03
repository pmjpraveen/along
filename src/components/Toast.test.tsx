import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { toast, useToast } from "../stores/toast";
import { Toast } from "./Toast";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

test("a toast with an action shows a tappable Undo that runs it once", async () => {
  const undo = jest.fn();
  await render(<Toast />);
  await act(async () => { toast("Plan deleted", { label: "Undo", onPress: undo }); });
  expect(screen.getByText("Plan deleted")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Undo" }));
  expect(undo).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  useToast.setState({ message: "", n: 0, action: undefined });
});

test("a plain toast has no action button", async () => {
  await render(<Toast />);
  await act(async () => { toast("Saved"); });
  expect(screen.getByText("Saved")).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});
