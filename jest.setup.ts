// Tests run with Reduce Motion on, so sheets open and close instantly and nothing waits on an animation.
jest.mock("./src/hooks/useReducedMotion", () => ({ useReducedMotion: () => true }));

// Native animation and gesture modules are not available under Jest.
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
jest.mock("react-native-worklets", () => require("react-native-worklets/lib/module/mock"));
require("react-native-gesture-handler/jestSetup");
