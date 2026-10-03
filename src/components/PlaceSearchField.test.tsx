import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { PlaceSearchField } from "./PlaceSearchField";

const mockSearch = jest.fn();
jest.mock("../api/placeSearch", () => ({ searchPlaces: (...a: unknown[]) => mockSearch(...a) }));
jest.useFakeTimers();

const goa = { id: "1", title: "Goa", subtitle: "India", lat: 15.3, lng: 74.1 };
beforeEach(() => { mockSearch.mockReset().mockResolvedValue({ ok: true, places: [goa] }); });

function Harness({ onPick }: { onPick: (p: unknown) => void }) {
  const [v, setV] = useState("");
  return <PlaceSearchField label="Location" placeholder="Search" value={v} onChangeText={setV} onPick={(p) => { setV(p.title); onPick(p); }} />;
}
const type = async (text: string) => { await fireEvent.changeText(screen.getByLabelText("Location"), text); await act(async () => { jest.advanceTimersByTime(800); }); };

test("suggestions appear after a pause in typing, and choosing one fills the field, reports the place and stops searching", async () => {
  const onPick = jest.fn();
  await render(<Harness onPick={onPick} />);
  await type("Goa");
  expect(mockSearch).toHaveBeenCalledTimes(1);
  await fireEvent.press(await screen.findByRole("button", { name: "Goa, India" }));
  expect(onPick).toHaveBeenCalledWith(goa);
  expect(screen.getByLabelText("Location").props.value).toBe("Goa");
  expect(screen.queryByLabelText("Place suggestions")).toBeNull();
  await act(async () => { jest.advanceTimersByTime(3000); });
  expect(mockSearch).toHaveBeenCalledTimes(1);
});

test("once a place is chosen the list stays hidden even when the screen fills the field with different text, and returns when you type again", async () => {
  mockSearch.mockResolvedValue({ ok: true, places: [goa, { ...goa, id: "2", title: "Goa Velha", subtitle: "India" }] });
  function Longer() {
    const [v, setV] = useState("");
    return <PlaceSearchField label="Location" placeholder="Search" value={v} onChangeText={setV} onPick={(p) => setV(`${p.title}, ${p.subtitle}`)} />;
  }
  await render(<Longer />);
  await type("Goa");
  await fireEvent.press(await screen.findByRole("button", { name: "Goa, India" }));
  expect(screen.getByLabelText("Location").props.value).toBe("Goa, India");
  expect(screen.queryByLabelText("Place suggestions")).toBeNull();
  await act(async () => { jest.advanceTimersByTime(3000); });
  expect(screen.queryByLabelText("Place suggestions")).toBeNull();
  expect(mockSearch).toHaveBeenCalledTimes(1);
  await type("Goa Vel");
  expect(await screen.findByLabelText("Place suggestions")).toBeTruthy();
});

test("a field that opens with a value does not search or show a list until it is edited", async () => {
  await render(<PlaceSearchField label="Location" placeholder="Search" value="Kullu, India" onChangeText={jest.fn()} onPick={jest.fn()} />);
  await act(async () => { jest.advanceTimersByTime(3000); });
  expect(mockSearch).not.toHaveBeenCalled();
  expect(screen.queryByLabelText("Place suggestions")).toBeNull();
});

test("nothing is searched for short text or a pasted link, and a failed search says so without blocking typing", async () => {
  await render(<Harness onPick={jest.fn()} />);
  await type("Go");
  await type("https://maps.app.goo.gl/abc");
  expect(mockSearch).not.toHaveBeenCalled();
  mockSearch.mockResolvedValue({ ok: false, message: "No connection. You can still type the place." });
  await type("Goa beach");
  expect(await screen.findByText(/You can still type the place/)).toBeTruthy();
  expect(screen.getByLabelText("Location").props.value).toBe("Goa beach");
});

test("typing more keeps the earlier matches on screen, dimmed, until the new ones arrive", async () => {
  mockSearch.mockReset();
  mockSearch.mockResolvedValueOnce({ ok: true, places: [goa] });
  await render(<Harness onPick={jest.fn()} />);
  await fireEvent.changeText(screen.getByLabelText("Location"), "goa");
  await act(async () => { jest.advanceTimersByTime(800); });
  expect(await screen.findByText("Goa")).toBeTruthy();
  let resolve: (v: unknown) => void = () => {};
  mockSearch.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
  await fireEvent.changeText(screen.getByLabelText("Location"), "goa beach");
  expect(screen.getByText("Goa")).toBeTruthy();                       // still there, not replaced by a spinner
  expect(screen.getByLabelText("Place suggestions").props.accessibilityState).toMatchObject({ busy: true });
  await act(async () => { jest.advanceTimersByTime(1200); });
  await act(async () => { resolve({ ok: true, places: [{ ...goa, id: "2", title: "Goa Beach" }] }); });
  expect(await screen.findByText("Goa Beach")).toBeTruthy();
  expect(screen.getByLabelText("Place suggestions").props.accessibilityState).toMatchObject({ busy: false });
});
