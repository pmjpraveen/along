import { Stack } from "expo-router";

// One trip: the tab group (Trip, Itinerary, Activity, Expenses) plus everything you open from it. Forms rise as modals.
export default function TripLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="memories" />
      <Stack.Screen name="balances" />
      <Stack.Screen name="complete" />
      <Stack.Screen name="summary" />
      <Stack.Screen name="add-guest" options={{ presentation: "modal" }} />
      <Stack.Screen name="add-item" options={{ presentation: "modal" }} />
      <Stack.Screen name="add-expense" options={{ presentation: "modal" }} />
      <Stack.Screen name="settle" options={{ presentation: "modal" }} />
    </Stack>
  );
}
