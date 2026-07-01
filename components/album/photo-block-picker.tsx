import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LayoutPreviewThumbnail } from '@/components/album/layout-preview-thumbnail';
import { LayoutPreviewIcon } from '@/components/album/photo-layout-preview-icon';
import { AppButton, AppCard, AppText } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/design-tokens';
import type { PhotoBlockSchema } from '@/types/album-page-schema';
import {
  canAddMorePhotos,
  countFilledPhotoSlots,
  findFirstEmptyPhotoSlotIndex,
} from '@/utils/photoVariantAspect';
import { resolveGlobalLayoutPreviewUri } from '@/utils/variantPreview';

type PhotoBlockPickerProps = {
  block: PhotoBlockSchema;
  selectedVariantId?: string;
  slotUris: (string | null)[];
  onSelectVariant: (variantId: string) => void;
  onAddPhoto: (slotIndex: number) => void;
  onReplacePhoto: (slotIndex: number) => void;
  onRemovePhoto: (slotIndex: number) => void;
};

export function PhotoBlockPicker({
  block,
  selectedVariantId,
  slotUris,
  onSelectVariant,
  onAddPhoto,
  onReplacePhoto,
  onRemovePhoto,
}: PhotoBlockPickerProps) {
  const variant =
    block.variants.find((v) => v.variantId === selectedVariantId) ?? block.variants[0];
  const filledCount = countFilledPhotoSlots(slotUris);
  const nextEmptyIndex = findFirstEmptyPhotoSlotIndex(slotUris);
  const canAdd = canAddMorePhotos(slotUris);

  const handleAddPress = () => {
    if (nextEmptyIndex < 0) return;
    onAddPhoto(nextEmptyIndex);
  };

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <AppText variant="titleSm">{block.label}</AppText>
        {block.variants.length > 1 ? (
          <AppText variant="bodySm" style={styles.hint}>
            Выберите раскладку
          </AppText>
        ) : null}
      </View>

      {block.variants.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.variantChips}
        >
          {block.variants.map((v) => {
            const isSelected = variant?.variantId === v.variantId;
            const layoutPreviewUri = resolveGlobalLayoutPreviewUri(v.variantId, isSelected);
            return (
              <Pressable
                key={v.variantId}
                onPress={() => onSelectVariant(v.variantId)}
                style={({ pressed }) => [
                  styles.variantChip,
                  isSelected && styles.variantChipSelected,
                  pressed && styles.variantChipPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                {layoutPreviewUri ? (
                  <LayoutPreviewThumbnail variantId={v.variantId} uri={layoutPreviewUri} />
                ) : (
                  <LayoutPreviewIcon
                    variantId={v.variantId}
                    slots={v.slots}
                    selected={isSelected}
                  />
                )}
                <AppText
                  variant="caption"
                  style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}
                  numberOfLines={2}
                >
                  {v.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {variant ? (
        <View style={styles.slots}>
          {filledCount > 0 ? (
            <View style={styles.filledGrid}>
              {Array.from({ length: variant.slots }).map((_, slotIndex) => {
                const uri = slotUris[slotIndex];
                if (!uri) return null;

                const slotLabel =
                  variant.slots > 1 ? `Фото ${slotIndex + 1}` : 'Фото';

                return (
                  <View key={slotIndex} style={styles.filledSlot}>
                    {variant.slots > 1 ? (
                      <AppText variant="caption" style={styles.slotLabel}>
                        {slotLabel}
                      </AppText>
                    ) : null}
                    <Image source={{ uri }} style={styles.preview} contentFit="cover" />
                    <View style={styles.slotActions}>
                      <Pressable
                        onPress={() => onReplacePhoto(slotIndex)}
                        style={({ pressed }) => [
                          styles.textAction,
                          pressed && styles.textActionPressed,
                        ]}
                      >
                        <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
                        <AppText variant="bodySm" style={styles.textActionLabel}>
                          Заменить
                        </AppText>
                      </Pressable>
                      <View style={styles.actionDivider} />
                      <Pressable
                        onPress={() => onRemovePhoto(slotIndex)}
                        style={({ pressed }) => [
                          styles.textAction,
                          pressed && styles.textActionPressed,
                        ]}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                        <AppText variant="bodySm" style={styles.textActionDanger}>
                          Удалить
                        </AppText>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {canAdd ? (
            <Pressable
              onPress={handleAddPress}
              style={({ pressed }) => [
                styles.emptySlot,
                pressed && styles.emptySlotPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Добавить фото"
            >
              <View style={styles.emptyIconWrap}>
                <Ionicons name="add" size={30} color={colors.primary} />
              </View>
              <AppText variant="body" style={styles.emptyTitle}>
                + Добавить фото
              </AppText>
              <AppText variant="bodySm" style={styles.emptyHint}>
                {variant.slots > 1
                  ? `Нажмите, чтобы выбрать фото ${filledCount + 1} из ${variant.slots}`
                  : 'Нажмите, чтобы выбрать из галереи'}
              </AppText>
            </Pressable>
          ) : null}

          {filledCount > 0 && filledCount < variant.slots && canAdd ? (
            <AppButton
              title="+ Добавить фото"
              variant="outline"
              onPress={handleAddPress}
              style={styles.addMoreButton}
            />
          ) : null}
        </View>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    gap: 4,
  },
  hint: {
    color: colors.textSecondary,
  },
  variantChips: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  variantChip: {
    width: 108,
    minHeight: 88,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  variantChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  variantChipPressed: {
    opacity: 0.9,
  },
  chipLabel: {
    textAlign: 'center',
    color: colors.textSecondary,
  },
  chipLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  slots: {
    gap: spacing.md,
  },
  filledGrid: {
    gap: spacing.md,
  },
  slotLabel: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  emptySlot: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  emptySlotPressed: {
    backgroundColor: '#FCE8EC',
    borderColor: colors.primaryLight,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    marginBottom: 4,
  },
  emptyTitle: {
    fontWeight: '600',
  },
  emptyHint: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  filledSlot: {
    gap: spacing.sm,
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: radii.md,
    backgroundColor: colors.primarySurface,
  },
  slotActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  textAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    minHeight: 44,
  },
  textActionPressed: {
    backgroundColor: colors.primarySurface,
  },
  textActionLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
  textActionDanger: {
    color: colors.error,
    fontWeight: '600',
  },
  actionDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  addMoreButton: {
    marginTop: 0,
  },
});
