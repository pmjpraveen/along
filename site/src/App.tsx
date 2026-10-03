import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import Lenis from "lenis";
import { Faq } from "./components/Faq";
import { Logo } from "./components/Logo";
import { GuestMock, MemoryMock, PlanMock, SettleMock, SplitMock, StampMock } from "./components/Mocks";
import { ShotPhone, Showcase } from "./components/Showcase";
import { ProgressiveBlur, ScrollHeadline, StickyStack } from "./components/Skiper";

const APP_STORE = "https://apps.apple.com/app/id6817977368";
const PLAY_STORE = "https://play.google.com/store/apps/details?id=xyz.getalong.app";

const Reveal = ({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) => (
  <motion.div className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, delay, ease: [0.23, 1, 0.32, 1] }}>
    {children}
  </motion.div>
);

const Arrow = () => <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

const StoreButtons = ({ dark = false }: { dark?: boolean }) => {
  const base = "inline-flex items-center justify-center rounded-2xl px-6 py-4 text-[15px] font-medium transition-transform active:scale-[0.98]";
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <a href={APP_STORE} className={`${base} ${dark ? "bg-ink text-white" : "bg-ink text-white"}`}>Download on the App Store</a>
      <a href={PLAY_STORE} className={`${base} ${dark ? "bg-white text-ink" : "bg-[#f2f2f2] text-ink"}`}>Get it on Google Play</a>
    </div>
  );
};

/* The dark floating pill at the top: logo, a white call to action with a coloured arrow, and a menu that drops down. */
function Nav() {
  const [open, setOpen] = useState(false);
  const link = "rounded-xl px-4 py-3 text-lg font-medium text-white/90 hover:bg-white/10";
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-5">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] bg-ink text-white shadow-[0_10px_40px_-12px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between gap-3 py-2.5 pl-5 pr-3 sm:pr-4">
          <a href="/" aria-label="along"><Logo className="h-8 w-auto text-white" /></a>
          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="hidden items-center gap-1 text-sm font-medium text-white/80 md:flex">
              <a href="#features" className="rounded-lg px-3 py-2 hover:text-white">Features</a>
              <a href="#how" className="rounded-lg px-3 py-2 hover:text-white">How it works</a>
              <a href="#faq" className="rounded-lg px-3 py-2 hover:text-white">FAQ</a>
            </nav>
            <a href="#get" className="flex items-center gap-2.5 rounded-full bg-white py-2 pl-5 pr-2 text-[15px] font-medium text-ink">
              Get along <span className="grid size-8 place-items-center rounded-full bg-card-0 text-ink"><Arrow /></span>
            </a>
            <button onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open} className="grid size-10 place-items-center md:hidden">
              <span className="block w-6 space-y-1.5"><motion.span animate={{ rotate: open ? 45 : 0, y: open ? 4 : 0 }} className="block h-0.5 bg-white" /><motion.span animate={{ rotate: open ? -45 : 0, y: open ? -4 : 0 }} className="block h-0.5 bg-white" /></span>
            </button>
          </div>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }} className="overflow-hidden md:hidden">
              <div className="flex flex-col px-3 pb-4">
                <a onClick={() => setOpen(false)} href="#features" className={link}>Features</a>
                <a onClick={() => setOpen(false)} href="#how" className={link}>How it works</a>
                <a onClick={() => setOpen(false)} href="#faq" className={link}>FAQ</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

const cards = [
  { n: "01", label: "Your trips", bg: "var(--color-card-0)", body: <ShotPhone src="/shots/home.jpg" alt="The along home screen with a trip tile" /> },
  { n: "02", label: "Plan together", bg: "var(--color-card-1)", body: <PlanMock /> },
  { n: "03", label: "Split exactly", bg: "var(--color-card-3)", body: <SplitMock /> },
  { n: "04", label: "Your passport", bg: "var(--color-card-2)", body: <ShotPhone src="/shots/profile.jpg" alt="The along profile page with a passport cover" /> },
  { n: "05", label: "Travel stamps", bg: "var(--color-card-5)", body: <ShotPhone src="/shots/stamps.jpg" alt="Travel stamps earned from finished trips" /> },
];

const four = [
  { t: "Your people", d: "Friends with the app, friends without it, and the one who always forgets. All in.", bg: "rgba(255,255,255,0.14)" },
  { t: "Your plans", d: "Day by day, with maps, moves and undo, the same for everyone the moment it changes.", bg: "rgba(255,255,255,0.1)" },
  { t: "Your costs", d: "Who paid, who shares, exact to the last paisa. Never a rounded-away rupee.", bg: "rgba(255,255,255,0.14)" },
  { t: "Your memories", d: "Photos, notes and a pair of stamps for every trip you finish.", bg: "rgba(255,255,255,0.1)" },
];

const features = [
  { bg: "var(--color-card-0)", title: "One plan, everyone on it", text: "Lay the trip out day by day. Add a place and a map shows up on the plan. Drag a day, undo a delete, and everyone sees the same thing the moment it changes.", mock: <PlanMock /> },
  { bg: "var(--color-card-1)", title: "Split it exactly", text: "Say who paid and who shares it: equally, by amounts, by percentage or by shares. Every split adds up to the total, to the last unit.", mock: <SplitMock /> },
  { bg: "var(--color-card-3)", title: "Settle up in plain words", text: "“You owe Rahul ₹800.” That’s it. along works out the fewest payments that square the group, and you record them once they’re paid.", mock: <SettleMock /> },
  { bg: "var(--color-card-4)", title: "Friends join with one tap", text: "Add a friend by name, then send a personal invite with the trip, the days and a link. Already on along? Add them straight in by email.", mock: <GuestMock /> },
  { bg: "var(--color-card-2)", title: "Keep the memories", text: "Drop in photos and notes as the trip happens. Everyone on the trip sees them, long after it’s over.", mock: <MemoryMock /> },
  { bg: "var(--color-card-5)", title: "Collect travel stamps", text: "Finish a trip and you earn an arrival and a departure stamp, each a different shape and ink, pressed into your own travel stamps page.", mock: <StampMock /> },
];

const steps = [
  { n: "1", title: "Start a trip", text: "Pick a place and the dates. along gives it a colour of its own." },
  { n: "2", title: "Bring your people", text: "Share an invite link, add a friend by name, or add someone already on the app." },
  { n: "3", title: "Go make memories", text: "Plan, spend and settle in a couple of taps. We’ll keep the receipts of the fun." },
];

const notes = [
  { bg: "var(--color-card-0)", t: "Works with no signal", d: "Add an expense in the middle of nowhere. It saves on your phone and syncs once, when you’re back online." },
  { bg: "var(--color-card-1)", t: "Guests are first-class", d: "A friend without the app still has a seat: in the plan, the splits and the balances, until they join and take it over." },
  { bg: "var(--color-card-3)", t: "Any currency", d: "Pick your trip’s currency from every ISO currency. Amounts are never converted, so they never drift." },
];

const faqs = [
  { q: "Is along free?", a: "Yes, it’s free to start. Sign in with Google, create a trip and bring your group. There are no adverts, and your data is never sold." },
  { q: "Do my friends need the app?", a: "No. You can add a friend by name and include them in the plan and the splits right away. When they’re ready, send them a personal invite and they take over their own spot." },
  { q: "Does along move money?", a: "No. along keeps the record: who paid, who owes whom, and the fewest payments to square up. You pay each other however you like, then mark it paid." },
  { q: "Who can see my trip?", a: "Only the people on it. Anyone with an invite link sees just the trip’s name, place, dates and head-count until they join." },
  { q: "Which phones does it run on?", a: "iPhone and Android, with the same features on both." },
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
      <motion.div className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-card-0" style={{ scaleX: bar }} />
      <Nav />

      <main>
        <section className="relative px-5 pt-36 text-center sm:pt-44">
          <ProgressiveBlur height={90} />
          <Reveal>
            <span className="inline-flex items-center gap-2.5 rounded-full bg-soft px-4 py-2 text-sm text-ink"><span className="size-2.5 rounded-full bg-card-0" />Plan together. Settle fairly. Remember everything.</span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mx-auto mt-8 max-w-5xl text-[clamp(3.4rem,11.5vw,10rem)] font-normal leading-[0.92] tracking-[-0.065em]">Every trip,<br />with everyone along.</h1>
          </Reveal>
          <Reveal delay={0.16}><p className="mx-auto mt-8 max-w-xl text-xl leading-relaxed text-body md:text-2xl">Plan the days. Split the costs. Keep the memories.</p></Reveal>
          <Reveal delay={0.24} className="mt-10"><StoreButtons /></Reveal>
        </section>

        <section className="mt-16 px-3 sm:px-5"><Showcase items={cards} /></section>

        <section className="py-[18vh]"><ScrollHeadline lines={["a group of friends.", "one plan. everyone even."]} /></section>

        <section className="px-3 sm:px-5">
          <Reveal>
            <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#4da3ef] px-6 py-14 text-white sm:px-12 md:py-20">
              <h2 className="max-w-3xl text-[clamp(2.6rem,7vw,5.5rem)] font-normal leading-[0.98] tracking-[-0.055em]">Everything for the trip. Nothing in the way.</h2>
              <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {four.map((f, i) => (
                  <motion.div key={f.t} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.08, ease: [0.23, 1, 0.32, 1] }} className="rounded-3xl p-6" style={{ background: f.bg }}>
                    <h3 className="text-2xl font-medium tracking-tight">{f.t}</h3>
                    <p className="mt-3 leading-relaxed text-white/85">{f.d}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        <section id="features" className="mt-[10vh] scroll-mt-10">
          <StickyStack items={features.map((f) => ({ bg: f.bg, body: (
            <>
              <div className="flex flex-1 flex-col justify-center gap-4 p-8 md:p-12">
                <h2 className="text-3xl font-normal leading-tight tracking-[-0.04em] md:text-5xl">{f.title}</h2>
                <p className="max-w-md text-[17px] leading-relaxed text-[#444]">{f.text}</p>
              </div>
              <div className="flex flex-1 items-center justify-center overflow-hidden p-6 pb-8 md:p-10">{f.mock}</div>
            </>
          ) }))} />
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-10 px-5 py-[16vh]">
          <Reveal><h2 className="max-w-3xl text-[clamp(2.4rem,6vw,5rem)] font-normal leading-[1] tracking-[-0.055em]">From “we should go” to “we’re even.”</h2></Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <div className="h-full rounded-[1.75rem] bg-soft p-7">
                  <span className="text-6xl font-normal tracking-[-0.06em] text-ink/20">{s.n}</span>
                  <h3 className="mt-6 text-2xl font-medium tracking-tight">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-body">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-[14vh]">
          <Reveal><h2 className="max-w-3xl text-[clamp(2.2rem,5.5vw,4.5rem)] font-normal leading-[1] tracking-[-0.055em]">Less “who’s paid what?” More “remember when?”</h2></Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {notes.map((n, i) => (
              <Reveal key={n.t} delay={i * 0.1}>
                <div className="flex h-full min-h-[260px] flex-col justify-between rounded-[1.75rem] p-7" style={{ background: n.bg }}>
                  <h3 className="text-2xl font-medium tracking-tight">{n.t}</h3>
                  <p className="mt-10 leading-relaxed text-[#444]">{n.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-4xl scroll-mt-10 px-5 pb-[14vh]">
          <Reveal><h2 className="mb-10 text-[clamp(2.4rem,6vw,4.5rem)] font-normal tracking-[-0.055em]">Good to know.</h2></Reveal>
          <Reveal><Faq items={faqs} /></Reveal>
        </section>

        <section id="get" className="px-3 pb-10 sm:px-5">
          <Reveal>
            <div className="mx-auto max-w-6xl rounded-[2rem] bg-[#f7f8fa] px-6 py-20 text-center md:py-28">
              <Logo className="mx-auto h-12 w-auto text-ink" />
              <h2 className="mx-auto mt-8 max-w-4xl text-[clamp(2.8rem,8vw,6.5rem)] font-normal leading-[0.96] tracking-[-0.06em]">Your people. Your places. along.</h2>
              <p className="mx-auto mt-5 max-w-md text-lg text-body">Free to start. Sign in with Google and bring your group.</p>
              <div className="mt-9"><StoreButtons /></div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-5 pb-12 pt-6 text-sm text-body">
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <span>© {new Date().getFullYear()} Along · Hubballi, Karnataka, India</span>
          <nav className="flex flex-wrap gap-5">
            <a href="/privacy" className="hover:text-ink">Privacy policy</a>
            <a href="/terms" className="hover:text-ink">Terms of use</a>
            <a href="mailto:alongtravel.app@gmail.com" className="hover:text-ink">alongtravel.app@gmail.com</a>
          </nav>
        </div>
        <p className="mt-6 text-xs">Layout inspired by oneplan.space. Scroll effects adapted from <a className="underline" href="https://skiper-ui.com">Skiper UI</a>, animated with <a className="underline" href="https://motion.dev">motion.dev</a>.</p>
      </footer>
    </>
  );
}
