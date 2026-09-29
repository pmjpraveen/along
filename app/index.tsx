import { Redirect, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { PrimaryButton } from "../src/components/Buttons";
import { useSession } from "../src/stores/session";

// Placeholder Home; the empty state and trip list arrive in later stories.
export default function Home() {
  const router = useRouter();
  const pending = useSession((s) => s.pendingInvite);
  if (pending) return <Redirect href={{ pathname: "/join/[token]", params: { token: pending } }} />;
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
      <Text>Home</Text>
      <PrimaryButton label="Create trip" onPress={() => router.push("/create-trip")} />
    </View>
  );
}
