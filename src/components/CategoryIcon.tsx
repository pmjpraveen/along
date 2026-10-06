import { BedDouble, Car, Compass, Fuel, Receipt, ShoppingBag, ShoppingBasket, Ticket, Utensils } from "../icons";
import { StyleSheet, View } from "react-native";
import { color, radius } from "../theme/tokens";

const ICON = { food: Utensils, stay: BedDouble, transport: Car, activities: Compass, shopping: ShoppingBag, tickets: Ticket, groceries: ShoppingBasket, fuel: Fuel, other: Receipt } as const;

// The grey circle at the start of an expense row, with an icon for its category (a plain receipt when it has none).
// `onGrey` draws it as a white circle, for use on a grey card where the usual grey one would vanish.
export function CategoryIcon({ category, size = 40, onGrey }: { category?: string; size?: number; onGrey?: boolean }) {
  const Icon = ICON[(category as keyof typeof ICON) ?? "other"] ?? Receipt;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.circle, onGrey && s.white, { width: size, height: size }]}>
      <Icon size={Math.round(size * 0.5)} color={color.iconInk} strokeWidth={1.75} />
    </View>
  );
}

const s = StyleSheet.create({
  white: { backgroundColor: color.paper },
  circle: { borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey, alignItems: "center", justifyContent: "center" },
});
