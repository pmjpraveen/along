import { Search, X } from "../icons";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { color, radius, space, type } from "../theme/tokens";
import { Pressable } from "./Pressable";

// A single-line search input: the same field as every other input (48 high, 1px border, 3px black when focused) with a search icon
// before the text and a clear button once something is typed.
export function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[s.field, focused ? s.focus : s.thin]}>
      <Search size={20} color={color.iconInk} strokeWidth={1.75} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      <TextInput accessibilityLabel="Search" value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={color.pebble}
        autoCorrect={false} autoCapitalize="none" returnKeyType="search" maxFontSizeMultiplier={1.4}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={s.input} />
      {value.length > 0 && (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onChangeText("")} hitSlop={space.s8} style={s.clear}>
          <X size={14} color={color.iconInk} strokeWidth={2.5} />
        </Pressable>
      )}
    </View>
  );
}

const { lineHeight: _lh, ...valueType } = type.fieldValue;
const s = StyleSheet.create({
  field: { flexDirection: "row", alignItems: "center", gap: space.s12, height: 48, borderRadius: radius.card, borderCurve: "continuous", backgroundColor: color.paper },
  thin: { borderWidth: 1, borderColor: color.inputBorder, paddingHorizontal: space.s16 },
  focus: { borderWidth: 3, borderColor: color.brandBlack, paddingHorizontal: 14 },
  input: { flex: 1, height: 48, paddingVertical: 0, ...valueType, color: color.obsidian },
  clear: { width: 24, height: 24, borderRadius: radius.pill, borderCurve: "continuous", backgroundColor: color.softGrey, alignItems: "center", justifyContent: "center" },
});
