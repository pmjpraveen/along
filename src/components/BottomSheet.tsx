import { ReactNode, useEffect, useState } from "react";
import { scheduleOnRN } from "react-native-worklets";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { cancelAnimation, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { rubberband, shouldDismiss } from "../domain/gesture";
import { motion } from "../theme/motion";
import { color, radius, space, type } from "../theme/tokens";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { Button, ButtonType } from "./Buttons";

// List rows put their own 16pt of padding inside, so inside a sheet they are pulled out by the same 16pt: their icons and text then line up with
// the close button and the title (all 20pt from the edge) and the pressed highlight still reaches the sheet's sides.
export function SheetRows({ children }: { children: ReactNode }) {
  return <View style={s.rows}>{children}</View>;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onClosed?: () => void;                // after the sheet has fully left, so another screen can safely be presented
  title: string;
  body?: string;                        // a line or two under the title
  children?: ReactNode;                 // the sheet's content; scrolls if it is taller than the screen allows
  header?: ReactNode;                   // pinned under the title, outside the scroll (a search field)
  tall?: boolean;                       // a fixed 90% height, so a filtered list never makes the sheet jump
  actionLabel?: string; onAction?: () => void; actionBusy?: boolean; actionDisabled?: boolean; actionType?: ButtonType;   // one primary action in a fixed footer
};

// The design system's bottom sheet (Figma "bottom sheet"): a white container with rounded top corners, a close button at the
// top left (44pt circle on the neutral wash), a header and optional body, content, and a footer with one primary button above
// a hairline. It slides up over a neutral grey scrim; tapping the scrim, the close button, or the system back gesture closes it.
export function BottomSheet({ visible, onClose, onClosed, title, body, children, header, tall, actionLabel, onAction, actionBusy, actionDisabled, actionType = "primary" }: Props) {
  // A sheet only has to clear the home indicator. Over a screen with a native tab bar the app-wide bottom inset also counts the tab bar (83pt on an
  // iPhone), which would leave a big empty band under the last row, and no iPhone's home indicator needs more than 34pt.
  const insetBottom = useSafeAreaInsets().bottom;
  const bottom = Platform.OS === "ios" ? Math.min(insetBottom, 34) : insetBottom;
  const reduceMotion = useReducedMotion();   // with Reduce Motion the sheet fades in and out instead of moving
  const { height: screenH } = useWindowDimensions();
  const y = useSharedValue(screenH);         // sheet offset from its resting place; screenH = fully off screen
  const sheetH = useSharedValue(screenH);
  const startY = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  // One spring drives every move and always starts from where the sheet is right now, so any move can be interrupted.
  const settle = (to: number, velocity: number, done?: () => void) => {
    if (reduceMotion) { y.value = to; done?.(); return; }
    y.value = withSpring(to, { ...motion.sheet, velocity, overshootClamping: to !== 0 }, (finished) => { if (finished && done) scheduleOnRN(done); });
  };

  useEffect(() => {
    if (visible) { setMounted(true); y.value = reduceMotion ? 0 : screenH; settle(0, 0); }
    else settle(screenH, 0, () => { setMounted(false); if (Platform.OS !== "ios") onClosed?.(); });
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
        y.value = withSpring(sheetH.value, { ...motion.sheet, velocity: e.velocityY, overshootClamping: true }, (finished) => { if (finished) scheduleOnRN(onClose); });
      } else {
        y.value = withSpring(0, { ...motion.sheet, velocity: e.velocityY });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, screenH], [1, 0], Extrapolation.CLAMP) }));
  const dismiss = () => settle(sheetH.value, 0, onClose);
  return (
    <Modal transparent visible={mounted} onDismiss={onClosed} animationType={reduceMotion ? "fade" : "none"} onRequestClose={dismiss} accessibilityViewIsModal>
      <GestureHandlerRootView style={s.root}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.root} pointerEvents="box-none">
        <Animated.View style={[s.scrimFill, scrimStyle]}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={dismiss} style={s.scrim} />
        </Animated.View>
        <Animated.View onLayout={(e) => { sheetH.value = e.nativeEvent.layout.height; }}
          style={[s.sheet, tall && s.tall, { paddingBottom: actionLabel ? 0 : bottom }, sheetStyle]}>
          <GestureDetector gesture={drag}>
            <View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={dismiss} hitSlop={space.s8} style={s.close}>
                <X size={20} color={color.iconInk} strokeWidth={2} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
              </Pressable>
            </View>
          </GestureDetector>
          {header ? (
            <View style={s.pinned}>
              <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.title}>{title}</Text>
              {body && <Text maxFontSizeMultiplier={1.4} style={s.body}>{body}</Text>}
              {header}
            </View>
          ) : null}
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[s.content, !!header && s.contentBelow]}>
            {!header && <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={s.title}>{title}</Text>}
            {!header && body && <Text maxFontSizeMultiplier={1.4} style={s.body}>{body}</Text>}
            {children}
          </ScrollView>
          {actionLabel && onAction && (
            <View style={[s.footer, { paddingBottom: bottom + space.s16 }]}>
              <Button label={actionLabel} onPress={onAction} busy={actionBusy} disabled={actionDisabled} type={actionType} size="large" />
            </View>
          )}
        </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  scrimFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  scrim: { flex: 1, backgroundColor: color.scrim },
  sheet: { maxHeight: "90%", backgroundColor: color.paper, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, borderCurve: "continuous", overflow: "hidden" },
  close: { width: 44, height: 44, borderRadius: radius.pill, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: color.softGrey, marginLeft: space.s20, marginTop: space.s20 },
  tall: { height: "90%" },
  pinned: { paddingHorizontal: space.s20, paddingTop: space.s16, paddingBottom: space.s8, gap: space.s8 },
  contentBelow: { paddingTop: 0 },
  content: { paddingHorizontal: space.s20, paddingTop: space.s16, paddingBottom: 0, gap: space.s8 },
  rows: { marginHorizontal: -space.s16 },
  title: { ...type.sheetTitle, color: color.obsidian },
  body: { ...type.fieldValue, color: color.obsidian },
  footer: { paddingHorizontal: space.s20, paddingTop: space.s16, borderTopWidth: 1, borderTopColor: color.borderNeutral, backgroundColor: color.paper },
});
