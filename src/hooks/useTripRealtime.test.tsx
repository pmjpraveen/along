import { act, render } from "@testing-library/react-native";
import { useTripRealtime } from "./useTripRealtime";

type Chan = { listeners: { filter: { table: string; filter: string }; cb: () => void }[]; statusCb?: (status: string) => void; removed: boolean };
const mockChannels: Chan[] = [];
jest.mock("../api/supabase", () => ({
  supabase: {
    channel: () => {
      const ch: any = { listeners: [], statusCb: undefined, removed: false };
      ch.on = (_e: unknown, filter: unknown, cb: unknown) => { ch.listeners.push({ filter, cb }); return ch; };
      ch.subscribe = (cb: unknown) => { ch.statusCb = cb; return ch; };
      mockChannels.push(ch);
      return ch;
    },
    removeChannel: (ch: any) => { ch.removed = true; },
  },
}));

const reload = jest.fn();
function Probe({ id = "t1" }: { id?: string }) {
  useTripRealtime(id, ["expenses", "settlements"], reload);
  return null;
}
jest.useFakeTimers();
beforeEach(() => { jest.clearAllMocks(); mockChannels.length = 0; });

test("6.1 subscribes to each table for this trip only", async () => {
  await render(<Probe />);
  expect(mockChannels).toHaveLength(1);
  expect(mockChannels[0].listeners.map((l) => l.filter)).toEqual([
    { event: "*", schema: "public", table: "expenses", filter: "trip_id=eq.t1" },
    { event: "*", schema: "public", table: "settlements", filter: "trip_id=eq.t1" },
  ]);
});

test("6.1 a burst of events reloads once, shortly after", async () => {
  await render(<Probe />);
  const [expenses, settlements] = mockChannels[0].listeners;
  await act(async () => { expenses.cb(); expenses.cb(); settlements.cb(); });
  expect(reload).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(300); });
  expect(reload).toHaveBeenCalledTimes(1);
  expect(300).toBeLessThan(2000);
});

test("6.1 the first connection does not reload but a reconnect does, to catch up on missed changes", async () => {
  await render(<Probe />);
  await act(async () => { mockChannels[0].statusCb?.("SUBSCRIBED"); });
  expect(reload).not.toHaveBeenCalled();
  await act(async () => { mockChannels[0].statusCb?.("CHANNEL_ERROR"); });
  await act(async () => { mockChannels[0].statusCb?.("SUBSCRIBED"); });
  expect(reload).toHaveBeenCalledTimes(1);
});

test("6.1 leaving the screen unsubscribes and cancels a pending reload", async () => {
  const { unmount } = await render(<Probe />);
  await act(async () => { mockChannels[0].listeners[0].cb(); });
  await unmount();
  expect(mockChannels[0].removed).toBe(true);
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(reload).not.toHaveBeenCalled();
});

test("6.1 switching trips resubscribes to the new trip", async () => {
  const { rerender } = await render(<Probe id="t1" />);
  await rerender(<Probe id="t2" />);
  expect(mockChannels[0].removed).toBe(true);
  expect(mockChannels[1].listeners[0].filter.filter).toBe("trip_id=eq.t2");
});
