import { wavePath } from "./WaveLine";

test("the wave runs the full width, starts and ends on the midline, and has a bump every ~12pt", () => {
  const d = wavePath(120);
  expect(d.startsWith("M0 2.5")).toBe(true);
  expect(d.endsWith("120 2.5")).toBe(true);
  expect(d.match(/Q/g)).toHaveLength(10);
  expect(wavePath(3).match(/Q/g)).toHaveLength(1);
});
