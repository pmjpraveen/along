import { useMemo } from "react";
import { Canvas, Fill, ImageShader, Shader, Skia, SkImage } from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";
import { hashSeed, rng } from "../domain/stampWear";

// Prints a stamp the way real ink lands, from a picture of the clean stamp (opaque where there is ink). This is a port of the approved sample, step for step, on the GPU:
//  - the clean stamp is blurred a little and re-thresholded against noise, so edges fatten, wobble and fine gaps fill in (the ink spreads);
//  - uneven pressure: a broad dark/light field plus a slow gradient across the stamp, finer patches, and ink pooling along the inside of edges;
//  - grain: the paper's tooth drops ink everywhere, more where the pressure was light, plus pinholes;
//  - a faint second strike a hair off, and up to three smudges (some stamps have many, some hardly any) where the stamp slipped and dragged its ink in one direction.
// Every number comes from the stamp's own words, so a stamp always wears the same way. All distances are measured on a 300-wide stamp whatever its real size.
const SOURCE = `
uniform shader art;
uniform float2 dims;
uniform float3 ink;
uniform float seed;
uniform float4 sm0;
uniform float4 sm1;
uniform float4 sm2;
uniform float3 amt;
uniform float2 grad;

float h1(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7)) + seed * 13.7) * 43758.5453); }
float vn(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h1(i), h1(i + float2(1.0, 0.0)), f.x), mix(h1(i + float2(0.0, 1.0)), h1(i + float2(1.0, 1.0)), f.x), f.y);
}
float fbm3(float2 p) {
  float s = vn(p) * 0.5 + vn(p * 2.0) * 0.25 + vn(p * 4.0) * 0.125;
  return s / 0.875;
}
float fbm2(float2 p) { return (vn(p) * 0.5 + vn(p * 2.0) * 0.25) / 0.75; }
float cov(float2 xy) { return art.eval(xy).a; }
float ss(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }

half4 main(float2 xy) {
  float k = dims.x / 300.0;
  float2 p = xy / k;

  // soft coverage: a small blur for the spread, a wide one for the pooling at edges
  float b1 = 0.0;
  float b2 = 0.0;
  float w1 = 0.0;
  float w2 = 0.0;
  for (int j = -2; j <= 2; j++) {
    for (int i = -2; i <= 2; i++) {
      float2 o = float2(float(i), float(j));
      float g = exp(-dot(o, o) / 4.0);
      b1 += g * cov(xy + o * 1.5 * k); w1 += g;
      b2 += g * cov(xy + o * 5.5 * k); w2 += g;
    }
  }
  b1 /= w1;
  b2 /= w2;
  float th = 0.2 + 0.2 * (fbm3(p / 7.0) - 0.5);
  float c2 = ss(th, th + 0.34, b1);

  float uvx = xy.x / dims.x - 0.5;
  float uvy = xy.y / dims.y - 0.5;
  float D = 0.74 + 0.55 * (fbm3(p / 85.0 + 101.0) - 0.5) + 0.3 * (uvx * grad.x + uvy * grad.y);
  D += 0.22 * (fbm2(p / 22.0 + float2(9.0, 4.0) + 101.0) - 0.5);
  D = clamp(D, 0.28, 1.0);
  float rim = clamp((c2 - b2) * 1.5, -0.15, 0.35);
  float dens = clamp(D + rim, 0.28, 1.05);

  float g = fbm3(p / 1.7);
  float thr = 0.46 + 0.4 * dens;
  float drop = ss(thr, thr + 0.12, g);
  float a = c2 * min(1.0, dens) * (1.0 - drop * 0.96);
  if (vn(p / 0.9 + 40.0) * 1.0 > 0.9) { a *= 0.35; }
  a = max(a, cov(xy - float2(3.0, 2.0) * k) * 0.1 * (1.0 - drop));

  for (int m = 0; m < 3; m++) {
    float4 s = m == 0 ? sm0 : (m == 1 ? sm1 : sm2);
    float strength = m == 0 ? amt.x : (m == 1 ? amt.y : amt.z);
    float dist = length(p - s.xy);
    if (strength > 0.01 && dist < s.z) {
      float w = ss(s.z, 0.0, dist);
      float2 dir = float2(cos(s.w), sin(s.w));
      float sv = 0.0;
      for (int q = 0; q < 6; q++) { sv += ss(th, th + 0.34, cov(xy - dir * float(q) * 3.2 * k)); }
      sv /= 6.0;
      a = min(1.0, a + w * 0.8 * strength * sv * dens * (1.0 - drop * 0.6) * (1.0 - c2 * 0.6));
    }
  }
  a = min(1.0, a) * 0.96;
  float dark = 1.0 - 0.18 * min(1.0, a * 1.2);
  return half4(half3(ink * dark * a), a);
}
`;

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export function StampInk({ image, w, h, ink, seed }: { image: SkImage; w: number; h: number; ink: string; seed: string }) {
  const effect = useMemo(() => Skia.RuntimeEffect.Make(SOURCE), []);
  const uniforms = useMemo(() => {
    const r = rng(hashSeed(seed));
    const ph = (300 * h) / w;
    const smudge = () => [30 + r() * 240, 30 + r() * Math.max(10, ph - 60), 60 + r() * 50, r() * 6.28];
    const ang = r() * 6.28;
    const heavy = r();   // how smudged this stamp is overall: from clean-ish to badly slipped
    const amt = [0.5 + heavy * 1.1, heavy > 0.3 ? 0.35 + heavy * 1.0 : 0, heavy > 0.62 ? 0.3 + heavy * 0.9 : 0];
    return { dims: [w, h], ink: rgb(ink), seed: (hashSeed(seed) % 997) / 7, sm0: smudge(), sm1: smudge(), sm2: smudge(), amt, grad: [Math.cos(ang), Math.sin(ang)] };
  }, [w, h, ink, seed]);
  if (!effect) return null;
  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Fill>
        <Shader source={effect} uniforms={uniforms}>
          <ImageShader image={image} x={0} y={0} width={w} height={h} fit="fill" />
        </Shader>
      </Fill>
    </Canvas>
  );
}
