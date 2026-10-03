import { useGlobalSearchParams, useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { loadExpenseAccess } from "../../../../src/api/expenses";
import { AddChoice, TripAddMenu } from "../../../../src/components/TripAddMenu";
import { color } from "../../../../src/theme/tokens";

// The trip's bottom bar is the platform's own (UITabBar on iOS, Material navigation bar on Android), with one "+" beside it for
// everything you add: an itinerary item, a guest, an expense.
export default function TripTabs() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const router = useRouter();
  const [canAddExpense, setCanAddExpense] = useState(true);
  useEffect(() => { loadExpenseAccess(id).then(setCanAddExpense); }, [id]);
  const choose = (c: AddChoice) =>
    router.push({ pathname: c === "item" ? "/trip/[id]/add-item" : c === "guest" ? "/trip/[id]/add-guest" : "/trip/[id]/add-expense", params: { id } });
  return (
    <View style={{ flex: 1 }}>
      <NativeTabs tintColor={color.brandBlack} iconColor={{ default: color.iconInk, selected: color.brandBlack }}
        labelStyle={{ default: { color: color.iconInk }, selected: { color: color.brandBlack } }}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Trip</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "map", selected: "map.fill" }} md="map" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="expenses">
          <NativeTabs.Trigger.Label>Expenses</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "creditcard", selected: "creditcard.fill" }} md="payments" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="activity">
          <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "clock", selected: "clock.fill" }} md="history" />
        </NativeTabs.Trigger>
        {/* iOS: the "search" role draws a separate round button beside the bar; the "+" below sits exactly over it. */}
        {Platform.OS === "ios" && (
          <NativeTabs.Trigger name="add" role="search">
            <NativeTabs.Trigger.Label>Add</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="plus" />
          </NativeTabs.Trigger>
        )}
      </NativeTabs>
      <TripAddMenu onChoose={choose} canAddExpense={canAddExpense} />
    </View>
  );
}
