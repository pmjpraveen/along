import { StyleSheet } from "react-native";
import { Pressable } from "./Pressable";
import Svg, { Circle, Defs, Ellipse, G, Mask, Path, RadialGradient, Rect, Stop, Text as SvgText, TextPath } from "react-native-svg";
import { StampKind, StampShape, StampStyle, stampDate, styleFor } from "../domain/stampShape";
import { stampWear } from "../domain/stampWear";
import { color, font } from "../theme/tokens";

type Props = { destination: string; date: string; kind: StampKind; shape: StampShape; onPress?: () => void; ink?: string; tilt?: number; compact?: boolean; frame?: StampStyle };

const W = 340;
const H = 176;
const CX = W / 2;
const CY = H / 2;
const LABEL = { arrival: "ARRIVAL", departure: "DEPARTURE" } as const;

// An ink stamp in one of ten shapes (rounded rectangle, oval, circle, hexagon, cut-corner rectangle, octagon, stadium, arch, ticket, triangle) and one
// of six frame styles (double line, dashed, bold, triple, filled label band, dotted), with the destination, ARRIVAL or DEPARTURE, and the date. It is printed like the real thing: fine grain where the ink did not take, soft
// smudges where it faded, and a faint ghost of a double strike. The wear comes from the destination, date and kind, so a stamp always
// looks the same. Arrival carries a solid ink dot, departure an open ring.
export function Stamp({ destination, date, kind, shape, onPress, ink = color.forestInk, tilt, compact, frame }: Props) {
  const wear = stampWear(`${destination}|${date}|${kind}`, W, H);
  const name = destination.toUpperCase();
  const label = LABEL[kind];
  const when = stampDate(date);

  // One ring of the frame, pulled in by `d` drawing units. The five original shapes are drawn directly; the others are paths that are
  // scaled in about the centre, which keeps their rings evenly spaced.
  const PATH: Partial<Record<StampShape, string>> = {
    hexagon: "M96 8 H244 L318 88 L244 168 H96 L22 88 Z",
    chamfer: "M40 10 H300 L330 40 V136 L300 166 H40 L10 136 V40 Z",
    octagon: "M84 8 H256 L332 52 V124 L256 168 H84 L8 124 V52 Z",
    arch: "M24 168 V86 Q24 8 170 8 Q316 8 316 86 V168 Z",
    ticket: "M12 12 H328 V77 A11 11 0 0 0 328 99 V164 H12 V99 A11 11 0 0 0 12 77 Z",
    triangle: "M170 9 L328 166 H12 Z",
  };
  type Line = { strokeWidth: number; strokeDasharray?: string; strokeLinecap?: "round" };
  const ring = (d: number, line: Line) => {
    const p = { stroke: ink, fill: "none", ...line } as const;
    switch (shape) {
      case "oval": return <Ellipse cx={CX} cy={CY} rx={152 - d} ry={76 - d} {...p} />;
      case "circle": return <Circle cx={CX} cy={CY} r={80 - d * 0.85} {...p} />;
      case "stadium": return <Rect x={10 + d} y={12 + d} width={W - 20 - 2 * d} height={H - 24 - 2 * d} rx={76 - d} ry={76 - d} {...p} />;
      case "rect": return <Rect x={10 + d} y={10 + d} width={W - 20 - 2 * d} height={H - 20 - 2 * d} rx={Math.max(30 - d, 6)} ry={Math.max(30 - d, 6)} {...p} />;
      default: {
        const sx = (CX - d) / CX;
        const sy = (CY - d) / CY;
        return <G transform={`translate(${CX} ${CY}) scale(${sx} ${sy}) translate(${-CX} ${-CY})`}><Path d={PATH[shape]} strokeLinejoin="round" {...p} /></G>;
      }
    }
  };
  const look = frame ?? styleFor(`${destination}|${date}|${kind}`, shape);   // `frame` forces a style (previews and tests)
  const outline = () => {
    switch (look) {
      case "dashed": return <>{ring(0, { strokeWidth: 4, strokeDasharray: "18 9" })}{ring(13, { strokeWidth: 1.5 })}</>;
      case "bold": return <>{ring(0, { strokeWidth: 9 })}{ring(15, { strokeWidth: 1.5 })}</>;
      case "triple": return <>{ring(0, { strokeWidth: 3 })}{ring(8, { strokeWidth: 2 })}{ring(16, { strokeWidth: 1.5 })}</>;
      case "dotted": return <>{ring(0, { strokeWidth: 5 })}{ring(13, { strokeWidth: 3, strokeDasharray: "0.1 8", strokeLinecap: "round" })}</>;
      case "beaded": return <>{ring(0, { strokeWidth: 7, strokeDasharray: "0.1 11", strokeLinecap: "round" })}{ring(12, { strokeWidth: 2 })}</>;
      case "dashdot": return <>{ring(0, { strokeWidth: 4, strokeDasharray: "22 6 3 6" })}{ring(12, { strokeWidth: 1.5 })}</>;
      case "stencil": return <>{ring(0, { strokeWidth: 6, strokeDasharray: "46 14" })}{ring(13, { strokeWidth: 2, strokeDasharray: "46 14" })}</>;
      // A second, fainter strike a few units off, as if the stamp had slipped: the real thing most often happens at a busy border desk.
      case "offset": return <>{ring(0, { strokeWidth: 5 })}<G x={5} y={4} opacity={0.35}>{ring(0, { strokeWidth: 4 })}</G>{ring(12, { strokeWidth: 2 })}</>;
      default: return <>{ring(0, { strokeWidth: 5 })}{ring(12, { strokeWidth: 2 })}</>;   // solid and banner
    }
  };

  // Where the words sit. A triangle is narrow at the top, so everything moves down and the name is set smaller to fit its width.
  const tri = shape === "triangle";
  const markY = shape === "circle" ? 74 : tri ? 54 : 40;
  const labelY = tri ? 86 : 64;
  const nameY = tri ? 116 : 104;
  const nameSize = tri ? (name.length > 9 ? 17 : 22) : name.length > 14 ? 24 : 30;
  const dateY = tri ? 143 : 138;
  const dateSize = tri ? 13 : 16;
  const mark = kind === "arrival"
    ? <Circle cx={CX} cy={markY} r={5} fill={ink} stroke={ink} strokeWidth={1.5} />
    : <Circle cx={CX} cy={markY} r={5} fill="none" stroke={ink} strokeWidth={2} />;

  // A circle sets its words on the curve: the label and destination over the top, the date under it. Every other shape reads straight.
  const words = (dx = 0) => (
    <G x={dx}>
      {outline()}
      {shape === "circle" ? (
        <>
          <Defs>
            <Path id="arcTop" d={`M ${CX - 56} ${CY + 6} A 56 56 0 0 1 ${CX + 56} ${CY + 6}`} />
            <Path id="arcBottom" d={`M ${CX - 60} ${CY + 10} A 60 60 0 0 0 ${CX + 60} ${CY + 10}`} />
          </Defs>
          <SvgText fontSize={13} fontFamily={font.medium} letterSpacing={2.5} fill={ink} textAnchor="middle"><TextPath href="#arcTop" startOffset="50%">{name.length > 12 ? name.slice(0, 12) : name}</TextPath></SvgText>
          <SvgText fontSize={11} fontFamily={font.medium} letterSpacing={3} fill={ink} textAnchor="middle"><TextPath href="#arcBottom" startOffset="50%">{label}</TextPath></SvgText>
          {mark}
          <SvgText x={CX} y={CY + 22} fontSize={13} fontFamily={font.medium} fill={ink} textAnchor="middle">{when}</SvgText>
        </>
      ) : (
        <>
          {mark}
          {look === "banner" && <Rect x={CX - (tri ? 64 : 78)} y={labelY - 15} width={tri ? 128 : 156} height={22} rx={11} ry={11} fill={ink} />}
          <SvgText x={CX} y={labelY} fontSize={tri ? 11 : 12} fontFamily={font.medium} letterSpacing={tri ? 3 : 4} fill={look === "banner" ? color.paper : ink} textAnchor="middle">{label}</SvgText>
          <SvgText x={CX} y={nameY} fontSize={nameSize} fontFamily={font.medium} letterSpacing={tri ? 1.5 : 2.5} fill={ink} textAnchor="middle">{name}</SvgText>
          <SvgText x={CX} y={dateY} fontSize={dateSize} fontFamily={font.medium} letterSpacing={1} fill={ink} textAnchor="middle">{when}</SvgText>
        </>
      )}
    </G>
  );

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${destination}, ${kind} ${when}`} onPress={onPress} style={[s.wrap, compact && s.compact]}>
      <Svg viewBox={`0 0 ${W} ${H}`} style={[s.svg, { transform: [{ rotate: `${tilt ?? wear.tilt}deg` }] }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Defs>
          <RadialGradient id="smudge">
            <Stop offset="0" stopColor="#000" stopOpacity={1} />
            <Stop offset="1" stopColor="#000" stopOpacity={0} />
          </RadialGradient>
          {/* White shows the ink; black hides it. Grain is small black dots, smudges are soft black patches. */}
          <Mask id="wear" x={0} y={0} width={W} height={H}>
            <Rect x={0} y={0} width={W} height={H} fill="#fff" />
            {wear.grain.map((g, i) => <Circle key={`g${i}`} cx={g.x} cy={g.y} r={g.r} fill="#000" />)}
            {wear.smudges.map((m, i) => (
              <Ellipse key={`s${i}`} cx={m.x} cy={m.y} rx={m.rx} ry={m.ry} fill="url(#smudge)" opacity={m.strength} rotation={m.angle} origin={`${m.x}, ${m.y}`} />
            ))}
          </Mask>
        </Defs>
        <G opacity={0.1}>{words(1.8)}</G>
        <G mask="url(#wear)" opacity={0.92}>{words()}</G>
      </Svg>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { minHeight: 48, alignItems: "center", paddingVertical: 12 },
  compact: { minHeight: 0, paddingVertical: 0 },
  svg: { width: "100%", aspectRatio: W / H },
});
