import { render, screen } from "@testing-library/react-native";
import { TripCover } from "./TripCover";

test("a trip with a photo shows it, labelled for screen readers", async () => {
  await render(<TripCover uri="https://example.com/goa.jpg" destination="Goa, India" />);
  const img = screen.getByRole("image", { name: "Cover photo of Goa, India" });
  expect(img.props.source).toEqual({ uri: "https://example.com/goa.jpg" });
});

test("a trip without a photo shows the default travel illustration instead of an empty space", async () => {
  await render(<TripCover uri={null} destination="Goa, India" />);
  expect(screen.getByRole("image", { name: "Goa, India, default cover" })).toBeTruthy();
});
