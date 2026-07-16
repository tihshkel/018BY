import React, { useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AlbumPhotoSlotGrid } from '@/components/album/album-photo-slot-grid';
import { PageFormFields } from '@/components/album/page-form-fields';
import { AppCard, AppText } from '@/components/ui';
import { colors, radii, sansFont, spacing } from '@/constants/design-tokens';
import type { AlbumPageField, AlbumPageSchema, PageValues } from '@/types/album-page-schema';
import type { FieldTextAlign } from '@/utils/albumFieldTextAlign';
import {
  getPageFormatForLineGuide,
  getTemplateLayout,
} from '@/utils/photoPageTemplateManifest';

type TimelinePageEditorProps = {
  schema: AlbumPageSchema;
  pageValues: PageValues;
  lineGuideId: string;
  onFieldChange: (fieldId: string, value: string) => void;
  onFieldTextAlignChange?: (fieldId: string, align: FieldTextAlign) => void;
  onPickPhoto: (slotIndex: number) => void;
  onRemovePhoto: (slotIndex: number) => void;
};

export const TimelinePageEditor = React.memo(function TimelinePageEditor({
  schema,
  pageValues,
  lineGuideId,
  onFieldChange,
  onFieldTextAlignChange,
  onPickPhoto,
  onRemovePhoto,
}: TimelinePageEditorProps) {
  const format = getPageFormatForLineGuide(lineGuideId);
  const layout = useMemo(
    () =>
      schema.templateLibraryId
        ? getTemplateLayout(schema.templateLibraryId, format)
        : undefined,
    [format, schema.templateLibraryId],
  );

  const block = schema.photoBlocks?.[0];
  const blockValues = block ? pageValues.photoBlocks[block.blockId] : undefined;
  const variant = block?.variants[0];
  const slotUris = variant
    ? Array.from({ length: variant.slots }, (_, i) => blockValues?.slots[i] ?? null)
    : [];

  if (!layout?.events?.length || !block || !variant) {
    return null;
  }

  return (
    <View style={styles.container}>
      {layout.events.map((event, index) => {
        const dateField = schema.fields?.find((f) => f.fieldId.endsWith(`_${event.date.id}`));
        const descField = schema.fields?.find((f) => f.fieldId.endsWith(`_${event.description.id}`));
        const eventFields: AlbumPageField[] = [dateField, descField].filter(
          (field): field is AlbumPageField => Boolean(field),
        );

        return (
          <AppCard key={event.id} style={styles.eventCard}>
            <AppText variant="caption" style={styles.eventLabel}>
              Событие {index + 1}
            </AppText>

            <AlbumPhotoSlotGrid
              embedded
              lineGuideId={lineGuideId}
              sourcePageNumber={schema.sourcePageNumber}
              templateLibraryId={schema.templateLibraryId}
              block={{
                ...block,
                variants: [{ ...variant, slots: 1, slotIndices: [index] }],
              }}
              selectedVariantId={variant.variantId}
              slotUris={[slotUris[index] ?? null]}
              slotTransforms={pageValues.photoSlotTransforms ?? {}}
              onPickPhoto={() => onPickPhoto(index)}
              onRemovePhoto={() => onRemovePhoto(index)}
              onSlotTransformChange={() => {}}
            />

            {eventFields.length > 0 ? (
              <PageFormFields
                fields={eventFields}
                values={pageValues.fields}
                onChange={onFieldChange}
                textAligns={pageValues.fieldTextAlign}
                onTextAlignChange={onFieldTextAlignChange}
                lineGuideId={lineGuideId}
                sourcePageNumber={schema.sourcePageNumber}
              />
            ) : null}
          </AppCard>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  eventCard: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
  },
  eventLabel: {
    color: colors.textSecondary,
  },
});
