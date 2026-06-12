import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Annotation } from '@/components/pdf-annotations';
import { resolveLineGuideId } from '@/utils/albumImages';
import { getSchemaForInstance } from '@/utils/albumProjectInit';
import { migrateProjectToPageValues } from '@/utils/migrateToPageValues';
import {
  loadPageInstances,
  loadPageValuesMap,
} from '@/utils/pageStorage';
import { syncPageValuesToAnnotationsStorage } from '@/utils/pageValuesAdapter';

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

  let viewportWidth = 390;
  let viewportHeight = 844;
  const viewportRaw = await AsyncStorage.getItem(`@project_viewport_${projectId}`);
  if (viewportRaw) {
    try {
      const vp = JSON.parse(viewportRaw);
      viewportWidth = vp.width ?? viewportWidth;
      viewportHeight = vp.height ?? viewportHeight;
    } catch {
      /* defaults */
    }
  }

  const annotations = syncPageValuesToAnnotationsStorage(
    instances,
    pageValuesMap,
    lineGuideId,
    viewportWidth,
    viewportHeight
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
