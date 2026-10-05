// Scroll effects adapted from Skiper UI (https://skiper-ui.com): the sticky card stack (Skiper 16), the characters that fly in with the scroll
// (Skiper 31) and the progressive blur (Skiper 41). Rebuilt on GSAP and its ScrollTrigger. Skiper UI's free licence asks for attribution; the
// footer credits it.
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap, reduced } from "../gsap";

/* A big statement whose words rise out of a mask, one after another, the first time it scrolls into view. Text in [brackets] sits in a tilted ink tag, like a trip name in the app. */
export function ScrollHeadline({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reduced()) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-w]", { yPercent: 115, duration: 1, ease: "expo.out", stagger: 0.09, scrollTrigger: { trigger: ref.current, start: "top 75%", once: true } });
      gsap.from("[data-tag]", { rotate: 0, scale: 0.9, duration: 0.8, ease: "back.out(2)", delay: 0.7, scrollTrigger: { trigger: ref.current, start: "top 75%", once: true } });
    }, ref);
    return () => ctx.revert();
  }, []);
  return (
    <div ref={ref} className="mx-auto max-w-5xl px-5 text-center">
      {lines.map((line) => {
        const tag = line.match(/\[(.+?)\]/);
        const before = tag ? line.slice(0, tag.index).trim() : line;
        const word = (w: string, i: number, inTag = false) => <span key={`${w}${i}`} className="inline-block overflow-hidden pb-[0.14em] align-top"><span data-w className={`inline-block ${inTag ? "" : "mr-[0.25em]"}`}>{w}</span></span>;
        return (
          <div key={line} className="text-[clamp(2.4rem,8vw,6.5rem)] font-medium leading-[1.1] tracking-[-0.03em] sm:tracking-[-0.045em]">
            {before.split(" ").filter(Boolean).map((w, i) => word(w, i))}
            {tag && <span data-tag className="inline-block -rotate-2 rounded-[0.16em] bg-ink px-[0.2em] pb-[0.04em] text-white">{tag[1].split(" ").map((w, i, all) => <span key={i} className="inline-block overflow-hidden pb-[0.14em] align-top"><span data-w className={`inline-block ${i < all.length - 1 ? "mr-[0.25em]" : ""}`}>{w}</span></span>)}</span>}
          </div>
        );
      })}
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
        <div key={i} className="sticky top-0 flex h-screen items-center justify-center px-2 sm:px-4">
          <div data-card style={{ top: `calc(${i * 14}px)`, background: it.bg }} className="relative flex h-[min(640px,90vh)] w-full max-w-6xl origin-top flex-col overflow-hidden rounded-[2.25rem] shadow-[0_-24px_60px_-28px_rgba(0,0,0,0.3)] ring-1 ring-black/5 md:flex-row md:items-stretch">
            {it.body}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Skiper 41: a blur that thins out toward the edge, so content scrolling under the header fades instead of being cut off. */
export const ProgressiveBlur = ({ height = 96 }: { height?: number }) => (
  <div aria-hidden data-blur className="pointer-events-none absolute inset-x-0 top-0 select-none" style={{ height }}>
    {[4, 3, 2, 1].map((blur, i) => (
      <div key={blur} className="absolute inset-0" style={{
        backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)`,
        maskImage: `linear-gradient(to bottom, black ${i * 20}%, transparent ${60 + i * 12}%)`, WebkitMaskImage: `linear-gradient(to bottom, black ${i * 20}%, transparent ${60 + i * 12}%)`,
      }} />
    ))}
  </div>
);
