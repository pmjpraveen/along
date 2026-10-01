import { describeNotification, routeFor, TYPES } from "./notifications";

const n = (type: never, payload: Record<string, string | number>) => ({ type, payload });

test("6.4 every notification type is worded in plain language", () => {
  expect(describeNotification(n("trip_invitation" as never, { actor: "Ben", trip: "Goa", action: "joined" }))).toBe("Ben joined Goa");
  expect(describeNotification(n("trip_invitation" as never, { actor: "Rahul", trip: "Goa", action: "claimed" }))).toBe("Rahul claimed their spot in Goa");
  expect(describeNotification(n("itinerary_change" as never, { actor: "Ben", trip: "Goa", title: "Beach day", action: "added" }))).toBe('Ben added "Beach day" to Goa');
  expect(describeNotification(n("itinerary_change" as never, { actor: "Ben", title: "Beach day", action: "moved", day: "2026-12-03" }))).toBe('Ben moved "Beach day" to 3 Dec');
  expect(describeNotification(n("new_expense" as never, { actor: "Ben", title: "Dinner", amount_minor: 90000, currency: "INR", exponent: 2 }))).toBe("Ben added Dinner · ₹900.00");
  expect(describeNotification(n("balance_change" as never, { actor: "Ben", title: "Dinner", amount_minor: 90000, currency: "INR", exponent: 2, action: "added" })))
    .toBe("Ben added Dinner (₹900.00). Your balance changed.");
  expect(describeNotification(n("balance_change" as never, { actor: "Ben", title: "Dinner", action: "edited" }))).toBe("Ben edited Dinner. Your balance changed.");
  expect(describeNotification(n("settlement_update" as never, { from: "Ben", to: "Asha", amount_minor: 30000, currency: "INR", exponent: 2, kind: "payment" }))).toBe("Ben paid Asha ₹300.00");
  expect(describeNotification(n("settlement_update" as never, { from: "Ben", to: "Asha", amount_minor: 30000, currency: "INR", exponent: 2, kind: "reversal" })))
    .toBe("Ben's payment of ₹300.00 to Asha was reversed");
});

test("6.4 amounts follow the currency's decimals", () => {
  expect(describeNotification(n("new_expense" as never, { actor: "Ken", title: "Ramen", amount_minor: 1500, currency: "JPY", exponent: 0 }))).toBe("Ken added Ramen · ¥1,500");
});

test("6.4 every type has a destination", () => {
  for (const t of TYPES) expect(["people", "itinerary", "expenses", "balances"]).toContain(routeFor(t));
});
