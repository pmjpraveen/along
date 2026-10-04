// The row a scrolled wheel has settled on: the scroll offset divided by the row height, rounded, and kept inside the list.
export const wheelIndex = (offsetY: number, rowHeight: number, count: number): number =>
  Math.max(0, Math.min(count - 1, Math.round(offsetY / rowHeight)));
