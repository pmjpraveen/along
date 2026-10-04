import { useEffect, useRef } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from "react-native";
import { wheelIndex } from "../domain/timeWheel";
import { haptic } from "../haptics";
import { color, radius, type } from "../theme/tokens";

const ROW = 44;
const ROWS = 5;   // visible rows: the chosen one in the middle, two above and two below

// One scrolling column of numbers that snaps to a row. It reports the row it settles on, not every frame.
function Column({ count, value, label, onChange }: { count: number; value: number; label: string; onChange: (n: number) => void }) {
  const ref = useRef<ScrollView>(null);
  useEffect(() => { ref.current?.scrollTo({ y: value * ROW, animated: false }); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const n = wheelIndex(e.nativeEvent.contentOffset.y, ROW, count);
    if (n !== value) { haptic.select(); onChange(n); }
  };
  const step = (by: number) => { const n = Math.max(0, Math.min(count - 1, value + by)); ref.current?.scrollTo({ y: n * ROW, animated: true }); onChange(n); };
  return (
    <ScrollView ref={ref} accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: String(value).padStart(2, "0") }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === "increment" ? 1 : -1)}
      style={s.column} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} snapToInterval={ROW} decelerationRate="fast" nestedScrollEnabled
      onMomentumScrollEnd={settle} onScrollEndDrag={settle}>
      {Array.from({ length: count }, (_, n) => (
        <View key={n} style={s.row}><Text maxFontSizeMultiplier={1.2} style={s.number}>{String(n).padStart(2, "0")}</Text></View>
      ))}
    </ScrollView>
  );
}

// A 24-hour time wheel drawn inside the sheet. Android's own time picker opens a separate system dialog on top of everything, so on Android
// the time is chosen here instead; iOS keeps its native wheel.
export function TimeWheel({ hour, minute, onChange }: { hour: number; minute: number; onChange: (hour: number, minute: number) => void }) {
  return (
    <View style={s.wheel}>
      <View pointerEvents="none" style={s.band} />
      <Column count={24} value={hour} label="Hour" onChange={(h) => onChange(h, minute)} />
      <Text style={s.colon}>:</Text>
      <Column count={60} value={minute} label="Minute" onChange={(m) => onChange(hour, m)} />
    </View>
  );
}

const s = StyleSheet.create({
  wheel: { height: ROW * ROWS, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  band: { position: "absolute", left: 0, right: 0, top: ROW * 2, height: ROW, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey },
  column: { width: 88, height: ROW * ROWS, flexGrow: 0 },
  content: { paddingVertical: ROW * 2 },
  row: { height: ROW, alignItems: "center", justifyContent: "center" },
  number: { ...type.fieldValue, fontSize: 22, lineHeight: 28, color: color.obsidian, fontVariant: ["tabular-nums"] },
  colon: { ...type.fieldValue, fontSize: 22, color: color.obsidian },
});
