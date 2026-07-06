import { AlbumPhotoImage, prefetchAlbumPhotoUri } from '@/components/album/album-photo-image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { colors, BLANK_ALBUM_PHOTO_RADIUS, radii } from '@/constants/design-tokens';
import type { PhotoSlotTransform } from '@/types/album-page-schema';
import { getContentRect } from '@/utils/imageContentRect';
import {
  computePhotoBlockLayout,
  type PhotoBlockLayout,
  type ViewportRect,
} from '@/utils/photoBlockLayout';
import {
  applyPhotoSlotTransform,
  clampPhotoBlockTransform,
  DEFAULT_PHOTO_SLOT_TRANSFORM,
  normalizePhotoSlotTransform,
} from '@/utils/photoSlotTransform';

type AlbumPreviewPhotoBlockEditorProps = {
  lineGuideId: string;
  sourcePageNumber: number;
  variantId: string;
  slotUris: (string | null)[];
  templateLibraryId?: string;
  groupTransform?: PhotoSlotTransform;
  safeBounds?: ViewportRect | null;
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
  templateLibraryId,
  groupTransform = DEFAULT_PHOTO_SLOT_TRANSFORM,
  safeBounds,
  coordinateWidth,
  coordinateHeight,
  sourceWidth,
  sourceHeight,
  onGroupTransformChange,
}: AlbumPreviewPhotoBlockEditorProps) {
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    slotUris.forEach((uri) => prefetchAlbumPhotoUri(uri));
  }, [slotUris]);

  const contentRect = useMemo(
    () =>
      getContentRect(
        coordinateWidth,
        coordinateHeight,
        sourceWidth ?? coordinateWidth,
        sourceHeight ?? coordinateHeight,
      ),
    [coordinateHeight, coordinateWidth, sourceHeight, sourceWidth],
  );

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
        contentRect,
        templateLibraryId,
      }),
    [
      contentRect,
      coordinateHeight,
      coordinateWidth,
      lineGuideId,
      slotUris,
      sourceHeight,
      sourcePageNumber,
      sourceWidth,
      templateLibraryId,
      variantId,
    ],
  );

  const baseBlock = layout?.baseBlock;

  const applyClampedTransform = useCallback(
    (next: PhotoSlotTransform) => {
      if (!baseBlock) return next;
      const bounds =
        safeBounds && safeBounds.width > 0 && safeBounds.height > 0 ? safeBounds : null;
      return clampPhotoBlockTransform(baseBlock, next, bounds);
    },
    [baseBlock, safeBounds],
  );

  const savedScale = useSharedValue(groupTransform.scale ?? 1);
  const savedOffsetX = useSharedValue(groupTransform.offsetX ?? 0);
  const savedOffsetY = useSharedValue(groupTransform.offsetY ?? 0);
  const scale = useSharedValue(groupTransform.scale ?? 1);
  const offsetX = useSharedValue(groupTransform.offsetX ?? 0);
  const offsetY = useSharedValue(groupTransform.offsetY ?? 0);

  const baseX = useSharedValue(0);
  const baseY = useSharedValue(0);
  const baseW = useSharedValue(1);
  const baseH = useSharedValue(1);
  const safeX = useSharedValue(0);
  const safeY = useSharedValue(0);
  const safeW = useSharedValue(0);
  const safeH = useSharedValue(0);
  const hasSafeBounds = useSharedValue(false);

  useEffect(() => {
    if (!baseBlock) return;
    baseX.value = baseBlock.x;
    baseY.value = baseBlock.y;
    baseW.value = baseBlock.width;
    baseH.value = baseBlock.height;
  }, [baseBlock, baseH, baseW, baseX, baseY]);

  useEffect(() => {
    if (safeBounds && safeBounds.width > 0 && safeBounds.height > 0) {
      hasSafeBounds.value = true;
      safeX.value = safeBounds.x;
      safeY.value = safeBounds.y;
      safeW.value = safeBounds.width;
      safeH.value = safeBounds.height;
      return;
    }
    hasSafeBounds.value = false;
  }, [hasSafeBounds, safeBounds, safeH, safeW, safeX, safeY]);

  useEffect(() => {
    const next = applyClampedTransform(normalizePhotoSlotTransform(groupTransform));
    savedScale.value = next.scale;
    savedOffsetX.value = next.offsetX;
    savedOffsetY.value = next.offsetY;
    scale.value = next.scale;
    offsetX.value = next.offsetX;
    offsetY.value = next.offsetY;
  }, [
    applyClampedTransform,
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
          const block = {
            x: baseX.value,
            y: baseY.value,
            width: baseW.value,
            height: baseH.value,
          };
          const bounds = hasSafeBounds.value
            ? { x: safeX.value, y: safeY.value, width: safeW.value, height: safeH.value }
            : null;
          const clamped = clampPhotoBlockTransform(
            block,
            {
              scale: savedScale.value,
              offsetX: savedOffsetX.value + event.translationX / Math.max(block.width, 1),
              offsetY: savedOffsetY.value + event.translationY / Math.max(block.height, 1),
            },
            bounds,
          );
          scale.value = clamped.scale;
          offsetX.value = clamped.offsetX;
          offsetY.value = clamped.offsetY;
        })
        .onEnd(() => {
          savedScale.value = scale.value;
          savedOffsetX.value = offsetX.value;
          savedOffsetY.value = offsetY.value;
          runOnJS(commitTransform)();
        }),
    [
      baseH,
      baseW,
      baseX,
      baseY,
      commitTransform,
      hasSafeBounds,
      offsetX,
      offsetY,
      safeH,
      safeW,
      safeX,
      safeY,
      savedOffsetX,
      savedOffsetY,
      savedScale,
      scale,
      selected,
    ],
  );

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .enabled(selected)
        .onUpdate((event) => {
          const block = {
            x: baseX.value,
            y: baseY.value,
            width: baseW.value,
            height: baseH.value,
          };
          const bounds = hasSafeBounds.value
            ? { x: safeX.value, y: safeY.value, width: safeW.value, height: safeH.value }
            : null;
          const clamped = clampPhotoBlockTransform(
            block,
            {
              scale: savedScale.value * event.scale,
              offsetX: savedOffsetX.value,
              offsetY: savedOffsetY.value,
            },
            bounds,
          );
          scale.value = clamped.scale;
          offsetX.value = clamped.offsetX;
          offsetY.value = clamped.offsetY;
        })
        .onEnd(() => {
          savedScale.value = scale.value;
          savedOffsetX.value = offsetX.value;
          savedOffsetY.value = offsetY.value;
          runOnJS(commitTransform)();
        }),
    [
      baseH,
      baseW,
      baseX,
      baseY,
      commitTransform,
      hasSafeBounds,
      offsetX,
      offsetY,
      safeH,
      safeW,
      safeX,
      safeY,
      savedOffsetX,
      savedOffsetY,
      savedScale,
      scale,
      selected,
    ],
  );

  const blockGesture = useMemo(
    () => Gesture.Simultaneous(panGesture, pinchGesture),
    [panGesture, pinchGesture],
  );

  const selectBlockGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(!selected)
        .onEnd(() => {
          runOnJS(setSelected)(true);
        }),
    [selected],
  );

  const idleBlockGesture = useMemo(
    () => Gesture.Simultaneous(selectBlockGesture, blockGesture),
    [blockGesture, selectBlockGesture],
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
            const block = {
              x: baseX.value,
              y: baseY.value,
              width: baseW.value,
              height: baseH.value,
            };
            const bounds = hasSafeBounds.value
              ? { x: safeX.value, y: safeY.value, width: safeW.value, height: safeH.value }
              : null;
            const delta =
              (event.translationX * sign.x + event.translationY * sign.y) /
              Math.max(block.width, block.height, 1);
            const clamped = clampPhotoBlockTransform(
              block,
              {
                scale: savedScale.value * (1 + delta * 0.85),
                offsetX: savedOffsetX.value,
                offsetY: savedOffsetY.value,
              },
              bounds,
            );
            scale.value = clamped.scale;
            offsetX.value = clamped.offsetX;
            offsetY.value = clamped.offsetY;
          })
          .onEnd(() => {
            savedScale.value = scale.value;
            savedOffsetX.value = offsetX.value;
            savedOffsetY.value = offsetY.value;
            runOnJS(commitTransform)();
          });
        return acc;
      },
      {} as Record<CornerId, ReturnType<typeof Gesture.Pan>>,
    );
  }, [
    baseBlock,
    baseH,
    baseW,
    baseX,
    baseY,
    commitTransform,
    hasSafeBounds,
    offsetX,
    offsetY,
    safeH,
    safeW,
    safeX,
    safeY,
    savedOffsetX,
    savedOffsetY,
    savedScale,
    scale,
    selected,
  ]);

  const animatedBlockStyle = useAnimatedStyle(() => {
    const rect = applyPhotoSlotTransform(
      {
        x: baseX.value,
        y: baseY.value,
        width: baseW.value,
        height: baseH.value,
      },
      {
        scale: scale.value,
        offsetX: offsetX.value,
        offsetY: offsetY.value,
      },
    );

    return {
      position: 'absolute',
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
    };
  });

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

      <GestureDetector gesture={idleBlockGesture}>
        <Animated.View
          style={[styles.block, animatedBlockStyle]}
          pointerEvents={selected ? 'auto' : 'box-only'}
          testID={!selected ? 'preview-photo-block-select' : undefined}
          accessibilityRole={!selected ? 'button' : undefined}
          accessibilityLabel={!selected ? 'Выбрать блок фото' : undefined}
        >
          <BlockPhotos layout={layout} />

          {selected ? (
            <>
              <View
                style={styles.selectionBorder}
                pointerEvents="none"
                testID="preview-photo-block-selected"
              />
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
          <AlbumPhotoImage
            uri={slot.uri}
            style={styles.photo}
            recyclingKey={`preview-slot-${slot.slotIndex}-${slot.uri}`}
          />
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  block: {
    zIndex: 3,
    overflow: 'visible',
  },
  photoSlot: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: BLANK_ALBUM_PHOTO_RADIUS,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  selectionBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: BLANK_ALBUM_PHOTO_RADIUS,
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
