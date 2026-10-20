import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { SensorType, useAnimatedSensor, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring } from "react-native-reanimated";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { clampTilt, RecapCard as Card, recapInks, STAMP_SIZE, stampPlacement, Suit } from "../domain/recap";
import { formatMinor } from "../domain/money";
import { shapeFor } from "../domain/stampShape";
import { motion } from "../theme/motion";
import { color, font, mix, splashStripes } from "../theme/tokens";
import { LOGO_RATIO, LogoPaths } from "./AlongLogo";
import { Avatar } from "./Avatar";
import { CardTexture } from "./CardTexture";
import { Stamp } from "./Stamp";

export const CARD_RATIO = 7 / 5;
const BASE = 360;   // every size below is for a 360-wide card and scales with the width

// The effects of tilting, as styles for the layers they move. Absent for the flat copy that is photographed for sharing.
type Anim = React.ComponentProps<typeof Animated.View>["style"];
export type Fx = { stamps: Anim; sheen: Anim; holo: Anim };

function SuitMark({ suit, size }: { suit: Suit; size: number }) {
  const p = { stroke: color.brandBlack, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {suit === "compass" && <><Circle cx={12} cy={12} r={9} {...p} /><Path d="M12 5.5 15.5 12 12 18.5 8.5 12Z" fill={color.brandBlack} {...p} /></>}
      {suit === "sun" && <><Circle cx={12} cy={12} r={4} fill={color.brandBlack} {...p} />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const r = (a * Math.PI) / 180;
        return <Line key={a} x1={12 + 7 * Math.sin(r)} y1={12 - 7 * Math.cos(r)} x2={12 + 10.5 * Math.sin(r)} y2={12 - 10.5 * Math.cos(r)} {...p} />;
      })}</>}
      {suit === "wave" && <><Path d="M2 9c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1" {...p} /><Path d="M2 16c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1" {...p} /></>}
      {suit === "peak" && <Path d="M2 19 9 6l4.5 7 2.5-4 6 10Z" fill={color.brandBlack} {...p} />}
    </Svg>
  );
}

// The recap as a playing card: rank and suit in two corners (the second upside down), the trip's name, the total, the stamps and who paid how much.
// Everything is fixed-size (not Dynamic Type), because it is a picture that gets shared; the screen around it carries the text for screen readers.
export function RecapCardFace({ card, cur, bg, width, tripId, destination, start, end, people, fx }: {
  card: Card; cur: { code: string; exponent: number }; bg: string; width: number; tripId: string; destination: string; start: string; end: string;
  people: Map<string, string | null>; fx?: Fx;
}) {
  const u = (n: number) => (n * width) / BASE;
  const money = (n: number) => formatMinor(n, cur.exponent, cur.code);
  const ink = mix(bg, "#000000", 0.55);
  const corner = (flip: boolean) => (
    <View style={[s.corner, { top: u(18), left: u(18), width: u(34) }, flip && { top: undefined, left: undefined, bottom: u(18), right: u(18), transform: [{ rotate: "180deg" }] }]}>
      <Text allowFontScaling={false} style={[s.rank, { fontSize: u(card.rank.length > 1 ? 24 : 30), lineHeight: u(32) }]}>{card.rank}</Text>
      <SuitMark suit={card.suit} size={u(22)} />
    </View>
  );
  return (
    <View style={[s.card, { width, height: width * CARD_RATIO, borderRadius: u(22), backgroundColor: bg }]}>
      {/* The border is a holographic sticker edge: slanted bands of rainbow colour, with the card's own colour laid over the middle so only a ring is left.
          Tilting the phone slides the bands, so the colours shift like foil. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: u(22), overflow: "hidden" }]}>
        <Animated.View style={[{ position: "absolute", top: -u(80), bottom: -u(80), left: -u(200), width: width + u(400), flexDirection: "row", transform: [{ rotate: "22deg" }] }, fx?.holo]}>
          {[...splashStripes, ...splashStripes].map((c, i) => <View key={i} style={{ flex: 1, backgroundColor: mix(c, "#ffffff", 0.3) }} />)}
        </Animated.View>
      </View>
      <View pointerEvents="none" style={[s.inset, { inset: u(7), borderRadius: u(16), backgroundColor: bg }]} />
      {corner(false)}
      {corner(true)}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: u(22), overflow: "hidden" }]}><CardTexture width={width} height={width * CARD_RATIO} /></View>
      {/* The stamps are pressed faintly onto the card, behind the writing, in a different place for every trip. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0.5 }, fx?.stamps]}>
        {card.stamps ? stampPlacement(tripId).map((p) => (
          <View key={p.kind} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: "absolute", left: u(p.x), top: u(p.y), width: u(STAMP_SIZE) }}>
            <Stamp compact destination={card.destination.split(",")[0].trim()} date={p.kind === "arrival" ? start : end} kind={p.kind} shape={shapeFor(tripId, p.kind)} ink={recapInks(tripId)[p.kind]} tilt={p.tilt} />
          </View>
        )) : null}
      </Animated.View>
      <View style={{ position: "absolute", top: u(20), left: u(62), right: u(22) }}>
        <Text allowFontScaling={false} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6} style={[s.name, { fontSize: u(28), lineHeight: u(30) }]}>{card.title}</Text>
        <Text allowFontScaling={false} numberOfLines={1} style={[s.sub, { fontSize: u(12), marginTop: u(4) }]}>{card.destination} · {card.range}</Text>
      </View>
      <View style={{ position: "absolute", top: u(100), left: u(30), right: u(30) }}>
        <Text allowFontScaling={false} style={[s.label, { fontSize: u(12) }]}>{card.soFar ? "Spent so far" : "Total spent"}</Text>
        <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={[s.total, { fontSize: u(44), lineHeight: u(50) }]}>{money(card.totalMinor)}</Text>
      </View>
      <View style={{ position: "absolute", top: u(294), left: u(30), right: u(30), gap: u(2) }}>
        {card.people.length === 0 ? (
          <Text allowFontScaling={false} style={[s.person, { fontSize: u(14) }]}>{card.headcount} {card.headcount === 1 ? "person" : "people"}</Text>
        ) : card.people.map((p) => (
          <View key={p.id} style={[s.row, { height: u(24), gap: u(8) }]}>
            <Avatar name={p.name} uri={people.get(p.id) ?? null} guest={p.guest} size={24} />
            <Text allowFontScaling={false} numberOfLines={1} style={[s.person, { flex: 1, fontSize: u(13) }]}>{p.name}</Text>
            <Text allowFontScaling={false} style={[s.person, s.amount, { fontSize: u(13) }]}>{money(p.shareMinor)}</Text>
          </View>
        ))}
        {card.overflow > 0 && <Text allowFontScaling={false} style={[s.sub, { fontSize: u(12), marginLeft: u(32) }]}>+{card.overflow} others</Text>}
      </View>
      <View style={{ position: "absolute", left: u(24), bottom: u(24), flexDirection: "row", alignItems: "center", gap: u(5) }}>
        <Text allowFontScaling={false} style={[s.sub, { fontSize: u(10), color: ink }]}>Made with</Text>
        <Svg width={u(30)} height={u(30) * LOGO_RATIO} viewBox="0 0 404 156"><LogoPaths fill={color.brandBlack} /></Svg>
      </View>
      {fx && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: u(22), overflow: "hidden" }]}>
          <Animated.View style={[{ position: "absolute", top: -u(60), bottom: -u(60), left: 0, width: u(70) }, fx.sheen]}>
            <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.16)" }} />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// Leans the card with the phone (±12°, from wherever the phone was held when the screen opened), moves the stamps a little the other way for depth and slides
// a glint across. Only transform and opacity, on the UI thread; it stops with the screen. Where there is no sensor the card simply stays flat.
export function TiltCard({ width, children }: { width: number; children: (fx: Fx) => ReactNode }) {
  const sensor = useAnimatedSensor(SensorType.ROTATION, { interval: 16 });
  const from = useSharedValue([0, 0, 0]);   // pitch and roll when the first reading came in, and whether it has
  const target = useDerivedValue(() => {
    const { pitch, roll, yaw } = sensor.sensor.value;
    if (from.value[2] === 0 && (pitch !== 0 || roll !== 0 || yaw !== 0)) from.value = [pitch, roll, 1];
    return [clampTilt(pitch, from.value[0]) * from.value[2], clampTilt(roll, from.value[1]) * from.value[2]];
  });
  const rx = useDerivedValue(() => withSpring(target.value[0], motion.settle));
  const ry = useDerivedValue(() => withSpring(target.value[1], motion.settle));
  const card = useAnimatedStyle(() => ({ transform: [{ perspective: 900 }, { rotateX: `${-rx.value}deg` }, { rotateY: `${ry.value}deg` }] }));
  const stamps = useAnimatedStyle(() => ({ transform: [{ translateX: (-ry.value / 12) * 6 }, { translateY: (rx.value / 12) * 6 }] }));
  const sheen = useAnimatedStyle(() => ({ transform: [{ translateX: (ry.value / 12) * width * 0.6 + width * 0.25 }, { rotate: "22deg" }] }));
  const holo = useAnimatedStyle(() => ({ transform: [{ translateX: (ry.value / 12) * width * 0.3 }, { rotate: "22deg" }] }));
  return <Animated.View style={card}>{children({ stamps, sheen, holo })}</Animated.View>;
}

const s = StyleSheet.create({
  card: { overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  inset: { position: "absolute", borderWidth: 1, borderColor: "rgba(34,34,34,0.5)" },
  corner: { position: "absolute", alignItems: "center" },
  rank: { fontFamily: font.medium, color: color.brandBlack, fontVariant: ["tabular-nums"] },
  name: { fontFamily: font.medium, color: color.brandBlack },
  sub: { fontFamily: font.regular, color: color.charcoal },
  label: { fontFamily: font.medium, color: color.charcoal },
  total: { fontFamily: font.medium, color: color.brandBlack, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", alignItems: "center" },
  person: { fontFamily: font.medium, color: color.brandBlack },
  amount: { fontVariant: ["tabular-nums"] },
});
