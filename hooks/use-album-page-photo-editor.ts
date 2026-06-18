import { useCallback } from 'react';

import { useMediaLibraryPermission } from '@/components/media-library-permission-provider';
import type { AlbumPageSchema, PageValues, PhotoSlotTransform } from '@/types/album-page-schema';
import type { useAlbumProject } from '@/hooks/use-album-project';
import { pickPhotoFromLibrary } from '@/utils/pickAlbumPhoto';
import { migratePhotoBlockOnVariantChange } from '@/utils/migratePhotoBlockOnVariantChange';
import { getSlotAspectRatio } from '@/utils/photoVariantAspect';
import { enrichSchemaWithPhotoBlocks } from '@/utils/schemaPhotoBlocks';
import {
  DEFAULT_PHOTO_SLOT_TRANSFORM,
  photoSlotTransformKey,
} from '@/utils/photoSlotTransform';

type AlbumProject = ReturnType<typeof useAlbumProject>;

type UseAlbumPagePhotoEditorParams = {
  instanceId?: string;
  schema: AlbumPageSchema | undefined;
  pageValues: PageValues;
  project: AlbumProject;
};

export function useAlbumPagePhotoEditor({
  instanceId,
  schema,
  pageValues,
  project,
}: UseAlbumPagePhotoEditorParams) {
  const { ensureMediaLibraryPermission } = useMediaLibraryPermission();
  const resolvedSchema = schema ? enrichSchemaWithPhotoBlocks(schema) : undefined;
  const blocks = resolvedSchema?.photoBlocks ?? [];
  const photoBlocks = pageValues.photoBlocks;

  const showCaption = resolvedSchema?.captionEnabled === true;
  const showPerPhotoCaptions =
    resolvedSchema?.pageType === 'caption_photo_page' ||
    resolvedSchema?.pageType === 'birthday_free_page';

  const updatePageValues = useCallback(
    (updater: (prev: PageValues) => PageValues) => {
      if (!instanceId) return;
      project.updatePageValues(instanceId, updater);
    },
    [instanceId, project],
  );

  const updateBlock = useCallback(
    (
      blockId: string,
      updater: (prev: { variantId: string; slots: (string | null)[] }) => {
        variantId: string;
        slots: (string | null)[];
      },
    ) => {
      updatePageValues((prev) => ({
        ...prev,
        photoBlocks: {
          ...prev.photoBlocks,
          [blockId]: updater(
            prev.photoBlocks[blockId] ?? {
              variantId:
                blocks.find((b) => b.blockId === blockId)?.variants[0]?.variantId ?? 'default',
              slots: [],
            },
          ),
        },
      }));
    },
    [blocks, updatePageValues],
  );

  const handlePickPhoto = useCallback(
    async (blockId: string, slotIndex: number) => {
      const block = blocks.find((item) => item.blockId === blockId);
      const blockValues = photoBlocks[blockId];
      const variantId =
        blockValues?.variantId ?? block?.variants[0]?.variantId ?? 'default';

      const uri = await pickPhotoFromLibrary({
        ensurePermission: ensureMediaLibraryPermission,
        aspect: resolvedSchema
          ? getSlotAspectRatio({
              lineGuideId: resolvedSchema.lineGuideId,
              page: resolvedSchema.sourcePageNumber,
              variantId,
              slotIndex,
            })
          : undefined,
      });
      if (!uri) return;

      updateBlock(blockId, (prev) => {
        const slots = [...prev.slots];
        slots[slotIndex] = uri;
        return { ...prev, slots };
      });
    },
    [blocks, ensureMediaLibraryPermission, photoBlocks, updateBlock],
  );

  const handleRemovePhoto = useCallback(
    (blockId: string, slotIndex: number) => {
      updateBlock(blockId, (prev) => {
        const slots = [...prev.slots];
        slots[slotIndex] = null;
        return { ...prev, slots };
      });
      if (showPerPhotoCaptions) {
        updatePageValues((prev) => {
          const next = [...(prev.photoCaptions ?? [])];
          next[slotIndex] = null;
          return { ...prev, photoCaptions: next };
        });
      }
    },
    [showPerPhotoCaptions, updateBlock, updatePageValues],
  );

  const handleSelectVariant = useCallback(
    (blockId: string, newVariantId: string) => {
      const block = blocks.find((item) => item.blockId === blockId);
      const variant = block?.variants.find((item) => item.variantId === newVariantId);
      if (!variant) return;

      const prevBlock = photoBlocks[blockId];
      if (prevBlock?.variantId === newVariantId) return;

      const migrated = migratePhotoBlockOnVariantChange({
        blockId,
        prevSlots: prevBlock?.slots ?? [],
        newSlotCount: variant.slots,
        prevCaptions: pageValues.photoCaptions,
        prevSlotTransforms: pageValues.photoSlotTransforms,
      });

      updateBlock(blockId, () => ({
        variantId: newVariantId,
        slots: migrated.slots,
      }));

      updatePageValues((prev) => ({
        ...prev,
        photoCaptions: showPerPhotoCaptions ? migrated.photoCaptions : prev.photoCaptions,
        photoSlotTransforms: migrated.photoSlotTransforms,
        photoGroupTransform: { scale: 1, offsetX: 0, offsetY: 0 },
      }));
    },
    [
      blocks,
      pageValues.photoCaptions,
      pageValues.photoSlotTransforms,
      photoBlocks,
      showPerPhotoCaptions,
      updateBlock,
      updatePageValues,
    ],
  );

  const handleInitPhotoBlock = useCallback(
    (blockId: string, variantId: string, slotCount: number) => {
      if (photoBlocks[blockId]?.variantId) return;
      updateBlock(blockId, () => ({
        variantId,
        slots: Array(slotCount).fill(null),
      }));
    },
    [photoBlocks, updateBlock],
  );

  const handleSlotTransformChange = useCallback(
    (blockId: string, slotIndex: number, transform: PhotoSlotTransform) => {
      const key = photoSlotTransformKey(blockId, slotIndex);
      updatePageValues((prev) => ({
        ...prev,
        photoSlotTransforms: {
          ...prev.photoSlotTransforms,
          [key]: transform,
        },
      }));
    },
    [updatePageValues],
  );

  const handleGroupTransformChange = useCallback(
    (transform: PhotoSlotTransform) => {
      updatePageValues((prev) => ({
        ...prev,
        photoGroupTransform: transform,
      }));
    },
    [updatePageValues],
  );

  const getSlotTransform = useCallback(
    (blockId: string, slotIndex: number): PhotoSlotTransform => {
      const key = photoSlotTransformKey(blockId, slotIndex);
      return pageValues.photoSlotTransforms?.[key] ?? DEFAULT_PHOTO_SLOT_TRANSFORM;
    },
    [pageValues.photoSlotTransforms],
  );

  return {
    blocks,
    photoBlocks,
    showCaption,
    showPerPhotoCaptions,
    updatePageValues,
    handlePickPhoto,
    handleRemovePhoto,
    handleSelectVariant,
    handleInitPhotoBlock,
    handleSlotTransformChange,
    handleGroupTransformChange,
    getSlotTransform,
  };
}
