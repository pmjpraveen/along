import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { EASE, gsap, reduced } from "./gsap";
import { Faq } from "./components/Faq";
import { FooterLogo } from "./components/FooterLogo";
import { Logo } from "./components/Logo";
import { GuestMock, MemoryMock } from "./components/Mocks";
import { ShotPhone, Showcase } from "./components/Showcase";
import { ProgressiveBlur, ScrollHeadline, StickyStack } from "./components/Skiper";

const APP_STORE = "https://apps.apple.com/app/id6817977368";
const PLAY_STORE = "https://play.google.com/store/apps/details?id=xyz.getalong.app";

// Fades and lifts its content in once, as it scrolls into view. With Reduce Motion on it just shows.
const Reveal = ({ children, delay = 0, className = "", style }: { children: ReactNode; delay?: number; className?: string; style?: CSSProperties }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reduced()) return;
    const tween = gsap.from(ref.current, { opacity: 0, y: 28, duration: 0.7, delay, ease: EASE, scrollTrigger: { trigger: ref.current, start: "top bottom-=80", once: true } });
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }, [delay]);
  return <div ref={ref} className={className} style={style}>{children}</div>;
};

const Arrow = () => <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

// Drifts its content up and down forever (a few pixels, slowly): hero stickers and background colour. Holds still with Reduce Motion.
const Float = ({ children, className = "", dy = 12, dx = 0, dur = 3.4, delay = 0, decorative = false }: { children?: ReactNode; className?: string; dy?: number; dx?: number; dur?: number; delay?: number; decorative?: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reduced()) return;
    const tween = gsap.to(ref.current, { y: dy, x: dx, duration: dur, delay, ease: "sine.inOut", yoyo: true, repeat: -1 });
    return () => { tween.kill(); };
  }, [dy, dx, dur, delay]);
  return <div ref={ref} className={className} aria-hidden={decorative || undefined}>{children}</div>;
};

const Sticker = ({ bg, rot, className, children }: { bg: string; rot: number; className: string; children: ReactNode }) => (
  <Float decorative className={`absolute hidden lg:block ${className}`} dy={14} dur={3 + (rot % 3) * 0.4} delay={Math.abs(rot) * 0.2}>
    <div className="whitespace-nowrap rounded-2xl px-4 py-3 text-[15px] font-medium text-ink shadow-[0_14px_30px_-14px_rgba(0,0,0,0.35)]" style={{ background: bg, transform: `rotate(${rot}deg)` }}>{children}</div>
  </Float>
);

/* A slanted ink band of colourful pills that runs sideways forever. */
const MARQUEE = ["Plan together", "Split exactly", "Settle up", "Keep the memories", "Collect stamps"];
const PILL = ["var(--color-card-0)", "var(--color-card-5)", "var(--color-card-3)", "var(--color-card-4)", "var(--color-card-1)"];
function Marquee() {
  const track = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reduced()) return;
    const tween = gsap.to(track.current, { xPercent: -50, duration: 30, ease: "none", repeat: -1 });
    return () => { tween.kill(); };
  }, []);
  const row = MARQUEE.map((m, i) => (
    <span key={m} className="flex shrink-0 items-center gap-6 pr-6"><span className="rounded-full px-6 py-3 text-xl font-medium text-ink md:text-3xl" style={{ background: PILL[i % PILL.length] }}>{m}</span><span aria-hidden className="text-2xl text-white/40">✦</span></span>
  ));
  return (
    <div className="overflow-hidden py-10" aria-hidden>
      <div className="-rotate-[1.6deg] scale-[1.04] bg-ink py-5"><div ref={track} className="flex w-max">{row}{row}{row}{row}</div></div>
    </div>
  );
}

const StoreButtons = ({ dark = false }: { dark?: boolean }) => {
  const base = "inline-flex items-center justify-center rounded-full px-7 py-4 text-[15px] font-medium transition duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.97]";
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <a href={APP_STORE} className={`${base} bg-ink text-white hover:bg-black`}>Download on the App Store</a>
      <a href={PLAY_STORE} className={`${base} ${dark ? "bg-white text-ink hover:bg-white/85" : "bg-[#f2f2f2] text-ink hover:bg-[#e8e8e8]"}`}>Get it on Google Play</a>
    </div>
  );
};

/* The dark floating pill at the top: logo, a white call to action with a coloured arrow, and a menu that drops down. */
function Nav() {
  const [open, setOpen] = useState(false);
  const link = "rounded-xl px-4 py-3 text-lg font-medium text-ink transition-colors duration-150 hover:bg-black/5";
  const panel = useRef<HTMLDivElement>(null), top = useRef<HTMLSpanElement>(null), bottom = useRef<HTMLSpanElement>(null);
  const first = useRef(true);
  useEffect(() => {
    const duration = first.current || reduced() ? 0 : 0.3;
    first.current = false;
    gsap.to(panel.current, { height: open ? "auto" : 0, duration, ease: EASE, overwrite: true });
    gsap.to(top.current, { rotate: open ? 45 : 0, y: open ? 4 : 0, duration, overwrite: true });
    gsap.to(bottom.current, { rotate: open ? -45 : 0, y: open ? -4 : 0, duration, overwrite: true });
  }, [open]);
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-5">
      <div className="mx-auto max-w-6xl glass overflow-hidden rounded-[1.75rem] bg-white/70 text-ink shadow-[0_10px_40px_-14px_rgba(0,0,0,0.3)] ring-1 ring-black/5 backdrop-blur-xl backdrop-saturate-150">
        <div className="flex items-center justify-between gap-3 py-2.5 pl-5 pr-3 sm:pr-4">
          <a href="/" aria-label="along" className="inline-flex min-h-11 items-center"><Logo className="h-8 w-auto text-ink" /></a>
          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="hidden items-center gap-1 text-sm font-medium text-ink/70 md:flex">
              <a href="#features" className="rounded-lg px-3 py-3 transition-colors duration-150 hover:text-ink">Features</a>
              <a href="#how" className="rounded-lg px-3 py-3 transition-colors duration-150 hover:text-ink">How it works</a>
              <a href="#faq" className="rounded-lg px-3 py-3 transition-colors duration-150 hover:text-ink">FAQ</a>
            </nav>
            <a href="#get" className="flex items-center gap-2.5 whitespace-nowrap rounded-full bg-ink py-2 pl-5 pr-2 text-[15px] font-medium text-white transition duration-150 ease-out hover:bg-black active:scale-[0.97] max-[380px]:gap-2 max-[380px]:pl-4 max-[380px]:text-sm">
              Get along <span className="grid size-8 place-items-center rounded-full bg-card-0 text-ink"><Arrow /></span>
            </a>
            <button onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open} className="grid size-11 place-items-center transition-transform duration-150 ease-out active:scale-90 md:hidden">
              <span className="block w-6 space-y-1.5"><span ref={top} className="block h-0.5 bg-ink" /><span ref={bottom} className="block h-0.5 bg-ink" /></span>
            </button>
          </div>
        </div>
        <div ref={panel} inert={!open} className="overflow-hidden md:hidden" style={{ height: 0 }}>
          <div className="flex flex-col px-3 pb-4">
            <a onClick={() => setOpen(false)} href="#features" className={link}>Features</a>
            <a onClick={() => setOpen(false)} href="#how" className={link}>How it works</a>
            <a onClick={() => setOpen(false)} href="#faq" className={link}>FAQ</a>
          </div>
        </div>
      </div>
    </header>
  );
}

const cards = [
  { n: "01", label: "Your trips", bg: "var(--color-card-0)", body: <ShotPhone src="/shots/home.jpg" alt="The along home screen with a trip tile" /> },
  { n: "02", label: "Plan together", bg: "var(--color-card-1)", body: <ShotPhone src="/shots/plan.jpg" alt="A day of the trip plan with a map" /> },
  { n: "03", label: "Split exactly", bg: "var(--color-card-3)", body: <ShotPhone src="/shots/expenses.jpg" alt="Expenses and what you are owed" /> },
  { n: "04", label: "Settle up", bg: "var(--color-card-2)", body: <ShotPhone src="/shots/balances.jpg" alt="Balances in plain words" /> },
  { n: "05", label: "Travel stamps", bg: "var(--color-card-5)", body: <ShotPhone src="/shots/stamps.jpg" alt="Travel stamps earned from finished trips" /> },
];

const four = [
  { t: "Your people", d: "Friends with the app, friends without it, and the one who always forgets. All in.", bg: "rgba(255,255,255,0.14)" },
  { t: "Your plans", d: "Day by day, with maps, edits, moves and undo, the same for everyone the moment it changes.", bg: "rgba(255,255,255,0.1)" },
  { t: "Your costs", d: "Who paid, who shares, exact to the last paisa. Never a rounded-away rupee.", bg: "rgba(255,255,255,0.14)" },
  { t: "Your memories", d: "Photos, notes, Google Photos links and a pair of stamps for every trip you finish.", bg: "rgba(255,255,255,0.1)" },
];


const features = [
  { bg: "var(--color-card-0)", tag: "Plan", chips: ["Maps on every plan", "Edit and move", "Undo a delete", "Voice notes"], title: "One plan, everyone on it", text: "Lay the trip out day by day. Add a place and a map shows up on the plan. Edit a plan, move it to another day, undo a delete, or tap the mic and say it. Everyone sees the same thing the moment it changes.", shot: "/shots/plan.jpg", alt: "A day of the trip plan with a map" },
  { bg: "var(--color-card-1)", tag: "Costs", chips: ["Equally", "Amounts", "Percent", "Shares"], title: "Split it exactly", text: "Say who paid and who shares it: equally, by amounts, by percentage or by shares. Every split adds up to the total, to the last unit.", shot: "/shots/add-expense.jpg", alt: "Add expense" },
  { bg: "var(--color-card-3)", tag: "Settle up", chips: ["Fewest payments", "Plain words", "Mark as paid"], title: "Settle up in plain words", text: "“You owe Ben ₹4,500.” That’s it. along works out the fewest payments that square the group, and you record them once they’re paid.", shot: "/shots/balances.jpg", alt: "Balances" },
  { bg: "var(--color-card-4)", tag: "Friends", chips: ["Add by name", "Invite link", "Add by email", "Joined or not yet"], title: "Friends join with one tap", text: "Add a friend by name, then send a personal invite with the trip, the days and a link. See who has joined and who hasn’t yet. Already on along? Add them straight in by email.", mock: <GuestMock /> },
  { bg: "var(--color-card-2)", tag: "Memories", chips: ["Photos", "Notes", "Google Photos links", "Edit later"], title: "Keep the memories", text: "Drop in photos, notes and Google Photos links as the trip happens, and edit them later. Everyone on the trip sees them, long after it’s over.", mock: <MemoryMock /> },
  { bg: "var(--color-card-5)", tag: "Stamps", chips: ["Arrival", "Departure", "Every finished trip"], title: "Collect travel stamps", text: "Finish a trip and you earn an arrival and a departure stamp, each a different shape and ink, pressed into your own travel stamps page.", shot: "/shots/stamps.jpg", alt: "Travel stamps" },
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
  const bar = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (reduced()) return;
    const tween = gsap.fromTo(bar.current, { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }, []);

  return (
    <>
      <div ref={bar} className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left scale-x-0 bg-card-0" />
      <Nav />

      <main>
        <section className="relative isolate px-5 pb-6 pt-36 text-center sm:pt-44">
          <ProgressiveBlur height={90} />
          <Float className="absolute -left-24 top-24 -z-10 size-[26rem] rounded-full bg-card-0 opacity-70 blur-3xl" dy={40} dx={30} dur={7} />
          <Float className="absolute -right-24 top-40 -z-10 size-[24rem] rounded-full bg-card-4 opacity-90 blur-3xl" dy={-40} dx={-30} dur={8} />
          <Float className="absolute left-1/3 top-[28rem] -z-10 size-[22rem] rounded-full bg-card-5 opacity-60 blur-3xl" dy={30} dx={-40} dur={9} />
          <Sticker bg="var(--color-card-4)" rot={-6} className="left-[4%] top-[12rem]">You owe Ben ₹4,500</Sticker>
          <Sticker bg="var(--color-card-5)" rot={5} className="right-[4%] top-[11rem]">Everyone’s settled ✓</Sticker>
          <Sticker bg="var(--color-card-3)" rot={4} className="left-[12%] top-[34rem]">Day 2 · Baga Beach</Sticker>
          <Sticker bg="var(--color-card-0)" rot={-4} className="right-[12%] top-[35rem]">12 people going</Sticker>
          <Reveal>
            <span className="inline-flex items-center gap-2.5 rounded-full bg-white/80 px-4 py-2 text-sm text-ink shadow-sm backdrop-blur"><span className="size-2.5 rounded-full bg-card-0" />The group trip planner and expense splitter</span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mx-auto mt-8 max-w-[96rem] text-[clamp(2.7rem,9.4vw,9rem)] font-normal leading-[0.96] tracking-[-0.04em] sm:tracking-[-0.05em] lg:tracking-[-0.065em]">Every trip,<br />with <span className="inline-block -rotate-2 rounded-[0.14em] bg-ink px-[0.14em] pb-[0.05em] text-white">everyone</span> along.</h1>
          </Reveal>
          <Reveal delay={0.16}><p className="mx-auto mt-8 max-w-xl text-xl leading-relaxed text-ink/70 md:text-2xl">Plan the days. Split the costs. Keep the memories.</p></Reveal>
          <Reveal delay={0.24} className="mt-10"><StoreButtons /></Reveal>
        </section>

        <section className="mt-16 px-3 sm:px-5"><Showcase items={cards} /></section>

        <Marquee />

        <section className="py-[14vh]"><ScrollHeadline lines={["a group of friends.", "one plan. [everyone even.]"]} /></section>

        <section className="px-3 sm:px-5">
          <Reveal>
            <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-ink px-6 py-14 text-white sm:px-12 md:py-20">
              <h2 className="max-w-3xl text-[clamp(2.6rem,7vw,5.5rem)] font-normal leading-[0.98] tracking-[-0.035em] sm:tracking-[-0.045em] lg:tracking-[-0.055em]">Everything for the trip. Nothing in the way.</h2>
              <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {four.map((f, i) => (
                  <Reveal key={f.t} delay={i * 0.08} className="rounded-3xl p-6" style={{ background: f.bg }}>
                    <h3 className="text-2xl font-medium tracking-tight">{f.t}</h3>
                    <p className="mt-3 leading-relaxed text-white/75">{f.d}</p>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        <section id="features" className="mt-[10vh] scroll-mt-24">
          <StickyStack items={features.map((f, i) => ({ bg: f.bg, body: (
            <>
              <div className="relative z-10 flex flex-col justify-center gap-3 p-6 pb-4 md:flex-1 sm:p-8 md:gap-4 md:p-10 lg:p-12">
                <div className="flex items-center gap-2 text-sm font-medium"><span className="rounded-full bg-ink px-3 py-1 text-white">{String(i + 1).padStart(2, "0")}</span><span className="rounded-full bg-white/60 px-3 py-1 text-ink/80">{f.tag}</span></div>
                <h2 className="text-[clamp(2rem,4.4vw,3.8rem)] font-normal leading-[1.02] tracking-[-0.035em] sm:tracking-[-0.045em]">{f.title}</h2>
                <p className="max-w-md text-base leading-relaxed text-ink/75 md:text-[17px]">{f.text}</p>
                <ul className="hidden flex-wrap gap-2 sm:flex">{f.chips.map((c) => <li key={c} className="rounded-full bg-white/60 px-3 py-1.5 text-sm text-ink/80">{c}</li>)}</ul>
              </div>
              <div className="relative m-2 mt-0 flex flex-1 items-start justify-center overflow-hidden rounded-[1.75rem] bg-white/40 px-5 pt-5 md:m-3 md:ml-0 md:items-end md:px-8 md:pt-0">
                {f.shot
                  ? <div className={`relative w-[78%] max-w-[380px] md:w-[90%] md:translate-y-[9%] ${i % 2 ? "rotate-[2deg]" : "-rotate-[2deg]"}`}><ShotPhone src={f.shot} alt={f.alt ?? ""} /></div>
                  : <div className="relative w-full max-w-sm self-center py-6">{f.mock}</div>}
              </div>
            </>
          ) }))} />
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-[16vh]">
          <Reveal><h2 className="max-w-3xl text-[clamp(2.4rem,6vw,5rem)] font-normal leading-[1] tracking-[-0.035em] sm:tracking-[-0.045em] lg:tracking-[-0.055em]">From “we should go” to “we’re even.”</h2></Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <div className="h-full rounded-[1.75rem] p-7 transition-transform duration-200 ease-out hover:-translate-y-1 hover:-rotate-1" style={{ background: PILL[(i + 1) % PILL.length] }}>
                  <span className="text-7xl font-normal tracking-[-0.04em] sm:tracking-[-0.05em] lg:tracking-[-0.06em] text-ink/30">{s.n}</span>
                  <h3 className="mt-6 text-2xl font-medium tracking-tight">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink/75">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-[14vh]">
          <Reveal><h2 className="max-w-3xl text-[clamp(2.2rem,5.5vw,4.5rem)] font-normal leading-[1] tracking-[-0.035em] sm:tracking-[-0.045em] lg:tracking-[-0.055em]">Less “who’s paid what?” More “remember when?”</h2></Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {notes.map((n, i) => (
              <Reveal key={n.t} delay={i * 0.1}>
                <div className="flex h-full min-h-[260px] flex-col justify-between rounded-[1.75rem] p-7 transition-transform duration-200 ease-out hover:-translate-y-1 hover:rotate-1" style={{ background: n.bg }}>
                  <h3 className="text-2xl font-medium tracking-tight">{n.t}</h3>
                  <p className="mt-10 leading-relaxed text-[#444]">{n.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto grid max-w-6xl scroll-mt-24 gap-8 px-5 pb-[14vh] md:grid-cols-[0.85fr_1.4fr] md:gap-14">
          <Reveal className="md:sticky md:top-28 md:self-start">
            <span className="text-sm font-medium text-ink/60">FAQ</span>
            <h2 className="mt-3 text-[clamp(2.6rem,5.4vw,4.6rem)] font-normal leading-[1] tracking-[-0.035em] sm:tracking-[-0.045em] lg:tracking-[-0.055em]">Good to<br />know.</h2>
            <p className="mt-5 max-w-xs text-lg text-ink/70">Quick answers before you pack.</p>
            <a href="mailto:alongtravel.app@gmail.com" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-soft px-6 text-[15px] font-medium text-ink transition duration-150 ease-out hover:bg-[#e8e8e8] active:scale-[0.97]">Ask us anything</a>
          </Reveal>
          <Reveal><Faq items={faqs} /></Reveal>
        </section>

        <section id="get" className="scroll-mt-24 px-3 pb-12 pt-[4vh] sm:px-5">
          <Reveal>
            <div className="relative mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] bg-card-0 md:grid-cols-[1.15fr_1fr] md:items-stretch">
              <Float decorative className="absolute -left-16 -top-16 size-64 rounded-full bg-card-5/70 blur-2xl" dy={20} dx={16} dur={7} />
              <div className="relative flex flex-col justify-center p-8 sm:p-12 md:p-14">
                <h2 className="text-[clamp(2.6rem,6.2vw,5.2rem)] font-normal leading-[0.98] tracking-[-0.04em] sm:tracking-[-0.05em] lg:tracking-[-0.06em]">Your people.<br />Your places.<br /><span className="inline-block -rotate-2 rounded-[0.14em] bg-ink px-[0.14em] pb-[0.05em] text-white">along.</span></h2>
                <p className="mt-6 max-w-md text-lg text-ink/75">Free to start. Sign in with Google, make a trip and bring your group.</p>
                <div className="mt-8 [&>div]:!justify-start"><StoreButtons /></div>
                <p className="mt-4 text-sm text-ink/70">iPhone and Android, the same on both.</p>
              </div>
              <div className="relative flex items-end justify-center px-8 pt-4 md:justify-end md:px-14 md:pt-14">
                <div className="w-full max-w-[320px] translate-y-10 rotate-[4deg] md:translate-y-14"><ShotPhone src="/shots/home.jpg" alt="The along home screen" /></div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <div className="pt-4"><FooterLogo /></div>

      <footer className="mx-auto max-w-6xl px-5 pb-12 pt-6 text-sm text-body">
        <nav aria-label="Guides" className="flex flex-wrap gap-x-5 border-t border-line pt-5">
          <span className="py-3 font-medium text-ink lg:py-1">Guides</span>
          {[["/split-trip-expenses", "Split trip expenses"], ["/group-trip-planner", "Group trip planner"], ["/trip-expense-tracker", "Trip expense tracker"], ["/along-vs-wanderlog", "along vs Wanderlog"], ["/along-vs-oneplan", "along vs OnePlan"]].map(([h, l]) => <a key={h} href={h} className="inline-block py-3 transition-colors duration-150 hover:text-ink lg:py-1">{l}</a>)}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <span>© {new Date().getFullYear()} Along · Hubballi, Karnataka, India</span>
          <nav className="flex flex-wrap gap-x-5">
            <a href="/privacy" className="inline-block py-3 transition-colors duration-150 hover:text-ink lg:py-1">Privacy policy</a>
            <a href="/terms" className="inline-block py-3 transition-colors duration-150 hover:text-ink lg:py-1">Terms of use</a>
            <a href="/delete-account" className="inline-block py-3 transition-colors duration-150 hover:text-ink lg:py-1">Delete account</a>
            <a href="mailto:alongtravel.app@gmail.com" className="inline-block py-3 transition-colors duration-150 hover:text-ink lg:py-1">alongtravel.app@gmail.com</a>
          </nav>
        </div>
      </footer>
    </>
  );
}
