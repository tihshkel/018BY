import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AlbumPhotoSlotGrid } from '@/components/album/album-photo-slot-grid';
import { FamilyTreePhotoPicker } from '@/components/album/family-tree-photo-picker';
import { BirthdayFreePageEditor } from '@/components/album/birthday-free-page-editor';
import { FreePageEditor } from '@/components/album/free-page-editor';
import { TimelinePageEditor } from '@/components/album/timeline-page-editor';
import { AlbumVariantBar } from '@/components/album/album-variant-bar';
import {
  FamilyTreeForm,
  GrowthWeightForm,
  MonthPageForm,
  TeethForm,
} from '@/components/album/editors/special-page-forms';
import { PageFormFields, TextFieldStyleToolbar } from '@/components/album/page-form-fields';
import { AppCard, AppText } from '@/components/ui';
import { colors, radii, sansFont, spacing } from '@/constants/design-tokens';
import type { AlbumPageSchema, BirthdayCustomFieldValue, FieldTextStyle, FreePageElement, PageValues, PhotoSlotTransform } from '@/types/album-page-schema';
import { isSquareBlankLineGuide } from '@/utils/albumImages';
import { enrichSchemaWithPhotoBlocks } from '@/utils/schemaPhotoBlocks';
import { getDefaultVariantIdForPage, getVariantPreviewThumbnails, resolvePhotoBlockVariant } from '@/utils/variantPreview';

type AlbumPageUnifiedEditorProps = {
  schema: AlbumPageSchema;
  pageValues: PageValues;
  lineGuideId: string;
  onFieldChange: (fieldId: string, value: string) => void;
  onFieldStyleChange?: (fieldId: string, patch: Partial<FieldTextStyle>) => void;
  onCaptionStyleChange?: (patch: Partial<FieldTextStyle>) => void;
  onCaptionChange: (text: string) => void;
  onPhotoCaptionChange: (slotIndex: number, text: string) => void;
  onSelectVariant: (blockId: string, variantId: string) => void;
  onPickPhoto: (blockId: string, slotIndex: number) => void;
  onSlotTransformChange: (
    blockId: string,
    slotIndex: number,
    transform: PhotoSlotTransform,
  ) => void;
  onGroupTransformChange: (transform: PhotoSlotTransform) => void;
  onRemovePhoto: (blockId: string, slotIndex: number) => void;
  onInitPhotoBlock: (blockId: string, variantId: string, slotCount: number) => void;
  onFreeElementsChange?: (elements: FreePageElement[]) => void;
  onCustomFieldsChange?: (fields: BirthdayCustomFieldValue[]) => void;
  allowCustomFieldCrud?: boolean;
  ensureMediaLibraryPermission?: () => Promise<boolean>;
  projectId?: string;
  instanceId?: string;
  showCaption: boolean;
  showPerPhotoCaptions: boolean;
};

export const AlbumPageUnifiedEditor = React.memo(function AlbumPageUnifiedEditor({
  schema,
  pageValues,
  lineGuideId,
  onFieldChange,
  onFieldStyleChange,
  onCaptionStyleChange,
  onCaptionChange,
  onPhotoCaptionChange,
  onSelectVariant,
  onPickPhoto,
  onSlotTransformChange,
  onGroupTransformChange,
  onRemovePhoto,
  onInitPhotoBlock,
  onFreeElementsChange,
  onCustomFieldsChange,
  allowCustomFieldCrud = false,
  ensureMediaLibraryPermission,
  projectId,
  instanceId,
  showCaption,
  showPerPhotoCaptions,
}: AlbumPageUnifiedEditorProps) {
  const resolvedSchema = useMemo(
    () => enrichSchemaWithPhotoBlocks(schema),
    [schema],
  );
  const blocks = resolvedSchema.photoBlocks ?? [];
  const primaryBlock = blocks[0];
  const blockValues = primaryBlock ? pageValues.photoBlocks[primaryBlock.blockId] : undefined;
  const selectedVariantId =
    blockValues?.variantId ??
    getDefaultVariantIdForPage(lineGuideId, resolvedSchema.sourcePageNumber, primaryBlock) ??
    primaryBlock?.variants[0]?.variantId;

  useEffect(() => {
    if (!primaryBlock) return;

    const currentId = blockValues?.variantId;
    if (currentId) {
      const resolved = resolvePhotoBlockVariant(
        primaryBlock.variants,
        currentId,
        lineGuideId,
      );
      if (resolved && primaryBlock.variants.some((item) => item.variantId === resolved.variantId)) {
        return;
      }
      const fallback = primaryBlock.variants[0];
      if (fallback) {
        onSelectVariant(primaryBlock.blockId, fallback.variantId);
      }
      return;
    }

    const defaultVariantId = getDefaultVariantIdForPage(
      lineGuideId,
      resolvedSchema.sourcePageNumber,
      primaryBlock,
    );
    const variant =
      primaryBlock.variants.find((item) => item.variantId === defaultVariantId) ??
      primaryBlock.variants[0];
    if (!variant) return;
    onInitPhotoBlock(primaryBlock.blockId, variant.variantId, variant.slots);
  }, [
    blockValues?.variantId,
    lineGuideId,
    onInitPhotoBlock,
    onSelectVariant,
    primaryBlock,
    resolvedSchema.sourcePageNumber,
  ]);

  const thumbnails = useMemo(
    () =>
      getVariantPreviewThumbnails({
        lineGuideId,
        sourcePageNumber: resolvedSchema.sourcePageNumber,
        photoBlock: primaryBlock,
      }),
    [lineGuideId, primaryBlock, resolvedSchema.sourcePageNumber],
  );

  const fields = resolvedSchema.fields ?? [];
  const showTextStyleToolbar = isSquareBlankLineGuide(lineGuideId);
  const formProps = {
    fields,
    values: pageValues.fields,
    onChange: onFieldChange,
    fieldTextStyles: pageValues.fieldTextStyles,
    onFieldStyleChange,
    lineGuideId,
    sourcePageNumber: resolvedSchema.sourcePageNumber,
  };

  const textForm = (() => {
    if (resolvedSchema.pageType === 'timeline_page') {
      return (
        <TimelinePageEditor
          schema={resolvedSchema}
          pageValues={pageValues}
          lineGuideId={lineGuideId}
          onFieldChange={onFieldChange}
          onPickPhoto={(slotIndex) => {
            if (!primaryBlock) return;
            onPickPhoto(primaryBlock.blockId, slotIndex);
          }}
          onRemovePhoto={(slotIndex) => {
            if (!primaryBlock) return;
            onRemovePhoto(primaryBlock.blockId, slotIndex);
          }}
        />
      );
    }

    if (resolvedSchema.pageType === 'birthday_free_page') {
      if (fields.length > 0) {
        return (
          <PageFormFields
            {...formProps}
            sectionTitle="Текстовые поля"
          />
        );
      }
      if (onCustomFieldsChange) {
        return (
          <BirthdayFreePageEditor
            schema={resolvedSchema}
            customFields={pageValues.customFields ?? []}
            onChange={onCustomFieldsChange}
            allowFieldCrud={allowCustomFieldCrud}
          />
        );
      }
      return null;
    }

    if (resolvedSchema.pageType === 'free_page' && onFreeElementsChange && ensureMediaLibraryPermission) {
      return (
        <FreePageEditor
          schema={resolvedSchema}
          elements={pageValues.freeElements ?? []}
          lineGuideId={lineGuideId}
          projectId={projectId}
          instanceId={instanceId}
          onChange={onFreeElementsChange}
          ensureMediaLibraryPermission={ensureMediaLibraryPermission}
        />
      );
    }

    switch (resolvedSchema.pageType) {
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

  const handleVariantSelect = useCallback(
    (variantId: string) => {
      if (!primaryBlock) return;
      onSelectVariant(primaryBlock.blockId, variantId);
    },
    [onSelectVariant, primaryBlock],
  );

  const isCircleTreeBlock = primaryBlock?.layoutKind === 'circle_tree';

  return (
    <View style={styles.container}>
      {textForm}

      {primaryBlock &&
      resolvedSchema.pageType !== 'timeline_page' &&
      resolvedSchema.pageType !== 'free_page' ? (
        <AppCard style={styles.photosCard}>
          {!isCircleTreeBlock && thumbnails.length > 1 ? (
            <AlbumVariantBar
              thumbnails={thumbnails}
              selectedVariantId={selectedVariantId}
              onSelectVariant={handleVariantSelect}
              embedded
            />
          ) : null}

          {!isCircleTreeBlock && thumbnails.length > 1 && blocks.length > 0 ? (
            <View style={styles.sectionDivider} />
          ) : null}

          {blocks.map((block) => {
            const values = pageValues.photoBlocks[block.blockId];
            const variantId =
              values?.variantId ?? block.variants[0]?.variantId ?? 'default';
            const variant =
              block.variants.find((item) => item.variantId === variantId) ?? block.variants[0];
            const uris = variant
              ? Array.from({ length: variant.slots }, (_, i) => values?.slots[i] ?? null)
              : [];

            if (block.layoutKind === 'circle_tree') {
              return (
                <FamilyTreePhotoPicker
                  key={block.blockId}
                  embedded
                  block={block}
                  lineGuideId={lineGuideId}
                  sourcePageNumber={resolvedSchema.sourcePageNumber}
                  slotUris={uris}
                  onPickPhoto={(slotIndex) => onPickPhoto(block.blockId, slotIndex)}
                  onRemovePhoto={(slotIndex) => onRemovePhoto(block.blockId, slotIndex)}
                />
              );
            }

            return (
              <AlbumPhotoSlotGrid
                key={block.blockId}
                embedded={thumbnails.length > 1}
                block={block}
                selectedVariantId={variantId}
                slotUris={uris}
                slotTransforms={pageValues.photoSlotTransforms ?? {}}
                groupTransform={pageValues.photoGroupTransform}
                lineGuideId={lineGuideId}
                sourcePageNumber={resolvedSchema.sourcePageNumber}
                templateLibraryId={resolvedSchema.templateLibraryId}
                onPickPhoto={(slotIndex) => onPickPhoto(block.blockId, slotIndex)}
                onRemovePhoto={(slotIndex) => onRemovePhoto(block.blockId, slotIndex)}
                onSlotTransformChange={(slotIndex, transform) =>
                  onSlotTransformChange(block.blockId, slotIndex, transform)
                }
                onGroupTransformChange={onGroupTransformChange}
              />
            );
          })}
        </AppCard>
      ) : null}

      {showPerPhotoCaptions && primaryBlock
        ? (() => {
            const variant =
              primaryBlock.variants.find((item) => item.variantId === selectedVariantId) ??
              primaryBlock.variants[0];
            if (!variant) return null;
            return Array.from({ length: variant.slots }).map((_, slotIndex) => (
              <AppCard key={`cap-${slotIndex}`} style={styles.captionCard}>
                <AppText variant="caption" style={styles.captionLabel}>
                  Подпись к фото {slotIndex + 1}
                </AppText>
                {showTextStyleToolbar && onFieldStyleChange ? (
                  <TextFieldStyleToolbar
                    style={pageValues.fieldTextStyles?.[`caption${slotIndex + 1}`]}
                    defaultAlign="center"
                    onChange={(patch) => onFieldStyleChange(`caption${slotIndex + 1}`, patch)}
                  />
                ) : null}
                <TextInput
                  style={styles.captionInput}
                  value={pageValues.photoCaptions?.[slotIndex] ?? ''}
                  onChangeText={(text) => onPhotoCaptionChange(slotIndex, text)}
                  placeholder="Необязательно"
                  placeholderTextColor={colors.placeholder}
                />
              </AppCard>
            ));
          })()
        : null}

      {showCaption && !showPerPhotoCaptions ? (
        <AppCard style={styles.captionCard}>
          <AppText variant="caption" style={styles.captionLabel}>
            Подпись (необязательно)
          </AppText>
          {showTextStyleToolbar && onCaptionStyleChange ? (
            <TextFieldStyleToolbar
              style={pageValues.captionTextStyle}
              defaultAlign="center"
              onChange={onCaptionStyleChange}
            />
          ) : null}
          <TextInput
            style={styles.captionInput}
            value={pageValues.caption ?? ''}
            onChangeText={onCaptionChange}
            placeholder="Короткая подпись"
            placeholderTextColor={colors.placeholder}
          />
        </AppCard>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  photosCard: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.white,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  captionCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    gap: spacing.xs,
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
