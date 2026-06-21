import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Annotation } from '@/components/pdf-annotations';
import type { PageInstance, PageValues } from '@/types/album-page-schema';
import { resolveLineGuideId } from '@/utils/albumImages';
import { getSchemaForInstance, buildInitialPageInstances, buildInitialPageValuesMap } from '@/utils/albumProjectInit';
import {
  annotationsToPageValues,
  syncPageValuesToAnnotationsStorage,
} from '@/utils/pageValuesAdapter';
import {
  getFormMigrationKey,
  loadPageInstances,
  loadPageValuesMap,
  savePageInstances,
  savePageValuesMap,
} from '@/utils/pageStorage';
import { normalizeProjectAnnotations } from '@/utils/migrateTemplateLineAnnotations';

export async function migrateProjectToPageValues(projectId: string): Promise<boolean> {
  const migrationKey = getFormMigrationKey(projectId);
  const alreadyMigrated = await AsyncStorage.getItem(migrationKey);
  if (alreadyMigrated === 'true') return false;

  const projectRaw = await AsyncStorage.getItem(`@project_${projectId}`);
  if (!projectRaw) return false;

  const project = JSON.parse(projectRaw) as {
    albumId?: string;
    interiorType?: string;
    category?: string;
  };

  const lineGuideId = resolveLineGuideId(
    project.interiorType ?? project.albumId,
    project.category
  );

  let instances = await loadPageInstances(
    (key) => AsyncStorage.getItem(key),
    projectId
  );

  if (instances.length === 0) {
    const imagesRaw = await AsyncStorage.getItem(`@project_images_${projectId}`);
    const images: string[] = imagesRaw ? JSON.parse(imagesRaw) : [];
    if (images.length === 0) return false;

    instances = buildInitialPageInstances(lineGuideId, images.length);
    await savePageInstances((key, val) => AsyncStorage.setItem(key, val), projectId, instances);
  }

  const annotationsRaw = await AsyncStorage.getItem(`@project_annotations_${projectId}`);
  if (!annotationsRaw) {
    await AsyncStorage.setItem(migrationKey, 'true');
    return true;
  }

  const parsed = JSON.parse(annotationsRaw) as Annotation[];
  const { items: annotations } = normalizeProjectAnnotations(parsed);

  const pageValuesMap: Record<string, PageValues> = await loadPageValuesMap(
    (key) => AsyncStorage.getItem(key),
    projectId
  );

  for (const instance of instances) {
    const schema = getSchemaForInstance(instance, lineGuideId);
    if (!schema) continue;

    const pageNumber = instance.imageIndex + 1;
    const pageAnnotations = annotations.filter((ann) => Number(ann.page) === pageNumber);
    if (pageAnnotations.length === 0) continue;

    pageValuesMap[instance.instanceId] = annotationsToPageValues(pageAnnotations, schema);
  }

  await savePageValuesMap(
    (key, val) => AsyncStorage.setItem(key, val),
    projectId,
    pageValuesMap
  );

  const viewportRaw = await AsyncStorage.getItem(`@project_viewport_${projectId}`);
  let viewportWidth = 390;
  let viewportHeight = 844;
  if (viewportRaw) {
    try {
      const vp = JSON.parse(viewportRaw);
      viewportWidth = vp.width ?? viewportWidth;
      viewportHeight = vp.height ?? viewportHeight;
    } catch {
      /* use defaults */
    }
  }

  const synced = syncPageValuesToAnnotationsStorage(
    instances,
    pageValuesMap,
    lineGuideId,
    viewportWidth,
    viewportHeight
  );

  await AsyncStorage.setItem(`@project_annotations_${projectId}`, JSON.stringify(synced));
  await AsyncStorage.setItem(migrationKey, 'true');
  return true;
}
