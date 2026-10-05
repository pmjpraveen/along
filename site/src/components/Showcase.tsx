import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap } from "../gsap";

// A wide row of pastel cards, each a screen of the app. It slides sideways as the page scrolls down, so the row feels like it is being
// pulled across the page rather than sitting still.
export type ShowcaseItem = { n: string; label: string; bg: string; body: ReactNode };

export function Showcase({ items }: { items: ShowcaseItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    // From tablet width up the row is pulled sideways as the page scrolls; on a phone it is a row you swipe, so nothing moves on its own.
    const mm = gsap.matchMedia();
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(row.current, { xPercent: 6 }, { xPercent: -22, ease: "none", scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true } });
    });
    return () => mm.revert();
  }, []);
  return (
    <div ref={ref} className="py-6 md:overflow-hidden">
      <div ref={row} className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:gap-4 md:w-[150%] md:snap-none md:overflow-visible md:px-0 lg:w-[135%] [&::-webkit-scrollbar]:hidden">
        {items.map((it) => (
          <div key={it.n} className="relative flex h-[480px] w-[78vw] max-w-[340px] shrink-0 snap-center flex-col overflow-hidden rounded-[1.75rem] p-6 sm:h-[560px] md:h-[640px] md:w-auto md:max-w-none md:flex-1" style={{ background: it.bg }}>
            <div className="flex items-start justify-between text-sm text-ink/70"><span className="text-2xl font-medium tracking-tight text-ink">{it.label}</span><span>{it.n}</span></div>
            <div className="mt-5 flex flex-1 items-start justify-center overflow-hidden">{it.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// A phone frame around a real screenshot, cut off at the bottom of its card.
export const ShotPhone = ({ src, alt }: { src: string; alt: string }) => (
  <div className="w-[78%] max-w-[300px] overflow-hidden rounded-[2.4rem] border-[8px] border-ink bg-white shadow-[0_24px_60px_-24px_rgba(0,0,0,0.4)]">
    <img src={src} alt={alt} className="block w-full" draggable={false} />
  </div>
);
