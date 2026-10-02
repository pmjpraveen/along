import { useFocusEffect, useRouter } from "expo-router";
import { Skeleton } from "../src/components/Skeleton";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "../src/components/Pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadStamps, StampsResult } from "../src/api/passport";
import { loadMyProfile } from "../src/api/profile";
import { PASSPORTS } from "../src/domain/countries";
import { pages, placement } from "../src/domain/passportPage";
import { impressions } from "../src/domain/stampShape";
import { PassportBook } from "../src/components/PassportBook";
import { VisaPage } from "../src/components/VisaPage";
import { Alert } from "../src/components/Alert";
import { TextButton } from "../src/components/Buttons";
import { Stamp } from "../src/components/Stamp";
import { usePullToRefresh } from "../src/hooks/usePullToRefresh";
import { color, radius, space, type } from "../src/theme/tokens";

// The pages of my passport: one stamp for each trip I completed, most recent first. Tap a stamp to reopen that trip's summary.
export default function Passport() {
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<StampsResult | null>(null);
  const load = useCallback(async () => { setState(await loadStamps()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = usePullToRefresh(load);
  const stamps = state?.ok ? state.stamps : [];
  const [country, setCountry] = useState<string | null>(null);
  useEffect(() => { loadMyProfile().then((m) => setCountry(m?.country ?? null)); }, []);
  const cover = (country && PASSPORTS[country]?.cover) || "#1f6f78";

  return (
    <ScrollView style={s.screen} contentInsetAdjustmentBehavior="never" refreshControl={pull} contentContainerStyle={[s.content, { paddingTop: top + space.s16, paddingBottom: bottom + space.s24 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/profile"))} hitSlop={space.s4} style={s.round}>
        <ChevronLeft size={22} color={color.brandBlack} strokeWidth={1.75} />
      </Pressable>
      <View style={s.head}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={s.heading}>Passport</Text>
        <Text maxFontSizeMultiplier={1.4} style={s.body}>One stamp for every finished trip.</Text>
      </View>
      {state === null ? (
        <Skeleton label="Loading your stamps" variant="cards" />
      ) : !state.ok ? (
        <View style={s.gap}>
          <Alert variant="negative" persist>{state.message}</Alert>
          <TextButton label="Retry" onPress={load} />
        </View>
      ) : stamps.length === 0 ? (
        <Text maxFontSizeMultiplier={1.4} style={s.body}>No stamps yet. Finish a trip and you'll earn your first one.</Text>
      ) : (
        <PassportBook firstNumber={1} tint={cover} pages={pages(impressions(stamps)).map((group, n) => (
          <VisaPage key={group[0].key} cover={cover} number={n + 1}>
            {group.map((im, i) => {
              const p = placement(im.key, i);
              return (
                <View key={im.key} style={{ width: "49%", transform: [{ translateX: p.dx }, { translateY: p.dy }] }}>
                  <Stamp compact destination={im.destination} date={im.date} kind={im.kind} shape={im.shape} ink={p.ink} tilt={p.tilt}
                    onPress={() => router.push({ pathname: "/trip/[id]/summary", params: { id: im.tripId } })} />
                </View>
              );
            })}
          </VisaPage>
        ))} />
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  round: { width: 48, height: 48, borderRadius: radius.pill, borderCurve: "continuous", borderWidth: 1, borderColor: color.borderNeutral, backgroundColor: color.paper, alignItems: "center", justifyContent: "center" },
  head: { gap: space.s8, marginTop: space.s8, marginBottom: space.s8 },
  heading: { fontFamily: type.sheetTitle.fontFamily, fontSize: 32, lineHeight: 38, letterSpacing: -0.8, color: color.brandBlack },
  gap: { gap: space.s8 },
  body: { ...type.fieldValue, color: color.charcoal },
});
