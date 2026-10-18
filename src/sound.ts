// The payment chime. expo-audio is a native module, so a build made before it was added cannot load it: required lazily and guarded, so such a
// build simply stays silent (the confetti still plays) instead of failing when a payment is recorded.
export function playChime() {
  try {
    const { createAudioPlayer } = require("expo-audio") as typeof import("expo-audio");
    const player = createAudioPlayer(require("../assets/sounds/payment-recorded.wav"));
    player.addListener("playbackStatusUpdate", (s) => { if (s.didJustFinish) player.remove(); });
    player.play();
  } catch {
    // no sound is fine
  }
}
