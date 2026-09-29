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
export function describeNotification(n: Pick<Notification, "type" | "payload">): string {
  const p = n.payload;
  const money = () => formatMinor(Number(p.amount_minor), Number(p.exponent ?? 2), String(p.currency ?? ""));
  switch (n.type) {
    case "trip_invitation":
      return `${p.actor} ${p.action === "claimed" ? "claimed their spot in" : "joined"} ${p.trip}`;
    case "itinerary_change":
      return p.action === "moved" ? `${p.actor} moved "${p.title}" to ${formatDate(String(p.day))}` : `${p.actor} added "${p.title}" to ${p.trip}`;
    case "new_expense":
      return `${p.actor} added ${p.title} · ${money()}`;
    case "balance_change":
      return p.action === "edited" ? `${p.actor} edited ${p.title}. Your balance changed.` : `${p.actor} added ${p.title} (${money()}). Your balance changed.`;
    case "settlement_update":
      return p.kind === "reversal" ? `${p.from}'s payment of ${money()} to ${p.to} was reversed` : `${p.from} paid ${p.to} ${money()}`;
  }
}

// Where tapping a notification should take you within its trip.
export const routeFor = (t: NotificationType): "people" | "itinerary" | "expenses" | "balances" =>
  ({ trip_invitation: "people", itinerary_change: "itinerary", new_expense: "expenses", balance_change: "balances", settlement_update: "balances" } as const)[t];
