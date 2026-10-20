import { ReactNode, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { SensorType, useAnimatedSensor, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { clampTilt, RecapCard as Card, recapInk, TripFacts, postageSpec } from "../domain/recap";
import { formatMinor } from "../domain/money";
import { EASE_OUT, motion } from "../theme/motion";
import { color, font, mix, handwritingFont, postcardArt } from "../theme/tokens";
import { LOGO_RATIO, LogoPaths } from "./AlongLogo";
import { Avatar, AvatarGroup } from "./Avatar";
import { CardTexture } from "./CardTexture";
import { PostageStamp } from "./PostageStamp";
import { Postmark } from "./Postmark";
import { Stamp } from "./Stamp";
import { shapeFor } from "../domain/stampShape";
import Svg from "react-native-svg";

export const CARD_RATIO = 7 / 5;
const BASE = 360;   // every size below is for a 360-wide card and scales with the width
const EDGE = 11;    // the airmail border's thickness
const INK = "#222222";

// The effects of tilting, as styles for the layers they move. Absent for the flat copy that is photographed for sharing.
type Anim = React.ComponentProps<typeof Animated.View>["style"];
export type Fx = { stamps: Anim; sheen: Anim };

// One side of the recap, a travel postcard: a red and blue airmail border round cream paper (tinted with the trip's colour), "POST CARD" across the top, a
// postmark, and handwriting. The front is the one to post: a postage stamp, a greeting from the town, the trip's highlights and the group's avatars. The back has
// the total spent and each person's share, on ruled lines. Everything is fixed-size (not Dynamic Type), because it is a picture that gets shared; the screen
// around it carries the text for screen readers.
export function RecapCardFace({ card, facts, side, cur, bg, width, tripId, destination, start, end, people, members, fx }: {
  card: Card; facts: TripFacts; side: "front" | "back"; cur: { code: string; exponent: number }; bg: string; width: number; tripId: string; destination: string; start: string; end: string;
  people: Map<string, string | null>; members: { name: string; uri: string | null; guest: boolean }[]; fx?: Fx;
}) {
  const u = (n: number) => (n * width) / BASE;
  const money = (n: number) => formatMinor(n, cur.exponent, cur.code);
  const paper = mix(bg, postcardArt.cream, 0.6);
  const rule = "rgba(34,34,34,0.22)";
  const post = postageSpec({ tripId, destination, start, end });
  const place = destination.split(",")[0].trim();
  const h = width * CARD_RATIO;
  return (
    <View style={[s.card, { width, height: h, borderRadius: u(16), backgroundColor: paper }]}>
      {/* The airmail border: slanted red and blue bands on cream, with the paper laid over the middle so only the ring is left. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: u(16), overflow: "hidden", backgroundColor: postcardArt.cream }]}>
        <View style={{ position: "absolute", width: u(720), height: u(720), left: (width - u(720)) / 2, top: (h - u(720)) / 2, flexDirection: "row", transform: [{ rotate: "45deg" }] }}>
          {Array.from({ length: 60 }, (_, i) => <View key={i} style={{ flex: 1, backgroundColor: i % 4 === 0 ? postcardArt.red : i % 4 === 2 ? postcardArt.blue : postcardArt.cream }} />)}
        </View>
      </View>
      <View pointerEvents="none" style={{ position: "absolute", top: u(EDGE), left: u(EDGE), right: u(EDGE), bottom: u(EDGE), borderRadius: u(6), backgroundColor: paper }} />

      <View style={{ position: "absolute", top: u(30), left: u(30) }}>
        <Text allowFontScaling={false} style={[s.head, { fontSize: u(24), lineHeight: u(26), letterSpacing: u(3.2) }]}>POST CARD</Text>
        <Text allowFontScaling={false} style={[s.sub, { fontSize: u(8.5), letterSpacing: u(1.6), marginTop: u(3) }]}>{side === "front" ? "A LITTLE TRIP NOTE" : "THE SPLIT"}</Text>
      </View>

      {side === "front" ? (
        <>
          <View pointerEvents="none" style={{ position: "absolute", top: u(24), left: u(238), transform: [{ rotate: "4deg" }], shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } }}>
            <PostageStamp tripId={tripId} destination={destination} start={start} end={end} width={u(90)} />
          </View>
          <View pointerEvents="none" style={{ position: "absolute", top: u(92), left: u(200), opacity: 0.62 }}>
            <Postmark city={post.city} date={post.postmark} width={u(118)} ink={INK} />
          </View>
          <View style={{ position: "absolute", top: u(132), left: u(30), right: u(30) }}>
            <Text allowFontScaling={false} numberOfLines={1} style={[s.hand, { fontSize: u(30), lineHeight: u(34) }]}>Greetings from</Text>
            <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={[s.hand, { fontSize: u(52), lineHeight: u(54) }]}>{place}!</Text>
            <Text allowFontScaling={false} numberOfLines={1} style={[s.sub, { fontSize: u(10), letterSpacing: u(1.1), marginTop: u(2) }]}>{card.title.toUpperCase()} · {card.range.toUpperCase()}</Text>
          </View>
          <View style={{ position: "absolute", top: u(252), left: u(30), right: u(30) }}>
            <Text allowFontScaling={false} style={[s.sub, { fontSize: u(10), letterSpacing: u(1.4) }]}>THIS WAS</Text>
            <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[s.head, { fontSize: u(22), lineHeight: u(26) }]}>{facts.tagline}</Text>
            <Text allowFontScaling={false} style={[s.body, { fontSize: u(12), marginTop: u(4) }]}>
              {facts.days} {facts.days === 1 ? "day" : "days"} · {facts.people} {facts.people === 1 ? "person" : "people"} · {facts.activities} {facts.activities === 1 ? "activity" : "activities"}
            </Text>
          </View>
          <View style={{ position: "absolute", top: u(316), left: u(30), right: u(30) }}>
            {facts.facts.map((f) => (
              <View key={f.label} style={[s.line, { height: u(27), borderColor: rule }]}>
                <Text allowFontScaling={false} numberOfLines={1} style={[s.sub, { fontSize: u(11), flex: 1 }]}>{f.label}{f.note ? ` · ${f.note}` : ""}</Text>
                <Text allowFontScaling={false} numberOfLines={1} style={[s.value, { fontSize: u(f.value.length > 12 ? 14 : 18), lineHeight: u(22), maxWidth: "45%" }]}>{f.value}</Text>
              </View>
            ))}
            {facts.facts.length === 0 && <Text allowFontScaling={false} style={[s.body, { fontSize: u(12) }]}>Add photos and favourite places in Memories and they show up here.</Text>}
            <View style={{ flexDirection: "row", marginTop: u(18) }}><AvatarGroup people={members} size={48} max={5} /></View>
          </View>
        </>
      ) : (
        <>
          <View pointerEvents="none" style={{ position: "absolute", top: u(24), left: u(206), opacity: 0.62 }}>
            <Postmark city={post.city} date={post.postmark} width={u(118)} ink={INK} />
          </View>
          <View style={{ position: "absolute", top: u(110), left: u(30), right: u(30) }}>
            <Text allowFontScaling={false} style={[s.sub, { fontSize: u(10), letterSpacing: u(1.4) }]}>{card.soFar ? "SPENT SO FAR" : "TOTAL SPENT"}</Text>
            <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={[s.value, { fontSize: u(46), lineHeight: u(54) }]}>{money(card.totalMinor)}</Text>
            <Text allowFontScaling={false} numberOfLines={1} style={[s.hand, { fontSize: u(32), lineHeight: u(36), marginTop: u(2) }]}>{card.title}</Text>
          </View>
          <View style={{ position: "absolute", top: u(214), left: u(30), right: u(30) }}>
            {card.people.length === 0 ? (
              <Text allowFontScaling={false} style={[s.body, { fontSize: u(14) }]}>{card.headcount} {card.headcount === 1 ? "person" : "people"} on this trip</Text>
            ) : card.people.map((p) => (
              <View key={p.id} style={[s.line, { height: u(40), gap: u(10), borderColor: rule }]}>
                <Avatar name={p.name} uri={people.get(p.id) ?? null} guest={p.guest} size={32} />
                <Text allowFontScaling={false} numberOfLines={1} style={[s.value, { flex: 1, fontSize: u(15) }]}>{p.name}</Text>
                <Text allowFontScaling={false} style={[s.value, { fontSize: u(15) }]}>{money(p.shareMinor)}</Text>
              </View>
            ))}
            {card.overflow > 0 && <Text allowFontScaling={false} style={[s.sub, { fontSize: u(12), marginTop: u(6), marginLeft: u(42) }]}>+{card.overflow} others</Text>}
          </View>
        </>
      )}

      <View style={{ position: "absolute", left: u(30), bottom: u(26), flexDirection: "row", alignItems: "center", gap: u(5) }}>
        <Text allowFontScaling={false} style={[s.sub, { fontSize: u(10) }]}>Made with</Text>
        <Svg width={u(30)} height={u(30) * LOGO_RATIO} viewBox="0 0 404 156"><LogoPaths fill={color.brandBlack} /></Svg>
      </View>
      <View style={{ position: "absolute", right: u(30), bottom: u(26), borderWidth: u(1.5), borderColor: postcardArt.blue, paddingHorizontal: u(7), paddingVertical: u(2), backgroundColor: postcardArt.cream }}>
        <Text allowFontScaling={false} style={[s.head, { fontSize: u(11), lineHeight: u(14), letterSpacing: u(1.6), color: postcardArt.blue }]}>AIR MAIL</Text>
      </View>

      {/* The departure stamp, pressed lightly off the bottom right corner (cut by the edge of the card), on top of the AIR MAIL label. */}
      {card.stamps && side === "front" && (
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: "absolute", top: u(352), left: u(238), width: u(150), opacity: 0.42 }}>
          <Stamp compact destination={place} date={end} kind="departure" shape={shapeFor(tripId, "departure")} ink={recapInk(tripId)} tilt={-6} />
        </View>
      )}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: u(16), overflow: "hidden" }]}><CardTexture width={width} height={h} /></View>
      {fx && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: u(16), overflow: "hidden" }]}>
          <Animated.View style={[{ position: "absolute", top: -u(60), bottom: -u(60), left: 0, width: u(70) }, fx.sheen]}>
            <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.16)" }} />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// Leans the card with the phone (±12°, from wherever the phone was held when the screen opened) and slides a glint across it. Only transform and opacity,
// on the UI thread; it stops with the screen. Where there is no sensor the card simply stays flat.
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
  return <Animated.View style={card}>{children({ stamps, sheen })}</Animated.View>;
}

// The two sides of the card, one on top of the other: tapping turns the card over (rotateY, 400 ms). With Reduce Motion the sides crossfade instead.
export function FlipCard({ side, front, back, width, reduced }: { side: "front" | "back"; front: ReactNode; back: ReactNode; width: number; reduced: boolean }) {
  const p = useSharedValue(side === "back" ? 1 : 0);
  useEffect(() => { p.value = withTiming(side === "back" ? 1 : 0, { duration: reduced ? motion.fadeMs : motion.flipMs, easing: EASE_OUT }); }, [side, reduced, p]);
  // At rest a side carries no transform at all (a leftover rotateY(360deg) or perspective makes iOS draw the layer as a bitmap, which blurs the text); only
  // while turning does it rotate. The side that is turned away is hidden by opacity as well as backfaceVisibility.
  const f = useAnimatedStyle(() => {
    if (reduced) return { opacity: 1 - p.value };
    if (p.value === 0 || p.value === 1) return { opacity: 1 - p.value, transform: [] };
    return { opacity: 1, transform: [{ perspective: 1000 }, { rotateY: `${p.value * 180}deg` }] };
  });
  const b = useAnimatedStyle(() => {
    if (reduced) return { opacity: p.value };
    if (p.value === 0 || p.value === 1) return { opacity: p.value, transform: [] };
    return { opacity: 1, transform: [{ perspective: 1000 }, { rotateY: `${180 + p.value * 180}deg` }] };
  });
  const hide = { position: "absolute" as const, top: 0, left: 0, width, height: width * CARD_RATIO, backfaceVisibility: "hidden" as const };
  return (
    <View style={{ width, height: width * CARD_RATIO }}>
      <Animated.View pointerEvents="none" style={[hide, f]}>{front}</Animated.View>
      <Animated.View pointerEvents="none" style={[hide, b]}>{back}</Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  head: { fontFamily: font.medium, color: postcardArt.red },
  sub: { fontFamily: font.regular, color: color.charcoal },
  body: { fontFamily: font.regular, color: INK },
  value: { fontFamily: font.medium, color: color.brandBlack, fontVariant: ["tabular-nums"] },
  // The handwriting font's letters lean past their own box, so the text gets room on both sides and above and below or the first and last letters are cut off.
  hand: { fontFamily: handwritingFont, color: INK, paddingHorizontal: 10, marginHorizontal: -10 },
  line: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1 },
});
