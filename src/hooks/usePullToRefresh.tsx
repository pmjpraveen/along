import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";
import { color } from "../theme/tokens";

// The platform pull-to-refresh for a data screen: pass the result as the ScrollView's `refreshControl`.
// The spinner ends when the load settles, so it can never spin indefinitely.
export function usePullToRefresh(load: () => unknown) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.forestInk} colors={[color.forestInk]} />;
}
