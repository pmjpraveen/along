import { useRef } from "react";
import Svg, { Circle, Defs, G, Line, Mask, Path, Rect, Text as SvgText } from "react-native-svg";
import { motifFor } from "../domain/motifs";
import { postageSpec } from "../domain/recap";
import { font } from "../theme/tokens";
import { Illustration } from "./Stamp";

let uids = 0;
const PAPER = "#fbf6ea";
const holes = [
  ...Array.from({ length: 12 }, (_, i) => [6 + i * 8, 0] as const), ...Array.from({ length: 12 }, (_, i) => [6 + i * 8, 120] as const),
  ...Array.from({ length: 14 }, (_, i) => [0, 6 + i * 8] as const), ...Array.from({ length: 14 }, (_, i) => [100, 6 + i * 8] as const),
];

// A postage stamp for the trip, like the ones on a postcard: a perforated edge, a coloured panel with the country's name, a picture of the place (the same
// pictures the passport stamps use) and the trip's length where the price would be. Drawn as one SVG, so it stays sharp at any size.
export function PostageStamp({ tripId, destination, start, end, width }: { tripId: string; destination: string; start: string; end: string; width: number }) {
  const uid = useRef(++uids).current;
  const p = postageSpec({ tripId, destination, start, end });
  const text = { fontFamily: font.medium, fill: PAPER, textAnchor: "middle" } as const;
  return (
    <Svg width={width * 1.08} height={width * 1.28} viewBox="-4 -4 108 128" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <Mask id={`perf${uid}`} x={-4} y={-4} width={108} height={128} maskUnits="userSpaceOnUse">
          <Rect x={-4} y={-4} width={108} height={128} fill="#fff" />
          {holes.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={3.1} fill="#000" />)}
        </Mask>
      </Defs>
      <Rect x={0} y={0} width={100} height={120} fill={PAPER} mask={`url(#perf${uid})`} />
      <Rect x={8} y={8} width={84} height={104} fill={p.color} />
      <Rect x={10.5} y={10.5} width={79} height={99} fill="none" stroke={PAPER} strokeWidth={0.8} />
      <SvgText x={50} y={24} fontSize={9} letterSpacing={1.2} {...text}>{p.country}</SvgText>
      <Line x1={22} y1={29} x2={78} y2={29} stroke={PAPER} strokeWidth={0.7} />
      <Illustration id={motifFor(destination)} x={20} y={34} w={60} h={48} ink={PAPER} mask={`postage${uid}`} />
      <Line x1={22} y1={88} x2={78} y2={88} stroke={PAPER} strokeWidth={0.7} />
      <SvgText x={24} y={103} fontSize={10} letterSpacing={0.6} textAnchor="start" fontFamily={font.medium} fill={PAPER}>{p.value}</SvgText>
    </Svg>
  );
}
