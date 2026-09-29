import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { create } from "zustand";

// Online means connected and not known to be cut off from the internet (isInternetReachable can be null while it checks).
export const isOnline = (s: Pick<NetInfoState, "isConnected" | "isInternetReachable">) => s.isConnected !== false && s.isInternetReachable !== false;

export const useOnline = create<{ online: boolean }>(() => ({ online: true }));

let started = false;
export function startConnectivity() {
  if (started) return;
  started = true;
  NetInfo.addEventListener((s) => useOnline.setState({ online: isOnline(s) }));
}
