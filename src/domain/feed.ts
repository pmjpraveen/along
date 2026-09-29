import { formatMinor } from "./money";
import { formatDate, toIso } from "./trip";

export type FeedEvent = {
  id: string; entity_type: "expense" | "itinerary_item" | "member"; action: "created" | "joined" | "claimed" | "guest_added";
  actor: string | null; created_at: string; summary: Record<string, string | number | undefined>;
};

// One plain line per event. A record of what changed, not a social feed: no reactions, no comments.
export function describeEvent(e: Pick<FeedEvent, "entity_type" | "action" | "actor" | "summary">): string {
  const s = e.summary;
  const who = e.actor ?? "Someone";
  if (e.entity_type === "expense") {
    return `${who} added ${s.title} · ${formatMinor(Number(s.amount_minor), Number(s.exponent ?? 2), String(s.currency ?? ""))}, paid by ${s.paid_by}`;
  }
  if (e.entity_type === "itinerary_item") return `${who} added "${s.title}" to the itinerary for ${formatDate(String(s.day))}`;
  if (e.action === "guest_added") return `${who} added ${s.name} as a guest`;
  if (e.action === "claimed") return `${s.name} claimed their spot`;
  return `${s.name} joined the trip`;
}

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
