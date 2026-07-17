import { useCallback } from 'react';

import { useMediaLibraryPermission } from '@/components/media-library-permission-provider';
import { prefetchAlbumPhotoUriAsync } from '@/components/album/album-photo-image';
import type { AlbumPageSchema, PageValues, PhotoSlotTransform } from '@/types/album-page-schema';
import { flushAlbumProjectPersist } from '@/utils/albumProjectPersist';
import { pickPhotoFromLibrary } from '@/utils/pickAlbumPhoto';
import {
  buildAlbumPhotoStorageKey,
  deleteManagedAlbumPhotoUri,
  persistAlbumPhotoUri,
} from '@/utils/persistAlbumPhoto';
import { migratePhotoBlockOnVariantChange } from '@/utils/migratePhotoBlockOnVariantChange';
import { getSlotAspectRatio } from '@/utils/photoVariantAspect';
import {
  getPageFormatForLineGuide,
  getTemplateLayout,
} from '@/utils/photoPageTemplateManifest';
import { enrichSchemaWithPhotoBlocks } from '@/utils/schemaPhotoBlocks';
import { resolvePhotoBlockVariant } from '@/utils/variantPreview';
import {
  resolvePhotoCaptionsForMigration,
  shouldShowPerPhotoCaptions,
} from '@/utils/photoCaptions';
import {
  DEFAULT_PHOTO_SLOT_TRANSFORM,
  photoSlotTransformKey,
} from '@/utils/photoSlotTransform';

type UseAlbumPagePhotoEditorParams = {
  instanceId?: string;
  schema: AlbumPageSchema | undefined;
  pageValues: PageValues;
  projectId: string;
  commitPagePatch: (
    instanceId: string,
    updater: (prev: PageValues) => PageValues,
  ) => void;
};

export function useAlbumPagePhotoEditor({
  instanceId,
  schema,
  pageValues,
  projectId,
  commitPagePatch,
}: UseAlbumPagePhotoEditorParams) {
  const { ensureMediaLibraryPermission } = useMediaLibraryPermission();
  const resolvedSchema = schema ? enrichSchemaWithPhotoBlocks(schema) : undefined;
  const blocks = resolvedSchema?.photoBlocks ?? [];
  const photoBlocks = pageValues.photoBlocks;

  const showCaption = resolvedSchema?.captionEnabled === true;
  const captionMaxLength = resolvedSchema?.captionMaxLength;
  const templateHasPerPhotoCaptions = (() => {
    if (!resolvedSchema?.templateLibraryId) return false;
    const format = getPageFormatForLineGuide(resolvedSchema.lineGuideId);
    const layout = getTemplateLayout(resolvedSchema.templateLibraryId, format);
    return Boolean(layout?.perPhotoCaptions);
  })();
  const showPerPhotoCaptions = shouldShowPerPhotoCaptions(
    resolvedSchema,
    templateHasPerPhotoCaptions,
  );

  const updatePageValues = useCallback(
    (updater: (prev: PageValues) => PageValues) => {
      if (!instanceId) return;
      commitPagePatch(instanceId, updater);
    },
    [commitPagePatch, instanceId],
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

      const pid = projectId;
      if (pid) {
        await flushAlbumProjectPersist(pid);
      }

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

      const persistentUri =
        pid && instanceId
          ? await persistAlbumPhotoUri(
              uri,
              buildAlbumPhotoStorageKey({
                projectId: pid,
                instanceId,
                blockId,
                slotIndex,
              }),
            )
          : uri;

      await prefetchAlbumPhotoUriAsync(persistentUri);

      updatePageValues((prev) => {
        const prevBlock = prev.photoBlocks[blockId] ?? {
          variantId:
            blocks.find((b) => b.blockId === blockId)?.variants[0]?.variantId ?? 'default',
          slots: [],
        };
        const slots = [...prevBlock.slots];
        const previousUri = slots[slotIndex];
        slots[slotIndex] = persistentUri;
        if (previousUri && previousUri !== persistentUri) {
          void deleteManagedAlbumPhotoUri(previousUri);
        }
        return {
          ...prev,
          photoBlocks: {
            ...prev.photoBlocks,
            [blockId]: { ...prevBlock, slots },
          },
        };
      });
    },
    [
      blocks,
      ensureMediaLibraryPermission,
      instanceId,
      photoBlocks,
      projectId,
      resolvedSchema,
      updatePageValues,
    ],
  );

  const handleRemovePhoto = useCallback(
    (blockId: string, slotIndex: number) => {
      // Один патч: два подряд updatePageValues ломали persist/snapshot (второй без eager updater).
      updatePageValues((prev) => {
        const prevBlock = prev.photoBlocks[blockId];
        if (!prevBlock) return prev;

        const slots = [...prevBlock.slots];
        const removedUri = slots[slotIndex];
        slots[slotIndex] = null;
        if (removedUri) {
          void deleteManagedAlbumPhotoUri(removedUri);
        }

        const next: PageValues = {
          ...prev,
          photoBlocks: {
            ...prev.photoBlocks,
            [blockId]: { ...prevBlock, slots },
          },
        };

        if (showPerPhotoCaptions) {
          const captions = [...(prev.photoCaptions ?? [])];
          captions[slotIndex] = null;
          next.photoCaptions = captions;
        }

        return next;
      });
    },
    [showPerPhotoCaptions, updatePageValues],
  );

  const handleSelectVariant = useCallback(
    (blockId: string, newVariantId: string) => {
      const block = blocks.find((item) => item.blockId === blockId);
      const variant = resolvePhotoBlockVariant(
        block?.variants ?? [],
        newVariantId,
        resolvedSchema?.lineGuideId,
      );
      if (!variant) return;

      const prevBlock = photoBlocks[blockId];
      if (prevBlock?.variantId === variant.variantId) return;

      const migrated = migratePhotoBlockOnVariantChange({
        blockId,
        prevSlots: prevBlock?.slots ?? [],
        newSlotCount: variant.slots,
        prevCaptions: showPerPhotoCaptions
          ? resolvePhotoCaptionsForMigration(pageValues.photoCaptions, pageValues.caption)
          : pageValues.photoCaptions,
        prevSlotTransforms: pageValues.photoSlotTransforms,
      });

      // Один патч: variant + captions + transforms — иначе snapshot мог публиковать старый layout.
      updatePageValues((prev) => ({
        ...prev,
        photoBlocks: {
          ...prev.photoBlocks,
          [blockId]: {
            variantId: variant.variantId,
            slots: migrated.slots,
          },
        },
        photoCaptions: showPerPhotoCaptions ? migrated.photoCaptions : prev.photoCaptions,
        caption: showPerPhotoCaptions ? undefined : prev.caption,
        photoSlotTransforms: migrated.photoSlotTransforms,
        photoGroupTransform: { scale: 1, offsetX: 0, offsetY: 0 },
      }));
    },
    [
      blocks,
      pageValues.caption,
      pageValues.photoCaptions,
      pageValues.photoSlotTransforms,
      photoBlocks,
      resolvedSchema?.lineGuideId,
      showPerPhotoCaptions,
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
    captionMaxLength,
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
