import type { PhotoSlotTransform } from '@/types/album-page-schema';
import { photoSlotTransformKey } from '@/utils/photoSlotTransform';

type MigratePhotoBlockParams = {
  blockId: string;
  prevSlots: (string | null)[];
  newSlotCount: number;
  prevCaptions?: (string | null)[];
  prevSlotTransforms?: Record<string, PhotoSlotTransform>;
};

export type MigratedPhotoBlockState = {
  slots: (string | null)[];
  photoCaptions: (string | null)[];
  photoSlotTransforms: Record<string, PhotoSlotTransform>;
};

export function migratePhotoBlockOnVariantChange({
  blockId,
  prevSlots,
  newSlotCount,
  prevCaptions,
  prevSlotTransforms = {},
}: MigratePhotoBlockParams): MigratedPhotoBlockState {
  const slots = Array.from({ length: newSlotCount }, () => null as string | null);
  const photoCaptions = Array.from({ length: newSlotCount }, () => null as string | null);
  const photoSlotTransforms: Record<string, PhotoSlotTransform> = {};

  const filledEntries = prevSlots
    .map((uri, slotIndex) => ({
      uri,
      caption: prevCaptions?.[slotIndex] ?? null,
      transform: prevSlotTransforms[photoSlotTransformKey(blockId, slotIndex)],
    }))
    .filter((entry): entry is typeof entry & { uri: string } => Boolean(entry.uri));

  filledEntries.forEach((entry, newIndex) => {
    if (newIndex >= newSlotCount) return;
    slots[newIndex] = entry.uri;
    photoCaptions[newIndex] = entry.caption;
    if (entry.transform) {
      photoSlotTransforms[photoSlotTransformKey(blockId, newIndex)] = entry.transform;
    }
  });

  return { slots, photoCaptions, photoSlotTransforms };
}
