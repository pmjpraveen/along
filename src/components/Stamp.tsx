import { Pressable, StyleSheet } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, Mask, Path, RadialGradient, Rect, Stop, Text as SvgText, TextPath } from "react-native-svg";
import { StampKind, StampShape, stampDate } from "../domain/stampShape";
import { stampWear } from "../domain/stampWear";
import { color, font } from "../theme/tokens";

type Props = { destination: string; date: string; kind: StampKind; shape: StampShape; onPress?: () => void; ink?: string; tilt?: number; compact?: boolean };

const W = 340;
const H = 176;
const CX = W / 2;
const CY = H / 2;
const LABEL = { arrival: "ARRIVAL", departure: "DEPARTURE" } as const;

// An ink stamp in one of five shapes (rounded rectangle, oval, circle, hexagon, cut-corner rectangle), each drawn as a double outline with
// the destination, ARRIVAL or DEPARTURE, and the date. It is printed like the real thing: fine grain where the ink did not take, soft
// smudges where it faded, and a faint ghost of a double strike. The wear comes from the destination, date and kind, so a stamp always
// looks the same. Arrival carries a solid dot, departure an open ring.
export function Stamp({ destination, date, kind, shape, onPress, ink = color.forestInk, tilt, compact }: Props) {
  const wear = stampWear(`${destination}|${date}|${kind}`, W, H);
  const name = destination.toUpperCase();
  const label = LABEL[kind];
  const when = stampDate(date);

  const outline = () => {
    const outer = { stroke: ink, strokeWidth: 5, fill: "none" } as const;
    const inner = { stroke: ink, strokeWidth: 2, fill: "none" } as const;
    switch (shape) {
      case "oval": return <><Ellipse cx={CX} cy={CY} rx={152} ry={76} {...outer} /><Ellipse cx={CX} cy={CY} rx={140} ry={64} {...inner} /></>;
      case "circle": return <><Circle cx={CX} cy={CY} r={80} {...outer} /><Circle cx={CX} cy={CY} r={70} {...inner} /></>;
      case "hexagon": return <><Path d="M96 8 H244 L318 88 L244 168 H96 L22 88 Z" strokeLinejoin="round" {...outer} /><Path d="M104 20 H236 L304 88 L236 156 H104 L36 88 Z" strokeLinejoin="round" {...inner} /></>;
      case "chamfer": return <><Path d="M40 10 H300 L330 40 V136 L300 166 H40 L10 136 V40 Z" strokeLinejoin="round" {...outer} /><Path d="M46 22 H294 L318 46 V130 L294 154 H46 L22 130 V46 Z" strokeLinejoin="round" {...inner} /></>;
      default: return <><Rect x={10} y={10} width={W - 20} height={H - 20} rx={30} ry={30} {...outer} /><Rect x={20} y={20} width={W - 40} height={H - 40} rx={22} ry={22} {...inner} /></>;
    }
  };

  const mark = kind === "arrival"
    ? <Circle cx={CX} cy={shape === "circle" ? 74 : 40} r={5} fill={color.brightGreen} stroke={ink} strokeWidth={1.5} />
    : <Circle cx={CX} cy={shape === "circle" ? 74 : 40} r={5} fill="none" stroke={ink} strokeWidth={2} />;

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
          <SvgText x={CX} y={64} fontSize={12} fontFamily={font.medium} letterSpacing={4} fill={ink} textAnchor="middle">{label}</SvgText>
          <SvgText x={CX} y={104} fontSize={name.length > 14 ? 24 : 30} fontFamily={font.medium} letterSpacing={2.5} fill={ink} textAnchor="middle">{name}</SvgText>
          <SvgText x={CX} y={138} fontSize={16} fontFamily={font.medium} letterSpacing={1} fill={ink} textAnchor="middle">{when}</SvgText>
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
