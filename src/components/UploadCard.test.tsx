import { fireEvent, render, screen } from "@testing-library/react-native";
import { UploadCard } from "./UploadCard";

test("UploadCard names what to upload and its limit, and opens the picker once", async () => {
  const onSelect = jest.fn();
  await render(<UploadCard title="Front of your ID document" hint="Choose a file less than 5 MB" buttonLabel="Select file" onSelect={onSelect} />);
  expect(screen.getByText("Choose a file less than 5 MB")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Select file" }));
  expect(onSelect).toHaveBeenCalledTimes(1);
});
