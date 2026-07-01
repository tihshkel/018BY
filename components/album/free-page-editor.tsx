import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

import { AppButton, AppCard, AppText } from '@/components/ui';
import { colors, radii, sansFont, spacing } from '@/constants/design-tokens';
import type { AlbumPageSchema, FreePageElement, PhotoSlotTransform } from '@/types/album-page-schema';
import { createId } from '@/utils/id';
import {
  applyPhotoSlotTransform,
  clampPhotoOffset,
  clampPhotoScaleBetween,
  DEFAULT_PHOTO_SLOT_TRANSFORM,
  normalizePhotoSlotTransform,
} from '@/utils/photoSlotTransform';
import { buildInitialPhotoSlotTransform } from '@/utils/photoSlotInitialTransform';
import { resolvePageSourceSize } from '@/utils/pageSourceDimensions';
import {
  getPageFormatForLineGuide,
  getTemplateLayout,
} from '@/utils/photoPageTemplateManifest';
import { pickPhotoFromLibrary } from '@/utils/pickAlbumPhoto';
import {
  buildAlbumPhotoStorageKey,
  persistAlbumPhotoUri,
} from '@/utils/persistAlbumPhoto';

type FreePageEditorProps = {
  schema: AlbumPageSchema;
  elements: FreePageElement[];
  lineGuideId: string;
  projectId?: string;
  instanceId?: string;
  onChange: (elements: FreePageElement[]) => void;
  ensureMediaLibraryPermission: () => Promise<boolean>;
};

const CANVAS_ASPECT: Record<string, number> = {
  '18x24': 3 / 4,
  '21x21': 1,
};

function clampNorm(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

type DraggableElementProps = {
  element: FreePageElement;
  canvas: { width: number; height: number };
  safeRect: { x: number; y: number; w: number; h: number };
  selected: boolean;
  onSelect: () => void;
  onChange: (next: FreePageElement) => void;
};

function FreeImageCropLayer({
  uri,
  crop,
  selected,
  onCropChange,
}: {
  uri: string;
  crop: PhotoSlotTransform;
  selected: boolean;
  onCropChange: (crop: PhotoSlotTransform) => void;
}) {
  const savedScale = useSharedValue(crop.scale || 1);
  const savedOffsetX = useSharedValue(crop.offsetX || 0);
  const savedOffsetY = useSharedValue(crop.offsetY || 0);
  const scale = useSharedValue(crop.scale || 1);
  const offsetX = useSharedValue(crop.offsetX || 0);
  const offsetY = useSharedValue(crop.offsetY || 0);
  const slotWidth = useSharedValue(120);
  const slotHeight = useSharedValue(120);
  const minCoverScale = useSharedValue(1);

  useEffect(() => {
    const next = normalizePhotoSlotTransform(crop);
    savedScale.value = next.scale;
    savedOffsetX.value = next.offsetX;
    savedOffsetY.value = next.offsetY;
    scale.value = next.scale;
    offsetX.value = next.offsetX;
    offsetY.value = next.offsetY;
    minCoverScale.value = Math.max(1, next.scale);
  }, [crop, minCoverScale, offsetX, offsetY, savedOffsetX, savedOffsetY, savedScale, scale]);

  const commitCrop = useCallback(() => {
    onCropChange(
      normalizePhotoSlotTransform({
        scale: scale.value,
        offsetX: offsetX.value,
        offsetY: offsetY.value,
      }),
    );
  }, [onCropChange, offsetX, offsetY, scale]);

  const panGesture = Gesture.Pan()
    .enabled(selected)
    .onUpdate((event) => {
      const width = Math.max(slotWidth.value, 1);
      const height = Math.max(slotHeight.value, 1);
      offsetX.value = clampPhotoOffset(savedOffsetX.value + event.translationX / width);
      offsetY.value = clampPhotoOffset(savedOffsetY.value + event.translationY / height);
    })
    .onEnd(() => {
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
      runOnJS(commitCrop)();
    });

  const pinchGesture = Gesture.Pinch()
    .enabled(selected)
    .onBegin(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = clampPhotoScaleBetween(savedScale.value * event.scale, minCoverScale.value);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      runOnJS(commitCrop)();
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
    );
    return {
      position: 'absolute',
      left: rect.x,
      top: rect.y,
      width: rect.width,
      height: rect.height,
    };
  });

  const content = (
    <View
      style={styles.imageClip}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) {
          slotWidth.value = width;
          slotHeight.value = height;
        }
      }}
    >
      <Animated.View style={imageStyle}>
        <Image source={{ uri }} style={styles.fill} contentFit="cover" />
      </Animated.View>
    </View>
  );

  return selected ? <GestureDetector gesture={composed}>{content}</GestureDetector> : content;
}

function DraggableFreeElement({
  element,
  canvas,
  safeRect,
  selected,
  onSelect,
  onChange,
}: DraggableElementProps) {
  const savedX = useSharedValue(element.x);
  const savedY = useSharedValue(element.y);
  const savedW = useSharedValue(element.w);
  const savedH = useSharedValue(element.h);

  useEffect(() => {
    savedX.value = element.x;
    savedY.value = element.y;
    savedW.value = element.w;
    savedH.value = element.h;
  }, [element, savedH, savedW, savedX, savedY]);

  const commit = useCallback(() => {
    onChange({
      ...element,
      x: savedX.value,
      y: savedY.value,
      w: savedW.value,
      h: savedH.value,
    });
  }, [element, onChange, savedH, savedW, savedX, savedY]);

  const commitCrop = useCallback(
    (crop: PhotoSlotTransform) => {
      onChange({ ...element, crop });
    },
    [element, onChange],
  );

  const isImage = element.type === 'image' && Boolean(element.content);
  const frameGesturesEnabled = !selected || !isImage;

  const panGesture = Gesture.Pan()
    .enabled(frameGesturesEnabled)
    .onBegin(() => {
      runOnJS(onSelect)();
    })
    .onUpdate((event) => {
      const dx = event.translationX / Math.max(canvas.width, 1);
      const dy = event.translationY / Math.max(canvas.height, 1);
      savedX.value = clampNorm(
        savedX.value + dx,
        safeRect.x,
        safeRect.x + safeRect.w - savedW.value,
      );
      savedY.value = clampNorm(
        savedY.value + dy,
        safeRect.y,
        safeRect.y + safeRect.h - savedH.value,
      );
    })
    .onEnd(() => {
      runOnJS(commit)();
    });

  const pinchGesture = Gesture.Pinch()
    .enabled(frameGesturesEnabled)
    .onBegin(() => {
      savedW.value = element.w;
      savedH.value = element.h;
    })
    .onUpdate((event) => {
      savedW.value = clampNorm(
        savedW.value * event.scale,
        0.08,
        Math.min(safeRect.w, safeRect.h),
      );
      savedH.value = clampNorm(
        savedH.value * event.scale,
        0.08,
        Math.min(safeRect.w, safeRect.h),
      );
    })
    .onEnd(() => {
      runOnJS(commit)();
    });

  const framePanGesture = Gesture.Pan()
    .enabled(selected && isImage)
    .onUpdate((event) => {
      const dx = event.translationX / Math.max(canvas.width, 1);
      const dy = event.translationY / Math.max(canvas.height, 1);
      savedX.value = clampNorm(
        savedX.value + dx,
        safeRect.x,
        safeRect.x + safeRect.w - savedW.value,
      );
      savedY.value = clampNorm(
        savedY.value + dy,
        safeRect.y,
        safeRect.y + safeRect.h - savedH.value,
      );
    })
    .onEnd(() => {
      runOnJS(commit)();
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: savedX.value * canvas.width,
    top: savedY.value * canvas.height,
    width: savedW.value * canvas.width,
    height: savedH.value * canvas.height,
    borderWidth: selected ? 2 : 0,
    borderColor: colors.primary,
    zIndex: element.zIndex ?? 1,
    transform: [{ rotate: `${element.rotation ?? 0}deg` }],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={style}>
        {isImage && element.content ? (
          <>
            {selected ? (
              <GestureDetector gesture={framePanGesture}>
                <View style={styles.frameDragHandle}>
                  <AppText variant="caption" style={styles.frameDragLabel}>
                    Переместить рамку
                  </AppText>
                </View>
              </GestureDetector>
            ) : null}
            <FreeImageCropLayer
              uri={element.content}
              crop={element.crop ?? DEFAULT_PHOTO_SLOT_TRANSFORM}
              selected={selected}
              onCropChange={commitCrop}
            />
          </>
        ) : (
          <View style={styles.textPreview}>
            <AppText variant="caption" numberOfLines={3}>
              {element.content || 'Текст'}
            </AppText>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export function FreePageEditor({
  schema,
  elements,
  lineGuideId,
  projectId,
  instanceId,
  onChange,
  ensureMediaLibraryPermission,
}: FreePageEditorProps) {
  const format = getPageFormatForLineGuide(lineGuideId);
  const layout = useMemo(
    () =>
      schema.templateLibraryId
        ? getTemplateLayout(schema.templateLibraryId, format)
        : undefined,
    [format, schema.templateLibraryId],
  );

  const limits = layout?.limits ?? { maxPhotos: 4, maxTextBlocks: 5 };
  const safeRect = layout?.freeCanvas ?? { x: 0.06, y: 0.06, w: 0.88, h: 0.88 };
  const aspect = CANVAS_ASPECT[format] ?? 3 / 4;

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');

  const photoCount = elements.filter((el) => el.type === 'image').length;
  const textCount = elements.filter((el) => el.type === 'text').length;

  const onCanvasLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      setCanvasSize({ width, height: width / aspect });
    },
    [aspect],
  );

  const updateElement = useCallback(
    (id: string, next: FreePageElement) => {
      onChange(elements.map((el) => (el.id === id ? next : el)));
    },
    [elements, onChange],
  );

  const removeElement = useCallback(
    (id: string) => {
      onChange(elements.filter((el) => el.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [elements, onChange, selectedId],
  );

  const rotateSelected = useCallback(
    (delta: number) => {
      if (!selectedId) return;
      const maxRotation = limits.maxRotationDegrees ?? 15;
      onChange(
        elements.map((el) =>
          el.id === selectedId
            ? {
                ...el,
                rotation: clampNorm((el.rotation ?? 0) + delta, -maxRotation, maxRotation),
              }
            : el,
        ),
      );
    },
    [elements, limits.maxRotationDegrees, onChange, selectedId],
  );

  const addPhoto = useCallback(async () => {
    if (photoCount >= (limits.maxPhotos ?? 4)) return;
    const pickedUri = await pickPhotoFromLibrary({ ensurePermission: ensureMediaLibraryPermission });
    if (!pickedUri) return;
    const elementId = createId('free');
    const uri =
      projectId && instanceId
        ? await persistAlbumPhotoUri(
            pickedUri,
            buildAlbumPhotoStorageKey({
              projectId,
              instanceId,
              freeElementId: elementId,
            }),
          )
        : pickedUri;
    const imageSize = await resolvePageSourceSize(uri);
    const initialCrop = buildInitialPhotoSlotTransform({
      slotAspect: [1, 1],
      imageWidth: imageSize?.width,
      imageHeight: imageSize?.height,
    });
    const next: FreePageElement = {
      id: elementId,
      type: 'image',
      x: safeRect.x + (safeRect.w - 0.52) / 2 + 0.05 * photoCount,
      y: safeRect.y + (safeRect.h - 0.52) / 2 + 0.05 * photoCount,
      w: 0.52,
      h: 0.52,
      zIndex: elements.length + 1,
      content: uri,
      crop: initialCrop,
    };
    onChange([...elements, next]);
    setSelectedId(next.id);
  }, [
    elements,
    ensureMediaLibraryPermission,
    instanceId,
    limits.maxPhotos,
    onChange,
    photoCount,
    projectId,
    safeRect.x,
    safeRect.y,
    safeRect.w,
    safeRect.h,
  ]);

  const addText = useCallback(() => {
    if (textCount >= (limits.maxTextBlocks ?? 5) || !draftText.trim()) return;
    const next: FreePageElement = {
      id: createId('free'),
      type: 'text',
      x: safeRect.x + 0.04,
      y: safeRect.y + 0.55 + textCount * 0.06,
      w: 0.5,
      h: 0.08,
      zIndex: elements.length + 1,
      content: draftText.trim(),
    };
    onChange([...elements, next]);
    setDraftText('');
    setSelectedId(next.id);
  }, [draftText, elements, limits.maxTextBlocks, onChange, safeRect.x, safeRect.y, textCount]);

  return (
    <View style={styles.container}>
      <AppCard style={styles.canvasCard}>
        <AppText variant="caption" style={styles.hint}>
          Перетащите и масштабируйте элементы в безопасной зоне
        </AppText>
        <View style={[styles.canvas, { aspectRatio: aspect }]} onLayout={onCanvasLayout}>
          <View
            style={[
              styles.safeZone,
              {
                left: `${safeRect.x * 100}%`,
                top: `${safeRect.y * 100}%`,
                width: `${safeRect.w * 100}%`,
                height: `${safeRect.h * 100}%`,
              },
            ]}
          />
          {canvasSize.width > 0
            ? elements.map((element) => (
                <DraggableFreeElement
                  key={element.id}
                  element={element}
                  canvas={canvasSize}
                  safeRect={safeRect}
                  selected={selectedId === element.id}
                  onSelect={() => setSelectedId(element.id)}
                  onChange={(next) => updateElement(element.id, next)}
                />
              ))
            : null}
        </View>
      </AppCard>

      <View style={styles.actions}>
        <AppButton
          title={`Добавить фото (${photoCount}/${limits.maxPhotos ?? 4})`}
          variant="outline"
          onPress={addPhoto}
          disabled={photoCount >= (limits.maxPhotos ?? 4)}
        />
      </View>

      <AppCard style={styles.textCard}>
        <AppText variant="caption" style={styles.hint}>
          Текстовый блок ({textCount}/{limits.maxTextBlocks ?? 5})
        </AppText>
        <TextInput
          style={styles.textInput}
          value={draftText}
          onChangeText={setDraftText}
          placeholder="Введите текст"
          placeholderTextColor={colors.placeholder}
        />
        <AppButton
          title="Добавить текст"
          variant="outline"
          onPress={addText}
          disabled={textCount >= (limits.maxTextBlocks ?? 5) || !draftText.trim()}
        />
      </AppCard>

      {selectedId ? (
        <AppCard style={styles.selectedCard}>
          <AppText variant="caption" style={styles.hint}>
            Выбранный элемент
          </AppText>
          <View style={styles.selectedActions}>
            <AppButton
              title="Влево"
              variant="outline"
              fullWidth={false}
              onPress={() => rotateSelected(-5)}
            />
            <AppButton
              title="Вправо"
              variant="outline"
              fullWidth={false}
              onPress={() => rotateSelected(5)}
            />
          </View>
          <Pressable onPress={() => removeElement(selectedId)}>
            <AppText variant="bodySm" style={styles.removeLink}>
              Удалить выбранный элемент
            </AppText>
          </Pressable>
        </AppCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  canvasCard: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
  },
  hint: {
    color: colors.textSecondary,
  },
  canvas: {
    width: '100%',
    backgroundColor: colors.border,
    borderRadius: radii.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  safeZone: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.textSecondary,
    borderRadius: radii.sm,
  },
  fill: {
    width: '100%',
    height: '100%',
    borderRadius: radii.sm,
  },
  imageClip: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: radii.sm,
  },
  frameDragHandle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    backgroundColor: 'rgba(241,148,162,0.92)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  frameDragLabel: {
    color: colors.white,
    fontSize: 10,
  },
  textPreview: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii.sm,
    padding: spacing.xs,
    justifyContent: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
  textCard: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
  },
  selectedCard: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
  },
  selectedActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: sansFont('regular'),
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  removeLink: {
    color: colors.error,
    textAlign: 'center',
  },
});
