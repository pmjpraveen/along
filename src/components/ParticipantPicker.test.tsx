import { fireEvent, render, screen } from "@testing-library/react-native";
import { ParticipantPicker } from "./ParticipantPicker";

const members = [
  { id: "m1", display_name: "Asha", membership_type: "registered" as const, role: "owner" as const },
  { id: "m2", display_name: "Rahul", membership_type: "guest" as const, role: "guest" as const },
];

test("US-04 tapping a person selects them and tapping again deselects", async () => {
  const onChange = jest.fn();
  const { rerender } = await render(<ParticipantPicker members={members} selected={[]} onChange={onChange} />);
  await fireEvent.press(screen.getByRole("checkbox", { name: "Asha" }));
  expect(onChange).toHaveBeenLastCalledWith(["m1"]);
  await rerender(<ParticipantPicker members={members} selected={["m1", "m2"]} onChange={onChange} />);
  await fireEvent.press(screen.getByRole("checkbox", { name: "Asha" }));
  expect(onChange).toHaveBeenLastCalledWith(["m2"]);
});

test("US-04 guests are selectable and labelled as guests", async () => {
  await render(<ParticipantPicker members={members} selected={["m2"]} onChange={jest.fn()} />);
  expect(screen.getByRole("checkbox", { name: "Rahul, guest" })).toBeChecked();
  expect(screen.getByText("Guest")).toBeTruthy();
});
