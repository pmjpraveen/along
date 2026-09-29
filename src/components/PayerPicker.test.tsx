import { fireEvent, render, screen } from "@testing-library/react-native";
import { PayerPicker } from "./PayerPicker";

const members = [
  { id: "m2", name: "Ben", guest: false, isMe: false },
  { id: "m1", name: "Asha", guest: false, isMe: true },
  { id: "m3", name: "Rahul", guest: true, isMe: false },
];

test("US-06 lists me first as You, marks the selected payer, and shows guests as guests", async () => {
  await render(<PayerPicker members={members} selected="m1" onChange={jest.fn()} />);
  const radios = screen.getAllByRole("radio");
  expect(radios[0]).toBeSelected();
  expect(screen.getByRole("radio", { name: "You" })).toBeTruthy();
  expect(screen.getByRole("radio", { name: "Rahul, guest" })).toBeTruthy();
});

test("US-06 picking someone reports their id", async () => {
  const onChange = jest.fn();
  await render(<PayerPicker members={members} selected="m1" onChange={onChange} />);
  await fireEvent.press(screen.getByRole("radio", { name: "Ben" }));
  expect(onChange).toHaveBeenCalledWith("m2");
});
