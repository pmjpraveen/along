// Small drawings of the app's own screens, built from the same colours and shapes the app uses, so the page shows what the product looks like
// without screenshots.
import type { ReactNode } from "react";

const Row = ({ title, sub, right, dot }: { title: string; sub?: string; right?: string; dot?: string }) => (
  <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-3.5 py-3">
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-soft text-xs font-medium text-[#444]">{dot ?? title[0]}</span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[15px] font-medium text-ink">{title}</span>
      {sub && <span className="block truncate text-xs text-body">{sub}</span>}
    </span>
    {right && <span className="text-sm font-medium tabular-nums text-ink">{right}</span>}
  </div>
);

const Pill = ({ children, on }: { children: ReactNode; on?: boolean }) => (
  <span className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${on ? "bg-[#444] text-white" : "bg-white/70 text-[#444]"}`}>{children}</span>
);

export const PlanMock = () => (
  <div className="flex w-full max-w-sm flex-col gap-3">
    <div className="flex gap-2"><Pill on>Day 1</Pill><Pill>Day 2</Pill><Pill>Day 3</Pill><Pill>Day 4</Pill></div>
    <Row title="Check in at the beach hut" sub="2:00 PM" dot="🏖" />
    <div className="rounded-3xl bg-white/80 p-2">
      <div className="px-2 pb-2 pt-1"><span className="block text-[15px] font-medium">Sunset at Baga Beach</span><span className="text-xs text-body">📍 Baga Beach, Goa</span></div>
      <div className="relative h-24 overflow-hidden rounded-2xl bg-[#e9f1e4]">
        <div className="absolute -left-4 top-0 h-full w-1/2 -skew-x-12 bg-[#bfe9f5]" />
        <span className="absolute left-[46%] top-[38%] size-4 rounded-full border-[3px] border-white bg-[#e0245e] shadow" />
      </div>
    </div>
    <Row title="Seafood dinner" sub="8:00 PM" dot="🍤" />
  </div>
);

export const SplitMock = () => (
  <div className="flex w-full max-w-sm flex-col gap-3">
    <div className="rounded-3xl bg-white/80 px-4 py-4">
      <span className="text-xs text-body">Seafood dinner · paid by Asha</span>
      <span className="mt-1 block text-4xl font-medium tracking-tight tabular-nums">₹3,600.00</span>
    </div>
    <div className="flex gap-2"><Pill on>Equally</Pill><Pill>Amounts</Pill><Pill>Percent</Pill><Pill>Shares</Pill></div>
    <Row title="Asha" right="₹1,200.00" />
    <Row title="Rahul" sub="Guest" right="₹1,200.00" />
    <Row title="Meera" sub="Guest" right="₹1,200.00" />
  </div>
);

export const SettleMock = () => (
  <div className="flex w-full max-w-sm flex-col gap-3">
    <div className="rounded-3xl bg-white/80 px-4 py-4">
      <span className="text-xs text-body">Your balance</span>
      <span className="mt-1 block text-3xl font-medium tracking-tight">You owe ₹800.00</span>
    </div>
    <span className="px-1 pt-1 text-sm font-medium">To settle up</span>
    <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-3.5 py-3">
      <span className="grid size-9 place-items-center rounded-full bg-soft text-xs font-medium text-[#444]">Y</span>
      <span className="flex-1 text-[15px]">You pay <b className="font-medium">Rahul</b> ₹800.00</span>
      <span className="rounded-2xl bg-[#f2f2f2] px-3 py-1.5 text-xs font-medium">Settle up</span>
    </div>
    <span className="px-1 text-xs text-body">Fewest payments that square everyone up. No debits, no ledger, just who owes whom.</span>
  </div>
);

export const GuestMock = () => (
  <div className="flex w-full max-w-sm flex-col gap-3">
    <span className="px-1 text-sm font-medium">Guests</span>
    {["Rahul", "Meera"].map((n) => (
      <div key={n} className="flex items-center gap-3 rounded-2xl bg-white/80 px-3.5 py-3">
        <span className="grid size-10 place-items-center rounded-full border border-dashed border-[#6a6a6a] bg-soft text-sm font-medium text-[#444]">{n[0]}</span>
        <span className="flex-1 text-[15px] font-medium">{n}</span>
        <span className="rounded-2xl bg-[#f2f2f2] px-3.5 py-1.5 text-sm font-medium">Invite</span>
      </div>
    ))}
    <div className="rounded-3xl bg-ink px-4 py-3.5 text-[13px] leading-relaxed text-white">
      👋 Hi Rahul!<br />You’re invited to join <b>Goa beach weekend</b> on along 🌴<br />🗓️ 5 days · 👥 3 guests
    </div>
  </div>
);

export const MemoryMock = () => (
  <div className="flex w-full max-w-sm flex-col gap-3">
    <div className="rounded-3xl bg-white/80 p-2">
      <div className="h-36 rounded-2xl bg-gradient-to-br from-[#ffb36b] via-[#ff7e7e] to-[#7a5cff]" />
      <div className="px-2 pb-1 pt-3"><span className="block text-[15px]">Sunset at Baga was unreal. Best first evening.</span><span className="mt-1 block text-xs text-body">Asha · 3 Oct</span></div>
    </div>
    <div className="rounded-3xl bg-white/80 px-4 py-3.5 text-[15px]">Mist over the coffee estates at 7am. Worth the early start.</div>
  </div>
);

const Stamp = ({ label, place, date, rotate, ink, dashed }: { label: string; place: string; date: string; rotate: number; ink: string; dashed?: boolean }) => (
  <div className="w-44 bg-transparent px-4 py-3 text-center" style={{ transform: `rotate(${rotate}deg)`, color: ink, border: `3px ${dashed ? "dashed" : "double"} ${ink}`, borderRadius: dashed ? 18 : 12 }}>
    <span className="block text-[9px] font-medium tracking-[0.25em]">{label}</span>
    <span className="block text-lg font-semibold tracking-wide">{place}</span>
    <span className="block text-[11px] font-medium tracking-wider">{date}</span>
  </div>
);

export const StampMock = () => (
  <div className="flex flex-col items-center gap-6">
    <Stamp label="ARRIVAL" place="GOA, INDIA" date="01 DEC 2026" rotate={-6} ink="#1c3f8f" dashed />
    <Stamp label="DEPARTURE" place="GOA, INDIA" date="05 DEC 2026" rotate={5} ink="#a3202a" />
  </div>
);
