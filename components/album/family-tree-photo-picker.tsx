import React, { useMemo } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radii, spacing, surfaces } from '@/constants/design-tokens';
import type { PhotoBlockSchema } from '@/types/album-page-schema';
import { getBranchFillColor } from '@/utils/circleSlotColors';
import { getFamilyTreeSlots, refineFamilyTreeSlotForPicker } from '@/utils/familyTreeSlots';

type FamilyTreePhotoPickerProps = {
  block: PhotoBlockSchema;
  lineGuideId: string;
  sourcePageNumber: number;
  slotUris: (string | null)[];
  onPickPhoto: (slotIndex: number) => void;
  onRemovePhoto?: (slotIndex: number) => void;
  embedded?: boolean;
};

export function FamilyTreePhotoPicker({
  block,
  lineGuideId,
  sourcePageNumber,
  slotUris,
  onPickPhoto,
  onRemovePhoto,
  embedded = false,
}: FamilyTreePhotoPickerProps) {
  const treeSlots = useMemo(
    () =>
      getFamilyTreeSlots(lineGuideId, sourcePageNumber).map((slot) =>
        refineFamilyTreeSlotForPicker(lineGuideId, sourcePageNumber, slot),
      ),
    [lineGuideId, sourcePageNumber],
  );

  const filledCount = slotUris.filter(Boolean).length;

  return (
    <View style={[styles.section, embedded && styles.sectionEmbedded]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <AppText variant="titleSm">{block.label}</AppText>
          <View style={styles.countBadge}>
            <AppText variant="caption" style={styles.countText}>
              {filledCount} / {treeSlots.length}
            </AppText>
          </View>
        </View>
        <AppText variant="bodySm" style={styles.hint}>
          Нажмите на круг, чтобы добавить фото родственника. Розовые — линия мамы, голубые — линия
          папы.
        </AppText>
      </View>

      <View style={styles.treeFrame}>
        {treeSlots.map((slot) => {
          const uri = slotUris[slot.slotIndex] ?? null;
          const fillColor = getBranchFillColor(slot.branch);
          const slotStyle: ViewStyle = {
            left: `${(slot.x - slot.width / 2) * 100}%`,
            top: `${(slot.y - slot.height / 2) * 100}%`,
            width: `${Math.max(8, Math.min(18, slot.width * 100))}%`,
            aspectRatio: 1,
            backgroundColor: fillColor,
          };

          return (
            <Pressable
              key={`${slot.slotId ?? 'slot'}-${slot.slotIndex}`}
              onPress={() => onPickPhoto(slot.slotIndex)}
              onLongPress={uri && onRemovePhoto ? () => onRemovePhoto(slot.slotIndex) : undefined}
              style={[styles.treeSlot, slotStyle]}
              accessibilityRole="button"
              accessibilityLabel={slot.label}
            >
              {uri ? (
                <Image source={{ uri }} style={styles.slotImage} contentFit="cover" />
              ) : (
                <AppText variant="caption" style={styles.slotPlaceholder}>
                  +
                </AppText>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.genderGirl }]} />
          <AppText variant="caption" style={styles.legendText}>
            Линия мамы
          </AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.genderBoy }]} />
          <AppText variant="caption" style={styles.legendText}>
            Линия папы
          </AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.genderChild }]} />
          <AppText variant="caption" style={styles.legendText}>
            Ребёнок
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  sectionEmbedded: {
    marginBottom: 0,
  },
  header: {
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 4,
  },
  countBadge: {
    backgroundColor: colors.primarySurface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    color: colors.primary,
  },
  hint: {
    color: colors.textSecondary,
  },
  treeFrame: {
    aspectRatio: 1,
    borderRadius: radii.md,
    backgroundColor: surfaces.muted,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  treeSlot: {
    position: 'absolute',
    borderRadius: 9999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  slotImage: {
    width: '100%',
    height: '100%',
  },
  slotPlaceholder: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    color: colors.textSecondary,
  },
});
