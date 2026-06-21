import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

import { colors, radii } from "@/constants/design-tokens";

type PageDragHandleProps = {
  disabled?: boolean;
  onDragStart: () => void;
  onDragMove: (translationY: number) => void;
  onDragEnd: () => void;
  active?: boolean;
};

export function PageDragHandle({
  disabled = false,
  onDragStart,
  onDragMove,
  onDragEnd,
  active = false,
}: PageDragHandleProps) {
  const panGesture = Gesture.Pan()
    .activateAfterLongPress(Platform.OS === "android" ? 220 : 280)
    .enabled(!disabled)
    .shouldCancelWhenOutside(false)
    .onStart(() => {
      runOnJS(onDragStart)();
    })
    .onUpdate((event) => {
      runOnJS(onDragMove)(event.translationY);
    })
    .onEnd(() => {
      runOnJS(onDragEnd)();
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
