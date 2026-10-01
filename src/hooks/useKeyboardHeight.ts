import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

// The keyboard's height while it is up (0 when it is down), so a pinned footer can sit just above it. On Android the window already resizes.
export function useKeyboardHeight(): number {
  const [h, setH] = useState(0);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const show = Keyboard.addListener("keyboardWillShow", (e) => setH(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardWillHide", () => setH(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return h;
}
