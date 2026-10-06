import { PinnedBack, useContentTop, useScrollY } from "../../../src/components/PinnedBack";
import Animated from "react-native-reanimated";
import { usePullToRefresh } from "../../../src/hooks/usePullToRefresh";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BalancesResult, loadBalances } from "../../../src/api/balances";
import { BalancesView } from "../../../src/components/BalancesView";
import { useTripRealtime } from "../../../src/hooks/useTripRealtime";
import { color, space, type } from "../../../src/theme/tokens";

// The Balances page: the shared balances view under a title. All derived on read.
export default function Balances() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bottom } = useSafeAreaInsets();
  const { scrollY, onScroll } = useScrollY();
  const contentTop = useContentTop();
  const router = useRouter();
  const [state, setState] = useState<BalancesResult | null>(null);
  const load = useCallback(async () => setState(await loadBalances(id)), [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = usePullToRefresh(load);
  // Live: another member's expense, split or payment refreshes this screen without a pull.
  useTripRealtime(id, ["expenses", "expense_participants", "settlements"], load);
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={s.screen}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} style={s.scroll} contentInsetAdjustmentBehavior="never" refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: contentTop, paddingBottom: bottom + space.s24 }]}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Balances</Text>
        <BalancesView state={state} tripId={id} onRetry={load} />
      </Animated.ScrollView>
      <PinnedBack onPress={back} scrollY={scrollY} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  scroll: { flex: 1 },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  heading: { ...type.pageTitle, color: color.brandBlack, marginVertical: space.s8 },
});
