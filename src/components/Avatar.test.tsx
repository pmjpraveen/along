import { render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";
import { Avatar, AVATAR_SIZES, AvatarGroup } from "./Avatar";
import { color } from "../theme/tokens";

const flat = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;

test("a text avatar shows initials in Forest Ink on the neutral wash, in a circle", async () => {
  await render(<Avatar name="Jane Wilson" size={56} />);
  expect(screen.getByText("JW")).toBeTruthy();
  expect(flat(screen.getByText("JW")).color).toBe(color.forestInk);
  const circle = flat(screen.getByText("JW").parent!);
  expect(circle).toMatchObject({ width: 56, height: 56, borderRadius: 9999, backgroundColor: color.neutralWash });
});

test("all seven sizes render at exactly that size, and the initials scale with the circle", async () => {
  for (const size of AVATAR_SIZES) {
    const { unmount } = await render(<Avatar name="Asha Rao" size={size} />);
    if (size >= 24) {
      expect(flat(screen.getByText("AR").parent!)).toMatchObject({ width: size, height: size });
      expect(flat(screen.getByText("AR")).fontSize).toBe(Math.round(size * 0.4));
    } else {
      expect(screen.queryByText("AR")).toBeNull(); // 16pt is too small to read initials, so it is a plain circle
    }
    await unmount();
  }
});

test("a photo fills the circle instead of initials", async () => {
  await render(<Avatar name="Jane Wilson" uri="https://example.com/j.jpg" size={48} />);
  expect(screen.queryByText("JW")).toBeNull();
  expect(screen.getByTestId("avatar-photo").props.source).toEqual({ uri: "https://example.com/j.jpg" });
});

test("an icon avatar is an outlined circle around the icon", async () => {
  await render(<Avatar size={56} icon={<Text>↑</Text>} />);
  expect(flat(screen.getByText("↑").parent!)).toMatchObject({ width: 56, height: 56, backgroundColor: color.paper, borderWidth: 1, borderColor: color.borderNeutral });
});

test("a guest is the same size as everyone but has a dashed Slate ring, and is announced as a guest", async () => {
  await render(<Avatar name="Rahul" guest size={40} />);
  const circle = flat(screen.getByText("R").parent!);
  expect(circle).toMatchObject({ width: 40, height: 40, borderStyle: "dashed", borderColor: color.slate });
  expect(screen.getByRole("image", { name: "Rahul, guest" })).toBeTruthy();
});

test("selected adds a Forest Ink ring and a green check, and says so to screen readers", async () => {
  await render(<Avatar name="Ben" selected />);
  expect(flat(screen.getByText("B").parent!)).toMatchObject({ borderWidth: 2, borderColor: color.forestInk });
  expect(screen.getByRole("image", { name: "Ben, selected" })).toBeTruthy();
});

test("a badge sits at the bottom right, and a notification is a red dot that is announced", async () => {
  await render(<Avatar name="Ben" badge="↗" notification />);
  expect(screen.getByText("↗")).toBeTruthy();
  expect(flat(screen.getByTestId("avatar-notification")).backgroundColor).toBe(color.alarmRed);
  expect(screen.getByRole("image", { name: "Ben, has a notification" })).toBeTruthy();
});

test("a group overlaps its avatars and folds the rest into a +N circle", async () => {
  const people = ["Asha Rao", "Ben Ko", "Cy Lee", "Dee Ng", "Eli Fox", "Fay Gu"].map((name) => ({ name }));
  await render(<AvatarGroup people={people} />);
  expect(screen.getByText("AR")).toBeTruthy();
  expect(screen.getByText("CL")).toBeTruthy();
  expect(screen.queryByText("DN")).toBeNull();
  expect(screen.getByText("+3")).toBeTruthy();
  expect(screen.getByLabelText("6 people")).toBeTruthy();
});

test("a group that fits shows no +N, and a single person reads as one person", async () => {
  await render(<AvatarGroup people={[{ name: "Asha Rao" }]} />);
  expect(screen.queryByText(/^\+/)).toBeNull();
  expect(screen.getByLabelText("1 person")).toBeTruthy();
});
