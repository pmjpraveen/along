import { makeImageFromView, SkImage } from "@shopify/react-native-skia";
import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { PASSPORTS } from "../domain/countries";
import { Half, bookHalves, lastSpread } from "../domain/passportBook";
import { placement } from "../domain/passportPage";
import type { Impression } from "../domain/stampShape";
import { haptic } from "../haptics";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { EASE_IN_OUT, motion } from "../theme/motion";
import { color, passportArt, radius, space, type } from "../theme/tokens";
import { PageCurl } from "./PageCurl";
import { PassportCover } from "./PassportCover";
import { Holder, PassportDetails } from "./PassportDetails";
import { Pressable } from "./Pressable";
import { Stamp } from "./Stamp";

const STAMP_ASPECT = 340 / 176;
const EDGE = radius.card;
const SPINE_TILT = 5;   // degrees each page of the open book leans in toward the spine, so the book is a little narrower at the fold (a shallow "V") as in a real open book
const TILT = 9;   // degrees the fold line tilts while a page lifts, as if pulled up by one corner
type Item = Impression;
type Props = { items: Item[]; onOpenStamp: (tripId: string) => void; holder?: Holder };

// My passport as a small book. It starts closed; tapping the cover opens it, then pages turn with a real curl (a GPU shader drawing two pictures of the pages). Swipe up or down, tap
// to turn. Reduce Motion skips the animation.
//
// The book is drawn in its own frame: two portrait pages side by side with the spine upright. Opened, the whole frame turns a quarter turn so the spine runs across the middle and the
// pages sit one above the other; a page's content is drawn upright in a landscape box and turned back the other way. Pages are numbered by "half": 0 is the cover, 1 the data page, 2+
// stamp pages, and spread s shows halves 2s-1 (upper) and 2s (lower).
export function PassportBook({ items, onOpenStamp, holder }: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const reduced = useReducedMotion();
  // The book fills the space its parent gives it (no scrolling): closed, as big as that allows; opened, the whole book scales down by `fit` so both pages fit.
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const boxW = area?.width ?? screenW - 24;
  const boxH = area?.height ?? screenH - 280;
  const w = Math.floor(Math.min(boxW - 24, boxH / 1.4));
  const h = Math.round(w * 1.4);
  const fit = Math.min(1, boxH / (2 * w), boxW / h);
  const fitX = fit * (1 - 16 / (h * fit));   // opened, the book is 8 points narrower on each side than it would be; its height is unchanged
  const onLayout = (e: LayoutChangeEvent) => setArea({ width: Math.round(e.nativeEvent.layout.width), height: Math.round(e.nativeEvent.layout.height) });
  const cellW = Math.floor((h - 50) / 2);
  const rows = Math.max(1, Math.min(3, Math.floor((w - 50) / (Math.round(cellW / STAMP_ASPECT) + 8))));
  const halves = useMemo(() => bookHalves(items, rows * 2), [items, rows]);
  const last = lastSpread(halves);

  const [spread, setSpread] = useState(0);
  const [curl, setCurl] = useState<{ front: SkImage | null; back: SkImage | null; d: 1 | -1 } | null>(null);   // the turn in progress, if any
  const spreadRef = useRef(0);
  const busy = useRef(false);
  const from = useSharedValue(0);   // the spread a turn started from
  const dir = useSharedValue(0);    // 1 forward, -1 back, 0 at rest
  const p = useSharedValue(0);      // how far the page curl has gone, 0 to 1
  const lay = useSharedValue(0);    // how far the book is laid out open: 0 closed and upright, 1 open and turned on its side (animated on its own, so the rotation is a motion of its own)
  const flat = useSharedValue(0);   // 1 while a page is turning: the pages lie flat then, because the curl is drawn flat; at rest they lean in toward the spine

  // Pictures of the pages next to the current spread are taken ahead of time from hidden copies, so a turn starts at once. The data page waits for the holder's photo to load.
  const hosts = useRef<Record<number, View | null>>({});
  const pictures = useRef(new Map<number, SkImage>());
  const [photoReady, setPhotoReady] = useState(false);
  const photoRef = useRef(false);   // the same, readable from inside a running turn
  photoRef.current = photoReady;
  const neighbours = [2 * spread, 2 * spread + 1, 2 * spread - 1, 2 * spread - 2].filter((i) => i >= 0 && i < halves.length);
  const grab = async (i: number): Promise<SkImage | null> => {
    const hit = pictures.current.get(i);
    if (hit) return hit;
    const view = hosts.current[i];
    const img = view ? await makeImageFromView({ current: view }).catch(() => null) : null;
    if (img) pictures.current.set(i, img);
    return img;
  };
  useEffect(() => { pictures.current.clear(); }, [halves, holder, w, h]);
  // The photo is only "not ready" when the photo itself changes: the off-screen copy of the data page keeps it once loaded, however often the data around it is reloaded.
  useEffect(() => { setPhotoReady(false); }, [holder?.avatarUrl]);
  useEffect(() => {
    if (reduced || curl) return;
    const id = setTimeout(() => neighbours.forEach((i) => { grab(i); }), 80);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread, halves, holder, w, h, curl, reduced, photoReady]);
  useEffect(() => { if (spreadRef.current > last) { spreadRef.current = last; setSpread(last); } }, [last]);   // stamps changed under the book

  const settle = (to: number) => {
    spreadRef.current = to;
    setSpread(to);
    setCurl(null);
    busy.current = false;
    haptic.tap();
  };
  // Once the curl has left the screen (not before: resetting earlier shows one frame of the unturned page) the turn's shared state returns to rest.
  useEffect(() => { if (!curl) { from.value = spread; dir.value = 0; p.value = 0; lay.value = spread >= 1 ? 1 : 0; flat.value = withTiming(0, { duration: 180 }); } }, [curl, spread, from, dir, p, lay, flat]);

  const go = async (d: 1 | -1) => {
    const s = spreadRef.current;
    if (busy.current || s + d < 0 || s + d > last) return;
    busy.current = true;
    if (reduced) return settle(s + d);
    const [lift, back] = d === 1 ? [2 * s, 2 * s + 1] : [2 * s - 1, 2 * s - 2];
    // The pictures are normally ready already; right after the screen opens they may need a moment (the photo loading, the first capture), so wait up to about a second for them. If they
    // never come, the book still turns and rotates, just without the curl, rather than jumping.
    let front: SkImage | null = null;
    let behind: SkImage | null = null;
    for (let tries = 0; tries < 10 && !(front && behind); tries++) {
      const needsPhoto = (halves[lift]?.kind === "details" || halves[back]?.kind === "details") && !photoRef.current && tries < 8;
      [front, behind] = needsPhoto ? [null, null] : await Promise.all([grab(lift), grab(back)]);
      if (!(front && behind)) await new Promise((r) => setTimeout(r, 100));
    }
    flat.value = withTiming(1, { duration: 90 });   // straighten the pages before the curl (which is flat) takes over
    await new Promise((r) => setTimeout(r, 90));
    from.value = s; dir.value = d; p.value = 0;
    setCurl({ front, back: behind, d });
    const done = () => scheduleOnRN(settle, s + d);
    const fold = { duration: motion.book.foldMs, easing: EASE_IN_OUT };
    const turnOver = { duration: motion.book.rotateMs, easing: EASE_IN_OUT };
    if (s === 0 && d === 1) lay.value = withTiming(1, turnOver, (ok) => { if (ok) p.value = withTiming(1, fold, (ok2) => { if (ok2) done(); }); });   // opening: the book turns on its side, then the cover lifts
    else if (s === 1 && d === -1) p.value = withTiming(1, fold, (ok) => { if (ok) lay.value = withTiming(0, turnOver, (ok2) => { if (ok2) done(); }); });   // closing: the page folds over, then the book turns upright
    else p.value = withTiming(1, { duration: motion.book.turnMs, easing: EASE_IN_OUT }, (ok) => { if (ok) done(); });
  };
  const swipe = Gesture.Pan().activeOffsetY([-12, 12]).failOffsetX([-30, 30]).onEnd((e) => {
    if (Math.abs(e.translationY) > 40 || Math.abs(e.velocityY) > 500) scheduleOnRN(go, e.translationY < 0 ? 1 : -1);
  });

  const curlP = p;
  const stage = useAnimatedStyle(() => {
    const open = lay.value;
    return { transform: [{ translateX: -(w / 2) * (1 - open) }, { scaleX: 1 + (fitX - 1) * open }, { scaleY: 1 + (fit - 1) * open }, { rotate: `${90 * open}deg` }] };
  });
  // The open book rests on the page; the closed cover carries its own shadow. Each half has its own, because the left half is empty while the cover is in the air (its page has lifted
  // off, or has not landed yet), and a shadow's backing must not show there as an empty page.
  const lean = (side: 1 | -1) => useAnimatedStyle(() => {
    const a = SPINE_TILT * (1 - flat.value) * (from.value >= 1 && dir.value === 0 ? 1 : 0);
    return { transformOrigin: side === 1 ? "0% 50%" : "100% 50%", transform: [{ perspective: 900 }, { rotateY: `${-side * a}deg` }] };
  });
  const leanLeft = lean(-1);
  const leanRight = lean(1);
  const shadowRight = useAnimatedStyle(() => ({ opacity: lay.value }));
  const shadowLeft = useAnimatedStyle(() => {
    const k = (x: number) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };
    const lifted = dir.value === -1 && from.value === 1 ? 1 - k(curlP.value / 0.15) : dir.value === 1 && from.value === 0 ? k((curlP.value - 0.85) / 0.15) : 1;
    return { opacity: lay.value * lifted };
  });

  // Which page shows where. A turning page lifts off one side and the next lies beneath it.
  const d = curl?.d ?? 0;
  const leftIdx = d === -1 ? 2 * spread - 3 : 2 * spread - 1;
  const rightIdx = d === 1 ? 2 * spread + 2 : 2 * spread;
  const render = (i: number, host = false) => {
    const half = halves[i];
    if (!half) return null;
    return <PageView half={half} idx={i} w={w} h={h} cellW={cellW} count={items.length} holder={holder} light={host} onOpenStamp={onOpenStamp}
      onPhotoReady={host ? () => setPhotoReady(true) : undefined} />;
  };

  return (
    <GestureHandlerRootView style={s.root} onLayout={onLayout}>
      <GestureDetector gesture={swipe}>
        <View style={{ width: boxW, height: boxH }} accessibilityLabel="Passport. Swipe up or down to turn the page.">
          <Animated.View style={[{ position: "absolute", left: (boxW - 2 * w) / 2, top: (boxH - h) / 2, width: 2 * w, height: h }, stage]}>
            <Animated.View pointerEvents="none" style={[s.bookShadow, s.shadowWide, { left: 0, width: w, height: h }, shadowLeft]} />
            <Animated.View pointerEvents="none" style={[s.bookShadow, s.shadowTight, { left: 0, width: w, height: h }, shadowLeft]} />
            <Animated.View pointerEvents="none" style={[s.bookShadow, s.shadowWide, { left: w, width: w, height: h }, shadowRight]} />
            <Animated.View pointerEvents="none" style={[s.bookShadow, s.shadowTight, { left: w, width: w, height: h }, shadowRight]} />
            <Animated.View style={[s.slot, { width: w, left: 0, height: h }, leanLeft]}>{render(leftIdx)}</Animated.View>
            <Animated.View style={[s.slot, { width: w, left: w, height: h }, leanRight]}>
              {render(rightIdx)}
              {spread === 0 && !curl && <Pressable accessibilityRole="button" accessibilityLabel="Open passport" onPress={() => go(1)} dip={false} style={StyleSheet.absoluteFill} />}
            </Animated.View>
            {curl?.front && curl.back && <PageCurl w={w} h={h} p={curlP} dir={dir} front={curl.front} back={curl.back} tiltDeg={TILT} />}
            {!reduced && (
              <View pointerEvents="none" style={{ position: "absolute", left: -(3 * w + 200), top: 0, width: w, height: h }}>
                {neighbours.map((i) => (
                  <View key={i} ref={(v) => { hosts.current[i] = v; }} collapsable={false} style={{ position: "absolute", left: 0, top: 0, width: w, height: h }}>{render(i, true)}</View>
                ))}
              </View>
            )}
          </Animated.View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

// The soft shade where a page dips into the spine: darkest right at the fold, easing out over the first few points of the page, with a fine crease line and a faint highlight just beyond it,
// so the two pages read as one folded sheet. `top` is true for the page whose spine edge is its top (the lower page of the open book), false for the one whose spine edge is its bottom.
function SpineShade({ width, top }: { width: number; top: boolean }) {
  const H = 56;
  return (
    <Svg pointerEvents="none" width={width} height={H} style={[{ position: "absolute", left: 0 }, top ? { top: 0 } : { bottom: 0 }]}>
      <Defs>
        <LinearGradient id="spine" x1="0" y1={top ? "0" : "1"} x2="0" y2={top ? "1" : "0"}>
          <Stop offset="0" stopColor="#3c2808" stopOpacity={0.34} />
          <Stop offset="0.12" stopColor="#3c2808" stopOpacity={0.2} />
          <Stop offset="0.35" stopColor="#3c2808" stopOpacity={0.08} />
          <Stop offset="0.7" stopColor="#3c2808" stopOpacity={0.02} />
          <Stop offset="1" stopColor="#3c2808" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width={width} height={H} fill="url(#spine)" />
    </Svg>
  );
}

type PageProps = { onPhotoReady?: () => void; half: Half<Item>; idx: number; w: number; h: number; cellW: number; count: number; holder?: Holder; light?: boolean; onOpenStamp: (id: string) => void};

// One page, in the book's own frame (w wide, h tall). Even positions are right-hand pages (the spine is on their left), odd ones left-hand pages. The content is drawn upright in a
// landscape box (h wide, w tall) and turned a quarter turn back, so that once the whole book has turned to lie spine-across, it reads the right way up. In that box the spine is
// along the top edge of a right-hand page (the lower one) and along the bottom edge of a left-hand page (the upper one).
function PageView({ half, idx, w, h, cellW, count, holder, light, onOpenStamp, onPhotoReady }: PageProps) {
  const right = idx % 2 === 0;
  if (half.kind === "cover") {
    const base = (holder?.country && PASSPORTS[holder.country]?.cover) || passportArt.defaultCover;
    return (
      <View style={[s.pageRight, { width: w, height: h, backgroundColor: base }, !light && s.coverShadow]}>
        <View style={[s.page, s.pageRight, { width: w, height: h }]}><PassportCover w={w} h={h} base={base} /></View>
      </View>
    );
  }
  return (
    <View style={[s.page, right ? s.pageRight : s.pageLeft, s.paper, { width: w, height: h }]}>
      <View style={{ position: "absolute", left: (w - h) / 2, top: (h - w) / 2, width: h, height: w, transform: [{ rotate: "-90deg" }], alignItems: "center", justifyContent: "center" }}>
        <SpineShade width={h} top={right} />
        {half.kind === "details" && <View style={StyleSheet.absoluteFill}><PassportDetails holder={holder} trips={Math.floor(count / 2)} w={h} h={w} spineBelow={!right} onPhotoReady={onPhotoReady} /></View>}
        {half.kind === "stamps" && (
          <>
            <View style={s.stamps}>
              {half.items.map((im, i) => {
                const pl = placement(im.key, i);
                return (
                  <View key={im.key} style={{ width: cellW, transform: [{ translateX: pl.dx / 3 }, { translateY: pl.dy / 3 }] }}>
                    <Stamp compact destination={im.destination} date={im.date} kind={im.kind} shape={im.shape} ink={pl.ink} tilt={pl.tilt} light={light} onPress={() => onOpenStamp(im.tripId)} />
                  </View>
                );
              })}
            </View>
            <Text style={s.pageNo}>{idx - 1}</Text>
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  slot: { position: "absolute", top: 0 },
  bookShadow: { position: "absolute", top: 0, backgroundColor: "#d9d2c3", borderRadius: EDGE },
  shadowWide: { shadowColor: "#2a1d08", shadowOpacity: 0.3, shadowRadius: 26, shadowOffset: { width: 22, height: 0 }, elevation: 14 },
  shadowTight: { shadowColor: "#000", shadowOpacity: 0.32, shadowRadius: 5, shadowOffset: { width: 3, height: 0 }, elevation: 4 },
  page: { overflow: "hidden" },
  coverShadow: { shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 4, height: 10 }, elevation: 10 },
  pageRight: { borderTopRightRadius: EDGE, borderBottomRightRadius: EDGE, borderTopLeftRadius: 2, borderBottomLeftRadius: 2 },
  pageLeft: { borderTopLeftRadius: EDGE, borderBottomLeftRadius: EDGE, borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  paper: { backgroundColor: color.cream, borderWidth: StyleSheet.hairlineWidth, borderColor: color.borderNeutral, justifyContent: "center", alignItems: "center" },
  stamps: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: 6, rowGap: 8, paddingHorizontal: 18 },
  pageNo: { position: "absolute", bottom: 10, right: 20, ...type.fieldMessage, color: color.slate },
});
