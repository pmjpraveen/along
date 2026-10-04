import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import { UpdateBanner } from "./UpdateBanner";

test("US-30 the banner says there is a new update and its Update button opens the store page", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
  await render(<UpdateBanner storeUrl="https://apps.apple.com/app/id1" />);
  expect(screen.getByText("The app has a new update")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Update the app" }));
  expect(open).toHaveBeenCalledWith("https://apps.apple.com/app/id1");
});

test("US-30 it cannot be dismissed: Update is the only control", async () => {
  await render(<UpdateBanner storeUrl="https://play.google.com/store/apps/details?id=x" />);
  expect(screen.getAllByRole("button")).toHaveLength(1);
});
