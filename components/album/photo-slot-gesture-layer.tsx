import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui';
import { colors, BLANK_ALBUM_PHOTO_RADIUS, radii, spacing, surfaces } from '@/constants/design-tokens';
import type { PhotoSlotTransform } from '@/types/album-page-schema';
import {
  applyPhotoSlotTransform,
  clampAspectAwarePhotoOffset,
  clampPhotoScaleBetween,
  computePhotoContainScaleWorklet,
  DEFAULT_PHOTO_SLOT_TRANSFORM,
  MAX_PHOTO_SCALE,
  normalizePhotoSlotTransformWithMin,
} from '@/utils/photoSlotTransform';
import { resolvePhotoSlotTransformForDisplay } from '@/utils/photoSlotInitialTransform';
import { resolvePageSourceSize } from '@/utils/pageSourceDimensions';
import { isManagedAlbumPhotoUri, isRemotePhotoUri } from '@/utils/persistAlbumPhoto';

type PhotoSlotChromeStyle = 'toolbar' | 'overlay' | 'none';

type PhotoSlotGestureLayerProps = {
  uri: string | null;
  slotLabel: string;
  slotIndex: number;
  transform: PhotoSlotTransform;
  gesturesEnabled?: boolean;
  /** @deprecated use chromeStyle="none" */
  hideChrome?: boolean;
  chromeStyle?: PhotoSlotChromeStyle;
  onPressEmpty: () => void;
  onReplacePhoto?: () => void;
  onRemovePhoto?: () => void;
  onTransformChange: (transform: PhotoSlotTransform) => void;
};

function resolveChromeStyle(
  chromeStyle: PhotoSlotChromeStyle | undefined,
  hideChrome: boolean | undefined,
): PhotoSlotChromeStyle {
  if (chromeStyle) return chromeStyle;
  if (hideChrome) return 'none';
  return 'toolbar';
}

function PhotoSlotFilled({
  uri,
  slotLabel,
  slotIndex,
  transform,
  gesturesEnabled,
  chromeStyle,
  onReplacePhoto,
  onRemovePhoto,
  onTransformChange,
}: Omit<PhotoSlotGestureLayerProps, 'onPressEmpty' | 'uri' | 'hideChrome'> & {
  uri: string;
  chromeStyle: PhotoSlotChromeStyle;
}) {
  const savedScale = useSharedValue(transform.scale || 1);
  const savedOffsetX = useSharedValue(transform.offsetX || 0);
  const savedOffsetY = useSharedValue(transform.offsetY || 0);
  const scale = useSharedValue(transform.scale || 1);
  const offsetX = useSharedValue(transform.offsetX || 0);
  const offsetY = useSharedValue(transform.offsetY || 0);
  const slotWidth = useSharedValue(120);
  const slotHeight = useSharedValue(120);
  const imageAspect = useSharedValue(1);
  const minPhotoScale = useSharedValue(1);

  useEffect(() => {
    let cancelled = false;
    resolvePageSourceSize(uri).then((size) => {
      if (cancelled || !size?.width || !size?.height) return;
      const aspect = size.width / size.height;
      imageAspect.value = aspect;
      minPhotoScale.value = computePhotoContainScaleWorklet(
        slotWidth.value,
        slotHeight.value,
        aspect,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [imageAspect, minPhotoScale, slotHeight, slotWidth, uri]);

  useEffect(() => {
    if (slotWidth.value > 0 && slotHeight.value > 0 && imageAspect.value > 0) {
      minPhotoScale.value = computePhotoContainScaleWorklet(
        slotWidth.value,
        slotHeight.value,
        imageAspect.value,
      );
    }
  }, [imageAspect, minPhotoScale, slotHeight, slotWidth, transform.scale]);

  useEffect(() => {
    const minScale = minPhotoScale.value;
    const slotW = slotWidth.value;
    const slotH = slotHeight.value;
    const aspect = imageAspect.value;
    const displayTransform =
      slotW > 0 && slotH > 0 && aspect > 0
        ? resolvePhotoSlotTransformForDisplay(transform, slotW, slotH, aspect)
        : transform;
    const next = normalizePhotoSlotTransformWithMin(displayTransform, minScale);
    savedScale.value = next.scale;
    savedOffsetX.value = next.offsetX;
    savedOffsetY.value = next.offsetY;
    scale.value = next.scale;
    offsetX.value = next.offsetX;
    offsetY.value = next.offsetY;

    if (
      slotW > 0 &&
      slotH > 0 &&
      aspect > 0 &&
      (Math.abs((displayTransform.scale ?? 1) - (transform.scale ?? 1)) > 0.001 ||
        Math.abs((displayTransform.offsetX ?? 0) - (transform.offsetX ?? 0)) > 0.001 ||
        Math.abs((displayTransform.offsetY ?? 0) - (transform.offsetY ?? 0)) > 0.001)
    ) {
      onTransformChange(next);
    }
  }, [
    transform,
    offsetX,
    offsetY,
    savedOffsetX,
    savedOffsetY,
    savedScale,
    scale,
    minPhotoScale,
    slotWidth,
    slotHeight,
    imageAspect,
    onTransformChange,
  ]);

  const commitTransform = useCallback(() => {
    const minScale = minPhotoScale.value;
    const clamped = clampAspectAwarePhotoOffset(
      slotWidth.value,
      slotHeight.value,
      imageAspect.value,
      scale.value,
      offsetX.value,
      offsetY.value,
    );
    onTransformChange(
      normalizePhotoSlotTransformWithMin(
        {
          scale: scale.value,
          offsetX: clamped.offsetX,
          offsetY: clamped.offsetY,
        },
        minScale,
      ),
    );
  }, [imageAspect, minPhotoScale, onTransformChange, offsetX, offsetY, scale, slotHeight, slotWidth]);

  const panGesture = Gesture.Pan()
    .enabled(gesturesEnabled !== false)
    .onUpdate((event) => {
      const width = Math.max(slotWidth.value, 1);
      const height = Math.max(slotHeight.value, 1);
      const next = clampAspectAwarePhotoOffset(
        width,
        height,
        imageAspect.value,
        scale.value,
        savedOffsetX.value + event.translationX / width,
        savedOffsetY.value + event.translationY / height,
      );
      offsetX.value = next.offsetX;
      offsetY.value = next.offsetY;
    })
    .onEnd(() => {
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
      runOnJS(commitTransform)();
    });

  const pinchGesture = Gesture.Pinch()
    .enabled(gesturesEnabled !== false)
    .onBegin(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = clampPhotoScaleBetween(
        savedScale.value * event.scale,
        minPhotoScale.value,
        MAX_PHOTO_SCALE,
      );
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      runOnJS(commitTransform)();
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  const imageStyle = useAnimatedStyle(() => {
    const rect = applyPhotoSlotTransform(
      { x: 0, y: 0, width: slotWidth.value, height: slotHeight.value },
      {
        scale: scale.value,
        offsetX: offsetX.value,
        offsetY: offsetY.value,
      },
      imageAspect.value,
    );

    return {
      position: 'absolute',
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
    };
  });

  const isOverlay = chromeStyle === 'overlay';
  const canUseGestures = gesturesEnabled !== false;

  const imageContent = (
    <Animated.View
      style={styles.imageClip}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) {
          slotWidth.value = width;
          slotHeight.value = height;
          if (imageAspect.value > 0) {
            minPhotoScale.value = computePhotoContainScaleWorklet(
              width,
              height,
              imageAspect.value,
            );
          }
        }
      }}
    >
      <Animated.View style={[styles.imageInner, imageStyle]}>
        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="cover"
          recyclingKey={uri}
          onError={() => {
            // Не трогаем remote HTTPS и чужие file:// (с другого устройства):
            // иначе слот стирается при первом open и уезжает пустым в облако.
            if (isManagedAlbumPhotoUri(uri) && !isRemotePhotoUri(uri)) {
              onRemovePhoto?.();
            }
          }}
        />
      </Animated.View>
    </Animated.View>
  );

  return (
    <View
      testID={`photo-slot-${slotIndex}`}
      style={[styles.filledWrap, isOverlay && styles.filledWrapOverlay]}
    >
      {canUseGestures ? (
        <GestureDetector gesture={composed}>{imageContent}</GestureDetector>
      ) : (
        imageContent
      )}

      {isOverlay && canUseGestures ? (
        <AppText variant="caption" style={styles.overlayGestureHint} pointerEvents="none">
          Щипок — масштаб, перетаскивание — позиция
        </AppText>
      ) : null}

      {isOverlay ? (
        <View style={styles.overlayChrome} pointerEvents="box-none">
          {onReplacePhoto || onRemovePhoto ? (
            <View style={styles.overlayActions}>
              {onReplacePhoto ? (
                <Pressable
                  onPress={onReplacePhoto}
                  style={({ pressed }) => [
                    styles.overlayBtn,
                    pressed && styles.overlayBtnPressed,
                  ]}
                  accessibilityLabel="Заменить фото"
                >
                  <Ionicons name="swap-horizontal" size={16} color={colors.white} />
                </Pressable>
              ) : null}
              {onRemovePhoto ? (
                <Pressable
                  onPress={onRemovePhoto}
                  style={({ pressed }) => [
                    styles.overlayBtn,
                    pressed && styles.overlayBtnPressed,
                  ]}
                  accessibilityLabel="Удалить фото"
                >
                  <Ionicons name="trash-outline" size={16} color={colors.white} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {chromeStyle === 'toolbar' ? (
        <View style={styles.toolbar}>
          <AppText variant="caption" style={styles.toolbarLabel} numberOfLines={1}>
            {slotLabel}
          </AppText>
          <View style={styles.toolbarActions}>
            {onReplacePhoto ? (
              <Pressable
                onPress={onReplacePhoto}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                accessibilityLabel="Заменить фото"
              >
                <Ionicons name="swap-horizontal-outline" size={16} color={colors.primary} />
              </Pressable>
            ) : null}
            {onRemovePhoto ? (
              <Pressable
                onPress={onRemovePhoto}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                accessibilityLabel="Удалить фото"
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {chromeStyle === 'toolbar' && gesturesEnabled !== false ? (
        <AppText variant="caption" style={styles.gestureHint}>
          Щипок — масштаб, перетаскивание — позиция
        </AppText>
      ) : null}
    </View>
  );
}

export function PhotoSlotGestureLayer({
  uri,
  slotLabel,
  slotIndex,
  transform,
  gesturesEnabled = true,
  hideChrome = false,
  chromeStyle,
  onPressEmpty,
  onReplacePhoto,
  onRemovePhoto,
  onTransformChange,
}: PhotoSlotGestureLayerProps) {
  const resolvedChromeStyle = resolveChromeStyle(chromeStyle, hideChrome);

  if (!uri) {
    return (
      <Pressable
        testID={`photo-slot-${slotIndex}`}
        onPress={onPressEmpty}
        style={({ pressed }) => [
          styles.emptySlot,
          resolvedChromeStyle === 'overlay' && styles.emptySlotOverlay,
          pressed && styles.emptyPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Добавить фото ${slotIndex + 1}`}
      >
        <View style={styles.emptyIconWrap}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </View>
        <AppText variant="caption" style={styles.emptyHint}>
          {slotLabel}
        </AppText>
      </Pressable>
    );
  }

  return (
    <PhotoSlotFilled
      uri={uri}
      slotLabel={slotLabel}
      slotIndex={slotIndex}
      transform={transform}
      gesturesEnabled={gesturesEnabled}
      chromeStyle={resolvedChromeStyle}
      onReplacePhoto={onReplacePhoto}
      onRemovePhoto={onRemovePhoto}
      onTransformChange={onTransformChange}
    />
  );
}

const styles = StyleSheet.create({
  filledWrap: {
    flex: 1,
    borderRadius: BLANK_ALBUM_PHOTO_RADIUS,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filledWrapOverlay: {
    borderWidth: 0,
    backgroundColor: colors.primarySurface,
  },
  imageClip: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: BLANK_ALBUM_PHOTO_RADIUS,
    backgroundColor: colors.white,
    position: 'relative',
  },
  imageInner: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlayChrome: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 6,
  },
  overlayActions: {
    flexDirection: 'row',
    gap: 6,
  },
  overlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(61, 61, 61, 0.55)',
  },
  overlayBtnPressed: {
    opacity: 0.85,
  },
  overlayGestureHint: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 6,
    textAlign: 'center',
    color: colors.white,
    backgroundColor: 'rgba(61, 61, 61, 0.45)',
    borderRadius: radii.sm,
    paddingVertical: 4,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    gap: spacing.xs,
  },
  toolbarLabel: {
    color: colors.textSecondary,
    flex: 1,
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
  },
  iconBtnPressed: {
    opacity: 0.8,
  },
  gestureHint: {
    textAlign: 'center',
    color: colors.placeholder,
    paddingBottom: 6,
    backgroundColor: colors.white,
  },
  emptySlot: {
    flex: 1,
    borderRadius: BLANK_ALBUM_PHOTO_RADIUS,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: surfaces.muted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    minHeight: 72,
  },
  emptySlotOverlay: {
    backgroundColor: colors.white,
    borderColor: colors.primaryLight,
  },
  emptyPressed: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primary,
  },
  emptyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
  },
  emptyHint: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
