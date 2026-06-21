import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';

import { formatRouteEventDate, parseRouteEventDate, resolveRouteParam } from '@/utils/routeParams';
import { getAlbumTemplateById } from '@/albums';
import type { Annotation } from '@/components/pdf-annotations';
import type { PageInstance, PageValues } from '@/types/album-page-schema';
import {
  getAlbumImages,
  getAlbumImageUrisForViewing,
  getAlbumPageCount,
  getBlankInteriorPageUri,
  isBlankInteriorAlbum,
  resolveInteriorAlbumId,
  resolveLineGuideId,
} from '@/utils/albumImages';
import {
  buildInitialPageInstances,
  buildInitialPageValuesMap,
  getInstanceTitle,
  getSchemaForInstance,
} from '@/utils/albumProjectInit';
import { migrateProjectToPageValues } from '@/utils/migrateToPageValues';
import {
  buildAnnotationsForProject,
  duplicatePageAtIndex,
  insertPageAtIndex,
  movePageAtIndex,
  removePageAtIndex,
  renamePageInstance,
} from '@/utils/albumPageOperations';
import {
  loadPageInstances,
  loadPageValuesMap,
  savePageInstances,
  savePageValuesMap,
} from '@/utils/pageStorage';
import { refreshPageValuesStatus } from '@/utils/pageStatus';
import { ensureProjectAnnotationsSynced } from '@/utils/ensureProjectAnnotationsSynced';
import { getCoverThumbnailForProject } from '@/utils/projectCoverImage';
import { linkNewProjectToEventReminders } from '@/utils/project-reminders-cleanup';
import {
  flushAlbumProjectPersist,
  scheduleAlbumProjectPersist,
} from '@/utils/albumProjectPersist';
import {
  getAlbumProjectSnapshot,
  patchAlbumProjectSnapshot,
  publishAlbumProjectSnapshot,
  subscribeAlbumProjectSnapshot,
} from '@/utils/albumProjectStateSync';
import { pushAccountDataToCloud, scheduleSyncToCloud, addProjectToSyncedList } from '@/utils/account-sync';
import { runDedupedAlbumProjectCreation } from '@/utils/albumProjectCreationLock';
import { getDiaryInteriorImageUris } from '@/utils/diaryAlbumsLoader';

export type AlbumProjectMeta = {
  id: string;
  title: string;
  category?: string;
  albumId?: string;
  interiorType?: string;
  coverType?: string;
  hasPdfTemplate?: boolean;
  isReadyMadeAlbum?: boolean;
  pagesCount?: number;
};

type UseAlbumProjectParams = {
  projectId?: string;
  celebration?: string;
  coverType?: string;
  interiorType?: string;
  eventDate?: string;
  /** false на экранах редактирования — иначе snapshot перезаписывает ввод с клавиатуры. */
  subscribeSnapshots?: boolean;
};

function getCelebrationTitle(celebration: string): string {
  const titles: Record<string, string> = {
    pregnancy: 'Дневник беременности',
    kids: 'Детский фотоальбом',
    family: 'Семейный альбом',
    holidays: 'Праздничный альбом',
    diary: 'Дневник',
  };
  return titles[celebration] ?? 'Мой альбом';
}

export function useAlbumProject(params: UseAlbumProjectParams) {
  const {
    projectId: rawProjectId,
    celebration: rawCelebration,
    coverType: rawCoverType,
    interiorType: rawInteriorType,
    eventDate: rawEventDate,
    subscribeSnapshots = true,
  } = params;
  const projectId = resolveRouteParam(rawProjectId);
  const celebration = resolveRouteParam(rawCelebration);
  const coverType = resolveRouteParam(rawCoverType);
  const interiorType = resolveRouteParam(rawInteriorType);
  const eventDate = useMemo(
    () => parseRouteEventDate(rawEventDate),
    [rawEventDate]
  );

  const [effectiveProjectId, setEffectiveProjectId] = useState(projectId ?? '');
  const [meta, setMeta] = useState<AlbumProjectMeta | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [instances, setInstances] = useState<PageInstance[]>([]);
  const [pageValuesMap, setPageValuesMap] = useState<Record<string, PageValues>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const pageValuesMapRef = useRef(pageValuesMap);
  pageValuesMapRef.current = pageValuesMap;

  const lineGuideId = useMemo(
    () => resolveLineGuideId(meta?.interiorType ?? meta?.albumId, meta?.category ?? celebration),
    [meta, celebration]
  );

  const loadImagesForAlbum = useCallback(async (albumId: string, category?: string): Promise<string[]> => {
    if (category === 'diary' && albumId.startsWith('diary_interior_')) {
      const diaryUris = await getDiaryInteriorImageUris(albumId);
      return diaryUris ?? [];
    }
    if (isBlankInteriorAlbum(albumId)) {
      const resolvedLineGuide = resolveLineGuideId(albumId, category);
      const blankUri = await getBlankInteriorPageUri(resolvedLineGuide);
      const count = getAlbumPageCount(albumId);
      return Array(count).fill(blankUri);
    }
    const uris = await getAlbumImageUrisForViewing(albumId);
    if (uris.length > 0) return uris;
    const assets = getAlbumImages(albumId);
    return assets.map((a) => String(a));
  }, []);

  const persistAll = useCallback(
    async (
      pid: string,
      nextImages: string[],
      nextInstances: PageInstance[],
      nextValues: Record<string, PageValues>,
      nextMeta?: AlbumProjectMeta | null
    ) => {
      setIsSaving(true);
      try {
        await savePageInstances((k, v) => AsyncStorage.setItem(k, v), pid, nextInstances);
        await savePageValuesMap((k, v) => AsyncStorage.setItem(k, v), pid, nextValues);
        await AsyncStorage.setItem(`@project_images_${pid}`, JSON.stringify(nextImages));

        await ensureProjectAnnotationsSynced(pid);

        if (nextMeta) {
          const updated = { ...nextMeta, pagesCount: nextImages.length };
          await AsyncStorage.setItem(`@project_${pid}`, JSON.stringify(updated));
          const raw = await AsyncStorage.getItem('@user_projects');
          if (raw) {
            const list = JSON.parse(raw) as AlbumProjectMeta[];
            const idx = list.findIndex((p) => p.id === pid);
            if (idx >= 0) {
              list[idx] = { ...list[idx], pagesCount: nextImages.length };
              await AsyncStorage.setItem('@user_projects', JSON.stringify(list));
            }
          }
        }
        await addProjectToSyncedList(pid);
        scheduleSyncToCloud();
      } finally {
        setIsSaving(false);
      }
    },
    [lineGuideId]
  );

  const scheduleSave = useCallback(
    (
      nextImages: string[],
      nextInstances: PageInstance[],
      nextValues: Record<string, PageValues>
    ) => {
      if (!effectiveProjectId) return;
      scheduleAlbumProjectPersist(
        effectiveProjectId,
        {
          images: nextImages,
          instances: nextInstances,
          pageValuesMap: nextValues,
          meta: metaRef.current,
        },
        async (payload) => {
          await persistAll(
            effectiveProjectId,
            payload.images,
            payload.instances,
            payload.pageValuesMap,
            payload.meta
          );
        }
      );
    },
    [effectiveProjectId, persistAll]
  );

  const publishSnapshot = useCallback(
    (
      nextValues: Record<string, PageValues>,
      nextInstances: PageInstance[] = instances,
      nextImages: string[] = images
    ) => {
      if (!effectiveProjectId) return;
      patchAlbumProjectSnapshot(effectiveProjectId, {
        pageValuesMap: nextValues,
        instances: nextInstances,
        images: nextImages,
      });
    },
    [effectiveProjectId, instances, images]
  );

  const reloadProjectData = useCallback(async () => {
    if (!effectiveProjectId) return;

    await flushAlbumProjectPersist(effectiveProjectId);

    const memorySnapshot = getAlbumProjectSnapshot(effectiveProjectId);

    const [loadedInstances, loadedValues, savedImagesRaw] = await Promise.all([
      loadPageInstances((k) => AsyncStorage.getItem(k), effectiveProjectId),
      loadPageValuesMap((k) => AsyncStorage.getItem(k), effectiveProjectId),
      AsyncStorage.getItem(`@project_images_${effectiveProjectId}`),
    ]);

    const diskImages = savedImagesRaw ? (JSON.parse(savedImagesRaw) as string[]) : [];
    const mergedValues = memorySnapshot?.pageValuesMap
      ? { ...loadedValues, ...memorySnapshot.pageValuesMap }
      : loadedValues;
    const mergedInstances =
      memorySnapshot?.instances?.length && memorySnapshot.instances.length >= loadedInstances.length
        ? memorySnapshot.instances
        : loadedInstances;
    const mergedImages =
      memorySnapshot?.images?.length && memorySnapshot.images.length >= diskImages.length
        ? memorySnapshot.images
        : diskImages.length > 0
          ? diskImages
          : images;

    setInstances(mergedInstances);
    setPageValuesMap(mergedValues);
    if (mergedImages.length > 0) {
      setImages(mergedImages);
    }
    publishAlbumProjectSnapshot(effectiveProjectId, {
      pageValuesMap: mergedValues,
      instances: mergedInstances,
      images: mergedImages,
    });
  }, [effectiveProjectId, images]);

  useEffect(() => {
    if (!effectiveProjectId || !subscribeSnapshots) return;

    return subscribeAlbumProjectSnapshot(effectiveProjectId, (snapshot) => {
      setPageValuesMap(snapshot.pageValuesMap);
      setInstances(snapshot.instances);
      setImages(snapshot.images);
    });
  }, [effectiveProjectId, subscribeSnapshots]);

  useEffect(() => {
    const pid = effectiveProjectId;
    return () => {
      if (pid) {
        void flushAlbumProjectPersist(pid);
      }
    };
  }, [effectiveProjectId]);

  const updatePageValues = useCallback(
    (instanceId: string, updater: (prev: PageValues) => PageValues) => {
      const instance = instances.find((i) => i.instanceId === instanceId);
      const schema = instance ? getSchemaForInstance(instance, lineGuideId) : undefined;
      const current =
        pageValuesMapRef.current[instanceId] ?? {
          fields: {},
          photoBlocks: {},
          status: 'empty',
          updatedAt: new Date().toISOString(),
        };
      let next = updater(current);
      if (schema) {
        next = refreshPageValuesStatus(schema, next);
      }
      const merged = { ...pageValuesMapRef.current, [instanceId]: next };
      pageValuesMapRef.current = merged;
      setPageValuesMap(merged);
      scheduleSave(images, instances, merged);
      publishSnapshot(merged, instances, images);
    },
    [instances, images, lineGuideId, scheduleSave, publishSnapshot]
  );

  const savePageValuesNow = useCallback(
    async (instanceId: string, values: PageValues) => {
      const instance = instances.find((i) => i.instanceId === instanceId);
      const schema = instance ? getSchemaForInstance(instance, lineGuideId) : undefined;
      const refreshed = schema ? refreshPageValuesStatus(schema, values) : values;
      const merged = { ...pageValuesMap, [instanceId]: refreshed };
      setPageValuesMap(merged);
      publishSnapshot(merged, instances, images);
      if (effectiveProjectId) {
        await flushAlbumProjectPersist(effectiveProjectId);
        await persistAll(effectiveProjectId, images, instances, merged, metaRef.current);
      }
      return refreshed;
    },
    [instances, images, lineGuideId, pageValuesMap, effectiveProjectId, persistAll, publishSnapshot]
  );

  const addPage = useCallback(
    async (params: {
      insertAfterIndex: number;
      sourcePageIndex: number;
      templateLibraryId?: string;
      titleOverride?: string;
    }) => {
      const templatePages = await loadImagesForAlbum(
        meta?.interiorType ?? meta?.albumId ?? lineGuideId,
        meta?.category ?? celebration
      );
      const sourceUri = templatePages[params.sourcePageIndex];
      if (!sourceUri || !effectiveProjectId) return null;

      const sourcePageNumber = params.sourcePageIndex + 1;
      const schemaPageId = params.templateLibraryId
        ? `${lineGuideId}_lib_${params.templateLibraryId}_${Date.now()}`
        : `${lineGuideId}_p${sourcePageNumber}`;

      const result = insertPageAtIndex({
        instances,
        pageValuesMap,
        images,
        insertAfterIndex: params.insertAfterIndex,
        newImageUri: sourceUri,
        schemaPageId,
        sourcePageNumber,
        titleOverride: params.titleOverride,
        lineGuideId,
      });

      setImages(result.images);
      setInstances(result.instances);
      setPageValuesMap(result.pageValuesMap);
      if (effectiveProjectId) {
        publishAlbumProjectSnapshot(effectiveProjectId, {
          pageValuesMap: result.pageValuesMap,
          instances: result.instances,
          images: result.images,
        });
      }
      await persistAll(effectiveProjectId, result.images, result.instances, result.pageValuesMap, meta);
      return result.instances[params.insertAfterIndex + 1]?.instanceId ?? null;
    },
    [
      instances,
      pageValuesMap,
      images,
      effectiveProjectId,
      meta,
      lineGuideId,
      celebration,
      loadImagesForAlbum,
      persistAll,
    ]
  );

  const removePage = useCallback(
    async (instanceId: string) => {
      const pageIndex = instances.findIndex((item) => item.instanceId === instanceId);
      if (pageIndex < 0 || !effectiveProjectId) return false;

      const instance = instances[pageIndex];
      if (!instance.addedByUser) return false;

      const result = removePageAtIndex({
        instances,
        pageValuesMap,
        images,
        pageIndex,
      });
      if (!result) return false;

      setImages(result.images);
      setInstances(result.instances);
      setPageValuesMap(result.pageValuesMap);
      publishAlbumProjectSnapshot(effectiveProjectId, {
        pageValuesMap: result.pageValuesMap,
        instances: result.instances,
        images: result.images,
      });
      await persistAll(
        effectiveProjectId,
        result.images,
        result.instances,
        result.pageValuesMap,
        meta
      );
      return true;
    },
    [instances, pageValuesMap, images, effectiveProjectId, meta, persistAll]
  );

  const duplicatePage = useCallback(
    async (instanceId: string) => {
      const pageIndex = instances.findIndex((item) => item.instanceId === instanceId);
      if (pageIndex < 0 || !effectiveProjectId) return null;

      const result = duplicatePageAtIndex({
        instances,
        pageValuesMap,
        images,
        pageIndex,
        lineGuideId,
      });
      if (!result) return null;

      setImages(result.images);
      setInstances(result.instances);
      setPageValuesMap(result.pageValuesMap);
      publishAlbumProjectSnapshot(effectiveProjectId, {
        pageValuesMap: result.pageValuesMap,
        instances: result.instances,
        images: result.images,
      });
      await persistAll(
        effectiveProjectId,
        result.images,
        result.instances,
        result.pageValuesMap,
        meta
      );
      return result.instances[pageIndex + 1]?.instanceId ?? null;
    },
    [instances, pageValuesMap, images, effectiveProjectId, meta, lineGuideId, persistAll]
  );

  const renamePage = useCallback(
    async (instanceId: string, title: string) => {
      if (!effectiveProjectId) return false;
      const nextInstances = renamePageInstance({ instances, instanceId, titleOverride: title });
      if (!nextInstances) return false;
      setInstances(nextInstances);
      publishAlbumProjectSnapshot(effectiveProjectId, {
        pageValuesMap,
        instances: nextInstances,
        images,
      });
      await persistAll(effectiveProjectId, images, nextInstances, pageValuesMap, meta);
      return true;
    },
    [instances, pageValuesMap, images, effectiveProjectId, meta, persistAll]
  );

  const movePage = useCallback(
    async (instanceId: string, toIndex: number) => {
      const fromIndex = instances.findIndex((item) => item.instanceId === instanceId);
      if (fromIndex < 0 || !effectiveProjectId) return false;
      if (!instances[fromIndex]?.addedByUser) return false;

      const result = movePageAtIndex({
        instances,
        pageValuesMap,
        images,
        fromIndex,
        toIndex,
      });
      if (!result) return false;

      setImages(result.images);
      setInstances(result.instances);
      publishAlbumProjectSnapshot(effectiveProjectId, {
        pageValuesMap: result.pageValuesMap,
        instances: result.instances,
        images: result.images,
      });
      await persistAll(
        effectiveProjectId,
        result.images,
        result.instances,
        result.pageValuesMap,
        meta
      );
      return true;
    },
    [instances, pageValuesMap, images, effectiveProjectId, meta, persistAll]
  );

  const setPageExcluded = useCallback(
    (instanceId: string, excluded: boolean) => {
      updatePageValues(instanceId, (prev) => ({
        ...prev,
        excludedFromExport: excluded,
      }));
    },
    [updatePageValues]
  );

  const markDraftSaved = useCallback(
    (instanceId: string) => {
      updatePageValues(instanceId, (prev) => ({
        ...prev,
        draftSavedAt: new Date().toISOString(),
      }));
    },
    [updatePageValues]
  );

  const getPageAnnotations = useCallback(
    (instanceId: string): Annotation[] => {
      const instance = instances.find((i) => i.instanceId === instanceId);
      if (!instance) return [];
      const schema = getSchemaForInstance(instance, lineGuideId);
      const values = pageValuesMap[instanceId];
      if (!schema || !values) return [];
      return buildAnnotationsForProject({
        instances: [instance],
        pageValuesMap: { [instanceId]: values },
        lineGuideId,
      });
    },
    [instances, pageValuesMap, lineGuideId]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        if (projectId) {
          await migrateProjectToPageValues(projectId);
          const projectRaw = await AsyncStorage.getItem(`@project_${projectId}`);
          if (!projectRaw) {
            setIsLoading(false);
            return;
          }
          const project = JSON.parse(projectRaw) as AlbumProjectMeta;
          if (cancelled) return;
          setMeta(project);
          setEffectiveProjectId(projectId);

          let imageUris: string[] = [];
          const savedImages = await AsyncStorage.getItem(`@project_images_${projectId}`);
          if (savedImages) {
            imageUris = JSON.parse(savedImages);
          } else {
            imageUris = await loadImagesForAlbum(
              project.interiorType ?? project.albumId ?? '',
              project.category
            );
          }
          setImages(imageUris);

          let loadedInstances = await loadPageInstances(
            (k) => AsyncStorage.getItem(k),
            projectId
          );
          let loadedValues = await loadPageValuesMap(
            (k) => AsyncStorage.getItem(k),
            projectId
          );

          const lgId = resolveLineGuideId(project.interiorType ?? project.albumId, project.category);
          if (loadedInstances.length === 0 && imageUris.length > 0) {
            loadedInstances = buildInitialPageInstances(lgId, imageUris.length);
            loadedValues = buildInitialPageValuesMap(loadedInstances);
            await savePageInstances((k, v) => AsyncStorage.setItem(k, v), projectId, loadedInstances);
            await savePageValuesMap((k, v) => AsyncStorage.setItem(k, v), projectId, loadedValues);
          }

          const memorySnapshot = getAlbumProjectSnapshot(projectId);
          const mergedValues = memorySnapshot?.pageValuesMap
            ? { ...loadedValues, ...memorySnapshot.pageValuesMap }
            : loadedValues;
          const mergedInstances =
            memorySnapshot?.instances?.length &&
            memorySnapshot.instances.length >= loadedInstances.length
              ? memorySnapshot.instances
              : loadedInstances;
          const mergedImages =
            memorySnapshot?.images?.length && memorySnapshot.images.length >= imageUris.length
              ? memorySnapshot.images
              : imageUris;

          setInstances(mergedInstances);
          setPageValuesMap(mergedValues);
          setImages(mergedImages);
          publishAlbumProjectSnapshot(projectId, {
            pageValuesMap: mergedValues,
            instances: mergedInstances,
            images: mergedImages,
          });
          setIsLoading(false);
          return;
        }

        if (!celebration) {
          setIsLoading(false);
          return;
        }

        const created = await runDedupedAlbumProjectCreation(
          { celebration, coverType, interiorType, eventDate },
          async () => {
            const albumId = resolveInteriorAlbumId(interiorType ?? coverType, celebration);
            const imageUris = (await loadImagesForAlbum(albumId, celebration)) ?? [];

            const lgId = resolveLineGuideId(albumId, celebration);
            const newInstances = buildInitialPageInstances(lgId, imageUris.length);
            const newValues = buildInitialPageValuesMap(newInstances);

            const createdProjectId = Date.now().toString();
            const albumTemplate = coverType ? getAlbumTemplateById(coverType) : null;
            const projectData: AlbumProjectMeta & {
              createdAt?: string;
              thumbnailPath?: ImageSourcePropType;
              reminderDate?: string;
            } = {
              id: createdProjectId,
              title: albumTemplate?.name ?? getCelebrationTitle(celebration),
              category: celebration,
              albumId,
              interiorType: interiorType ?? albumId,
              coverType: coverType ?? undefined,
              createdAt: new Date().toISOString(),
              isReadyMadeAlbum: true,
              hasPdfTemplate: true,
              pagesCount: imageUris.length,
            };

            const thumb = getCoverThumbnailForProject(coverType, celebration);
            if (thumb) projectData.thumbnailPath = thumb;
            if (eventDate) projectData.reminderDate = eventDate;

            await AsyncStorage.setItem(`@project_${createdProjectId}`, JSON.stringify(projectData));
            await AsyncStorage.setItem(
              `@project_images_${createdProjectId}`,
              JSON.stringify(imageUris),
            );
            await savePageInstances(
              (k, v) => AsyncStorage.setItem(k, v),
              createdProjectId,
              newInstances,
            );
            await savePageValuesMap(
              (k, v) => AsyncStorage.setItem(k, v),
              createdProjectId,
              newValues,
            );
            await AsyncStorage.setItem(`@project_annotations_${createdProjectId}`, JSON.stringify([]));

            const existingProjects = await AsyncStorage.getItem('@user_projects');
            const projects = existingProjects ? JSON.parse(existingProjects) : [];
            if (!projects.some((entry: { id?: string }) => entry?.id === createdProjectId)) {
              projects.push(projectData);
              await AsyncStorage.setItem('@user_projects', JSON.stringify(projects));
            }

            void pushAccountDataToCloud({ forceIncludeProjectIds: [createdProjectId] }).catch(
              () => {},
            );
            scheduleSyncToCloud();

            if (eventDate && celebration) {
              void linkNewProjectToEventReminders(createdProjectId, celebration, eventDate).catch(
                () => {},
              );
            }

            return {
              projectId: createdProjectId,
              meta: projectData,
              images: imageUris,
              instances: newInstances,
              pageValuesMap: newValues,
            };
          },
        );

        if (cancelled) return;

        setImages(created.images);
        setInstances(created.instances);
        setPageValuesMap(created.pageValuesMap);
        setMeta(created.meta);
        setEffectiveProjectId(created.projectId);
        publishAlbumProjectSnapshot(created.projectId, {
          pageValuesMap: created.pageValuesMap,
          instances: created.instances,
          images: created.images,
        });

        router.setParams({
          id: created.projectId,
          celebration,
          coverType,
          interiorType,
          ...(eventDate
            ? { eventDate: formatRouteEventDate(new Date(eventDate)) }
            : null),
        } as unknown as Href);
      } catch (error) {
        console.warn('[useAlbumProject] load error', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [projectId, celebration, coverType, interiorType, eventDate, loadImagesForAlbum]);

  return {
    projectId: effectiveProjectId,
    meta,
    images,
    instances,
    pageValuesMap,
    lineGuideId,
    isLoading,
    isSaving,
    updatePageValues,
    savePageValuesNow,
    addPage,
    removePage,
    duplicatePage,
    renamePage,
    movePage,
    setPageExcluded,
    markDraftSaved,
    getPageAnnotations,
    getInstanceTitle: (instance: PageInstance) => getInstanceTitle(instance, lineGuideId),
    getSchemaForInstance: (instance: PageInstance) => getSchemaForInstance(instance, lineGuideId),
    reloadProjectData,
    persistAll,
    setInstances,
    setImages,
    setPageValuesMap,
  };
}
