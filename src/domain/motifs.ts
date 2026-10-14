// The little illustrations printed on a departure stamp: one flat silhouette per famous place, plus a few generic scenes for everywhere else. Each is a list of shapes painted in order
// onto a mask: "ink" shapes print, "cut" shapes are left blank again (windows, snowcaps, wave lines), so detail comes out of the ink instead of being drawn on top of it.
// A shape with `stroke` is a line of that width rather than a filled area. Coordinates are in each motif's own `box` ([x, y, width, height]), which is scaled to fit where it is drawn.
export type MotifShape = { kind: "ink" | "cut"; d: string; stroke?: number };
export type Motif = { box: [number, number, number, number]; shapes: MotifShape[] };
export const MOTIF_IDS = ["mountains", "lighthouse", "mosque", "pagoda", "taj", "hawamahal", "skyline", "coast", "island", "fort", "temple", "globe"] as const;
export type MotifId = (typeof MOTIF_IDS)[number];

const ink = (d: string, stroke?: number): MotifShape => ({ kind: "ink", d, stroke });
const cut = (d: string, stroke?: number): MotifShape => ({ kind: "cut", d, stroke });
const sun = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const waves = (y: number, x = 14, n = 7) => `M${x} ${y} q10 -6 20 0${" t20 0".repeat(n - 1)}`;
const frond = (x: number, y: number, s: number) => `M${x} ${y} q${-12 * s} ${-12 * s} ${-26 * s} ${4 * s} q${14 * s} ${-6 * s} ${26 * s} ${-4 * s}z M${x} ${y} q${14 * s} ${-14 * s} ${28 * s} 0 q${-14 * s} ${-4 * s} ${-28 * s} 0z M${x} ${y} q${-8 * s} ${-16 * s} ${-22 * s} ${-12 * s} q${14 * s} ${2 * s} ${22 * s} ${12 * s}z M${x} ${y} q${6 * s} ${-16 * s} ${20 * s} ${-16 * s} q${-12 * s} ${4 * s} ${-20 * s} ${16 * s}z`;

export const MOTIFS: Record<MotifId, Motif> = {
  mountains: { box: [22, 36, 106, 76], shapes: [
    ink("M28 108 L60 58 L76 80 L98 48 L124 108 Z"), ink(sun(112, 46, 8)), ink("M22 107 h106 v3 h-106Z"),
    cut("M60 58 L52 72 L58 69 L63 75 L68 70 L72 73 L76 80 L66 68Z"), cut("M98 48 L90 64 L96 61 L101 67 L107 62 L111 66 L104 56Z")] },
  lighthouse: { box: [30, 34, 92, 78], shapes: [
    ink("M62 108 L66 62 H84 L88 108 Z"), ink("M64 52 h22 v10 h-22Z"), ink("M62 52 L75 40 L88 52 Z"), ink("M73 34 h4 v6 h-4Z"),
    ink("M30 106 q8 -8 16 0 t16 0 V110 H30Z M88 106 q8 -8 16 0 t16 0 V110 H88Z"), ink("M28 108 h94 v3 h-94Z"),
    ink("M60 46 L38 40 M60 50 L36 52 M90 46 L112 40 M90 50 L114 52", 1.6),
    cut("M64 72 h22 v5 h-22Z M63 86 h24 v5 h-24Z M68 55 h14 v5 h-14Z")] },
  mosque: { box: [26, 54, 98, 58], shapes: [
    ink("M52 108 V88 Q52 62 75 62 Q98 62 98 88 V108 Z"), ink("M36 108 V92 Q36 78 52 80 V108Z M114 108 V92 Q114 78 98 80 V108Z"),
    ink("M28 64 h5 v44 h-5Z M26 64 L30.5 54 L35 64Z M117 64 h5 v44 h-5Z M115 64 L119.5 54 L124 64Z"), ink("M74 52 h2 v10 h-2Z"), ink("M26 108 h98 v3 h-98Z"),
    cut("M62 108 V96 a6 6 0 0 1 12 0 V108Z M76 108 V96 a6 6 0 0 1 12 0 V108Z M42 108 V99 a4 4 0 0 1 8 0 V108Z M100 108 V99 a4 4 0 0 1 8 0 V108Z"),
    cut("M70 72 h3 v7 h-3Z M77 72 h3 v7 h-3Z")] },
  pagoda: { box: [30, 36, 90, 76], shapes: [
    ink("M50 108 L56 94 H94 L100 108Z M56 94 L60 80 H90 L94 94Z M60 80 L64 68 H86 L90 80Z M64 68 L67 57 H83 L86 68Z M67 57 L70 48 H80 L83 57Z"),
    ink("M73.5 36 h3 v12 h-3Z"), ink(sun(112, 52, 8)), ink("M30 108 h90 v3 h-90Z"), ink("M34 108 L38 84 L42 108Z"),
    cut("M50 94 h50 v1.8 h-50Z M56 80 h38 v1.8 h-38Z M60 68 h30 v1.8 h-30Z M64 57 h22 v1.8 h-22Z")] },
  taj: { box: [28, 41, 94, 69], shapes: [
    ink("M62 106 V84 Q62 54 75 54 Q88 54 88 84 V106Z"), ink("M74 42 h2 v12 h-2Z"), ink(sun(75, 41, 2.5)),
    ink("M50 86 h12 v20 h-12Z M50 86 q6 -12 12 0Z M88 86 h12 v20 h-12Z M88 86 q6 -12 12 0Z"),
    ink("M32 62 h5 v44 h-5Z M30 62 q4.5 -10 9 0Z M113 62 h5 v44 h-5Z M111 62 q4.5 -10 9 0Z"), ink("M28 106 h94 v4 h-94Z"),
    cut("M69 106 V92 a6 6 0 0 1 12 0 V106Z")] },
  hawamahal: { box: [38, 40, 74, 71], shapes: [
    ink("M38 84 h74 v24 h-74Z M46 66 h58 v20 h-58Z M56 48 h38 v20 h-38Z"),
    ink("M60 48 q3 -8 6 0Z M70 48 q5 -10 10 0Z M84 48 q3 -8 6 0Z M50 66 q3 -8 6 0Z M94 66 q3 -8 6 0Z"), ink("M38 108 h74 v3 h-74Z"),
    cut("M62 60 v-4 a3 3 0 0 1 6 0 v4Z M72 60 v-4 a3 3 0 0 1 6 0 v4Z M82 60 v-4 a3 3 0 0 1 6 0 v4Z"),
    cut("M52 80 v-4 a3 3 0 0 1 6 0 v4Z M62 80 v-4 a3 3 0 0 1 6 0 v4Z M72 80 v-4 a3 3 0 0 1 6 0 v4Z M82 80 v-4 a3 3 0 0 1 6 0 v4Z M92 80 v-4 a3 3 0 0 1 6 0 v4Z"),
    cut("M44 102 v-5 a3 3 0 0 1 6 0 v5Z M56 102 v-5 a3 3 0 0 1 6 0 v5Z M68 102 v-5 a3 3 0 0 1 6 0 v5Z M80 102 v-5 a3 3 0 0 1 6 0 v5Z M92 102 v-5 a3 3 0 0 1 6 0 v5Z M104 102 v-5 a3 3 0 0 1 6 0 v5Z")] },
  skyline: { box: [22, 43, 104, 68], shapes: [
    ink("M24 76 h12 v32 h-12Z M38 64 h10 v44 h-10Z M50 52 h6 v56 h-6Z M62 52 h6 v56 h-6Z M74 52 h6 v56 h-6Z M46 50 H86 L88 54 H44 Z M88 70 h12 v38 h-12Z M102 60 h10 v48 h-10Z M114 80 h10 v28 h-10Z"),
    ink(sun(38, 50, 7)), ink("M22 108 h104 v3 h-104Z"),
    cut("M27 82 h2 v3 h-2Z M31 82 h2 v3 h-2Z M27 90 h2 v3 h-2Z M31 90 h2 v3 h-2Z M41 70 h2 v3 h-2Z M45 70 h2 v3 h-2Z M41 80 h2 v3 h-2Z M45 80 h2 v3 h-2Z M91 76 h2 v3 h-2Z M95 76 h2 v3 h-2Z M105 68 h2 v3 h-2Z M108 68 h2 v3 h-2Z M105 78 h2 v3 h-2Z M108 78 h2 v3 h-2Z M117 86 h2 v3 h-2Z M120 86 h2 v3 h-2Z")] },
  coast: { box: [14, 30, 118, 76], shapes: [
    ink(sun(40, 38, 11)), ink("M14 84 q10 -7 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V104 H14 Z"), ink("M52 83 h36 l-8 -9 h-20 z"), ink("M70 74 V46 L90 72 Z"),
    ink("M114 86 Q110 70 118 52", 4), ink(frond(118, 52, 0.8)), cut(waves(94)), cut(waves(100))].map((s) => (s.kind === "cut" ? { ...s, stroke: 1.5 } : s)) },
  island: { box: [14, 30, 130, 76], shapes: [
    ink(sun(134, 38, 10)), ink("M38 92 Q80 60 122 92 Z"), ink("M14 92 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V106 H14 Z"),
    ink("M72 84 Q68 66 74 50", 3.5), ink("M98 80 Q96 70 99 62", 3), ink(frond(74, 50, 1)), ink(frond(99, 62, 0.65)), cut(waves(99, 14), 1.4)] },
  fort: { box: [20, 28, 114, 78], shapes: [
    ink("M20 100 Q46 76 78 90 T130 82 V106 H20Z"), ink(sun(124, 36, 9)), ink("M70 52 h50 v40 h-50Z"), ink("M70 52 v-7 h8 v7Z M86 52 v-7 h8 v7Z M102 52 v-7 h8 v7Z M112 52 v-7 h8 v7Z"),
    ink("M56 42 h16 v50 h-16Z"), ink("M56 42 v-7 h5 v7Z M67 42 v-7 h5 v7Z"), ink("M20 104 Q50 86 90 98 T130 92 V106 H20Z"),
    cut("M88 92 V76 a7 7 0 0 1 14 0 V92Z M62 52 h3 v10 h-3Z M76 58 h3 v9 h-3Z M108 58 h3 v9 h-3Z")] },
  temple: { box: [30, 8, 116, 98], shapes: [
    ink("M42 86 h60 v14 h-60Z M50 68 h44 v18 h-44Z M58 52 h28 v16 h-28Z"), ink("M58 52 Q72 6 86 52 Z"), ink("M70.5 8 h1.5 v14 h-1.5Z M72 8 L88 13 L72 18 Z"), ink(sun(128, 62, 17)),
    cut("M42 93 H102 M50 77 H94 M58 60 H86", 1.4), cut(sun(128, 62, 12), 1.4), cut("M128 49 V75 M115 62 H141 M119 53 L137 71 M137 53 L119 71", 1.4), ink(sun(128, 62, 4)), ink("M30 100 h92 v4 h-92Z")] },
  globe: { box: [36, 36, 78, 78], shapes: [
    ink("M39 75 a36 36 0 1 0 72 0 a36 36 0 1 0 -72 0Z", 3), ink("M59 75 a16 36 0 1 0 32 0 a16 36 0 1 0 -32 0Z", 2.5), ink("M45 75 a30 36 0 1 0 60 0 a30 36 0 1 0 -60 0Z", 2.5),
    ink("M39 75 H111 M43 56 H107 M43 94 H107", 2.5)] },
};

// Which scene a destination gets. Famous places have their own; otherwise the words in the name decide (a beach, a fort, the hills); anything else gets the globe.
const PLACES: [RegExp, MotifId][] = [
  [/istanbul|constantinople|hagia|blue mosque/, "mosque"], [/kyoto|nara|osaka|tokyo|japan|pagoda/, "pagoda"], [/agra|taj/, "taj"], [/jaipur|hawa mahal|pink city/, "hawamahal"],
  [/singapore|dubai|hong kong|new york|manhattan|shanghai|bangkok|kuala lumpur|mumbai|bombay|delhi|bengaluru|bangalore|hyderabad|chennai|kolkata|london|toronto/, "skyline"],
  [/goa|lighthouse|kovalam|gokarna|pondicherry|puducherry|varkala/, "lighthouse"],
  [/manali|kullu|shimla|himachal|kashmir|srinagar|leh\b|ladakh|spiti|munnar|ooty|darjeeling|sikkim|nainital|mussoorie|rishikesh|himalaya|alps|swiss|nepal|kathmandu|patagonia|andes/, "mountains"],
  [/andaman|lakshadweep|maldives|bali|phuket|phi phi|krabi|seychelles|mauritius|hawaii|fiji|zanzibar|island|isle/, "island"],
  [/jaisalmer|jodhpur|udaipur|bikaner|hampi|fort|palace|castle|desert|rajasthan|pushkar|ranthambore|amer|hampi/, "fort"],
  [/puri|konark|bhubaneswar|varanasi|banaras|kashi|madurai|rameswaram|tirupati|khajuraho|temple|mandir|angkor|bagan|dwarka|somnath/, "temple"],
  [/beach|coast|bay|harbou?r|sea\b|kerala|alleppey|alappuzha|kochi|cochin|amalfi|santorini|lisbon|barcelona|sydney|cape town|miami/, "coast"],
  [/hills?\b|mountain|mount\b|valley|peak|trek|glacier|volcano/, "mountains"],
];
export function motifFor(destination: string): MotifId {
  const name = destination.toLowerCase();
  return PLACES.find(([re]) => re.test(name))?.[1] ?? "globe";
}
