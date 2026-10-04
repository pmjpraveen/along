import { Redirect } from "expo-router";

// Google sign-in comes back to the app as along://auth/callback?code=… On Android that link is delivered to the router as well as to the
// sign-in code (which reads the code and finishes signing in), so the route has to exist or the router shows "Unmatched Route". There is nothing to
// show here: go to the start, which is Home once signed in and the sign-in screen until then.
export default function AuthCallback() {
  return <Redirect href="/" />;
}
