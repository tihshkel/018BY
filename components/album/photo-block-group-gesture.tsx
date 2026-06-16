import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { colors, radii, spacing } from '@/constants/design-tokens';
import type { PhotoSlotTransform } from '@/types/album-page-schema';
import {
  clampPhotoOffset,
  clampPhotoScale,
  normalizePhotoSlotTransform,
} from '@/utils/photoSlotTransform';

type PhotoBlockGroupGestureProps = {
  children: React.ReactNode;
  transform: PhotoSlotTransform;
  enabled: boolean;
  onTransformChange: (transform: PhotoSlotTransform) => void;
};

export function PhotoBlockGroupGesture({
  children,
  transform,
  enabled,
  onTransformChange,
}: PhotoBlockGroupGestureProps) {
  const savedScale = useSharedValue(transform.scale || 1);
  const savedOffsetX = useSharedValue(transform.offsetX || 0);
  const savedOffsetY = useSharedValue(transform.offsetY || 0);
  const scale = useSharedValue(transform.scale || 1);
  const offsetX = useSharedValue(transform.offsetX || 0);
  const offsetY = useSharedValue(transform.offsetY || 0);

  useEffect(() => {
    const next = normalizePhotoSlotTransform(transform);
    savedScale.value = next.scale;
    savedOffsetX.value = next.offsetX;
    savedOffsetY.value = next.offsetY;
    scale.value = next.scale;
    offsetX.value = next.offsetX;
    offsetY.value = next.offsetY;
  }, [transform, offsetX, offsetY, savedOffsetX, savedOffsetY, savedScale, scale]);

  const commitTransform = useCallback(() => {
    onTransformChange(
      normalizePhotoSlotTransform({
        scale: scale.value,
        offsetX: offsetX.value,
        offsetY: offsetY.value,
      }),
    );
  }, [onTransformChange, offsetX, offsetY, scale]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      offsetX.value = clampPhotoOffset(savedOffsetX.value + event.translationX / 140);
      offsetY.value = clampPhotoOffset(savedOffsetY.value + event.translationY / 140);
    })
    .onEnd(() => {
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
      runOnJS(commitTransform)();
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = clampPhotoScale(savedScale.value * event.scale);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      runOnJS(commitTransform)();
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  const groupStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: offsetX.value * 18 },
      { translateY: offsetY.value * 18 },
    ],
  }));

  if (!enabled) {
    return <View style={styles.wrap}>{children}</View>;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.activeIndicator}>
        <Ionicons name="move-outline" size={14} color={colors.primary} />
      </View>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.group, groupStyle]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  group: {
    width: '100%',
  },
  activeIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySurface,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
