import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { colors, radii, spacing } from '@/constants/design-tokens';
import type { PhotoBlockSchema } from '@/types/album-page-schema';

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

  return (
    <View style={styles.section}>
      <AppText variant="titleSm" style={styles.sectionTitle}>
        {block.label}
      </AppText>
      <AppText variant="caption" style={styles.hint}>
        Выберите вариант:
      </AppText>
      {block.variants.map((v) => (
        <Pressable
          key={v.variantId}
          onPress={() => onSelectVariant(v.variantId)}
          style={[styles.variantRow, variant?.variantId === v.variantId && styles.variantSelected]}
        >
          <View
            style={[
              styles.radio,
              variant?.variantId === v.variantId && styles.radioSelected,
            ]}
          />
          <AppText variant="body">{v.label}</AppText>
        </Pressable>
      ))}

      {variant ? (
        <View style={styles.slots}>
          {Array.from({ length: variant.slots }).map((_, slotIndex) => {
            const uri = slotUris[slotIndex];
            return (
              <View key={slotIndex} style={styles.slot}>
                {uri ? (
                  <>
                    <Image source={{ uri }} style={styles.preview} contentFit="cover" />
                    <View style={styles.slotActions}>
                      <AppButton
                        title="Заменить фото"
                        variant="outline"
                        onPress={() => onReplacePhoto(slotIndex)}
                        fullWidth={false}
                        style={styles.actionBtn}
                      />
                      <AppButton
                        title="Удалить"
                        variant="ghost"
                        onPress={() => onRemovePhoto(slotIndex)}
                        fullWidth={false}
                        style={styles.actionBtn}
                      />
                    </View>
                  </>
                ) : (
                  <AppButton
                    title={`+ Добавить фото ${variant.slots > 1 ? slotIndex + 1 : ''}`.trim()}
                    variant="outline"
                    onPress={() => onAddPhoto(slotIndex)}
                  />
                )}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  hint: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: 4,
  },
  variantSelected: {
    backgroundColor: colors.primarySurface,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  slots: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  slot: {
    gap: spacing.sm,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: radii.md,
    backgroundColor: colors.primarySurface,
  },
  slotActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 10,
  },
});
