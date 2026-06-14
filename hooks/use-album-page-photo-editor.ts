import { useCallback } from 'react';

import { useMediaLibraryPermission } from '@/components/media-library-permission-provider';
import type { AlbumPageSchema, PageValues } from '@/types/album-page-schema';
import type { useAlbumProject } from '@/hooks/use-album-project';
import { pickPhotoFromLibrary } from '@/utils/pickAlbumPhoto';
import { getSlotAspectRatio } from '@/utils/photoVariantAspect';

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
  const blocks = schema?.photoBlocks ?? [];
  const photoBlocks = pageValues.photoBlocks;

  const showCaption = schema?.captionEnabled === true;
  const showPerPhotoCaptions = schema?.pageType === 'caption_photo_page';

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
        aspect: schema
          ? getSlotAspectRatio({
              lineGuideId: schema.lineGuideId,
              page: schema.sourcePageNumber,
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
      updateBlock(blockId, () => ({
        variantId: newVariantId,
        slots: Array(variant?.slots ?? 1).fill(null),
      }));
      if (showPerPhotoCaptions) {
        updatePageValues((prev) => ({
          ...prev,
          photoCaptions: Array(variant?.slots ?? 1).fill(null),
        }));
      }
    },
    [blocks, showPerPhotoCaptions, updateBlock, updatePageValues],
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
  };
}
