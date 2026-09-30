import { useEffect, useRef, useState } from "react";
import { searchPlaces } from "../api/placeSearch";
import { FoundPlace, isSearchable } from "../domain/places";

const PAUSE_MS = 700;        // wait for a pause in typing, never every keystroke
const MIN_GAP_MS = 1100;     // Nominatim allows one request a second

// Matches for what is being typed. `enabled` turns it off once a place has been chosen, so picking one does not search again.
export function usePlaceSearch(query: string, enabled = true) {
  const [places, setPlaces] = useState<FoundPlace[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastAt = useRef(0);

  useEffect(() => {
    if (!enabled || !isSearchable(query)) { setPlaces([]); setBusy(false); setError(null); return; }
    const ctrl = new AbortController();
    const wait = Math.max(PAUSE_MS, lastAt.current + MIN_GAP_MS - Date.now());
    const timer = setTimeout(async () => {
      setBusy(true);
      lastAt.current = Date.now();
      const r = await searchPlaces(query, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setBusy(false);
      if (r.ok) { setPlaces(r.places); setError(null); } else { setPlaces([]); setError(r.message); }
    }, wait);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query, enabled]);

  return { places, busy, error };
}
