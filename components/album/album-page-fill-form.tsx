import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { PhotoBlockPicker } from '@/components/album/photo-block-picker';
import {
  FamilyTreeForm,
  GrowthWeightForm,
  MonthPageForm,
  TeethForm,
} from '@/components/album/editors/special-page-forms';
import { PageFormFields } from '@/components/album/page-form-fields';
import { AppCard, AppText } from '@/components/ui';
import { colors, radii, sansFont, spacing } from '@/constants/design-tokens';
import type { AlbumPageSchema, PageValues } from '@/types/album-page-schema';

type AlbumPageFillFormProps = {
  schema: AlbumPageSchema;
  pageValues: PageValues;
  lineGuideId: string;
  onFieldChange: (fieldId: string, value: string) => void;
  onCaptionChange: (text: string) => void;
  onPhotoCaptionChange: (slotIndex: number, text: string) => void;
  onSelectVariant: (blockId: string, variantId: string) => void;
  onAddPhoto: (blockId: string, slotIndex: number) => void;
  onReplacePhoto: (blockId: string, slotIndex: number) => void;
  onRemovePhoto: (blockId: string, slotIndex: number) => void;
  showCaption: boolean;
  showPerPhotoCaptions: boolean;
  captionMaxLength?: number;
};

export function AlbumPageFillForm({
  schema,
  pageValues,
  lineGuideId,
  onFieldChange,
  onCaptionChange,
  onPhotoCaptionChange,
  onSelectVariant,
  onAddPhoto,
  onReplacePhoto,
  onRemovePhoto,
  showCaption,
  showPerPhotoCaptions,
  captionMaxLength,
}: AlbumPageFillFormProps) {
  const fields = schema.fields ?? [];
  const blocks = schema.photoBlocks ?? [];
  const photoBlocks = pageValues.photoBlocks;
  const photoCaptions = pageValues.photoCaptions ?? [];
  const caption = pageValues.caption ?? '';

  const formProps = {
    fields,
    values: pageValues.fields,
    onChange: onFieldChange,
    lineGuideId,
    sourcePageNumber: schema.sourcePageNumber,
  };

  const textForm = (() => {
    switch (schema.pageType) {
      case 'family_tree':
        return <FamilyTreeForm {...formProps} />;
      case 'teeth':
        return <TeethForm {...formProps} />;
      case 'growth_weight':
        return <GrowthWeightForm {...formProps} />;
      case 'month_page':
        return <MonthPageForm {...formProps} />;
      default:
        return fields.length > 0 ? <PageFormFields {...formProps} /> : null;
    }
  })();

  return (
    <View style={styles.container}>
      {blocks.map((block) => {
        const blockValues = photoBlocks[block.blockId];
        const variantId =
          blockValues?.variantId ?? block.variants[0]?.variantId ?? 'default';
        const variant =
          block.variants.find((item) => item.variantId === variantId) ?? block.variants[0];
        const slotUris: (string | null)[] = variant
          ? Array.from({ length: variant.slots }, (_, i) => blockValues?.slots[i] ?? null)
          : [];

        return (
          <View key={block.blockId}>
            <PhotoBlockPicker
              block={block}
              selectedVariantId={variantId}
              slotUris={slotUris}
              onSelectVariant={(newVariantId) => onSelectVariant(block.blockId, newVariantId)}
              onAddPhoto={(slotIndex) => onAddPhoto(block.blockId, slotIndex)}
              onReplacePhoto={(slotIndex) => onReplacePhoto(block.blockId, slotIndex)}
              onRemovePhoto={(slotIndex) => onRemovePhoto(block.blockId, slotIndex)}
            />

            {showPerPhotoCaptions && variant
              ? Array.from({ length: variant.slots }).map((_, slotIndex) => (
                  <AppCard key={`cap-${slotIndex}`} style={styles.captionCard}>
                    <AppText variant="caption" style={styles.captionLabel}>
                      Подпись к фото {slotIndex + 1}
                    </AppText>
                    <TextInput
                      style={styles.captionInput}
                      value={photoCaptions[slotIndex] ?? ''}
                      onChangeText={(text) => onPhotoCaptionChange(slotIndex, text)}
                      placeholder="Необязательно"
                      placeholderTextColor={colors.placeholder}
                    />
                  </AppCard>
                ))
              : null}
          </View>
        );
      })}

      {textForm}

      {showCaption && !showPerPhotoCaptions ? (
        <AppCard style={styles.captionCard}>
          <AppText variant="caption" style={styles.captionLabel}>
            Подпись (необязательно)
            {captionMaxLength != null ? ` · до ${captionMaxLength} символов` : ''}
          </AppText>
          <TextInput
            style={styles.captionInput}
            value={caption}
            onChangeText={(text) =>
              onCaptionChange(
                captionMaxLength != null ? text.slice(0, captionMaxLength) : text,
              )
            }
            placeholder="Короткая подпись"
            placeholderTextColor={colors.placeholder}
            maxLength={captionMaxLength}
          />
        </AppCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  captionCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  captionLabel: {
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
    backgroundColor: colors.white,
  },
});
