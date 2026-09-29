import { useFocusEffect, useNavigation } from "expo-router";
import { useCallback } from "react";
import { useAddMenu } from "../../../../src/components/TripAddMenu";

// The iOS detached "+" tab is the platform's own button. Pressing it lands here, which opens the add menu and steps straight back
// to the tab you were on, so the bar never shows "+" as a place you are.
export default function Add() {
  const navigation = useNavigation();
  useFocusEffect(useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    // iOS drops a modal presented while the tab switch is still in flight, so the sheet opens once the tab has settled back.
    // Not cleared on blur: stepping back blurs this screen at once, which would cancel the very timer that opens the sheet.
    setTimeout(() => useAddMenu.getState().set(true), 350);
  }, [navigation]));
  return null;
}
