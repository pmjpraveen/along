import { useEffect, useRef } from "react";
import { subscribeToTrip, TripTable } from "../api/realtime";

// Calls `reload` when something changes in this trip. A burst of events (an expense plus each person's share, say) becomes
// one reload, so a screen refreshes once, well inside two seconds. Also reloads after a dropped connection is restored.
export function useTripRealtime(tripId: string, tables: TripTable[], reload: () => void, debounceMs = 300) {
  const latest = useRef(reload);
  latest.current = reload;
  const key = tables.join(",");
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => latest.current(), debounceMs);
    };
    const unsubscribe = subscribeToTrip(tripId, key.split(",") as TripTable[], schedule, () => latest.current());
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [tripId, key, debounceMs]);
}
