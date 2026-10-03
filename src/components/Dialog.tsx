import { ReactNode, useEffect, useRef, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { cancelAnimation, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { rubberband, shouldDismiss } from "../domain/gesture";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { motion } from "../theme/motion";
import { X } from "../icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius, space, type } from "../theme/tokens";
import { Button, ButtonType } from "./Buttons";

type Props = {
  visible: boolean; onClose: () => void; title: string;
  subheader?: string; body?: string; children?: ReactNode;
  actionLabel?: string; onAction?: () => void; actionBusy?: boolean; actionType?: ButtonType;
  secondaryLabel?: string; onSecondary?: () => void;
};

// Figma "Modal": an overlay that interrupts the task for one important message. On a phone it floats above the bottom edge
// as an inset card (unlike BottomSheet, which is full-bleed for browsing content). Header with a close button at the right,
// subheader and body, content, then one primary button. Scrim tap, close button and the back gesture all dismiss it.
// It moves like the sheets do: a spring from the bottom edge that can be grabbed at any moment (drag it down to dismiss, with a flick
// carrying on out), a scrim that fades with its position, and with Reduce Motion a plain fade.
const PRESENT_MS = 450;   // iOS can hang if a Modal is hidden mid-presentation, so an early close waits out the rest
export function Dialog({ visible, onClose, title, subheader, body, children, actionLabel, onAction, actionBusy, actionType = "primary", secondaryLabel, onSecondary }: Props) {
  const { bottom } = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { height: screenH } = useWindowDimensions();
  const y = useSharedValue(screenH);   // card offset from its resting place; screenH = fully off screen
  const cardH = useSharedValue(300);
  const startY = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);
  const openedAt = useRef(0);
  const hide = () => {
    const wait = Platform.OS === "ios" ? PRESENT_MS - (Date.now() - openedAt.current) : 0;
    if (wait > 0) setTimeout(() => setMounted(false), wait); else setMounted(false);
  };

  const settle = (to: number, velocity: number, done?: () => void) => {
    if (reduceMotion) { y.value = to; done?.(); return; }
    y.value = withSpring(to, { ...(velocity === 0 ? motion.settle : motion.sheet), velocity, overshootClamping: to !== 0 }, (finished) => { if (finished && done) scheduleOnRN(done); });
  };
  useEffect(() => {
    if (visible) { openedAt.current = Date.now(); setMounted(true); y.value = reduceMotion ? 0 : screenH; settle(0, 0); }
    else settle(screenH, 0, hide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const drag = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onBegin(() => { cancelAnimation(y); startY.value = y.value; })
    .onUpdate((e) => { const next = startY.value + e.translationY; y.value = next < 0 ? -rubberband(-next, cardH.value) : next; })
    .onEnd((e) => {
      if (shouldDismiss(startY.value + e.translationY, e.velocityY, cardH.value)) {
        y.value = withSpring(screenH, { ...motion.sheet, velocity: e.velocityY, overshootClamping: true }, (finished) => { if (finished) scheduleOnRN(onClose); });
      } else {
        y.value = withSpring(0, { ...motion.sheet, velocity: e.velocityY });
      }
    });
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, screenH], [1, 0], Extrapolation.CLAMP) }));
  const dismiss = () => settle(screenH, 0, onClose);

  return (
    <Modal transparent visible={mounted} animationType={reduceMotion ? "fade" : "none"} onRequestClose={dismiss} accessibilityViewIsModal>
      <GestureHandlerRootView style={[s.root, { paddingBottom: bottom + space.s8 }]}>
        <Animated.View style={[s.scrimFill, scrimStyle]}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={dismiss} style={s.scrim} />
        </Animated.View>
        <GestureDetector gesture={drag}>
          <Animated.View onLayout={(e) => { cardH.value = e.nativeEvent.layout.height; }} style={[s.card, cardStyle]}>
            <View style={s.head}>
              <Text accessibilityRole="header" style={s.title}>{title}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={dismiss} hitSlop={space.s8} style={s.close}>
                <X size={16} color={color.iconInk} strokeWidth={2.5} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
              </Pressable>
            </View>
            {(subheader || body) && (
              <View style={s.copy}>
                {subheader && <Text style={s.subheader}>{subheader}</Text>}
                {body && <Text style={s.body}>{body}</Text>}
              </View>
            )}
            {children}
            <View style={s.actions}>
              {actionLabel && onAction && <Button label={actionLabel} onPress={onAction} busy={actionBusy} type={actionType} size="large" />}
              {secondaryLabel && onSecondary && <Button label={secondaryLabel} onPress={onSecondary} type="secondary" size="large" />}
            </View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end", paddingHorizontal: space.s8 },
  scrimFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  scrim: { flex: 1, backgroundColor: color.scrim },
  card: { backgroundColor: color.paper, borderRadius: radius.sheet, borderCurve: "continuous", padding: space.s20, gap: space.s16 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.s12 },
  title: { ...type.sheetTitle, flex: 1, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: color.brandBlack },
  close: { width: 40, height: 40, borderRadius: radius.pill, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: color.softGrey },
  copy: { gap: space.s8 },
  actions: { gap: space.s8, marginTop: space.s8 },
  subheader: { ...type.label, color: color.brandBlack },
  body: { ...type.fieldValue, color: color.charcoal },
});
