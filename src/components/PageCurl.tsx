import { useMemo } from "react";
import { Canvas, Fill, ImageShader, Shader, Skia, SkImage } from "@shopify/react-native-skia";
import { SharedValue, useDerivedValue } from "react-native-reanimated";

// The curl of a turning passport page, drawn by a small GPU shader. The two pages are given as pictures: the face of the page that is lifting and the page that lies on its back.
// Everything is in "mirrored world" coordinates in which the lifting page is always the right-hand one (its spine on its left); for a page turning back the shader mirrors the screen
// first, so one set of maths serves both directions.
//
// The sheet is peeled from its free edge toward the spine. A fold line, a little tilted, travels from the free edge to the spine; the part of the page beyond it is rolled over a
// cylinder of radius `r` (which swells as the page is mid-turn and is nothing at either end) and lies on top, back side up, over the page it came from. So at the start the page is
// flat, in the middle it is a smooth rolled sheet with a rounded fold, and at the end it lies exactly on the other side, back side up. Lit like a rolled sheet, with a soft shadow
// cast on the page underneath.
const SOURCE = `
uniform shader front;
uniform shader back;
uniform float w;
uniform float h;
uniform float a;
uniform float r;
uniform float2 n;
uniform float side;
uniform float scale;

const float PI = 3.14159265;

bool inside(float2 s) { return s.x >= w && s.x <= 2.0 * w && s.y >= 0.0 && s.y <= h; }

half4 frontAt(float2 s) {
  float fx = side > 0.0 ? s.x - w : 2.0 * w - s.x;
  return front.eval(float2(fx * scale, s.y * scale));
}
half4 backAt(float2 s) {
  float bx = side > 0.0 ? 2.0 * w - s.x : s.x - w;
  return back.eval(float2(bx * scale, s.y * scale));
}
half4 shade(half4 c, float k) { return half4(c.rgb * k, c.a); }

half4 main(float2 xy) {
  float2 p = side > 0.0 ? xy : float2(2.0 * w - xy.x, xy.y);
  float q = dot(p - float2(w, h * 0.5), n) + w;

  // The rolled part: one visible layer, the outer face of the cylinder, which is the back of the page.
  if (r > 0.5 && q >= a && q <= a + r) {
    float t = clamp((q - a) / r, 0.0, 1.0);
    float theta = PI - asin(t);
    float2 s = p + n * (a + r * theta - q);
    if (inside(s)) {
      float2 nrm = float2(sin(theta), -cos(theta));
      float lit = 0.5 + 0.5 * dot(nrm, normalize(float2(-0.35, 0.94)));
      return shade(backAt(s), 0.62 + 0.38 * lit);
    }
  }

  if (q <= a) {
    // On top, the flap lying back on the page, back side up, darkest where it folds away from the page.
    float2 s = p + n * (2.0 * a + PI * r - 2.0 * q);
    if (inside(s)) {
      float fold = smoothstep(0.0, 70.0, a - q);
      return shade(backAt(s), 0.80 + 0.20 * fold);
    }
    // Underneath, the part of the page still lying flat.
    if (inside(p)) return frontAt(p);
  }

  // Past the fold the page below shows through: only a soft shadow of the curl falls on it.
  if (r > 0.5 && q > a + r && q < a + r + 56.0 && inside(p)) {
    float s = 1.0 - (q - a - r) / 56.0;
    float alpha = 0.26 * s * s;
    return half4(0.0, 0.0, 0.0, alpha);
  }
  return half4(0.0);
}
`;

type Props = { w: number; h: number; p: SharedValue<number>; dir: SharedValue<number>; front: SkImage; back: SkImage; tiltDeg: number };

export function PageCurl({ w, h, p, dir, front, back, tiltDeg }: Props) {
  const effect = useMemo(() => Skia.RuntimeEffect.Make(SOURCE), []);
  const scale = front.width() / w;
  const uniforms = useDerivedValue(() => {
    // Progress of the page as it lifts, 0 (lying flat) to 1 (turned over). A page turning back is the same motion mirrored left to right (see `side`), so it runs the same way.
    const t = p.value;
    const e = t * t * (3 - 2 * t);
    const bell = Math.sin(Math.PI * e);
    const phi = (tiltDeg * Math.PI) / 180 * bell;
    return {
      w, h,
      a: 2 * w - w * e + (h / 2) * Math.abs(Math.sin(phi)),
      r: w * 0.16 * Math.pow(bell, 0.8),
      n: [Math.cos(phi), Math.sin(phi)],
      side: dir.value === -1 ? -1 : 1,
      scale,
    };
  }, [p, dir]);
  if (!effect) return null;
  return (
    <Canvas pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: 2 * w, height: h }}>
      <Fill>
        <Shader source={effect} uniforms={uniforms}>
          <ImageShader image={front} fit="none" tx="clamp" ty="clamp" />
          <ImageShader image={back} fit="none" tx="clamp" ty="clamp" />
        </Shader>
      </Fill>
    </Canvas>
  );
}
