// Tests run with Reduce Motion on, so sheets open and close instantly and nothing waits on an animation.
jest.mock("./src/hooks/useReducedMotion", () => ({ useReducedMotion: () => true }));

// Native animation and gesture modules are not available under Jest.
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
jest.mock("react-native-worklets", () => require("react-native-worklets/lib/module/mock"));
require("react-native-gesture-handler/jestSetup");

// The native map is not available under Jest; render its children only.
jest.mock("react-native-maps", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: ({ children }: { children?: unknown }) => <View>{children as never}</View>, Marker: () => null };
});

// Haptics are native.
jest.mock("expo-haptics", () => ({
  impactAsync: () => Promise.resolve(), notificationAsync: () => Promise.resolve(),
  ImpactFeedbackStyle: { Light: "light" }, NotificationFeedbackType: { Success: "success", Warning: "warning" },
}));
