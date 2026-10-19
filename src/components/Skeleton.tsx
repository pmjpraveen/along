import { ReactNode } from "react";
import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View, ViewStyle } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { EASE_IN_OUT, motion } from "../theme/motion";
import { color, radius, space } from "../theme/tokens";

// What each screen shows while its data loads: grey shapes laid out like the real content (same sizes, same order, same spacing), so the page
// does not jump when the data lands. The whole placeholder breathes (opacity only, on the UI thread) so it reads as loading; with Reduce Motion
// on it holds still. The label tells screen readers what is loading.
export type SkeletonVariant =
  | "list" | "switchRows" | "guestRows"          // avatar rows, plain rows, avatar rows with a button
  | "tiles" | "cards" | "stamps" | "inviteCard"    // Home's two-column grid, History's wide cards, the travel passport (a closed book), the join preview
  | "tripHeader" | "planRows"                    // the trip page's header (cover, date, name) and its day chips with plans
  | "balances" | "balanceCards" | "expenses" | "expenseDetail" | "summaryBody" | "summaryCards"
  | "dayChips" | "greetingName" | "profileName" | "profileCard"                 // the profile page's name, and its email and member-since card
  | "fields" | "settle" | "memories" | "cover" | "block";

const Bar = ({ w, h = 16, style }: { w: ViewStyle["width"]; h?: number; style?: ViewStyle }) => <View style={[s.fill, { width: w, height: h, borderRadius: radius.pill }, style]} />;
const Box = ({ h, r = radius.card, style, children }: { h?: number; r?: number; style?: ViewStyle; children?: ReactNode }) => <View style={[s.fill, { height: h, borderRadius: r }, style]}>{children}</View>;
const Dot = ({ size = 40, style }: { size?: number; style?: ViewStyle }) => <View style={[s.fill, { width: size, height: size, borderRadius: radius.pill }, style]} />;
// Shapes that sit on a grey card are white, like the real content on its card.
const on: ViewStyle = { backgroundColor: color.paper };
const Row = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => <View style={[s.row, style]}>{children}</View>;

// One person's card on the Balances view: avatar, name, the amount owed or gained, then the Paid and Share boxes (white, like the real ones on the grey card).
const PersonCard = () => (
  <Box r={radius.card} style={s.personCard}>
    <Row><Dot size={48} style={on} /><Bar w="34%" h={18} style={on} /><View style={s.spacer} /><View style={s.stack}><Bar w={56} h={12} style={on} /><Bar w={84} h={18} style={on} /></View><Dot size={20} style={on} /></Row>
    <Row style={s.stats}>{[0, 1].map((i) => <Box key={i} h={68} r={radius.small} style={{ ...on, ...s.stat }}><Bar w="40%" h={12} /><Bar w="75%" h={18} /></Box>)}</Row>
  </Box>
);

export function Skeleton({ label, variant = "list" }: { label: string; variant?: SkeletonVariant }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduced) { pulse.value = 1; return; }
    pulse.value = withRepeat(withTiming(motion.skeleton.low, { duration: motion.skeleton.pulseMs, easing: EASE_IN_OUT }), -1, true);
    return () => cancelAnimation(pulse);
  }, [reduced, pulse]);
  const breathe = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const tile = (width - space.s20 * 2 - space.s12) / 2;   // Home's two columns
  const n = (count: number) => Array.from({ length: count }, (_, i) => i);

  const body = (() => {
    switch (variant) {
      case "list":   // avatar and two lines: notifications, history
        return n(5).map((i) => <Row key={i}><Dot /><View style={s.lines}><Bar w="60%" /><Bar w="35%" h={12} /></View></Row>);
      case "switchRows":   // title with a switch: notification choices
        return n(5).map((i) => <Row key={i} style={s.rowBetween}><Bar w="45%" /><Box h={31} r={radius.pill} style={{ width: 51 }} /></Row>);
      case "guestRows":   // avatar, name, and the Invite button
        return n(4).map((i) => <Row key={i}><Dot /><Bar w="40%" style={s.grow} /><Box h={30} r={radius.card} style={{ width: 72 }} /></Row>);
      case "tiles":   // Home: square cover, date pill, name tag, place
        return <View style={s.tiles}>{n(4).map((i) => (
          <View key={i} style={{ width: tile, gap: space.s8, alignItems: "center" }}>
            <Box h={tile} r={radius.tile} style={{ alignSelf: "stretch" }}><Bar w={84} h={32} style={{ ...on, position: "absolute", left: space.s12, bottom: space.s12 }} /></Box>
            <Bar w={96} h={20} style={{ borderRadius: 6 }} /><Bar w="80%" h={28} style={{ borderRadius: 8 }} /><Bar w="50%" h={14} />
          </View>))}</View>;
      case "cards":   // History: a wide card with the date pill, name tag and place
        return n(3).map((i) => (
          <Box key={i} h={168} r={radius.tile} style={s.cardCenter}><Bar w={96} h={20} style={{ ...on, borderRadius: 6 }} /><Bar w="70%" h={30} style={{ ...on, borderRadius: 8 }} /><Bar w="40%" h={14} style={on} /></Box>));
      case "stamps": {   // the Travel passport page: one closed book, 1 : 1.4, as large as the space under the heading allows
        const w = Math.floor(Math.min(width - space.s20 * 2 - 24, (height - 250) / 1.4));
        return <View style={s.center}><Box h={Math.round(w * 1.4)} r={radius.card} style={{ width: w }} /></View>;
      }
      case "inviteCard":   // the join preview card
        return <Box h={190} r={radius.sheet} style={s.cardCenter}><Bar w={96} h={20} style={{ ...on, borderRadius: 6 }} /><Bar w="70%" h={34} style={{ ...on, borderRadius: 8 }} /><Bar w="45%" h={16} style={on} /><Bar w="35%" h={14} style={on} /></Box>;
      case "tripHeader":   // the trip header: cover, date, name, place, avatars
        return <View style={s.center}><Box h={104} r={radius.tile} style={{ width: 104 }} /><Bar w={96} h={20} style={{ borderRadius: 6 }} /><Bar w="65%" h={32} style={{ borderRadius: 8 }} /><Bar w="40%" h={16} /><Row style={s.avatars}><Dot size={48} /><Dot size={48} /><Dot size={48} /></Row></View>;
      case "planRows":   // day chips, then plans: time column and a card
        return <><Row>{n(4).map((i) => <Box key={i} h={32} r={radius.pill} style={{ width: 72 }} />)}</Row>
          {n(3).map((i) => <Row key={i} style={s.top}><Bar w={44} h={14} /><Box h={84} r={radius.card} style={s.grow} /></Row>)}</>;
      case "balances":   // the Balances page: "Your balance" card, then each person's card
        return <><Box h={104} r={radius.sheet} style={s.inner}><Bar w="30%" h={14} style={on} /><Bar w="60%" h={30} style={on} /></Box><Bar w="38%" style={s.section} />{n(3).map((i) => <PersonCard key={i} />)}</>;
      case "balanceCards":   // the Expenses tab's Balances view: the section title, then each person's card
        return <><Bar w="38%" />{n(3).map((i) => <PersonCard key={i} />)}</>;
      case "expenses":   // the trip summary card, the Transactions | Balances switch, then a day band and its transactions
        return <><Box h={256} r={radius.xLarge} style={s.summaryOuter}>
            <Row style={s.tripRow}><Dot size={20} style={on} /><Bar w="40%" h={18} style={on} /></Row>
            <Box h={190} r={radius.sheet} style={{ ...on, ...s.summaryInner }}><Bar w="25%" h={14} /><Bar w="55%" h={44} /><Bar w="45%" h={14} /><Row style={s.faces}><Dot size={40} /><Dot size={40} /><Dot size={40} /><Dot size={40} /></Row></Box>
          </Box>
          <Box h={52} r={radius.pill} style={s.switchTrack}><Box h={44} r={radius.pill} style={s.switchPill} /></Box>
          <View style={s.bleed}>
            <Row style={s.band}><Bar w="35%" h={16} style={on} /><Bar w={72} h={16} style={on} /></Row>
            {n(4).map((i) => <Row key={i} style={s.txRow}><Dot size={48} /><View style={s.lines}><Bar w="55%" /><Bar w="35%" h={12} /></View><Bar w={64} /></Row>)}
          </View></>;
      case "expenseDetail":   // the grey hero card (icon and date, title, amount), the paid-by card, "Split with" and each person's share
        return <><Box h={182} r={radius.sheet} style={s.inner}><Row style={s.rowBetween}><Box h={48} r={radius.pill} style={{ ...on, width: 48 }} /><Bar w={96} h={16} style={on} /></Row><Bar w="50%" h={24} style={on} /><Bar w="60%" h={40} style={on} /></Box>
          <Box h={113} r={radius.sheet} style={s.inner}><Row style={s.rowBetween}><Bar w="20%" h={16} style={on} /><Bar w="35%" h={16} style={on} /></Row><View style={s.line} /><Row style={s.rowBetween}><Bar w="25%" h={16} style={on} /><Bar w="35%" h={16} style={on} /></Row></Box>
          <Row style={{ ...s.rowBetween, ...s.split }}><Bar w="28%" h={16} /><Box h={28} r={radius.pill} style={{ width: 84 }} /></Row>
          {n(3).map((i) => <Row key={i} style={s.personRow}><Dot size={40} /><View style={s.lines}><Bar w="40%" /><Bar w="22%" h={12} /></View><Bar w={72} /></Row>)}</>;
      case "summaryBody":   // the completed trip page below its header: total card and the three options
        return <><Box h={200} r={radius.sheet} style={s.inner}><Bar w="25%" h={14} style={on} /><Bar w="45%" h={40} style={on} /><Bar w="55%" h={14} style={on} /><Bar w="30%" h={14} style={on} /></Box><View style={s.options}>{n(3).map((i) => <Row key={i} style={s.optionRow}><Dot /><View style={s.lines}><Bar w="40%" /><Bar w="60%" h={12} /></View></Row>)}</View></>;
      case "summaryCards":   // the end-trip page: people and plans card, total spent card
        return <><Box h={96} r={radius.sheet} style={s.inner}><Bar w="30%" h={28} style={on} /><Bar w="50%" h={14} style={on} /></Box><Box h={148} r={radius.sheet} style={s.inner}><Bar w="25%" h={14} style={on} /><Bar w="45%" h={34} style={on} /><Bar w="55%" h={14} style={on} /></Box></>;
      case "fields":   // a form: label above a 48-tall box
        return n(4).map((i) => <View key={i} style={s.field}><Bar w="25%" h={14} /><Box h={48} r={radius.card} /></View>);
      case "settle":   // the Record a payment sheet: the two avatars and who paid whom, the amount, a hint and the note
        return <><View style={s.settleHero}><Row style={s.pair}><Dot size={72} /><Bar w={24} h={24} /><Dot size={72} /></Row><Bar w="60%" h={36} style={{ borderRadius: 8 }} /></View>
          <View style={s.field}><Bar w="28%" h={16} /><Box h={64} r={radius.card} /><Bar w="45%" h={12} /></View><Box h={64} r={radius.card} /></>;
      case "memories":   // a photo (4:3), a line of text and the byline
        return n(2).map((i) => (
          <Box key={i} r={radius.sheet} style={s.memory}><Box h={Math.round((width - space.s40 - space.s16) * 0.75)} r={radius.card} style={s.photo} /><Bar w="70%" style={on} /><Row><Box h={24} r={radius.pill} style={{ ...on, width: 24 }} /><Bar w="40%" h={12} style={on} /></Row></Box>));
      case "dayChips":
        return <Row>{n(4).map((i) => <Box key={i} h={32} r={radius.pill} style={{ width: 96 }} />)}</Row>;
      case "greetingName":
        return <Bar w={140} h={22} style={{ marginTop: 2 }} />;
      case "profileName":
        return <View style={s.center}><Bar w="55%" h={32} style={{ borderRadius: 8 }} /></View>;
      case "profileCard":
        return <Box r={radius.sheet} style={s.inner}><Row style={s.rowBetween}><Bar w="20%" h={14} style={on} /><Bar w="45%" h={16} style={on} /></Row><View style={s.line} /><Row style={s.rowBetween}><Bar w="30%" h={14} style={on} /><Bar w="30%" h={16} style={on} /></Row></Box>;
      case "cover":   // the profile's passport cover
        return <Box h={172} r={radius.card} />;
      case "block":
      default:
        return <Box h={140} r={radius.card} />;
    }
  })();

  return <Animated.View accessible accessibilityLabel={label} accessibilityRole="progressbar" accessibilityState={{ busy: true }} style={[s.wrap, breathe]}>{body}</Animated.View>;
}

const s = StyleSheet.create({
  wrap: { gap: space.s16, alignSelf: "stretch" },
  fill: { backgroundColor: color.softGrey, borderCurve: "continuous" },
  row: { flexDirection: "row", alignItems: "center", gap: space.s16 },
  rowBetween: { justifyContent: "space-between" },
  top: { alignItems: "flex-start" },
  grow: { flex: 1 },
  lines: { flex: 1, gap: space.s8 },
  stack: { gap: space.s8 },   // two lines of fixed width that keep the amount at the far edge
  stampGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space.s24 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: space.s12, rowGap: space.s24 },
  line: { height: 1, backgroundColor: color.borderNeutral },
  inner: { padding: space.s20, gap: space.s12, justifyContent: "center" },
  cardCenter: { alignItems: "center", justifyContent: "center", gap: space.s8 },
  center: { alignItems: "center", gap: space.s8 },
  avatars: { gap: -space.s8, marginTop: space.s8 },
  section: { marginTop: space.s8 },
  field: { gap: space.s8 },
  options: { borderRadius: radius.sheet, borderWidth: 1, borderColor: color.borderNeutral, overflow: "hidden" },
  optionRow: { padding: space.s16 },
  memory: { padding: space.s8, gap: space.s12 },
  photo: { backgroundColor: color.paper },
  personCard: { padding: space.s16, gap: space.s12 },
  spacer: { flex: 1 },
  stats: { gap: space.s8 },
  stat: { flex: 1, padding: space.s12, gap: space.s8, justifyContent: "center" },
  summaryOuter: { padding: space.s16, gap: space.s16 },
  tripRow: { gap: space.s12 },
  summaryInner: { padding: space.s20, gap: space.s12, justifyContent: "center" },
  faces: { gap: -space.s8 },
  switchTrack: { padding: 4, justifyContent: "center" },
  switchPill: { width: "50%", backgroundColor: color.paper },
  bleed: { marginHorizontal: -space.s20, marginTop: -space.s16 },   // the day band and transaction rows run edge to edge, up against the switch
  band: { minHeight: 48, paddingHorizontal: space.s20, justifyContent: "space-between", backgroundColor: color.softGrey },
  txRow: { minHeight: 72, paddingHorizontal: space.s20, paddingVertical: space.s16 },
  split: { marginTop: space.s8 },
  personRow: { minHeight: 64, paddingVertical: space.s12 },
  settleHero: { alignItems: "center", gap: space.s16, paddingTop: space.s64 },
  pair: { alignItems: "center" },
});
