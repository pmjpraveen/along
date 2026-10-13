import { useMemo } from "react";
import { Canvas, Fill, ImageShader, Shader, Skia, SkImage } from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";

// A pebbled leather cover drawn by a small GPU shader: a field of rounded grains separated by fine creases (a Voronoi pattern), lit from the top left so each grain has a soft
// highlight and a shadow, with a faint fine speckle on top. It is the base colour of the cover, so everything on the cover (spine, foil, wear) is drawn over it.
const GRAIN = `
float2 hash22(float2 p) {
  p = float2(dot(p, float2(127.1, 311.7)), dot(p, float2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

// Height of the grain pattern: 0 in the creases between grains, rising to 1 across each grain's face.
float height(float2 uv) {
  float2 g = floor(uv);
  float2 f = fract(uv);
  float d1 = 8.0;
  float d2 = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      float2 o = float2(float(i), float(j));
      float2 r = o + hash22(g + o) - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
    }
  }
  float edge = sqrt(d2) - sqrt(d1);
  return smoothstep(0.0, 0.5, edge) * (0.8 + 0.2 * (1.0 - sqrt(d1)));
}

`;

const SOURCE = GRAIN + `
uniform float2 size;
uniform float3 base;
uniform float cell;
half4 main(float2 xy) {
  float2 uv = xy / cell;
  float c = height(uv);
  float dx = height(uv + float2(0.04, 0.0)) - c;
  float dy = height(uv + float2(0.0, 0.04)) - c;
  float3 n = normalize(float3(-dx * 6.5, -dy * 6.5, 1.0));
  float3 l = normalize(float3(-0.4, -0.55, 0.73));
  float lit = dot(n, l);
  float speckle = hash22(floor(xy * 1.7)).x - 0.5;
  float shade = 0.8 + 0.2 * c + 0.55 * (lit - 0.73) + speckle * 0.04;
  return half4(half3(base * shade), 1.0);
}
`;

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

// `cell` is the grain size in points; by default it scales with the width so a cover looks the same at any size.
export function LeatherTexture({ w, h, base, cell }: { w: number; h: number; base: string; cell?: number }) {
  const effect = useMemo(() => Skia.RuntimeEffect.Make(SOURCE), []);
  const uniforms = useMemo(() => ({ size: [w, h], base: rgb(base), cell: cell ?? Math.max(4, (w / 340) * 5) }), [w, h, base, cell]);
  if (!effect) return null;
  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Fill><Shader source={effect} uniforms={uniforms} /></Fill>
    </Canvas>
  );
}

// The same grain pressed into the gold foil. `mask` is a picture of the foil shapes alone (opaque where there is foil); where it is opaque the shader lays the grain's highlights
// and shadows over the foil as translucent white and black, so the foil carries the leather's texture instead of looking printed on top of it.
const FOIL = GRAIN + `
uniform shader mask;
uniform float cell;
half4 main(float2 xy) {
  float m = mask.eval(xy).a;
  if (m < 0.01) return half4(0.0);
  float2 uv = xy / cell;
  float c = height(uv);
  float dx = height(uv + float2(0.04, 0.0)) - c;
  float dy = height(uv + float2(0.0, 0.04)) - c;
  float3 n = normalize(float3(-dx * 6.5, -dy * 6.5, 1.0));
  float lit = dot(n, normalize(float3(-0.4, -0.55, 0.73))) - 0.73;
  float shade = 0.5 * lit + 0.26 * (c - 0.85);
  float a = clamp(abs(shade) * 1.1, 0.0, 0.4) * m;
  return shade < 0.0 ? half4(0.1, 0.06, 0.0, a) : half4(0.95, 0.78, 0.38, a * 0.4);
}
`;

export function FoilGrain({ w, h, mask }: { w: number; h: number; mask: SkImage }) {
  const effect = useMemo(() => Skia.RuntimeEffect.Make(FOIL), []);
  const uniforms = useMemo(() => ({ cell: Math.max(4, (w / 340) * 5) }), [w]);
  if (!effect) return null;
  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Fill>
        <Shader source={effect} uniforms={uniforms}>
          <ImageShader image={mask} x={0} y={0} width={w} height={h} fit="fill" />
        </Shader>
      </Fill>
    </Canvas>
  );
}
