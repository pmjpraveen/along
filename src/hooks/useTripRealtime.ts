import { useEffect, useRef } from "react";
import { subscribeToMyNotifications, subscribeToTrip, TripTable } from "../api/realtime";

type Subscribe = (onChange: () => void, onResubscribe: () => void) => () => void;

// Calls `reload` when something changes. A burst of events (an expense plus each person's share, say) becomes one reload,
// so a screen refreshes once, well inside two seconds. Also reloads after a dropped connection is restored.
function useLiveReload(subscribe: Subscribe, key: string, reload: () => void, debounceMs: number) {
  const latest = useRef(reload);
  latest.current = reload;
  const sub = useRef(subscribe);
  sub.current = subscribe;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => latest.current(), debounceMs);
    };
    const unsubscribe = sub.current(schedule, () => latest.current());
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [key, debounceMs]);
}

export function useTripRealtime(tripId: string, tables: TripTable[], reload: () => void, debounceMs = 300) {
  useLiveReload((change, back) => subscribeToTrip(tripId, tables, change, back), `${tripId}|${tables.join(",")}`, reload, debounceMs);
}

export function useMyNotificationsRealtime(reload: () => void, debounceMs = 300) {
  useLiveReload(subscribeToMyNotifications, "mine", reload, debounceMs);
}
