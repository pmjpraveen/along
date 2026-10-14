import { hashSeed, rng } from "./stampWear";

// How each stamp sits, worked out from the trip so it always looks the same: nudged and tilted a little, so the stamps look
// pressed by hand rather than laid out in a grid.
export type Placement = { tilt: number; dx: number; dy: number };

export function placement(seed: string, index: number): Placement {
  const r = rng(hashSeed(`${seed}|${index}`));
  return {
    tilt: Math.round((-9 + r() * 18) * 10) / 10,
    dx: Math.round(-6 + r() * 12), dy: Math.round(-8 + r() * 16),
  };
}

// Where each stamp lands on a page, the way a person presses them: anywhere, a little crooked, never reversed, and never on top of another. `size` is a stamp's width and `ratio` its
// height over its width; the page is `w` by `h`. Each stamp tries random spots (tilted up to MAX_TILT either way) until it clears every earlier one, so what is left is a loose
// scatter; if a page is too crowded to find room the stamp takes the emptiest spot it saw. Everything comes from the keys, so a page always looks the same.
export type Spot = { x: number; y: number; rot: number; size: number };
export const MAX_TILT = 55;

type Box = { x: number; y: number; w: number; h: number; rot: number };
const corners = (b: Box) => {
  const c = Math.cos((b.rot * Math.PI) / 180), s = Math.sin((b.rot * Math.PI) / 180);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => ({ x: b.x + (i * b.w / 2) * c - (j * b.h / 2) * s, y: b.y + (i * b.w / 2) * s + (j * b.h / 2) * c }));
};
// Separating-axis test: two tilted rectangles overlap unless some edge direction separates them (`gap` leaves a margin).
export function overlaps(a: Box, b: Box, gap = 0): boolean {
  const pa = corners(a), pb = corners(b);
  for (const poly of [pa, pb]) {
    for (let i = 0; i < 4; i++) {
      const p = poly[i], q = poly[(i + 1) % 4];
      const ax = q.y - p.y, ay = p.x - q.x;
      const len = Math.hypot(ax, ay);
      const proj = (pts: { x: number; y: number }[]) => pts.map((v) => (v.x * ax + v.y * ay) / len);
      const ra = proj(pa), rb = proj(pb);
      if (Math.max(...ra) + gap < Math.min(...rb) || Math.max(...rb) + gap < Math.min(...ra)) return false;
    }
  }
  return true;
}

// Each stamp gets a cell of a loose grid (cells are dealt out in an order that depends on the keys) and lands somewhere inside it at a tilt that still fits, so no two ever touch while the
// page still looks pressed by hand rather than laid out.
export function scatter(keys: string[], w: number, h: number, sizes: number[], ratio = 170 / 150): Spot[] {
  const cols = keys.length > 2 ? Math.ceil(Math.sqrt(keys.length)) : keys.length || 1;
  const rows = Math.ceil(keys.length / cols) || 1;
  const cw = w / cols, ch = h / rows;
  const order = keys.map((_, i) => i).sort((a, b) => hashSeed(`${keys[a]}|cell`) - hashSeed(`${keys[b]}|cell`));
  return keys.map((key, n) => {
    const size = Math.min(sizes[n], cw - 4, (ch - 4) / ratio);   // a stamp is never bigger than its cell
    const sh = size * ratio;
    const r = rng(hashSeed(`${key}|${n}|spot`));
    const cell = order[n];
    const [cx, cy] = [(cell % cols) * cw, Math.floor(cell / cols) * ch];
    // the biggest tilt (up to MAX_TILT) whose tilted stamp still fits inside its cell
    let cap = MAX_TILT;
    while (cap > 0) {
      const a = (cap * Math.PI) / 180;
      if (Math.cos(a) * size + Math.sin(a) * sh <= cw - 4 && Math.sin(a) * size + Math.cos(a) * sh <= ch - 4) break;
      cap -= 1;
    }
    const rot = Math.round((r() * 2 - 1) * cap * 10) / 10;
    const a = (Math.abs(rot) * Math.PI) / 180;
    const hw = (Math.cos(a) * size + Math.sin(a) * sh) / 2;
    const hh = (Math.sin(a) * size + Math.cos(a) * sh) / 2;
    return { x: cx + hw + r() * Math.max(0, cw - 2 * hw), y: cy + hh + r() * Math.max(0, ch - 2 * hh), rot, size };
  });
}
