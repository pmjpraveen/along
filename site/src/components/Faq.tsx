import { useEffect, useRef, useState } from "react";
import { EASE, gsap, reduced } from "../gsap";

// An accordion: one answer open at a time. The answer grows in height and fades on the page's shared ease-out; closed answers are inert.
function Item({ q, a, on, toggle }: { q: string; a: string; on: boolean; toggle: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const plus = useRef<HTMLSpanElement>(null);
  const first = useRef(true);
  useEffect(() => {
    const d = first.current || reduced() ? 0 : 0.35;
    first.current = false;
    gsap.to(panel.current, { height: on ? "auto" : 0, autoAlpha: on ? 1 : 0, duration: d, ease: EASE, overwrite: true });
    gsap.to(plus.current, { rotate: on ? 45 : 0, duration: d ? 0.25 : 0, overwrite: true });
  }, [on]);
  return (
    <div className="rounded-[1.5rem] bg-soft px-5 sm:px-7">
      <button onClick={toggle} aria-expanded={on} className="group flex w-full items-center justify-between gap-5 py-5 text-left text-lg font-medium tracking-tight sm:py-6 md:text-xl">
        {q}
        <span ref={plus} className="grid size-9 shrink-0 place-items-center rounded-full bg-white/70 text-xl leading-none transition-colors duration-150 group-hover:bg-white">+</span>
      </button>
      <div ref={panel} className="overflow-hidden" style={{ height: 0, visibility: "hidden" }}>
        <p className="max-w-2xl pb-6 text-base leading-relaxed text-ink/75 md:text-[17px]">{a}</p>
      </div>
    </div>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="flex flex-col gap-3">
      {items.map((it, i) => <Item key={it.q} {...it} on={open === i} toggle={() => setOpen(open === i ? null : i)} />)}
    </div>
  );
}
