import { ReactNode, useEffect, useState } from "react";

import { StyleSheet, Text, View } from "react-native";
import { Pressable } from "./Pressable";
import { CircleAlert, CircleCheck, CircleX, Info, X } from "../icons";
import { color, radius, space, type } from "../theme/tokens";
import { Button } from "./Buttons";

const ERROR_MS = 5000;
export type AlertVariant = "neutral" | "positive" | "negative" | "warning" | "critical";

// The alert icons: a filled disc with a glyph in the variant's colours (Lucide's circle icons, filled so the disc is solid).
// "critical" is the banner's icon: a white disc with a red exclamation mark, for use on the red background.
export function AlertIcon({ variant, size = 32 }: { variant: AlertVariant; size?: number }) {
  const fill = { neutral: color.charcoal, positive: color.positive, negative: color.alarmRed, warning: color.warning, critical: color.paper }[variant];
  const mark = variant === "critical" ? color.alarmRed : variant === "warning" ? color.obsidian : color.paper;
  const Glyph = { neutral: Info, positive: CircleCheck, negative: CircleX, warning: CircleAlert, critical: CircleAlert }[variant];
  return <Glyph size={size} color={mark} fill={fill} strokeWidth={2} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}

type Props = {
  variant?: AlertVariant;
  title?: string;                       // bold first line (used by the critical banner)
  children: ReactNode;
  actionLabel?: string; onAction?: () => void; actionKind?: "button" | "link";
  onDismiss?: () => void;
  persist?: boolean;                    // an error that stays until the problem is dealt with (a failed load that offers Retry)
};

// Alert from the design system.
//   Simple (no action, no title): a soft pill, radius 32, icon and one line of 16/24 text.
//   With an action or dismiss: a card, radius 10, icon at the top, 14/22 Charcoal text, then a small button or an underlined link,
//     and a 24pt circular dismiss control at the top right.
//   Critical: a red banner (radius 10) with a white icon, a semibold white title, white text and a white small button.
// Meaning never rests on colour alone: the icon shape and the words say it.
export function Alert({ variant = "neutral", title, children, actionLabel, onAction, actionKind = "button", onDismiss, persist }: Props) {
  const critical = variant === "critical";
  const urgent = variant === "negative" || variant === "warning" || critical;
  const card = critical || !!actionLabel || !!onDismiss || !!title;
  const hasAction = !!actionLabel && !!onAction;

  // An error message clears itself after 5 seconds (unless it is `persist`, a failed load that offers Retry); a new message shows again for its own 5 seconds.
  const [gone, setGone] = useState(false);
  useEffect(() => {
    setGone(false);
    if (variant !== "negative" || persist) return;
    const id = setTimeout(() => setGone(true), ERROR_MS);
    return () => clearTimeout(id);
  }, [variant, children, persist]);
  if (gone) return null;

  return (
    <View accessible={!hasAction && !onDismiss} accessibilityRole={urgent ? "alert" : undefined} accessibilityLiveRegion={urgent ? "assertive" : "polite"}
      style={[s.box, card ? s.card : s.pill, variant === "negative" && s.errorBox, critical && s.criticalBox]}>
      <AlertIcon variant={variant} />
      <View style={[s.content, card && s.contentCard]}>
        <View style={s.texts}>
          {title && <Text maxFontSizeMultiplier={1.4} style={[s.title, critical && s.onRed]}>{title}</Text>}
          <Text maxFontSizeMultiplier={1.4} style={[card && !critical ? s.cardText : s.text, critical && [s.text, s.onRed]]}>{children}</Text>
        </View>
        {hasAction && (
          critical
            ? <Button label={actionLabel} onPress={onAction} type="destructive" size="small" />
            : <Button label={actionLabel} onPress={onAction} type={actionKind === "link" ? "tertiary" : "secondaryNeutral"} size="small" />
        )}
      </View>
      {onDismiss && !critical && (
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onDismiss} hitSlop={12} style={s.dismiss}>
          <X size={14} color={color.iconInk} strokeWidth={2.5} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: "row", gap: space.s16, padding: space.s16, backgroundColor: color.neutralWash },
  pill: { alignItems: "center", borderRadius: radius.xLarge , borderCurve: "continuous"},
  card: { alignItems: "flex-start", borderRadius: radius.small , borderCurve: "continuous"},
  errorBox: { backgroundColor: color.cream },
  criticalBox: { backgroundColor: color.alarmRed },
  content: { flex: 1, gap: space.s8 },
  contentCard: { justifyContent: "center" },
  texts: { gap: space.s8 },
  text: { ...type.fieldValue, color: color.obsidian },
  cardText: { ...type.fieldMessage, color: color.charcoal },
  title: { ...type.buttonLarge, color: color.obsidian },
  onRed: { color: color.paper },
  dismiss: { width: 24, height: 24, borderRadius: radius.pill, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: color.softGrey },
});
