import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

// An accordion: one answer open at a time, opening with a height and fade on the same ease-out as everything else on the page.
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((it, i) => {
        const on = open === i;
        return (
          <div key={it.q}>
            <button onClick={() => setOpen(on ? null : i)} aria-expanded={on} className="flex w-full items-center justify-between gap-6 py-6 text-left text-xl font-medium tracking-tight md:text-2xl">
              {it.q}
              <motion.span animate={{ rotate: on ? 45 : 0 }} transition={{ duration: 0.25 }} className="grid size-9 shrink-0 place-items-center rounded-full bg-soft text-xl leading-none">+</motion.span>
            </button>
            <AnimatePresence initial={false}>
              {on && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }} className="overflow-hidden">
                  <p className="max-w-2xl pb-7 text-lg leading-relaxed text-body">{it.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
