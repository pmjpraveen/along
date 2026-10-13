// Tests run with Reduce Motion on, so sheets open and close instantly and nothing waits on an animation.
jest.mock("./src/hooks/useReducedMotion", () => ({ useReducedMotion: () => true }));

// Native animation and gesture modules are not available under Jest.
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
jest.mock("react-native-worklets", () => require("react-native-worklets/lib/module/mock"));
require("react-native-gesture-handler/jestSetup");

// Skia draws on the GPU; the passport book's page curl is not exercised under Jest (Reduce Motion is on), so only its names need to exist.
jest.mock("@shopify/react-native-skia", () => ({
  Canvas: () => null, Fill: () => null, Shader: () => null, ImageShader: () => null,
  Skia: { RuntimeEffect: { Make: () => null } },
  makeImageFromView: async () => null,
}));

// Speech recognition is native.
jest.mock("expo-speech-recognition", () => ({
  ExpoSpeechRecognitionModule: { start: jest.fn(), stop: jest.fn(), requestPermissionsAsync: async () => ({ granted: true }) },
  useSpeechRecognitionEvent: () => {},
}));

// Haptics are native.
jest.mock("expo-haptics", () => ({
  impactAsync: () => Promise.resolve(), selectionAsync: () => Promise.resolve(), notificationAsync: () => Promise.resolve(),
  ImpactFeedbackStyle: { Light: "light" }, NotificationFeedbackType: { Success: "success", Warning: "warning" },
}));
