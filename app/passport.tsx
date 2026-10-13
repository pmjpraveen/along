import { useFocusEffect, useRouter } from "expo-router";
import { PinnedBack, useContentTop } from "../src/components/PinnedBack";
import { useSharedValue } from "react-native-reanimated";
import { Skeleton } from "../src/components/Skeleton";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadMyProfile, MyProfile } from "../src/api/profile";
import { loadStamps, StampsResult } from "../src/api/passport";
import { impressions } from "../src/domain/stampShape";
import { Alert } from "../src/components/Alert";
import { TextButton } from "../src/components/Buttons";
import { PassportBook } from "../src/components/PassportBook";
import { color, space, type } from "../src/theme/tokens";

// My travel stamps: an arrival and a departure for each trip I completed, most recent first, two to a row. Tap one to reopen that trip's summary.
export default function Passport() {
  const { bottom } = useSafeAreaInsets();
  const scrollY = useSharedValue(0);   // the page does not scroll; the back button just needs a resting value
  const contentTop = useContentTop();
  const router = useRouter();
  const [state, setState] = useState<StampsResult | null>(null);
  const [me, setMe] = useState<MyProfile | null>(null);
  const load = useCallback(async () => {
    const [stamps, profile] = await Promise.all([loadStamps(), loadMyProfile()]);
    setMe(profile);
    setState(stamps);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const stamps = state?.ok ? state.stamps : [];
  const pages = useMemo(() => impressions(stamps), [stamps]);
  const holder = useMemo(() => (me ? { name: me.name, country: me.country, avatarUrl: me.avatarUrl, since: me.since } : undefined), [me]);

  return (
    <View style={{ flex: 1 }}>
    <View style={[s.screen, s.content, { paddingTop: contentTop, paddingBottom: bottom + space.s16 }]}>
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
        <View style={s.book} accessibilityLabel="Passport"><PassportBook items={pages} holder={holder} onOpenStamp={(id) => router.push({ pathname: "/trip/[id]/summary", params: { id } })} /></View>
      )}
    </View>
    <PinnedBack onPress={() => (router.canGoBack() ? router.back() : router.replace("/profile"))} scrollY={scrollY} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.s20, gap: space.s16 },
  head: { gap: space.s8, marginTop: space.s8, marginBottom: space.s8 },
  heading: { ...type.pageTitle, color: color.brandBlack },
  gap: { gap: space.s8 },
  book: { flex: 1 },
  body: { ...type.fieldValue, color: color.charcoal },
});
