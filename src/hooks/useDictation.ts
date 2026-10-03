import { useRef, useState } from "react";

type Speech = typeof import("expo-speech-recognition");
// The recognizer is native. A build made before it was added (or Expo Go, or web) does not have it, and importing it there throws, so it
// is loaded defensively and `available` tells the screen to hide the mic instead of failing.
const speech: Speech | null = (() => { try { return require("expo-speech-recognition") as Speech; } catch { return null; } })();
const useSpeechRecognitionEvent: Speech["useSpeechRecognitionEvent"] = speech?.useSpeechRecognitionEvent ?? (() => {});

// Speech to text for a field: start() listens and writes what is said after whatever is already typed; stop() ends it. The words come from the
// phone's own recognizer. `error` is a plain sentence to show under the field, or null.
export function useDictation(value: string, onChange: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = useRef("");

  useSpeechRecognitionEvent("start", () => setListening(true));
  useSpeechRecognitionEvent("end", () => setListening(false));
  useSpeechRecognitionEvent("result", (e) => {
    const said = e.results[0]?.transcript ?? "";
    onChange(base.current ? `${base.current} ${said}` : said);
  });
  useSpeechRecognitionEvent("error", (e) => {
    setListening(false);
    if (e.error === "not-allowed") setError("Allow the microphone and speech recognition for along in Settings to dictate.");
    else if (e.error !== "aborted") setError("Couldn't hear that. Try again.");
  });

  const toggle = async () => {
    if (listening) return speech!.ExpoSpeechRecognitionModule.stop();
    setError(null);
    const { granted } = await speech!.ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) return setError("Allow the microphone and speech recognition for along in Settings to dictate.");
    base.current = value.trim();
    speech!.ExpoSpeechRecognitionModule.start({ lang: "en-US", interimResults: true, continuous: true });
  };
  return { available: !!speech, listening, error, toggle };
}
