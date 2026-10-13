import { makeImageFromView, SkImage } from "@shopify/react-native-skia";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, RadialGradient, Rect, Stop, Text as SvgText } from "react-native-svg";
import { font } from "../theme/tokens";
import { LOGO_W_UNITS, LogoPaths } from "./AlongLogo";
import { FoilGrain, LeatherTexture } from "./LeatherTexture";

type Props = { w: number; h: number; base: string };

// The front of the passport: pebbled cover, stitched spine, a pressed gold frame and a gold-foil globe, the title and the along logo. Everything is one SVG, so it costs one view.
export function PassportCover({ w: width, h: height, base }: Props) {
  // Drawn on a 340-wide sheet and scaled to fit, so the same cover works at any size.
  const w = 340;
  const h = (height * 340) / width;
  const cx = w / 2 + 6;   // the face is the cover less the spine, so its middle sits a little right of the cover's middle
  const gy = h * 0.5;
  const ty = h * 0.8;       // the along logo
  const py = h * 0.17;      // the word PASSPORT, at the top of the cover
  const foil = (id: string) => (
    <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <Stop offset="0" stopColor="#f6e3a6" />
      <Stop offset="0.45" stopColor="#d3ae55" />
      <Stop offset="0.7" stopColor="#efd48a" />
      <Stop offset="1" stopColor="#b9923f" />
    </LinearGradient>
  );
  // A pressed (embossed) mark is drawn twice: a dark copy a hair down and right, then the foil on top.
  const globe = (stroke: string, dx = 0, dy = 0, sw = 1.6) => (
    <G transform={`translate(${cx + dx} ${gy + dy})`} fill="none" stroke={stroke} strokeWidth={sw}>
      <Circle r={40} />
      <Ellipse rx={16} ry={40} />
      <Ellipse rx={30} ry={40} />
      <Line x1={-40} y1={0} x2={40} y2={0} />
      <Line x1={-35} y1={-19} x2={35} y2={-19} />
      <Line x1={-35} y1={19} x2={35} y2={19} />
    </G>
  );
  const logoW = 112;
  const title = (fill: string, dx = 0, dy = 0) => (
    <>
      <SvgText x={cx + dx} y={py + dy} fontSize={20} fontFamily={font.medium} letterSpacing={5} textAnchor="middle" fill={fill}>PASSPORT</SvgText>
      <G transform={`translate(${cx - logoW / 2 + dx} ${ty + dy}) scale(${logoW / LOGO_W_UNITS})`}><LogoPaths fill={fill} /></G>
    </>
  );
  // A picture of the foil shapes alone, taken from a hidden copy, so the grain shader knows where the foil is.
  const maskRef = useRef<View>(null);
  const [mask, setMask] = useState<SkImage | null>(null);
  useEffect(() => {
    let live = true;
    const id = setTimeout(async () => {
      const img = maskRef.current ? await makeImageFromView(maskRef).catch(() => null) : null;
      if (live && img) setMask(img);
    }, 60);
    return () => { live = false; clearTimeout(id); };
  }, [width, height]);
  return (
    <View style={{ width, height }}>
    <LeatherTexture w={width} h={height} base={base} />
    <Svg width={width} height={height} viewBox={`0 0 ${w} ${h}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <RadialGradient id="worn" cx="50%" cy="44%" r="75%">
          <Stop offset="0.55" stopColor="#000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.3} />
        </RadialGradient>
        <LinearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#fff" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#fff" stopOpacity={0.07} />
          <Stop offset="1" stopColor="#fff" stopOpacity={0} />
        </LinearGradient>
        {foil("foil")}
      </Defs>
      <Rect width={w} height={h} fill="url(#sheen)" />
      <Rect width={w} height={h} fill="url(#worn)" />
      {/* the spine: a darker band with a line of stitching down it */}
      <Rect width={22} height={h} fill="#000" opacity={0.22} />
      <Rect x={22} width={1.5} height={h} fill="#000" opacity={0.25} />
      <Line x1={12} y1={16} x2={12} y2={h - 16} stroke="#e9d9a8" strokeOpacity={0.55} strokeWidth={1.6} strokeDasharray="6 5" strokeLinecap="round" />
      {/* a pressed frame: a dark line a hair below the gold one */}
      <Rect x={37} y={30} width={w - 62} height={h - 56} rx={14} fill="none" stroke="#000" strokeOpacity={0.3} strokeWidth={1.4} />
      <Rect x={36} y={29} width={w - 62} height={h - 56} rx={14} fill="none" stroke="url(#foil)" strokeOpacity={0.8} strokeWidth={1.2} />
      {globe("#000", 1, 1.6, 1.8)}
      {globe("url(#foil)")}
      {title("#000", 1, 1.6)}
      {title("url(#foil)")}
    </Svg>
    {mask && <FoilGrain w={width} h={height} mask={mask} />}
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, opacity: 0 }}>
      <View ref={maskRef} collapsable={false} style={{ width, height }}>
        <Svg width={width} height={height} viewBox={`0 0 ${w} ${h}`}>
          <Rect x={36} y={29} width={w - 62} height={h - 56} rx={14} fill="none" stroke="#000" strokeWidth={1.2} />
          {globe("#000")}
          {title("#000")}
        </Svg>
      </View>
    </View>
    </View>
  );
}
