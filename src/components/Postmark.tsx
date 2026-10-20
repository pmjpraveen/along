import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { font } from "../theme/tokens";

// A postmark: a double ring with a dotted ring inside it and the town and date across the middle, and five wavy lines running off to the right that
// cancel the stamp beside it. One ink, drawn as vectors.
export function Postmark({ city, date, width, ink }: { city: string; date: string; width: number; ink: string }) {
  const t = { fontFamily: font.medium, fill: ink, textAnchor: "middle" } as const;
  return (
    <Svg width={width} height={(width * 56) / 130} viewBox="0 0 130 56" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <G fill="none" stroke={ink} strokeLinecap="round">
        {[9, 19, 29, 39, 49].map((y) => <Path key={y} d={`M44 ${y} q5 -4 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0`} strokeWidth={1.4} />)}
        <Circle cx={28} cy={28} r={26} strokeWidth={2} />
        <Circle cx={28} cy={28} r={22.5} strokeWidth={0.9} />
        <Circle cx={28} cy={28} r={18} strokeWidth={1.4} strokeDasharray="0.1 3.1" />
      </G>
      <SvgText x={28} y={26} fontSize={7} letterSpacing={0.6} {...t}>{city.length > 9 ? city.slice(0, 9) : city}</SvgText>
      <Line x1={13} y1={29.5} x2={43} y2={29.5} stroke={ink} strokeWidth={0.7} />
      <SvgText x={28} y={37.5} fontSize={6.4} letterSpacing={0.3} {...t}>{date}</SvgText>
    </Svg>
  );
}
