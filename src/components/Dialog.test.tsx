import { fireEvent, render, screen } from "@testing-library/react-native";
import { Dialog } from "./Dialog";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

test("Dialog shows its message, runs its one action and closes from the close button", async () => {
  const onClose = jest.fn(), onAction = jest.fn();
  await render(<Dialog visible onClose={onClose} title="Leave trip?" subheader="You will lose access" body="Your expenses stay." actionLabel="Leave" onAction={onAction} />);
  expect(screen.getByRole("header", { name: "Leave trip?" })).toBeTruthy();
  expect(screen.getByText("Your expenses stay.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Leave" }));
  expect(onAction).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("Dialog renders nothing when not visible", async () => {
  await render(<Dialog visible={false} onClose={() => {}} title="Hidden" />);
  expect(screen.queryByText("Hidden")).toBeNull();
});
