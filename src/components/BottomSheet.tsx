import { ReactNode, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { cancelAnimation, Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { rubberband, shouldDismiss } from "../domain/gesture";
import { motion } from "../theme/motion";
import { color, radius, space, type } from "../theme/tokens";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { Button, ButtonType } from "./Buttons";

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  body?: string;                        // a line or two under the title
  children?: ReactNode;                 // the sheet's content; scrolls if it is taller than the screen allows
  actionLabel?: string; onAction?: () => void; actionBusy?: boolean; actionDisabled?: boolean; actionType?: ButtonType;   // one primary action in a fixed footer
};

// The design system's bottom sheet (Figma "bottom sheet"): a white container with rounded top corners, a close button at the
// top left (44pt circle on the neutral wash), a header and optional body, content, and a footer with one primary button above
// a hairline. It slides up over a Forest Ink scrim; tapping the scrim, the close button, or the system back gesture closes it.
export function BottomSheet({ visible, onClose, title, body, children, actionLabel, onAction, actionBusy, actionDisabled, actionType = "primary" }: Props) {
  const { bottom } = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();   // with Reduce Motion the sheet fades in and out instead of moving
  const { height: screenH } = useWindowDimensions();
  const y = useSharedValue(screenH);         // sheet offset from its resting place; screenH = fully off screen
  const sheetH = useSharedValue(screenH);
  const startY = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  // One spring drives every move and always starts from where the sheet is right now, so any move can be interrupted.
  const settle = (to: number, velocity: number, done?: () => void) => {
    if (reduceMotion) { y.value = to; done?.(); return; }
    y.value = withSpring(to, { ...motion.sheet, velocity, overshootClamping: to !== 0 }, (finished) => { if (finished && done) runOnJS(done)(); });
  };

  useEffect(() => {
    if (visible) { setMounted(true); y.value = reduceMotion ? 0 : screenH; settle(0, 0); }
    else settle(screenH, 0, () => setMounted(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Dragging the header moves the sheet 1:1 from where it was grabbed (even mid-animation); above the top it resists.
  // On release the flick's velocity decides: thrown down it carries on out, otherwise it springs back at the same speed.
  const drag = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onBegin(() => { cancelAnimation(y); startY.value = y.value; })
    .onUpdate((e) => {
      const next = startY.value + e.translationY;
      y.value = next < 0 ? -rubberband(-next, sheetH.value) : next;
    })
    .onEnd((e) => {
      if (shouldDismiss(startY.value + e.translationY, e.velocityY, sheetH.value)) {
        y.value = withSpring(sheetH.value, { ...motion.sheet, velocity: e.velocityY, overshootClamping: true }, (finished) => { if (finished) runOnJS(onClose)(); });
      } else {
        y.value = withSpring(0, { ...motion.sheet, velocity: e.velocityY });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, screenH], [1, 0], Extrapolation.CLAMP) }));
  const dismiss = () => settle(sheetH.value, 0, onClose);
  return (
    <Modal transparent visible={mounted} animationType={reduceMotion ? "fade" : "none"} onRequestClose={dismiss} accessibilityViewIsModal>
      <GestureHandlerRootView style={s.root}>
        <Animated.View style={[s.scrimFill, scrimStyle]}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={dismiss} style={s.scrim} />
        </Animated.View>
        <Animated.View onLayout={(e) => { sheetH.value = e.nativeEvent.layout.height; }}
          style={[s.sheet, { paddingBottom: actionLabel ? 0 : bottom + space.s16 }, sheetStyle]}>
          <GestureDetector gesture={drag}>
            <View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={dismiss} hitSlop={space.s8} style={s.close}>
                <X size={20} color={color.forestInk} strokeWidth={2} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
              </Pressable>
            </View>
          </GestureDetector>
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.title}>{title}</Text>
            {body && <Text maxFontSizeMultiplier={1.4} style={s.body}>{body}</Text>}
            {children}
          </ScrollView>
          {actionLabel && onAction && (
            <View style={[s.footer, { paddingBottom: bottom + space.s16 }]}>
              <Button label={actionLabel} onPress={onAction} busy={actionBusy} disabled={actionDisabled} type={actionType} size="large" />
            </View>
          )}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  scrimFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  scrim: { flex: 1, backgroundColor: "rgba(22,51,0,0.4)" },
  sheet: { maxHeight: "90%", backgroundColor: color.paper, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, borderCurve: "continuous", overflow: "hidden" },
  close: { width: 44, height: 44, borderRadius: radius.pill, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: color.neutralWash, marginLeft: space.s20, marginTop: space.s20 },
  content: { paddingHorizontal: space.s24, paddingTop: space.s16, paddingBottom: space.s16, gap: space.s8 },
  title: { ...type.sheetTitle, color: color.obsidian },
  body: { ...type.fieldValue, color: color.obsidian },
  footer: { paddingHorizontal: space.s20, paddingTop: space.s16, borderTopWidth: 1, borderTopColor: color.borderNeutral, backgroundColor: color.paper },
});
