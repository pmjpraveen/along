import { formatMinor } from "./money";
import { formatDate, short, toIso } from "./trip";

export type FeedEvent = {
  id: string; entity_type: "expense" | "itinerary_item" | "member"; action: "created" | "joined" | "claimed" | "guest_added";
  actor: string | null; created_at: string; summary: Record<string, string | number | undefined>;
};

// One line per event as pieces, so the names and titles can be drawn bold. Joined together they are the plain sentence.
// A record of what changed, not a social feed: no reactions, no comments.
export type Part = { text: string; bold?: boolean };
export function describeParts(e: Pick<FeedEvent, "entity_type" | "action" | "actor" | "summary">): Part[] {
  const s = e.summary;
  const who: Part = { text: e.actor ?? "Someone", bold: true };
  if (e.entity_type === "expense") {
    return [who, { text: " added " }, { text: String(s.title), bold: true }, { text: ` · ${formatMinor(Number(s.amount_minor), Number(s.exponent ?? 2), String(s.currency ?? ""))}, paid by ` }, { text: String(s.paid_by), bold: true }];
  }
  if (e.entity_type === "itinerary_item") return [who, { text: " added " }, { text: String(s.title), bold: true }, { text: " to the plan for " }, { text: short(String(s.day)), bold: true }];
  if (e.action === "guest_added") return [who, { text: " added " }, { text: String(s.name), bold: true }, { text: " as a guest" }];
  if (e.action === "claimed") return [{ text: String(s.name), bold: true }, { text: " claimed their spot" }];
  return [{ text: String(s.name), bold: true }, { text: " joined the trip" }];
}
export const describeEvent = (e: Pick<FeedEvent, "entity_type" | "action" | "actor" | "summary">): string => describeParts(e).map((p) => p.text).join("");

const pad = (n: number) => String(n).padStart(2, "0");

// "Today 14:05", "Yesterday 09:10", otherwise "02-12-2026 18:30". `now` is passed in so this stays pure.
export function whenLabel(createdAt: string, now: Date): string {
  const d = new Date(createdAt);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const day = toIso(d);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (day === toIso(now)) return `Today ${time}`;
  if (day === toIso(yesterday)) return `Yesterday ${time}`;
  return `${formatDate(day)} ${time}`;
}

// Events since the viewer last looked. With no record of a previous visit nothing is marked, so a first visit is not a wall of "New".
export const isNew = (createdAt: string, lastSeen: string | null): boolean => lastSeen !== null && createdAt > lastSeen;

// The heading a day's events sit under: "Today", "Yesterday", or the date.
export function dayHeading(createdAt: string, now: Date): string {
  const day = toIso(new Date(createdAt));
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return day === toIso(now) ? "Today" : day === toIso(yesterday) ? "Yesterday" : formatDate(day);
}

// "10:09 AM"
export function clock12(createdAt: string): string {
  const d = new Date(createdAt);
  const h = d.getHours() % 12 || 12;
  return `${pad(h)}:${pad(d.getMinutes())} ${d.getHours() < 12 ? "AM" : "PM"}`;
}

// Events in order, split into a section per day.
export function groupByDayHeading<T extends { created_at: string }>(events: T[], now: Date): { heading: string; events: T[] }[] {
  const out: { heading: string; events: T[] }[] = [];
  for (const e of events) {
    const heading = dayHeading(e.created_at, now);
    const last = out[out.length - 1];
    if (last && last.heading === heading) last.events.push(e);
    else out.push({ heading, events: [e] });
  }
  return out;
}
