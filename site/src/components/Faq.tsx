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
    gsap.to(panel.current, { height: on ? "auto" : 0, autoAlpha: on ? 1 : 0, duration: d, ease: EASE });
    gsap.to(plus.current, { rotate: on ? 45 : 0, duration: d ? 0.25 : 0 });
  }, [on]);
  return (
    <div>
      <button onClick={toggle} aria-expanded={on} className="flex w-full items-center justify-between gap-6 py-6 text-left text-xl font-medium tracking-tight md:text-2xl">
        {q}
        <span ref={plus} className="grid size-9 shrink-0 place-items-center rounded-full bg-soft text-xl leading-none">+</span>
      </button>
      <div ref={panel} className="overflow-hidden" style={{ height: 0, visibility: "hidden" }}>
        <p className="max-w-2xl pb-7 text-lg leading-relaxed text-body">{a}</p>
      </div>
    </div>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((it, i) => <Item key={it.q} {...it} on={open === i} toggle={() => setOpen(open === i ? null : i)} />)}
    </div>
  );
}
