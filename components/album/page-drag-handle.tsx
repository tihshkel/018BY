import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, type SharedValue, withSpring } from "react-native-reanimated";

import { colors, radii } from "@/constants/design-tokens";

type PageDragHandleProps = {
  disabled?: boolean;
  onDragStart: () => void;
  onDragMove: (translationY: number) => void;
  onDragEnd: (translationY?: number) => void;
  dragTranslateY?: SharedValue<number>;
  active?: boolean;
};

export function PageDragHandle({
  disabled = false,
  onDragStart,
  onDragMove,
  onDragEnd,
  dragTranslateY,
  active = false,
}: PageDragHandleProps) {
  const resetSpringConfig =
    Platform.OS === "android"
      ? { damping: 22, stiffness: 180, mass: 0.9 }
      : { damping: 18, stiffness: 160, mass: 0.9 };

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(Platform.OS === "android" ? 220 : 280)
    .enabled(!disabled)
    .shouldCancelWhenOutside(false)
    .onStart(() => {
      runOnJS(onDragStart)();
    })
    .onUpdate((event) => {
      if (dragTranslateY) {
        dragTranslateY.value = event.translationY;
        return;
      }
      runOnJS(onDragMove)(event.translationY);
    })
    .onFinalize((event) => {
      if (dragTranslateY) {
        dragTranslateY.value = withSpring(0, resetSpringConfig);
      }
      runOnJS(onDragEnd)(event.translationY);
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View
        style={[styles.handle, active && styles.handleActive]}
        accessibilityLabel="Перетащить страницу"
      >
        <Ionicons
          name="reorder-three"
          size={24}
          color={active ? colors.primary : colors.tabInactive}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  handle: {
    width: 36,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.sm,
    backgroundColor: colors.white,
  },
  handleActive: {
    backgroundColor: colors.primarySurface,
  },
});
