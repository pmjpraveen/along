import { tripDays } from "./itinerary";

export const APP_STORE_URL = "https://apps.apple.com/app/id6817977368";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=xyz.getalong.app";
export const joinUrl = (token: string) => `https://getalong.xyz/join/${token}`;

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

// The personal note an owner sends to a guest they added by name.
export function guestInviteMessage(o: { guest: string; trip: string; start: string; end: string; guests: number; token: string }): string {
  const days = tripDays(o.start, o.end).length;
  return [
    `👋 Hi ${o.guest}!`,
    "",
    `You're invited to join *${o.trip}* on along 🌴`,
    "",
    `🗓️ ${plural(days, "day")}`,
    `👥 ${plural(o.guests, "guest")}`,
    "",
    "✨ Join the trip",
    joinUrl(o.token),
    "",
    "📲 Get the app",
    `🍎 App Store: ${APP_STORE_URL}`,
    `🤖 Google Play: ${PLAY_STORE_URL}`,
    "",
    "See you there! 🎉",
  ].join("\n");
}

const storeLines = ["📲 Get the app", `🍎 App Store: ${APP_STORE_URL}`, `🤖 Google Play: ${PLAY_STORE_URL}`];

// The note an owner shares about the whole trip, for anyone they want to bring along.
export function tripShareMessage(o: { trip: string; destination: string; start: string; end: string; people: number; token: string }): string {
  const days = tripDays(o.start, o.end).length;
  return [
    "🌴 Join our trip on along!",
    "",
    `*${o.trip}*`,
    ...(o.destination ? [`📍 ${o.destination}`] : []),
    `🗓️ ${plural(days, "day")}`,
    `👥 ${plural(o.people, "person").replace("persons", "people")} going`,
    "",
    "✨ Join the trip",
    joinUrl(o.token),
    "",
    ...storeLines,
    "",
    "Plans, expenses and memories, all in one place. See you there! 🎉",
  ].join("\n");
}
