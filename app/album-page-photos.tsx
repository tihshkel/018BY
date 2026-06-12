import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { PhotoBlockPicker } from '@/components/album/photo-block-picker';
import { AppButton, AppHeader, AppScreen, AppText } from '@/components/ui';
import { colors, radii, sansFont, spacing } from '@/constants/design-tokens';
import { useAlbumProject } from '@/hooks/use-album-project';
import { pickPhotoFromLibrary } from '@/utils/pickAlbumPhoto';
import { createEmptyPageValues } from '@/utils/pageStorage';

export default function AlbumPagePhotosScreen() {
  const { id, instanceId, celebration, coverType, interiorType } = useLocalSearchParams<{
    id?: string;
    instanceId?: string;
    celebration?: string;
    coverType?: string;
    interiorType?: string;
  }>();

  const project = useAlbumProject({
    projectId: id,
    celebration,
    coverType,
    interiorType,
  });

  const instance = useMemo(
    () => project.instances.find((i) => i.instanceId === instanceId),
    [project.instances, instanceId]
  );
  const schema = instance ? project.getSchemaForInstance(instance) : undefined;

  const stored = instanceId
    ? project.pageValuesMap[instanceId] ?? createEmptyPageValues()
    : createEmptyPageValues();

  const [photoBlocks, setPhotoBlocks] = useState(stored.photoBlocks);
  const [caption, setCaption] = useState(stored.caption ?? '');

  if (project.isLoading || !instance || !schema) {
    return (
      <AppScreen style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </AppScreen>
    );
  }

  const blocks = schema.photoBlocks ?? [];

  const updateBlock = (
    blockId: string,
    updater: (prev: { variantId: string; slots: (string | null)[] }) => {
      variantId: string;
      slots: (string | null)[];
    }
  ) => {
    setPhotoBlocks((prev) => ({
      ...prev,
      [blockId]: updater(
        prev[blockId] ?? {
          variantId: blocks.find((b) => b.blockId === blockId)?.variants[0]?.variantId ?? 'default',
          slots: [],
        }
      ),
    }));
  };

  const handlePickPhoto = async (blockId: string, slotIndex: number) => {
    const uri = await pickPhotoFromLibrary();
    if (!uri) return;
    updateBlock(blockId, (prev) => {
      const slots = [...prev.slots];
      slots[slotIndex] = uri;
      return { ...prev, slots };
    });
  };

  const handleDone = async () => {
    if (!instanceId) return;
    await project.savePageValuesNow(instanceId, {
      ...stored,
      photoBlocks,
      caption: caption.trim() || undefined,
    });
    router.push({
      pathname: '/album-page-preview',
      params: { id, instanceId, celebration, coverType, interiorType, mode: 'final' },
    } as unknown as Href);
  };

  return (
    <AppScreen scroll contentContainerStyle={styles.container}>
      <AppHeader title="Добавьте фото" />

      {blocks.map((block) => {
        const blockValues = photoBlocks[block.blockId];
        const variantId =
          blockValues?.variantId ?? block.variants[0]?.variantId ?? 'default';
        const variant = block.variants.find((v) => v.variantId === variantId) ?? block.variants[0];
        const slotUris: (string | null)[] = variant
          ? Array.from({ length: variant.slots }, (_, i) => blockValues?.slots[i] ?? null)
          : [];

        return (
          <PhotoBlockPicker
            key={block.blockId}
            block={block}
            selectedVariantId={variantId}
            slotUris={slotUris}
            onSelectVariant={(newVariantId) => {
              const v = block.variants.find((item) => item.variantId === newVariantId);
              updateBlock(block.blockId, () => ({
                variantId: newVariantId,
                slots: Array(v?.slots ?? 1).fill(null),
              }));
            }}
            onAddPhoto={(slotIndex) => handlePickPhoto(block.blockId, slotIndex)}
            onReplacePhoto={(slotIndex) => handlePickPhoto(block.blockId, slotIndex)}
            onRemovePhoto={(slotIndex) => {
              updateBlock(block.blockId, (prev) => {
                const slots = [...prev.slots];
                slots[slotIndex] = null;
                return { ...prev, slots };
              });
            }}
          />
        );
      })}

      {schema.pageType === 'photo' || schema.templateLibraryId ? (
        <View style={styles.captionSection}>
          <AppText variant="caption" style={styles.captionLabel}>
            Подпись (необязательно)
          </AppText>
          <TextInput
            style={styles.captionInput}
            value={caption}
            onChangeText={setCaption}
            placeholder="Короткая подпись"
            placeholderTextColor={colors.placeholder}
          />
        </View>
      ) : null}

      <AppButton title="Готово" onPress={handleDone} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionSection: {
    marginBottom: spacing.sm,
  },
  captionLabel: {
    marginBottom: 6,
    color: colors.textSecondary,
  },
  captionInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: sansFont('regular'),
    color: colors.textPrimary,
  },
});
