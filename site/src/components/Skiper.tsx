// Scroll effects adapted from Skiper UI (https://skiper-ui.com): the sticky card stack (Skiper 16), the characters that fly in with the scroll
// (Skiper 31) and the progressive blur (Skiper 41). Rebuilt on motion.dev's `motion/react`. Skiper UI's free licence asks for attribution; the
// footer credits it.
import { motion, MotionValue, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

/* Skiper 31: each character starts offset and rotated, and settles as the section scrolls into the middle of the screen. */
const Character = ({ char, index, center, progress }: { char: string; index: number; center: number; progress: MotionValue<number> }) => {
  const d = index - center;
  const x = useTransform(progress, [0, 0.5], [d * 40, 0]);
  const rotateX = useTransform(progress, [0, 0.5], [d * 40, 0]);
  const opacity = useTransform(progress, [0, 0.35], [0.15, 1]);
  return <motion.span className="inline-block" style={{ x, rotateX, opacity, whiteSpace: char === " " ? "pre" : undefined }}>{char}</motion.span>;
};

export function ScrollHeadline({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  return (
    <div ref={ref} className="mx-auto max-w-5xl px-5 text-center" style={{ perspective: 600 }}>
      {lines.map((line) => {
        const chars = line.split("");
        return (
          <div key={line} className="text-[clamp(2.4rem,8vw,6.5rem)] font-medium leading-[1.02] tracking-[-0.045em]">
            {chars.map((c, i) => <Character key={i} char={c} index={i} center={Math.floor(chars.length / 2)} progress={scrollYProgress} />)}
          </div>
        );
      })}
    </div>
  );
}

/* Skiper 16: cards stack as you scroll; the ones underneath shrink a little so the pile reads as depth. */
const StickyCard = ({ i, count, progress, children, bg }: { i: number; count: number; progress: MotionValue<number>; children: ReactNode; bg: string }) => {
  const target = Math.max(0.82, 1 - (count - i - 1) * 0.04);
  const scale = useTransform(progress, [i / count, 1], [1, target]);
  return (
    <div className="sticky top-0 flex h-screen items-center justify-center px-4">
      <motion.div style={{ scale, top: `calc(${i * 14}px)`, background: bg }} className="relative flex h-[min(560px,86vh)] w-full max-w-5xl origin-top flex-col overflow-hidden rounded-[2rem] md:flex-row md:items-center">
        {children}
      </motion.div>
    </div>
  );
};

export function StickyStack({ items }: { items: { bg: string; body: ReactNode }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  return (
    <div ref={ref} className="relative">
      {items.map((it, i) => <StickyCard key={i} i={i} count={items.length} progress={scrollYProgress} bg={it.bg}>{it.body}</StickyCard>)}
    </div>
  );
}

/* Skiper 41: a blur that thins out toward the edge, so content scrolling under the header fades instead of being cut off. */
export const ProgressiveBlur = ({ height = 96 }: { height?: number }) => (
  <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 select-none" style={{ height }}>
    {[4, 3, 2, 1].map((blur, i) => (
      <div key={blur} className="absolute inset-0" style={{
        backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)`,
        maskImage: `linear-gradient(to bottom, black ${i * 20}%, transparent ${60 + i * 12}%)`, WebkitMaskImage: `linear-gradient(to bottom, black ${i * 20}%, transparent ${60 + i * 12}%)`,
      }} />
    ))}
  </div>
);
