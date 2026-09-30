import { formatMinor } from "./money";
import { formatDate } from "./trip";

export type NotificationType = "trip_invitation" | "itinerary_change" | "new_expense" | "balance_change" | "settlement_update";
export type Notification = {
  id: string; trip_id: string | null; type: NotificationType; read_at: string | null; created_at: string;
  payload: Record<string, string | number | undefined>;
};

export const TYPE_LABEL: Record<NotificationType, string> = {
  trip_invitation: "People joining", itinerary_change: "Itinerary changes", new_expense: "New expenses",
  balance_change: "Balance changes", settlement_update: "Payments",
};
export const TYPES = Object.keys(TYPE_LABEL) as NotificationType[];

// The server stores who / what / how much; this words it. Plain language, never debit or credit.
// The notification as pieces, so names and titles can be drawn bold; joined together they are the plain sentence.
export type Part = { text: string; bold?: boolean };
const B = (text: unknown): Part => ({ text: String(text), bold: true });
const T = (text: string): Part => ({ text });

export function describeParts(n: Pick<Notification, "type" | "payload">): Part[] {
  const p = n.payload;
  const money = () => formatMinor(Number(p.amount_minor), Number(p.exponent ?? 2), String(p.currency ?? ""));
  switch (n.type) {
    case "trip_invitation":
      return [B(p.actor), T(p.action === "claimed" ? " claimed their spot in " : " joined "), B(p.trip)];
    case "itinerary_change":
      return p.action === "moved" ? [B(p.actor), T(" moved "), B(`"${p.title}"`), T(" to "), B(formatDate(String(p.day)))] : [B(p.actor), T(" added "), B(`"${p.title}"`), T(" to "), B(p.trip)];
    case "new_expense":
      return [B(p.actor), T(" added "), B(p.title), T(` · ${money()}`)];
    case "balance_change":
      return p.action === "edited" ? [B(p.actor), T(" edited "), B(p.title), T(". Your balance changed.")] : [B(p.actor), T(" added "), B(p.title), T(` (${money()}). Your balance changed.`)];
    case "settlement_update":
      return p.kind === "reversal" ? [B(p.from), T(`'s payment of ${money()} to `), B(p.to), T(" was reversed")] : [B(p.from), T(" paid "), B(p.to), T(` ${money()}`)];
  }
}

export const describeNotification = (n: Pick<Notification, "type" | "payload">): string => describeParts(n).map((x) => x.text).join("");

// Who the notification is about, for its avatar.
export const notificationActor = (n: Pick<Notification, "type" | "payload">): string => String(n.payload.actor ?? n.payload.from ?? "?");

// Where tapping a notification should take you within its trip.
export const routeFor = (t: NotificationType): "people" | "itinerary" | "expenses" | "balances" =>
  ({ trip_invitation: "people", itinerary_change: "itinerary", new_expense: "expenses", balance_change: "balances", settlement_update: "balances" } as const)[t];
