import { useFocusEffect, useRouter } from "expo-router";
import { PinnedBack, useContentTop, useScrollY } from "../src/components/PinnedBack";
import Animated from "react-native-reanimated";
import { Skeleton } from "../src/components/Skeleton";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadStamps, StampsResult } from "../src/api/passport";
import { placement } from "../src/domain/passportPage";
import { impressions } from "../src/domain/stampShape";
import { Alert } from "../src/components/Alert";
import { TextButton } from "../src/components/Buttons";
import { Stamp } from "../src/components/Stamp";
import { usePullToRefresh } from "../src/hooks/usePullToRefresh";
import { color, radius, space, type } from "../src/theme/tokens";

// My travel stamps: an arrival and a departure for each trip I completed, most recent first, two to a row. Tap one to reopen that trip's summary.
export default function Passport() {
  const { top, bottom } = useSafeAreaInsets();
  const { scrollY, onScroll } = useScrollY();
  const contentTop = useContentTop();
  const router = useRouter();
  const [state, setState] = useState<StampsResult | null>(null);
  const load = useCallback(async () => { setState(await loadStamps()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = usePullToRefresh(load);
  const stamps = state?.ok ? state.stamps : [];

  return (
    <View style={{ flex: 1 }}>
    <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} style={s.screen} contentInsetAdjustmentBehavior="never" refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: contentTop, paddingBottom: bottom + space.s24 }]}>
      <View style={s.head}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Travel stamps</Text>
        <Text maxFontSizeMultiplier={1.4} style={s.body}>An arrival and a departure for every finished trip.</Text>
      </View>
      {state === null ? (
        <Skeleton label="Loading your stamps" variant="stamps" />
      ) : !state.ok ? (
        <View style={s.gap}>
          <Alert variant="negative" persist>{state.message}</Alert>
          <TextButton label="Retry" onPress={load} />
        </View>
      ) : stamps.length === 0 ? (
        <Text maxFontSizeMultiplier={1.4} style={s.body}>No stamps yet. Finish a trip and you'll earn your first one.</Text>
      ) : (
        <View style={s.grid}>
          {impressions(stamps).map((im, i) => {
            const p = placement(im.key, i);
            return (
              <View key={im.key} style={[s.cell, { transform: [{ translateX: p.dx }, { translateY: p.dy }] }]}>
                <Stamp compact destination={im.destination} date={im.date} kind={im.kind} shape={im.shape} ink={p.ink} tilt={p.tilt}
                  onPress={() => router.push({ pathname: "/trip/[id]/summary", params: { id: im.tripId } })} />
              </View>
            );
          })}
        </View>
      )}
    </Animated.ScrollView>
    <PinnedBack onPress={() => (router.canGoBack() ? router.back() : router.replace("/profile"))} scrollY={scrollY} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  head: { gap: space.s8, marginTop: space.s8, marginBottom: space.s8 },
  heading: { ...type.pageTitle, color: color.brandBlack },
  gap: { gap: space.s8 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space.s24 },
  cell: { width: "48%" },
  body: { ...type.fieldValue, color: color.charcoal },
});
