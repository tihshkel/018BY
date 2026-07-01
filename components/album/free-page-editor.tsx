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
import type { AlbumPageSchema, FreePageElement } from '@/types/album-page-schema';
import { createId } from '@/utils/id';
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

  const panGesture = Gesture.Pan()
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
    .onUpdate((event) => {
      savedW.value = clampNorm(
        element.w * event.scale,
        0.08,
        Math.min(safeRect.w, safeRect.h),
      );
      savedH.value = clampNorm(
        element.h * event.scale,
        0.08,
        Math.min(safeRect.w, safeRect.h),
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
        {element.type === 'image' && element.content ? (
          <Image source={{ uri: element.content }} style={styles.fill} contentFit="cover" />
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
    const next: FreePageElement = {
      id: elementId,
      type: 'image',
      x: safeRect.x + (safeRect.w - 0.52) / 2 + 0.05 * photoCount,
      y: safeRect.y + (safeRect.h - 0.52) / 2 + 0.05 * photoCount,
      w: 0.52,
      h: 0.52,
      zIndex: elements.length + 1,
      content: uri,
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
