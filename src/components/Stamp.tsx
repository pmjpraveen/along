import { makeImageFromView, SkImage } from "@shopify/react-native-skia";
import { useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Pressable } from "./Pressable";
import Svg, { Circle, Defs, Ellipse, G, Mask, Path, Rect, Text as SvgText } from "react-native-svg";
import { MOTIFS, motifFor } from "../domain/motifs";
import { StampKind, StampShape, stampDate } from "../domain/stampShape";
import { stampWear } from "../domain/stampWear";
import { color, font } from "../theme/tokens";
import { StampInk } from "./StampInk";

type Props = { destination: string; date: string; kind: StampKind; shape: StampShape; onPress?: () => void; ink?: string; tilt?: number; compact?: boolean; light?: boolean };

export const STAMP_W = 150;
export const STAMP_H = 170;
const LABEL = { arrival: "ARRIVED", departure: "DEPARTED" } as const;
// Where the small word at the top sits: the arch and the hexagon close in at the top, so it drops a little.
const TOP: Record<StampShape, number> = { rect: 28, chamfer: 28, arch: 38, hexagon: 38, oval: 30, circle: 30 };
// How far the last lines are lifted where the frame closes in at the bottom, so the date stays inside it.
const LIFT: Record<StampShape, number> = { rect: 0, chamfer: 0, arch: 0, hexagon: 14, oval: 8, circle: 11 };

// A passport stamp. Both stamps of a trip share a frame (a double line in one of six shapes) and an ink. An arrival is plain type: ARRIVED, a dot, the city, the country, a rule and the
// date. A departure carries a small illustration of the place (see domain/motifs) above its words: DEPARTED, the picture, "CITY · COUNTRY", a rule and the date.
// It is printed like the real thing (see StampInk): ink that spreads, uneven pressure, grain and smudges. The clean stamp is drawn as SVG first; once a picture of it has been taken the GPU
// prints it through the ink shader. `light` skips the inking: a page being turned draws many copies.
const INK_CACHE = new Map<string, SkImage>();
let uids = 0;

// A scene scaled to fit a box, painted onto a mask so its "cut" shapes (windows, snowcaps, waves) are left blank again instead of covered with paper colour.
export function Illustration({ id, x, y, w, h, ink, mask }: { id: ReturnType<typeof motifFor>; x: number; y: number; w: number; h: number; ink: string; mask: string }) {
  const m = MOTIFS[id];
  const [bx, by, bw, bh] = m.box;
  const sc = Math.min(w / bw, h / bh);
  const tx = x + (w - bw * sc) / 2 - bx * sc;
  const ty = y + (h - bh * sc) / 2 - by * sc;
  return (
    <>
      <Defs>
        <Mask id={mask} x={x} y={y} width={w} height={h} maskUnits="userSpaceOnUse">
          <G transform={`translate(${tx} ${ty}) scale(${sc})`}>
            {m.shapes.map((s, i) => {
              const c = s.kind === "ink" ? "#fff" : "#000";
              return s.stroke ? <Path key={i} d={s.d} fill="none" stroke={c} strokeWidth={s.stroke} strokeLinecap="round" /> : <Path key={i} d={s.d} fill={c} />;
            })}
          </G>
        </Mask>
      </Defs>
      <Rect x={x} y={y} width={w} height={h} fill={ink} mask={`url(#${mask})`} />
    </>
  );
}

// The double-line frame: a heavy outer line and a hairline just inside it.
function Frame({ shape, ink }: { shape: StampShape; ink: string }) {
  const outer = { fill: "none", stroke: ink, strokeWidth: 2.4, strokeLinejoin: "round" } as const;
  const inner = { fill: "none", stroke: ink, strokeWidth: 0.9, strokeLinejoin: "round" } as const;
  switch (shape) {
    case "rect": return <><Rect x={4} y={4} width={142} height={162} rx={12} {...outer} /><Rect x={9.5} y={9.5} width={131} height={151} rx={8} {...inner} /></>;
    case "chamfer": return <><Path d="M26 4 H124 L146 26 V144 L124 166 H26 L4 144 V26 Z" {...outer} /><Path d="M28 9.5 H122 L140.5 28 V142 L122 160.5 H28 L9.5 142 V28 Z" {...inner} /></>;
    case "arch": return <><Path d="M6 166 V70 a69 69 0 0 1 138 0 V166 Z" {...outer} /><Path d="M12 160 V70 a63 63 0 0 1 126 0 V160 Z" {...inner} /></>;
    case "hexagon": return <><Path d="M75 4 L144 44 V126 L75 166 L6 126 V44 Z" {...outer} /><Path d="M75 10 L138 47 V123 L75 160 L12 123 V47 Z" {...inner} /></>;
    case "oval": return <><Ellipse cx={75} cy={85} rx={72} ry={80} {...outer} /><Ellipse cx={75} cy={85} rx={66.5} ry={74.5} {...inner} /></>;
    default: return <><Circle cx={75} cy={85} r={75} {...outer} /><Circle cx={75} cy={85} r={69.5} {...inner} /></>;
  }
}

export function Stamp({ destination, date, kind, shape, onPress, ink = color.forestInk, tilt, compact, light }: Props) {
  const words$ = `${destination}|${date}|${kind}`;
  const wear = stampWear(words$, STAMP_W, STAMP_H);
  const when = stampDate(date);
  const uid = useRef(++uids).current;
  const scene = motifFor(destination);
  const [cityName, ...rest] = destination.toUpperCase().split(",").map((x) => x.trim());
  const countryName = rest.join(", ");
  const top = TOP[shape];
  const up = LIFT[shape];
  // The lettering is fattened with a thin stroke: the sample is set in heavy type, and ink that has spread reads heavier than the clean font.
  const text = { fontFamily: font.medium, fill: ink, stroke: ink, strokeWidth: 0.25, textAnchor: "middle" } as const;

  const content = (
    <G>
      <Frame shape={shape} ink={ink} />
      <SvgText x={75} y={top} fontSize={9.5} letterSpacing={1.6} {...text}>{LABEL[kind]}</SvgText>
      {kind === "arrival" ? (
        <>
          <Circle cx={75} cy={top + 22} r={4.2} fill={ink} />
          <SvgText x={75} y={98 - Math.round(up * 0.8)} fontSize={Math.min(22, Math.max(12, Math.floor(100 / (cityName.length * 0.72))))} letterSpacing={1.2} {...text}>{cityName}</SvgText>
          {countryName ? <SvgText x={75} y={115 - Math.round(up * 0.8)} fontSize={10.5} letterSpacing={3.4} {...text}>{countryName}</SvgText> : null}
          <Rect x={34} y={124 - up} width={82} height={1.6} fill={ink} />
          <SvgText x={75} y={144 - up} fontSize={12} letterSpacing={0.6} {...text}>{when}</SvgText>
        </>
      ) : (
        <>
          <Illustration id={scene} x={26} y={top + 8} w={98} h={110 - up - (top + 8)} ink={ink} mask={`m${uid}`} />
          <SvgText x={75} y={130 - up} fontSize={Math.min(13, Math.max(9, Math.floor(104 / ((cityName.length + (countryName ? countryName.length + 3 : 0)) * 0.66))))} letterSpacing={0.7} {...text}>{countryName ? `${cityName} · ${countryName}` : cityName}</SvgText>
          <Rect x={28 + up} y={136 - up} width={94 - 2 * up} height={1.6} fill={ink} />
          <SvgText x={75} y={152 - up} fontSize={11.5} letterSpacing={0.5} {...text}>{when}</SvgText>
        </>
      )}
    </G>
  );

  // The picture of the clean stamp that the ink shader prints from, taken once and kept for the next time this stamp is drawn.
  const cacheKey = `v3|${words$}|${shape}|${ink}`;
  const artRef = useRef<View>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [image, setImage] = useState<SkImage | null>(() => INK_CACHE.get(cacheKey) ?? null);
  useEffect(() => {
    const hit = INK_CACHE.get(cacheKey);
    if (hit) return setImage(hit);
    setImage(null);
    if (light || !size) return;
    let live = true;
    const id = setTimeout(async () => {
      const img = artRef.current ? await makeImageFromView(artRef).catch(() => null) : null;
      if (img) INK_CACHE.set(cacheKey, img);
      if (live && img) setImage(img);
    }, 60);
    return () => { live = false; clearTimeout(id); };
  }, [cacheKey, light, size]);
  const inked = !light && !!image && !!size;
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) });

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${destination}, ${kind} ${when}`} onPress={onPress} style={[s.wrap, compact && s.compact]}>
      <View onLayout={onLayout} style={[s.svg, { transform: [{ rotate: `${tilt ?? wear.tilt}deg` }] }]}>
        <View ref={artRef} collapsable={false} style={[StyleSheet.absoluteFill, { opacity: inked ? 0 : 1 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Svg viewBox={`0 0 ${STAMP_W} ${STAMP_H}`} width="100%" height="100%">{content}</Svg>
        </View>
        {inked && size && <StampInk image={image} w={size.w} h={size.h} ink={ink} seed={words$} />}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { minHeight: 48, alignItems: "center", paddingVertical: 12 },
  compact: { minHeight: 0, paddingVertical: 0 },
  svg: { width: "100%", aspectRatio: STAMP_W / STAMP_H },
});
