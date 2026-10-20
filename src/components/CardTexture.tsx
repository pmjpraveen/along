import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { StyleSheet } from "react-native";

// The feel of a postcard: matte card stock with short paper fibres lying every which way (some lighter than the board, some darker), a fine tooth, the odd
// dark fleck where a speck of pulp was pressed in, and slow mottling where the board is a little denser or thinner. It only lightens and darkens a few percent,
// so the colours and text underneath stay true.
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
  float tooth = h(floor(xy * 1.6)) - 0.5;
  // One short strand per cell at most, at a random angle, a little off centre.
  float2 g = xy / 9.0;
  float2 cell = floor(g);
  float2 q = fract(g) - 0.5 - (float2(h(cell + 1.3), h(cell + 8.1)) - 0.5) * 0.5;
  float ang = h(cell + 3.7) * 6.2832;
  float2 dir = float2(cos(ang), sin(ang));
  float along = dot(q, dir);
  float across = abs(dot(q, float2(-dir.y, dir.x)));
  float strand = step(0.5, h(cell + 5.5)) * smoothstep(0.11, 0.0, across) * smoothstep(0.4, 0.12, abs(along));
  float side = h(cell + 9.9) > 0.45 ? 1.0 : -1.0;
  float fleck = step(0.9975, h(floor(xy * 1.3) + 17.0));
  float mottle = smoothNoise(xy / 42.0) - 0.5;
  float v = tooth * 0.03 + strand * side * 0.05 + mottle * 0.04 - fleck * 0.12;
  float a = clamp(abs(v), 0.0, 0.26);
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
