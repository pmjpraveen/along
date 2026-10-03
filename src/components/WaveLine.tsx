import { useState } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { color } from "../theme/tokens";

// A thin wavy line that fills the width it is given: a row of gentle bumps, as a divider with some life.
export const wavePath = (width: number, amp = 2.5, period = 12): string => {
  const waves = Math.max(1, Math.round(width / period));
  const step = width / waves;
  let d = `M0 ${amp}`;
  for (let i = 0; i < waves; i++) d += ` Q ${(i + 0.5) * step} ${i % 2 ? amp * 2 : 0} ${(i + 1) * step} ${amp}`;
  return d;
};

export function WaveLine({ stroke = color.borderNeutral }: { stroke?: string }) {
  const [w, setW] = useState(0);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flex: 1, height: 6, justifyContent: "center" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {w > 0 && <Svg width={w} height={6}><Path d={wavePath(w)} stroke={stroke} strokeWidth={1.25} fill="none" strokeLinecap="round" /></Svg>}
    </View>
  );
}
