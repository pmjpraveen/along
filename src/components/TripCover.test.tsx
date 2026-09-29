import { render, screen } from "@testing-library/react-native";
import { TripCover } from "./TripCover";

test("a trip with a photo shows it, labelled for screen readers", async () => {
  await render(<TripCover uri="https://example.com/goa.jpg" destination="Goa, India" />);
  const img = screen.getByRole("image", { name: "Cover photo of Goa, India" });
  expect(img.props.source).toEqual({ uri: "https://example.com/goa.jpg" });
});

test("a trip without a photo shows its destination on a calm block instead of an empty space", async () => {
  await render(<TripCover uri={null} destination="Goa, India" />);
  expect(screen.getByText("GOA, INDIA")).toBeTruthy();
  expect(screen.getByLabelText("Goa, India, no cover photo yet")).toBeTruthy();
});
