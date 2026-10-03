import { motion, useScroll, useSpring } from "motion/react";
import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { Logo } from "./components/Logo";
import { GuestMock, MemoryMock, PlanMock, SettleMock, SplitMock, StampMock } from "./components/Mocks";
import { ProgressiveBlur, ScrollHeadline, StickyStack } from "./components/Skiper";

const APP_STORE = "https://apps.apple.com/app/id6817977368";
const PLAY_STORE = "https://play.google.com/store/apps/details?id=xyz.getalong.app";

const Reveal = ({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) => (
  <motion.div className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, delay, ease: [0.23, 1, 0.32, 1] }}>
    {children}
  </motion.div>
);

const StoreButtons = ({ dark = false }: { dark?: boolean }) => {
  const base = "inline-flex items-center justify-center rounded-2xl px-6 py-4 text-[15px] font-medium transition-transform active:scale-[0.98]";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href={APP_STORE} className={`${base} ${dark ? "bg-white text-ink" : "bg-ink text-white"}`}>Download on the App Store</a>
      <a href={PLAY_STORE} className={`${base} ${dark ? "bg-white/15 text-white" : "bg-[#f2f2f2] text-ink"}`}>Get it on Google Play</a>
    </div>
  );
};

const features = [
  { bg: "var(--color-card-0)", title: "One plan, everyone on it", text: "Lay the trip out day by day. Add a place and a map shows up on the plan. Drag a day, undo a delete, and everyone sees the same thing the moment it changes.", mock: <PlanMock /> },
  { bg: "var(--color-card-1)", title: "Split it exactly", text: "Say who paid and who shares it: equally, by amounts, by percentage or by shares. It never rounds a rupee away, and every split adds up to the total.", mock: <SplitMock /> },
  { bg: "var(--color-card-3)", title: "Settle up in plain words", text: "“You owe Rahul ₹800.” That’s it. along works out the fewest payments that square the group, and you record them once they’re paid.", mock: <SettleMock /> },
  { bg: "var(--color-card-4)", title: "Friends join with one tap", text: "Add a friend by name, then send a personal invite with the trip, the days and a link. When they join, they take over their own spot. Already on along? Add them by email.", mock: <GuestMock /> },
  { bg: "var(--color-card-2)", title: "Keep the memories", text: "Drop in photos and notes as the trip happens. Everyone on the trip sees them, and they stay with the trip long after it’s over.", mock: <MemoryMock /> },
  { bg: "var(--color-card-5)", title: "Collect travel stamps", text: "Finish a trip and you earn an arrival and a departure stamp, each a different shape and ink, pressed into your own travel stamps page.", mock: <StampMock /> },
];

const steps = [
  { n: "1", title: "Start a trip", text: "Pick a place and the dates. along gives it a colour of its own." },
  { n: "2", title: "Bring everyone along", text: "Share an invite link, add a friend by name, or add someone already on the app." },
  { n: "3", title: "Plan, spend, settle", text: "Add plans, log what you paid, and settle up in a couple of taps when it’s over." },
];

const small = [
  ["Works offline", "Add an expense with no signal. It saves on your phone and syncs once, when you’re back online."],
  ["Private by design", "Only the people on a trip can see it. No adverts, no selling your data."],
  ["Guests are first-class", "Friends without the app still get a seat: they’re in the plan, the splits and the balances."],
  ["Any currency", "Pick your trip’s currency from every ISO currency. Amounts are never converted, so they never drift."],
];

export function App() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.1 });
    let id = requestAnimationFrame(function raf(t) { lenis.raf(t); id = requestAnimationFrame(raf); });
    return () => { cancelAnimationFrame(id); lenis.destroy(); };
  }, []);
  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });

  return (
    <>
      <motion.div className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-ink" style={{ scaleX: bar }} />
      <header className="fixed inset-x-0 top-0 z-40">
        <ProgressiveBlur height={96} />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <a href="/" aria-label="along"><Logo className="h-8 w-auto text-ink" /></a>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <a href="#features" className="hidden text-body hover:text-ink sm:block">Features</a>
            <a href="#how" className="hidden text-body hover:text-ink sm:block">How it works</a>
            <a href="#get" className="rounded-full bg-ink px-4 py-2 text-white">Get the app</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative flex min-h-[92vh] flex-col items-center justify-center px-5 pb-10 pt-32 text-center">
          <Reveal><span className="rounded-full bg-soft px-4 py-1.5 text-xs font-medium text-body">For groups on a trip · iOS and Android</span></Reveal>
          <Reveal delay={0.08}>
            <h1 className="mx-auto mt-6 max-w-4xl text-[clamp(2.8rem,9vw,7rem)] font-medium leading-[0.98] tracking-[-0.05em]">Plan the trip. <span className="text-body">Split the costs.</span> Keep the memories.</h1>
          </Reveal>
          <Reveal delay={0.16}><p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-body">along is where your group plans together, knows exactly who owes whom, and holds on to the whole trip afterwards.</p></Reveal>
          <Reveal delay={0.24} className="mt-9"><StoreButtons /></Reveal>
          <motion.div aria-hidden className="mt-14 flex gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            {["card-0", "card-1", "card-2", "card-3", "card-4", "card-5"].map((c, i) => (
              <motion.span key={c} className="h-3 w-12 rounded-full sm:w-20" style={{ background: `var(--color-${c})` }} animate={{ scaleX: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 3.2, delay: i * 0.18, ease: "easeInOut" }} />
            ))}
          </motion.div>
        </section>

        <section className="py-[18vh]"><ScrollHeadline lines={["everything the trip", "needs, in one place"]} /></section>

        <section id="features" className="scroll-mt-10">
          <StickyStack items={features.map((f) => ({ bg: f.bg, body: (
            <>
              <div className="flex flex-1 flex-col justify-center gap-4 p-8 md:p-12">
                <h2 className="text-3xl font-medium leading-tight tracking-[-0.03em] md:text-5xl">{f.title}</h2>
                <p className="max-w-md text-[17px] leading-relaxed text-[#444]">{f.text}</p>
              </div>
              <div className="flex flex-1 items-center justify-center overflow-hidden p-6 pb-8 md:p-10">{f.mock}</div>
            </>
          ) }))} />
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-10 px-5 py-[16vh]">
          <Reveal><h2 className="max-w-2xl text-4xl font-medium tracking-[-0.04em] md:text-6xl">Three steps from “we should go” to “we’re even.”</h2></Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <div className="h-full rounded-[1.75rem] bg-soft p-7">
                  <span className="grid size-10 place-items-center rounded-full bg-ink text-sm font-medium text-white">{s.n}</span>
                  <h3 className="mt-6 text-xl font-medium">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-body">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-[14vh]">
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {small.map(([t, d], i) => (
              <Reveal key={t} delay={(i % 2) * 0.08}>
                <div className="border-t border-line pt-5"><h3 className="text-lg font-medium">{t}</h3><p className="mt-1.5 leading-relaxed text-body">{d}</p></div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="get" className="px-4 pb-10">
          <Reveal>
            <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-ink px-6 py-20 text-center text-white md:py-28">
              <Logo className="mx-auto h-14 w-auto text-white" />
              <h2 className="mx-auto mt-8 max-w-3xl text-4xl font-medium tracking-[-0.04em] md:text-6xl">Your next trip, with everyone along.</h2>
              <p className="mx-auto mt-4 max-w-md text-white/70">Free to start. Sign in with Google and bring your group.</p>
              <div className="mt-9 flex justify-center"><StoreButtons dark /></div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-5 pb-12 pt-10 text-sm text-body">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
          <span>© {new Date().getFullYear()} Along · Hubballi, Karnataka, India</span>
          <nav className="flex flex-wrap gap-5">
            <a href="/privacy" className="hover:text-ink">Privacy policy</a>
            <a href="/terms" className="hover:text-ink">Terms of use</a>
            <a href="mailto:alongtravel.app@gmail.com" className="hover:text-ink">alongtravel.app@gmail.com</a>
          </nav>
        </div>
        <p className="mt-6 text-xs">Scroll effects adapted from <a className="underline" href="https://skiper-ui.com">Skiper UI</a>, animated with <a className="underline" href="https://motion.dev">motion.dev</a>.</p>
      </footer>
    </>
  );
}
