// Scroll effects adapted from Skiper UI (https://skiper-ui.com): the sticky card stack (Skiper 16), the characters that fly in with the scroll
// (Skiper 31) and the progressive blur (Skiper 41). Rebuilt on GSAP and its ScrollTrigger. Skiper UI's free licence asks for attribution; the
// footer credits it.
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap, reduced } from "../gsap";

/* Skiper 31: each character starts offset and rotated, and settles as the section scrolls into the middle of the screen. */
export function ScrollHeadline({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reduced()) return;
    const ctx = gsap.context(() => {
      ref.current!.querySelectorAll<HTMLElement>("[data-line]").forEach((line) => {
        const chars = line.querySelectorAll<HTMLElement>("[data-char]");
        const center = Math.floor(chars.length / 2);
        const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ref.current, start: "top bottom", end: "center center", scrub: true } });
        tl.fromTo(chars, { x: (i) => (i - center) * 40, rotateX: (i) => (i - center) * 40 }, { x: 0, rotateX: 0, duration: 0.5 }, 0)
          .fromTo(chars, { opacity: 0.15 }, { opacity: 1, duration: 0.35 }, 0)
          .to({}, { duration: 1 }, 0);
      });
    }, ref);
    return () => ctx.revert();
  }, []);
  return (
    <div ref={ref} className="mx-auto max-w-5xl px-5 text-center" style={{ perspective: 600 }}>
      {lines.map((line) => (
        <div key={line} data-line className="text-[clamp(2.4rem,8vw,6.5rem)] font-medium leading-[1.02] tracking-[-0.045em]">
          {line.split("").map((c, i) => <span key={i} data-char className="inline-block" style={{ whiteSpace: c === " " ? "pre" : undefined }}>{c}</span>)}
        </div>
      ))}
    </div>
  );
}

/* Skiper 16: cards stack as you scroll; the ones underneath shrink a little so the pile reads as depth. */
export function StickyStack({ items }: { items: { bg: string; body: ReactNode }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reduced()) return;
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-card]");
      const count = cards.length;
      cards.forEach((card, i) => {
        const target = Math.max(0.82, 1 - (count - i - 1) * 0.04);
        const from = i / count;
        gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ref.current, start: "top top", end: "bottom bottom", scrub: true } })
          .to({}, { duration: from })
          .fromTo(card, { scale: 1 }, { scale: target, duration: 1 - from });
      });
    }, ref);
    return () => ctx.revert();
  }, []);
  return (
    <div ref={ref} className="relative">
      {items.map((it, i) => (
        <div key={i} className="sticky top-0 flex h-screen items-center justify-center px-4">
          <div data-card style={{ top: `calc(${i * 14}px)`, background: it.bg }} className="relative flex h-[min(560px,86vh)] w-full max-w-5xl origin-top flex-col overflow-hidden rounded-[2rem] md:flex-row md:items-center">
            {it.body}
          </div>
        </div>
      ))}
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
