import { MOTIFS, MOTIF_IDS, motifFor } from "./motifs";

test("US-31 famous places get their own landmark, in any case and with the country after the comma", () => {
  expect(motifFor("Istanbul, Turkiye")).toBe("mosque");
  expect(motifFor("AGRA, INDIA")).toBe("taj");
  expect(motifFor("Jaipur, Rajasthan")).toBe("hawamahal");
  expect(motifFor("Kyoto, Japan")).toBe("pagoda");
  expect(motifFor("Singapore")).toBe("skyline");
  expect(motifFor("Goa, India")).toBe("lighthouse");
  expect(motifFor("Kullu, India")).toBe("mountains");
  expect(motifFor("Manali, India")).toBe("mountains");
  expect(motifFor("Puri, India")).toBe("temple");
});

test("US-31 other places are matched by the words in the name, and anything unknown gets the globe", () => {
  expect(motifFor("Havelock Island")).toBe("island");
  expect(motifFor("Jaisalmer Fort")).toBe("fort");
  expect(motifFor("Palolem Beach")).toBe("coast");
  expect(motifFor("Rohtang Valley")).toBe("mountains");
  expect(motifFor("Somewhere new")).toBe("globe");
  expect(motifFor("")).toBe("globe");
});

test("US-31 every motif has ink to print, shapes with valid path data, and a drawable box", () => {
  for (const id of MOTIF_IDS) {
    const m = MOTIFS[id];
    expect(m.shapes.some((s) => s.kind === "ink")).toBe(true);
    expect(m.box[2]).toBeGreaterThan(0);
    expect(m.box[3]).toBeGreaterThan(0);
    for (const s of m.shapes) expect(s.d).toMatch(/^M[\d\s.,\-MmLlHhVvQqTtAaZz]+$/);
  }
  expect(Object.keys(MOTIFS).sort()).toEqual([...MOTIF_IDS].sort());
});
