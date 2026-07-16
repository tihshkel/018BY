import { Alert } from 'react-native';
import { useCallback, useEffect, useMemo } from 'react';

import { useMediaLibraryPermission } from '@/components/media-library-permission-provider';
import type { AlbumPageSchema, PageValues, PhotoSlotTransform } from '@/types/album-page-schema';
import { flushAlbumProjectPersist } from '@/utils/albumProjectPersist';
import { pickPhotoFromLibrary } from '@/utils/pickAlbumPhoto';
import {
  buildAlbumPhotoStorageKey,
  persistAlbumPhotoUri,
  withPhotoCacheBust,
} from '@/utils/persistAlbumPhoto';
import { computePhotoSlotTargetPixels } from '@/utils/albumPhotoResample';
import { migratePhotoBlockOnVariantChange } from '@/utils/migratePhotoBlockOnVariantChange';
import { buildInitialPhotoSlotTransform } from '@/utils/photoSlotInitialTransform';
import { resolvePageSourceSize } from '@/utils/pageSourceDimensions';
import { getSlotAspectRatio } from '@/utils/photoVariantAspect';
import { usesDesignedAlbumPerPhotoCaptions } from '@/utils/designedAlbumPerPhotoCaptions';
import {
  getPageFormatForLineGuide,
  getTemplateLayout,
} from '@/utils/photoPageTemplateManifest';
import { enrichSchemaWithPhotoBlocks } from '@/utils/schemaPhotoBlocks';
import { resolvePhotoBlockVariant } from '@/utils/variantPreview';
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
  const showPerPhotoCaptions = useMemo(() => {
    if (!resolvedSchema) return false;
    if (resolvedSchema.pageType === 'birthday_free_page') return true;
    if (usesDesignedAlbumPerPhotoCaptions(resolvedSchema, resolvedSchema.lineGuideId)) {
      return true;
    }
    if (!resolvedSchema.captionEnabled || !resolvedSchema.templateLibraryId) {
      return false;
    }
    const format = getPageFormatForLineGuide(resolvedSchema.lineGuideId);
    const layout = getTemplateLayout(resolvedSchema.templateLibraryId, format);
    return Boolean(layout?.perPhotoCaptions);
  }, [resolvedSchema]);

  // Legacy page-level caption → per-photo captions[0] for designed photo pages.
  useEffect(() => {
    if (!showPerPhotoCaptions || !instanceId) return;
    const legacy = pageValues.caption?.trim();
    const legacyFieldCaption = Object.entries(pageValues.fields ?? {}).find(
      ([fieldId, value]) => fieldId.endsWith('_caption') && Boolean(value?.trim()),
    )?.[1]?.trim();
    const source = legacy || legacyFieldCaption;
    if (!source) return;
    const hasPerPhoto = (pageValues.photoCaptions ?? []).some((c) => Boolean(c?.trim()));
    if (hasPerPhoto) return;
    commitPagePatch(instanceId, (prev) => {
      if ((prev.photoCaptions ?? []).some((c) => Boolean(c?.trim()))) return prev;
      const caption =
        prev.caption?.trim() ||
        Object.entries(prev.fields ?? {}).find(
          ([fieldId, value]) => fieldId.endsWith('_caption') && Boolean(value?.trim()),
        )?.[1]?.trim();
      if (!caption) return prev;
      const nextFields = { ...prev.fields };
      for (const fieldId of Object.keys(nextFields)) {
        if (fieldId.endsWith('_caption')) delete nextFields[fieldId];
      }
      return {
        ...prev,
        fields: nextFields,
        photoCaptions: [caption],
        caption: undefined,
      };
    });
  }, [
    showPerPhotoCaptions,
    instanceId,
    pageValues.caption,
    pageValues.fields,
    pageValues.photoCaptions,
    commitPagePatch,
  ]);

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
      });
      if (!uri) return;

      const targetPixels = resolvedSchema
        ? computePhotoSlotTargetPixels({
            lineGuideId: resolvedSchema.lineGuideId,
            page: resolvedSchema.sourcePageNumber,
            variantId,
            slotIndex,
            templateLibraryId: resolvedSchema.templateLibraryId,
          })
        : null;

      let persistentUri = uri;
      if (pid && instanceId) {
        try {
          persistentUri = await persistAlbumPhotoUri(
            uri,
            buildAlbumPhotoStorageKey({
              projectId: pid,
              instanceId,
              blockId,
              slotIndex,
            }),
            { targetPixels },
          );
          persistentUri = withPhotoCacheBust(persistentUri);
        } catch (error) {
          console.error('[handlePickPhoto] persist failed', error);
          Alert.alert(
            'Не удалось сохранить фото',
            'Попробуйте выбрать снимок ещё раз. Если ошибка повторяется — перезапустите приложение.',
          );
          return;
        }
      }

      const slotAspect = resolvedSchema
        ? getSlotAspectRatio({
            lineGuideId: resolvedSchema.lineGuideId,
            page: resolvedSchema.sourcePageNumber,
            variantId,
            slotIndex,
          })
        : undefined;
      const imageSize = await resolvePageSourceSize(persistentUri);
      const initialTransform = buildInitialPhotoSlotTransform({
        slotAspect,
        imageWidth: imageSize?.width,
        imageHeight: imageSize?.height,
      });
      const transformKey = photoSlotTransformKey(blockId, slotIndex);

      updateBlock(blockId, (prev) => {
        const slots = [...prev.slots];
        slots[slotIndex] = persistentUri;
        return { ...prev, slots };
      });

      updatePageValues((prev) => ({
        ...prev,
        photoSlotTransforms: {
          ...prev.photoSlotTransforms,
          [transformKey]: initialTransform,
        },
      }));
    },
    [
      blocks,
      ensureMediaLibraryPermission,
      instanceId,
      photoBlocks,
      projectId,
      resolvedSchema,
      updateBlock,
      updatePageValues,
    ],
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
        prevCaptions: pageValues.photoCaptions,
        prevSlotTransforms: pageValues.photoSlotTransforms,
      });

      updateBlock(blockId, () => ({
        variantId: variant.variantId,
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
      resolvedSchema?.lineGuideId,
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
