import { useFocusEffect, useNavigation } from "expo-router";
import { useCallback } from "react";
import { useAddMenu } from "../../../../src/components/TripAddMenu";

// The iOS detached "+" tab is the platform's own button. Pressing it lands here, which opens the add menu and steps straight back
// to the tab you were on, so the bar never shows "+" as a place you are.
export default function Add() {
  const navigation = useNavigation();
  useFocusEffect(useCallback(() => {
    useAddMenu.getState().set(true);
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]));
  return null;
}
