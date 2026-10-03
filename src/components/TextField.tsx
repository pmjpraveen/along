import { useState } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { color, radius, space, type } from "../theme/tokens";
import { AlertIcon, AlertVariant } from "./Alert";

export type FieldStatus = "error" | "positive" | "warning";
const ICON: Record<FieldStatus, AlertVariant> = { error: "negative", positive: "positive", warning: "warning" };

// Label above a field: 14/22 medium Obsidian, or the tertiary grey when the field is disabled.
export function FieldLabel({ children, disabled }: { children: string; disabled?: boolean }) {
  return <Text style={[s.label, disabled && s.labelOff]}>{children}</Text>;
}

// Message under a field: 14/22 in Charcoal with a status icon for positive and warning, red text with an icon for errors.
// It never relies on colour alone: the icon shape and the words carry the meaning. Errors are announced to screen readers.
export function FieldMessage({ children, status, disabled }: { children: string; status?: FieldStatus; disabled?: boolean }) {
  return (
    <View accessible={status === "error"} accessibilityRole={status === "error" ? "alert" : undefined} accessibilityLiveRegion={status === "error" ? "assertive" : "polite"} style={s.messageRow}>
      {status && <AlertIcon variant={ICON[status]} size={16} />}
      <Text style={[s.message, status === "error" && s.messageError, disabled && s.labelOff]}>{children}</Text>
    </View>
  );
}

type Props = TextInputProps & { label: string; message?: string; status?: FieldStatus; disabled?: boolean };

// The design system's input field (Figma "input fields"): label, a white field (radius 10, 1px Pebble border, 16/12 padding),
// and a message. States: empty (Pebble placeholder), filled, focus (3px Control border), error (3px red border and message),
// positive and warning (message with icon), and disabled (faint border, tertiary label). The thicker border trades padding
// for width, so focusing or erroring never moves the layout.
export function TextField({ label, message, status, disabled = false, multiline, style, onFocus, onBlur, placeholder, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const thick = !disabled && (focused || status === "error");
  // iOS draws a native placeholder lower than the cursor and typed text. Single-line fields draw their own, centred like the text.
  const ownPlaceholder = !multiline && placeholder && rest.value === "";
  return (
    <View style={s.wrap}>
      <FieldLabel disabled={disabled}>{label}</FieldLabel>
      <View>
      <TextInput
        accessibilityLabel={label} editable={!disabled} multiline={multiline} placeholder={ownPlaceholder ? undefined : placeholder} placeholderTextColor={color.pebble}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }} onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={[
          s.field, thick ? s.thick : s.thin,
          status === "error" ? s.errorBorder : focused ? s.focusBorder : null,
          disabled && s.disabled, multiline ? s.multiline : s.single, style,
        ]}
        {...rest}
      />
      {ownPlaceholder && (
        <View pointerEvents="none" style={s.placeholderBox} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Text numberOfLines={1} style={s.placeholder}>{placeholder}</Text>
        </View>
      )}
      </View>
      {message ? <FieldMessage status={status} disabled={disabled}>{message}</FieldMessage> : null}
    </View>
  );
}

// A TextInput with a fixed line height draws its cursor at the top and its placeholder at the bottom on iOS, so the text style used here
// has no line height; a single-line field is instead given a fixed height and centres its text.
const { lineHeight: _lh, ...valueType } = type.fieldValue;

const s = StyleSheet.create({
  wrap: { gap: space.s8 },
  label: { ...type.fieldLabel, color: color.obsidian },
  labelOff: { color: color.slate },
  field: { borderRadius: radius.card, borderCurve: "continuous", backgroundColor: color.paper, ...valueType, color: color.obsidian },
  // A single-line input centres its text on its own; a fixed line height would push the text to the bottom of the box.
  single: { minHeight: 48, paddingVertical: 0, textAlignVertical: "center" },
  placeholderBox: { position: "absolute", top: 0, bottom: 0, left: 17, right: 17, justifyContent: "center" },
  placeholder: { ...valueType, color: color.pebble },
  thin: { borderWidth: 1, borderColor: color.inputBorder, paddingHorizontal: space.s16, paddingVertical: 12 },
  thick: { borderWidth: 3, paddingHorizontal: 14, paddingVertical: 10 },
  focusBorder: { borderColor: color.brandBlack },
  errorBorder: { borderColor: color.alarmRed },
  disabled: { borderColor: color.borderNeutral, color: color.pebble },
  multiline: { minHeight: 96, paddingVertical: 12, lineHeight: 24, textAlignVertical: "top" },
  messageRow: { flexDirection: "row", alignItems: "center", gap: space.s4 },
  message: { ...type.fieldMessage, color: color.charcoal, flexShrink: 1 },
  messageError: { color: color.alarmRed },
});
