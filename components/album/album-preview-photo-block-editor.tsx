import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { colors, radii } from '@/constants/design-tokens';
import type { PhotoSlotTransform } from '@/types/album-page-schema';
import {
  computePhotoBlockLayout,
  resolvePhotoBlockRect,
  type PhotoBlockLayout,
} from '@/utils/photoBlockLayout';
import {
  applyPhotoSlotTransform,
  clampPhotoOffset,
  clampPhotoScale,
  DEFAULT_PHOTO_SLOT_TRANSFORM,
  normalizePhotoSlotTransform,
} from '@/utils/photoSlotTransform';

type AlbumPreviewPhotoBlockEditorProps = {
  lineGuideId: string;
  sourcePageNumber: number;
  variantId: string;
  slotUris: (string | null)[];
  groupTransform?: PhotoSlotTransform;
  coordinateWidth: number;
  coordinateHeight: number;
  sourceWidth?: number;
  sourceHeight?: number;
  onGroupTransformChange: (transform: PhotoSlotTransform) => void;
};

const HANDLE_SIZE = 22;
const HANDLE_HIT = 36;

type CornerId = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

const CORNERS: CornerId[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

function cornerSign(corner: CornerId): { x: number; y: number } {
  switch (corner) {
    case 'topLeft':
      return { x: -1, y: -1 };
    case 'topRight':
      return { x: 1, y: -1 };
    case 'bottomLeft':
      return { x: -1, y: 1 };
    default:
      return { x: 1, y: 1 };
  }
}

function cornerHandleStyle(corner: CornerId) {
  const inset = -HANDLE_HIT / 2;
  switch (corner) {
    case 'topLeft':
      return { left: inset, top: inset };
    case 'topRight':
      return { right: inset, top: inset };
    case 'bottomLeft':
      return { left: inset, bottom: inset };
    default:
      return { right: inset, bottom: inset };
  }
}

export function AlbumPreviewPhotoBlockEditor({
  lineGuideId,
  sourcePageNumber,
  variantId,
  slotUris,
  groupTransform = DEFAULT_PHOTO_SLOT_TRANSFORM,
  coordinateWidth,
  coordinateHeight,
  sourceWidth,
  sourceHeight,
  onGroupTransformChange,
}: AlbumPreviewPhotoBlockEditorProps) {
  const [selected, setSelected] = useState(false);

  const layout = useMemo(
    () =>
      computePhotoBlockLayout({
        lineGuideId,
        sourcePageNumber,
        variantId,
        slotUris,
        viewportWidth: coordinateWidth,
        viewportHeight: coordinateHeight,
        sourceWidth,
        sourceHeight,
      }),
    [
      coordinateHeight,
      coordinateWidth,
      lineGuideId,
      slotUris,
      sourceHeight,
      sourcePageNumber,
      sourceWidth,
      variantId,
    ],
  );

  const baseBlock = layout?.baseBlock;

  const savedScale = useSharedValue(groupTransform.scale ?? 1);
  const savedOffsetX = useSharedValue(groupTransform.offsetX ?? 0);
  const savedOffsetY = useSharedValue(groupTransform.offsetY ?? 0);
  const scale = useSharedValue(groupTransform.scale ?? 1);
  const offsetX = useSharedValue(groupTransform.offsetX ?? 0);
  const offsetY = useSharedValue(groupTransform.offsetY ?? 0);

  useEffect(() => {
    const next = normalizePhotoSlotTransform(groupTransform);
    savedScale.value = next.scale;
    savedOffsetX.value = next.offsetX;
    savedOffsetY.value = next.offsetY;
    scale.value = next.scale;
    offsetX.value = next.offsetX;
    offsetY.value = next.offsetY;
  }, [
    groupTransform,
    offsetX,
    offsetY,
    savedOffsetX,
    savedOffsetY,
    savedScale,
    scale,
  ]);

  const commitTransform = useCallback(() => {
    onGroupTransformChange(
      normalizePhotoSlotTransform({
        scale: scale.value,
        offsetX: offsetX.value,
        offsetY: offsetY.value,
      }),
    );
  }, [offsetX, offsetY, onGroupTransformChange, scale]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(selected)
        .onUpdate((event) => {
          if (!baseBlock) return;
          offsetX.value = clampPhotoOffset(
            savedOffsetX.value + event.translationX / Math.max(baseBlock.width, 1),
          );
          offsetY.value = clampPhotoOffset(
            savedOffsetY.value + event.translationY / Math.max(baseBlock.height, 1),
          );
        })
        .onEnd(() => {
          savedOffsetX.value = offsetX.value;
          savedOffsetY.value = offsetY.value;
          runOnJS(commitTransform)();
        }),
    [baseBlock, commitTransform, offsetX, offsetY, savedOffsetX, savedOffsetY, selected],
  );

  const cornerGestures = useMemo(() => {
    if (!baseBlock) {
      return {} as Record<CornerId, ReturnType<typeof Gesture.Pan>>;
    }

    return CORNERS.reduce(
      (acc, corner) => {
        const sign = cornerSign(corner);
        acc[corner] = Gesture.Pan()
          .enabled(selected)
          .onUpdate((event) => {
            const delta =
              (event.translationX * sign.x + event.translationY * sign.y) /
              Math.max(baseBlock.width, baseBlock.height, 1);
            scale.value = clampPhotoScale(savedScale.value * (1 + delta * 0.85));
          })
          .onEnd(() => {
            savedScale.value = scale.value;
            runOnJS(commitTransform)();
          });
        return acc;
      },
      {} as Record<CornerId, ReturnType<typeof Gesture.Pan>>,
    );
  }, [baseBlock, commitTransform, savedScale, scale, selected]);

  const animatedBlockStyle = useAnimatedStyle(() => {
    if (!baseBlock) {
      return { opacity: 0 };
    }

    const rect = applyPhotoSlotTransform(baseBlock, {
      scale: scale.value,
      offsetX: offsetX.value,
      offsetY: offsetY.value,
    });

    return {
      position: 'absolute',
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
    };
  }, [baseBlock]);

  const tapRect = useMemo(() => {
    if (!layout) return null;
    return resolvePhotoBlockRect(layout.baseBlock, groupTransform);
  }, [groupTransform, layout]);

  if (!layout || !baseBlock) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {selected ? (
        <Pressable
          style={styles.backdrop}
          onPress={() => setSelected(false)}
          accessibilityLabel="Снять выделение блока фото"
        />
      ) : null}

      {!selected && tapRect ? (
        <Pressable
          style={[
            styles.tapTarget,
            {
              left: tapRect.x,
              top: tapRect.y,
              width: tapRect.width,
              height: tapRect.height,
            },
          ]}
          onPress={() => setSelected(true)}
          accessibilityRole="button"
          accessibilityLabel="Выбрать блок фото"
        />
      ) : null}

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.block, animatedBlockStyle]}>
          <BlockPhotos layout={layout} />

          {selected ? (
            <>
              <View style={styles.selectionBorder} pointerEvents="none" />
              {CORNERS.map((corner) => (
                <GestureDetector key={corner} gesture={cornerGestures[corner]}>
                  <Animated.View
                    style={[styles.handleHit, cornerHandleStyle(corner)]}
                    accessibilityLabel="Изменить размер блока фото"
                  >
                    <View style={styles.handle} />
                  </Animated.View>
                </GestureDetector>
              ))}
            </>
          ) : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function BlockPhotos({ layout }: { layout: PhotoBlockLayout }) {
  return (
    <>
      {layout.slots.map((slot) => (
        <View
          key={slot.slotIndex}
          style={[
            styles.photoSlot,
            {
              left: `${slot.relative.x * 100}%`,
              top: `${slot.relative.y * 100}%`,
              width: `${slot.relative.width * 100}%`,
              height: `${slot.relative.height * 100}%`,
            },
          ]}
        >
          <Image source={{ uri: slot.uri }} style={styles.photo} contentFit="cover" />
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 6,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  tapTarget: {
    position: 'absolute',
    zIndex: 2,
  },
  block: {
    zIndex: 3,
    overflow: 'visible',
  },
  photoSlot: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: radii.sm,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  selectionBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radii.sm,
    zIndex: 4,
  },
  handleHit: {
    position: 'absolute',
    width: HANDLE_HIT,
    height: HANDLE_HIT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  handle: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
});
