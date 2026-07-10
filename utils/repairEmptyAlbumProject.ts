import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PageInstance, PageValues } from '@/types/album-page-schema';
import {
  getAlbumImageUrisForViewing,
  resolveLineGuideId,
} from '@/utils/albumImages';
import {
  buildInitialPageInstances,
  buildInitialPageValuesMap,
} from '@/utils/albumProjectInit';
import { scheduleDeferredAlbumCloudSync } from '@/utils/account-sync';
import { mergePageValuesMaps } from '@/utils/projectSyncMerge';
import {
  createEmptyPageValues,
  getPageValueEntryKey,
  loadPageValuesMap,
  savePageInstances,
  savePageValuesMap,
} from '@/utils/pageStorage';

export type RepairAlbumProjectMeta = {
  id: string;
  category?: string;
  albumId?: string;
  interiorType?: string;
};

export type RepairAlbumProjectResult = {
  repaired: boolean;
  images: string[];
  instances: PageInstance[];
  pageValuesMap: Record<string, PageValues>;
};

async function scanProjectPvInstanceIds(projectId: string): Promise<string[]> {
  const prefix = `@project_pv_${projectId}_`;
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length));
}

async function loadAllStoredPageValues(
  projectId: string,
  pvInstanceIds: string[],
): Promise<Record<string, PageValues>> {
  const monolithic = await loadPageValuesMap((key) => AsyncStorage.getItem(key), projectId);
  const fromPv: Record<string, PageValues> = {};

  await Promise.all(
    pvInstanceIds.map(async (instanceId) => {
      const raw = await AsyncStorage.getItem(getPageValueEntryKey(projectId, instanceId));
      if (!raw) return;
      try {
        fromPv[instanceId] = JSON.parse(raw) as PageValues;
      } catch {
        // ignore corrupt entry
      }
    }),
  );

  return mergePageValuesMaps(monolithic, fromPv);
}

function remapValuesToInstances(
  instances: PageInstance[],
  valuesByOldId: Record<string, PageValues>,
): Record<string, PageValues> {
  const oldIds = Object.keys(valuesByOldId);
  if (oldIds.length === 0) {
    return buildInitialPageValuesMap(instances);
  }

  const remapped: Record<string, PageValues> = {};
  instances.forEach((instance, index) => {
    const oldId = oldIds[index];
    remapped[instance.instanceId] = oldId ? valuesByOldId[oldId] : createEmptyPageValues();
  });
  return remapped;
}

/**
 * Восстанавливает images/instances/page values после облачного pull, который обнулил снимок.
 */
export async function repairEmptyAlbumProject(
  projectId: string,
  meta: RepairAlbumProjectMeta,
  loadImagesForAlbum: (albumId: string, category?: string) => Promise<string[]>,
): Promise<RepairAlbumProjectResult> {
  const albumId = meta.interiorType ?? meta.albumId ?? '';
  const category = meta.category;
  if (!albumId && !category) {
    return { repaired: false, images: [], instances: [], pageValuesMap: {} };
  }

  const [savedImagesRaw, savedInstancesRaw] = await Promise.all([
    AsyncStorage.getItem(`@project_images_${projectId}`),
    AsyncStorage.getItem(`@project_page_instances_${projectId}`),
  ]);

  let images = savedImagesRaw ? (JSON.parse(savedImagesRaw) as string[]) : [];
  let instances: PageInstance[] = savedInstancesRaw
    ? (JSON.parse(savedInstancesRaw) as PageInstance[])
    : [];

  const pvInstanceIds = await scanProjectPvInstanceIds(projectId);
  const storedValues = await loadAllStoredPageValues(projectId, pvInstanceIds);

  if (!Array.isArray(images) || images.length === 0) {
    const templateImages =
      albumId.length > 0
        ? await loadImagesForAlbum(albumId, category)
        : await getAlbumImageUrisForViewing(albumId || category || '');
    if (templateImages.length > 0) {
      images = templateImages;
      await AsyncStorage.setItem(`@project_images_${projectId}`, JSON.stringify(images));
    }
  }

  const lgId = resolveLineGuideId(albumId, category);
  const needsInstances = !Array.isArray(instances) || instances.length === 0;
  const pageCount = Math.max(images.length, pvInstanceIds.length, Object.keys(storedValues).length);

  if (needsInstances && pageCount > 0 && lgId) {
    instances = buildInitialPageInstances(lgId, pageCount);
    await savePageInstances((key, value) => AsyncStorage.setItem(key, value), projectId, instances);
  }

  let pageValuesMap = storedValues;
  if (needsInstances && instances.length > 0 && Object.keys(storedValues).length > 0) {
    pageValuesMap = remapValuesToInstances(instances, storedValues);
    await savePageValuesMap(
      (key, value) => AsyncStorage.setItem(key, value),
      projectId,
      pageValuesMap,
    );
  } else if (instances.length > 0 && Object.keys(pageValuesMap).length === 0) {
    pageValuesMap = buildInitialPageValuesMap(instances);
    await savePageValuesMap(
      (key, value) => AsyncStorage.setItem(key, value),
      projectId,
      pageValuesMap,
    );
  }

  const hadEmptyImages = !savedImagesRaw || safeParseArray(savedImagesRaw).length === 0;
  const hadEmptyInstances = !savedInstancesRaw || safeParseInstances(savedInstancesRaw).length === 0;
  const repaired =
    (hadEmptyImages && images.length > 0) ||
    (hadEmptyInstances && instances.length > 0) ||
    (Object.keys(storedValues).length > 0 && hadEmptyInstances);

  if (repaired) {
    scheduleDeferredAlbumCloudSync();
  }

  return {
    repaired,
    images: Array.isArray(images) ? images : [],
    instances: Array.isArray(instances) ? instances : [],
    pageValuesMap,
  };
}

function safeParseArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeParseInstances(raw: string | null): PageInstance[] {
  const parsed = safeParseArray(raw);
  return parsed as PageInstance[];
}
