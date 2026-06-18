import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions } from 'react-native';

import type { Annotation } from '@/components/pdf-annotations';
import { resolveLineGuideId } from '@/utils/albumImages';
import { getSchemaForInstance } from '@/utils/albumProjectInit';
import { migrateProjectToPageValues } from '@/utils/migrateToPageValues';
import {
  loadPageInstances,
  loadPageValuesMap,
} from '@/utils/pageStorage';
import {
  getCachedPageSourceSize,
  resolvePageSourceSize,
} from '@/utils/pageSourceDimensions';
import {
  loadProjectViewport,
  resolveEditorCoordinateViewport,
} from '@/utils/exportViewport';
import { syncPageValuesToAnnotationsStorage } from '@/utils/pageValuesAdapter';

const { width: DEFAULT_VIEWPORT_WIDTH, height: DEFAULT_VIEWPORT_HEIGHT } =
  Dimensions.get('window');

async function loadSourceSizesForImages(
  imageUris: string[],
  imageIndices: number[]
): Promise<Map<number, { width: number; height: number }>> {
  const sizes = new Map<number, { width: number; height: number }>();
  const uniqueIndices = [...new Set(imageIndices)];

  await Promise.all(
    uniqueIndices.map(async (index) => {
      const uri = imageUris[index];
      if (!uri) return;
      const cached = getCachedPageSourceSize(uri);
      const size = cached ?? (await resolvePageSourceSize(uri));
      if (size) sizes.set(index, size);
    })
  );

  return sizes;
}

export async function ensureProjectAnnotationsSynced(projectId: string): Promise<Annotation[]> {
  await migrateProjectToPageValues(projectId);

  const projectRaw = await AsyncStorage.getItem(`@project_${projectId}`);
  if (!projectRaw) return [];

  const project = JSON.parse(projectRaw) as {
    albumId?: string;
    interiorType?: string;
    category?: string;
  };

  const lineGuideId = resolveLineGuideId(
    project.interiorType ?? project.albumId,
    project.category
  );

  const instances = await loadPageInstances((k) => AsyncStorage.getItem(k), projectId);
  const pageValuesMap = await loadPageValuesMap((k) => AsyncStorage.getItem(k), projectId);

  if (instances.length === 0) {
    const raw = await AsyncStorage.getItem(`@project_annotations_${projectId}`);
    return raw ? JSON.parse(raw) : [];
  }

  const imagesRaw = await AsyncStorage.getItem(`@project_images_${projectId}`);
  let imageUris: string[] = [];
  if (imagesRaw) {
    try {
      const parsed = JSON.parse(imagesRaw);
      imageUris = Array.isArray(parsed) ? parsed : [];
    } catch {
      imageUris = [];
    }
  }

  const sourceSizesByImageIndex = await loadSourceSizesForImages(
    imageUris,
    instances.map((i) => i.imageIndex)
  );

  const firstInstance = instances[0];
  const firstSourceSize = firstInstance
    ? sourceSizesByImageIndex.get(firstInstance.imageIndex)
    : undefined;

  let viewportWidth: number;
  let viewportHeight: number;
  const savedViewport = await loadProjectViewport(projectId);
  if (savedViewport) {
    viewportWidth = savedViewport.width;
    viewportHeight = savedViewport.height;
  } else {
    const derived = resolveEditorCoordinateViewport({
      windowWidth: DEFAULT_VIEWPORT_WIDTH,
      sourceWidth: firstSourceSize?.width,
      sourceHeight: firstSourceSize?.height,
    });
    viewportWidth = derived.width;
    viewportHeight = derived.height;
  }

  const annotations = syncPageValuesToAnnotationsStorage(
    instances,
    pageValuesMap,
    lineGuideId,
    viewportWidth,
    viewportHeight,
    imageUris,
    sourceSizesByImageIndex
  );

  await AsyncStorage.setItem(`@project_annotations_${projectId}`, JSON.stringify(annotations));
  return annotations;
}

export async function getSchemaForProjectPage(
  projectId: string,
  instanceId: string
) {
  const projectRaw = await AsyncStorage.getItem(`@project_${projectId}`);
  if (!projectRaw) return undefined;

  const project = JSON.parse(projectRaw);
  const lineGuideId = resolveLineGuideId(
    project.interiorType ?? project.albumId,
    project.category
  );

  const instances = await loadPageInstances((k) => AsyncStorage.getItem(k), projectId);
  const instance = instances.find((i) => i.instanceId === instanceId);
  if (!instance) return undefined;

  return getSchemaForInstance(instance, lineGuideId);
}
