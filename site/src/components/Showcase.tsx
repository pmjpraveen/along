import { motion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

// A wide row of pastel cards, each a screen of the app. It slides sideways as the page scrolls down, so the row feels like it is being
// pulled across the page rather than sitting still.
export type ShowcaseItem = { n: string; label: string; bg: string; body: ReactNode };

export function Showcase({ items }: { items: ShowcaseItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ["6%", "-22%"]);
  return (
    <div ref={ref} className="overflow-hidden py-6">
      <motion.div style={{ x }} className="flex w-[260%] gap-4 sm:w-[180%] md:w-[150%] lg:w-[135%]">
        {items.map((it) => (
          <div key={it.n} className="relative flex h-[440px] flex-1 flex-col overflow-hidden rounded-[1.75rem] p-6 sm:h-[560px] md:h-[640px]" style={{ background: it.bg }}>
            <div className="flex items-start justify-between text-sm text-body"><span className="text-2xl font-medium tracking-tight text-ink">{it.label}</span><span>{it.n}</span></div>
            <div className="mt-5 flex flex-1 items-start justify-center overflow-hidden">{it.body}</div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// A phone frame around a real screenshot, cut off at the bottom of its card.
export const ShotPhone = ({ src, alt }: { src: string; alt: string }) => (
  <div className="w-[78%] max-w-[300px] overflow-hidden rounded-[2.4rem] border-[8px] border-ink bg-white shadow-[0_24px_60px_-24px_rgba(0,0,0,0.4)]">
    <img src={src} alt={alt} className="block w-full" draggable={false} />
  </div>
);
