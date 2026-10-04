import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import { MapPreview } from "./MapPreview";

const place = { lat: 15.5559, lng: 73.7517, name: "Baga Beach" };

const sized = async (p = place) => {
  await render(<MapPreview place={p} />);
  await fireEvent(screen.getByTestId("map-box"), "layout", { nativeEvent: { layout: { width: 360, height: 96 } } });
};

test("US-03 the preview draws OpenStreetMap tiles, with no map SDK or key, and credits OpenStreetMap", async () => {
  await sized();
  const tiles = screen.getAllByTestId("map-tile");
  expect(tiles.length).toBeGreaterThan(0);
  // expo-image gives its native view the source as a list.
  const sources = tiles.map((t) => [(t.props as { source: object | object[] }).source].flat()[0] as { uri: string; headers: Record<string, string> });
  expect(sources.every((x) => x.uri.startsWith("https://tile.openstreetmap.org/17/"))).toBe(true);
  // OpenStreetMap serves an "Access blocked" picture to requests that do not identify the app, so every tile must carry our User-Agent.
  expect(sources.every((x) => /^along-app\/\d/.test(x.headers["User-Agent"]))).toBe(true);
  expect(screen.getByText("© OpenStreetMap contributors")).toBeTruthy();
});

test("US-03 tapping the credit opens the OpenStreetMap copyright page, not the maps app", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
  await sized();
  await fireEvent.press(screen.getByRole("link", { name: "Map data from OpenStreetMap contributors" }));
  expect(open).toHaveBeenCalledWith("https://www.openstreetmap.org/copyright");
  expect(open).toHaveBeenCalledTimes(1);
});
