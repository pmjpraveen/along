import { guestInviteMessage, tripShareMessage } from "./guestInvite";

const base = { guest: "Rahul", trip: "Goa trip", start: "2026-12-01", end: "2026-12-05", guests: 3, token: "abc" };

test("US-03 the invite names the guest and trip, counts days and guests, and links to join and both stores", () => {
  const m = guestInviteMessage(base);
  expect(m).toContain("Hi Rahul!");
  expect(m).toContain("Goa trip");
  expect(m).toContain("👥 3 guests");
  expect(m).toContain("🗓️ 5 days");
  expect(m).toContain("https://getalong.xyz/join/abc");
  expect(m).toContain("apps.apple.com");
  expect(m).toContain("play.google.com");
});

test("US-03 one day and one guest are singular", () => {
  expect(guestInviteMessage({ ...base, end: "2026-12-01", guests: 1 })).toContain("🗓️ 1 day\n👥 1 guest\n");
});

test("US-03 the trip share names the trip and place, counts days and people, and links to join and both stores", () => {
  const m = tripShareMessage({ trip: "Goa trip", destination: "Goa, India", start: "2026-12-01", end: "2026-12-05", people: 4, token: "abc" });
  expect(m).toContain("*Goa trip*");
  expect(m).toContain("📍 Goa, India");
  expect(m).toContain("🗓️ 5 days");
  expect(m).toContain("👥 4 people going");
  expect(m).toContain("https://getalong.xyz/join/abc");
  expect(m).toContain("apps.apple.com");
  expect(m).toContain("play.google.com");
});

test("US-03 the trip share skips the place when there is none and says 1 person", () => {
  const m = tripShareMessage({ trip: "T", destination: "", start: "2026-12-01", end: "2026-12-01", people: 1, token: "abc" });
  expect(m).not.toContain("📍");
  expect(m).toContain("👥 1 person going");
});
