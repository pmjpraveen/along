import { project, rubberband, shouldDismiss, spring } from "./gesture";

test("project: a stationary release goes nowhere and a fast flick is thrown a long way, in the flick's direction", () => {
  expect(project(0)).toBe(0);
  expect(project(1000)).toBeCloseTo(499, 0);
  expect(project(-1000)).toBeCloseTo(-499, 0);
  expect(project(2000)).toBeGreaterThan(project(1000));
});

test("rubberband: follows a little at first, never reaches the dimension, and grows only with more pull", () => {
  expect(rubberband(0, 600)).toBe(0);
  let last = 0;
  for (let o = 10; o <= 5000; o += 10) {
    const r = rubberband(o, 600);
    expect(r).toBeGreaterThan(last);
    expect(r).toBeLessThan(600);
    expect(r).toBeLessThan(o);
    last = r;
  }
});

test("spring: response and damping ratio become stiffness and damping; ratio 1 is critically damped", () => {
  const s = spring(0.4, 1);
  expect(s.damping).toBeCloseTo(2 * Math.sqrt(s.stiffness * s.mass), 6);
  expect(spring(0.3, 0.8).damping).toBeLessThan(2 * Math.sqrt(spring(0.3, 0.8).stiffness));
  expect(spring(0.2, 1).stiffness).toBeGreaterThan(spring(0.4, 1).stiffness);
});

test("shouldDismiss: a short slow drag snaps back, a long drag or a fast downward flick dismisses, an upward flick never does", () => {
  expect(shouldDismiss(40, 0, 400)).toBe(false);
  expect(shouldDismiss(250, 0, 400)).toBe(true);
  expect(shouldDismiss(40, 1500, 400)).toBe(true);
  expect(shouldDismiss(150, -1500, 400)).toBe(false);
});
