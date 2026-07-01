import type { PageInstance, PageValues } from '@/types/album-page-schema';
import { getSchemaForInstance } from '@/utils/albumProjectInit';
import { isBlankTemplateLineGuide } from '@/utils/photoPageTemplateManifest';
import {
  buildAlbumPhotoStorageKey,
  persistAlbumPhotoUri,
  photoUriExists,
} from '@/utils/persistAlbumPhoto';

const LEGACY_BLOCK_IDS = ['photo', 'photos', 'template', 'free_photos'] as const;
const PRIMARY_BLOCK_ID = 'main_photo';

function hasPhotoSlots(values: PageValues): boolean {
  return Object.values(values.photoBlocks).some((block) =>
    block?.slots?.some((uri) => Boolean(uri?.trim())),
  );
}

/** Сливает legacy blockId в main_photo для blank-шаблонов. */
function mergeLegacyPhotoBlocks(values: PageValues): { values: PageValues; changed: boolean } {
  const photoBlocks = { ...values.photoBlocks };
  const primary = photoBlocks[PRIMARY_BLOCK_ID];
  let changed = false;

  for (const legacyId of LEGACY_BLOCK_IDS) {
    const legacy = photoBlocks[legacyId];
    if (!legacy?.slots?.length) continue;

    const target = photoBlocks[PRIMARY_BLOCK_ID] ?? {
      variantId: legacy.variantId ?? 'template',
      slots: [] as (string | null)[],
    };
    const slots = [...target.slots];
    for (let i = 0; i < legacy.slots.length; i += 1) {
      const uri = legacy.slots[i];
      if (!uri?.trim()) continue;
      if (!slots[i]?.trim()) {
        slots[i] = uri;
        changed = true;
      }
    }
    photoBlocks[PRIMARY_BLOCK_ID] = {
      variantId: target.variantId || legacy.variantId || 'template',
      slots,
    };
    delete photoBlocks[legacyId];
    changed = true;
  }

  if (!changed) return { values, changed: false };
  return {
    values: { ...values, photoBlocks },
    changed: true,
  };
}

async function persistBlockSlots(
  projectId: string,
  instanceId: string,
  blockId: string,
  slots: (string | null)[],
): Promise<(string | null)[]> {
  const next: (string | null)[] = [];
  let changed = false;

  for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
    const uri = slots[slotIndex];
    if (!uri?.trim()) {
      next.push(uri);
      continue;
    }
    if (!(await photoUriExists(uri))) {
      next.push(uri);
      continue;
    }
    const persisted = await persistAlbumPhotoUri(
      uri,
      buildAlbumPhotoStorageKey({ projectId, instanceId, blockId, slotIndex }),
    );
    if (persisted !== uri) changed = true;
    next.push(persisted);
  }

  return changed ? next : slots;
}

async function migratePagePhotos(
  projectId: string,
  instanceId: string,
  values: PageValues,
): Promise<{ values: PageValues; changed: boolean }> {
  let next = values;
  let changed = false;

  const merged = mergeLegacyPhotoBlocks(next);
  if (merged.changed) {
    next = merged.values;
    changed = true;
  }

  const photoBlocks = { ...next.photoBlocks };
  for (const [blockId, block] of Object.entries(photoBlocks)) {
    if (!block) continue;
    const slots = await persistBlockSlots(projectId, instanceId, blockId, block.slots);
    if (slots !== block.slots) {
      photoBlocks[blockId] = { ...block, slots };
      changed = true;
    }
  }

  let freeElements = next.freeElements;
  if (freeElements?.length) {
    const updated = await Promise.all(
      freeElements.map(async (element) => {
        if (element.type !== 'image' || !element.content?.trim()) return element;
        if (!(await photoUriExists(element.content))) return element;
        const persisted = await persistAlbumPhotoUri(
          element.content,
          buildAlbumPhotoStorageKey({
            projectId,
            instanceId,
            freeElementId: element.id,
          }),
        );
        if (persisted === element.content) return element;
        changed = true;
        return { ...element, content: persisted };
      }),
    );
    freeElements = updated;
  }

  if (!changed) return { values, changed: false };
  return {
    values: {
      ...next,
      photoBlocks,
      ...(freeElements !== undefined ? { freeElements } : {}),
    },
    changed: true,
  };
}

export async function migrateBlankAlbumPhotosMap(
  projectId: string,
  instances: PageInstance[],
  pageValuesMap: Record<string, PageValues>,
  lineGuideId: string,
): Promise<{ pageValuesMap: Record<string, PageValues>; changed: boolean }> {
  if (!isBlankTemplateLineGuide(lineGuideId)) {
    return { pageValuesMap, changed: false };
  }

  let changed = false;
  const nextMap = { ...pageValuesMap };

  for (const instance of instances) {
    const values = nextMap[instance.instanceId];
    if (!values) continue;
    const schema = getSchemaForInstance(instance, lineGuideId);
    if (!schema || !isBlankTemplateLineGuide(schema.lineGuideId)) continue;
    if (!hasPhotoSlots(values) && !values.freeElements?.some((el) => el.type === 'image')) {
      continue;
    }

    const migrated = await migratePagePhotos(projectId, instance.instanceId, values);
    if (migrated.changed) {
      nextMap[instance.instanceId] = migrated.values;
      changed = true;
    }
  }

  return { pageValuesMap: changed ? nextMap : pageValuesMap, changed };
}
