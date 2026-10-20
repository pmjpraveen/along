import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { StyleSheet } from "react-native";

// The feel of card stock, drawn by a small GPU shader over a card: a fine tooth, faint paper fibres running mostly one way, and slow mottling where the
// board is a little denser or thinner. It only lightens and darkens a few percent, so colours and text underneath stay true.
const SOURCE = `
uniform float2 size;
float h(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
float smoothNoise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + float2(1.0, 0.0)), f.x), mix(h(i + float2(0.0, 1.0)), h(i + float2(1.0, 1.0)), f.x), f.y);
}
half4 main(float2 xy) {
  float tooth = h(floor(xy * 1.6)) - 0.5;                                   // fine pitted surface
  float fibre = h(floor(float2(xy.x * 0.9, xy.y * 0.07) + float2(0.0, 7.0))) - 0.5;   // short strands, mostly vertical
  float fibre2 = h(floor(float2(xy.x * 0.06, xy.y * 0.8))) - 0.5;            // and some across
  float mottle = smoothNoise(xy / 38.0) - 0.5;                              // slow patches
  float v = tooth * 0.04 + fibre * 0.04 + fibre2 * 0.02 + mottle * 0.05;
  float a = clamp(abs(v), 0.0, 0.2);
  float3 c = v > 0.0 ? float3(1.0) : float3(0.0);
  return half4(half3(c * a), half(a));
}
`;
const effect = Skia.RuntimeEffect.Make(SOURCE);

export function CardTexture({ width, height }: { width: number; height: number }) {
  const uniforms = useMemo(() => ({ size: [width, height] }), [width, height]);
  if (!effect) return null;   // no GPU shader (tests)
  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Fill><Shader source={effect} uniforms={uniforms} /></Fill>
    </Canvas>
  );
}
