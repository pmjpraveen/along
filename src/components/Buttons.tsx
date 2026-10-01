import { useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { Pressable } from "./Pressable";
import { PassportShine } from "./PassportShine";
import { buttonState, color, radius, space, type } from "../theme/tokens";

export type ButtonType = "primary" | "secondary" | "secondaryNeutral" | "destructive" | "tertiary";
export type ButtonSize = "large" | "medium" | "small";

type Props = {
  label: string; onPress: () => void; type?: ButtonType; size?: ButtonSize; disabled?: boolean; busy?: boolean;
  accessibilityHint?: string; align?: "start" | "center";
  shine?: number;   // a glint sweeps across the button this many times when it appears (0 or unset: none)
};

// The app's button: five types x three sizes x active/disabled, all with 16px smooth corners.
//   primary    #222222 fill, white label                 secondary / secondaryNeutral   #f2f2f2 fill, #222222 label
//   destructive  white fill, red 1px border and label    tertiary                       no fill, underlined #222222 label
// Disabled: fills fall back to the same #f2f2f2 grey with a Pebble label; tertiary goes to the faint border colour.
// Pressed and hovered (mouse, trackpad) each darken the fill a step (buttonState); the label dips slightly on press too.
// Sizes: large 56 (fills the width), medium 44, small 30. Small and medium keep a 44/48 touch area through hit slop.
export function Button({ label, onPress, type: kind = "primary", size = "large", disabled = false, busy = false, accessibilityHint, align = "start", shine = 0 }: Props) {
  const [focused, setFocused] = useState(false);
  const inactive = disabled || busy;
  const box = [
    s.base, sizeBox[size], typeBox[kind],
    disabled && disabledBox[kind],
  ];
  const hugs = size !== "large";
  const labelStyle = [
    size === "small" ? type_.small : type_.large,
    { color: disabled ? (kind === "tertiary" ? color.borderNeutral : color.pebble) : kind === "destructive" ? color.alarmRed : kind === "primary" ? color.paper : color.brandBlack },
    kind === "tertiary" && s.underline,
  ];
  const slop = size === "small" ? { top: 7, bottom: 7, left: 8, right: 8 } : size === "medium" && Platform.OS === "android" ? { top: 2, bottom: 2 } : undefined;
  return (
    // Small and medium buttons hug their label; large ones fill the width. The ring is an overlay, so focus never moves the layout.
    <View style={hugs ? { alignSelf: align === "center" ? "center" : "flex-start" } : undefined}>
      {focused && <View testID="focus-ring" pointerEvents="none" style={s.ring} />}
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled, busy }} disabled={inactive} onPress={onPress} hitSlop={slop}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={({ pressed, hovered }) => [...box, shine > 0 && s.clip, !inactive && (pressed || hovered) && { backgroundColor: buttonState[stateKey(kind)][pressed ? "pressed" : "hover"] }]}>
        {busy ? <ActivityIndicator color={kind === "primary" ? color.paper : color.brandBlack} /> : <Text maxFontSizeMultiplier={1.3} style={labelStyle}>{label}</Text>}
        {shine > 0 && !inactive && <PassportShine sweeps={shine} restMs={500} sweepMs={900} still={false} />}
      </Pressable>
    </View>
  );
}

const stateKey = (k: ButtonType) => (k === "secondaryNeutral" ? "secondary" : k);

// The three names every screen already uses, now mapped onto the design system.
type Simple = { label: string; onPress: () => void; disabled?: boolean; busy?: boolean };
export const PrimaryButton = (p: Simple) => <Button {...p} type="primary" size="large" />;
export const OutlinedButton = (p: Simple) => <Button {...p} type="secondary" size="large" />;
export const TextButton = (p: Simple) => <Button {...p} type="tertiary" size="medium" align="center" />;

const type_ = { large: type.buttonLarge, small: type.buttonSmall };

const s = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", borderRadius: radius.card, borderCurve: "continuous", borderWidth: 1, borderColor: "transparent" },
  // Focus: a 2px ring 2px outside the button.
  ring: { position: "absolute", top: -4, left: -4, right: -4, bottom: -4, borderRadius: radius.card + 4, borderCurve: "continuous", borderWidth: 2, borderColor: color.brandBlack },
  clip: { overflow: "hidden" },
  underline: { textDecorationLine: "underline" },
});

const sizeBox = StyleSheet.create({
  large: { minHeight: 56, paddingHorizontal: space.s24, paddingVertical: 16 },
  medium: { minHeight: Platform.OS === "android" ? 48 : 44, paddingHorizontal: space.s16, paddingVertical: 10 },
  small: { minHeight: 30, paddingHorizontal: space.s12, paddingVertical: 4 },
});

const typeBox = StyleSheet.create({
  primary: { backgroundColor: color.brandBlack },
  secondary: { backgroundColor: color.buttonGrey },
  secondaryNeutral: { backgroundColor: color.buttonGrey },
  destructive: { backgroundColor: color.paper, borderColor: color.alarmRed },
  tertiary: { backgroundColor: "transparent", paddingHorizontal: 2, paddingVertical: 4 },
});

const disabledBox = StyleSheet.create({
  primary: { backgroundColor: color.buttonGrey },
  secondary: { backgroundColor: color.buttonGrey },
  secondaryNeutral: { backgroundColor: color.buttonGrey },
  destructive: { backgroundColor: color.paper, borderColor: color.borderNeutral },
  tertiary: {},
});
