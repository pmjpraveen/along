import * as Haptics from "expo-haptics";

// The few moments that earn a tap under the finger: a choice landing, something saved, something going wrong. Fire on the causal event.
export const haptic = {
  select: () => Haptics.selectionAsync().catch(() => {}),
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warn: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};
