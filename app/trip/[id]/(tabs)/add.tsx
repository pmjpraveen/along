import { useFocusEffect, useNavigation } from "expo-router";
import { useCallback } from "react";
import { InteractionManager } from "react-native";
import { useAddMenu } from "../../../../src/components/TripAddMenu";

// The iOS detached "+" tab is the platform's own button. Pressing it lands here, which opens the add menu and steps straight back
// to the tab you were on, so the bar never shows "+" as a place you are.
export default function Add() {
  const navigation = useNavigation();
  useFocusEffect(useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    // iOS drops a modal presented while the tab switch is still in flight, so the sheet opens once that transition has finished.
    InteractionManager.runAfterInteractions(() => useAddMenu.getState().set(true));
  }, [navigation]));
  return null;
}
