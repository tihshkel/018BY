import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, type ImageSourcePropType } from 'react-native';

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
import { migrateBirthdayPageValuesMap } from '@/utils/migrateBirthdayPageValues';
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
  createEmptyPageValues,
  loadPageInstances,
  loadPageValuesMap,
  loadPageValuesMapMerged,
  savePageInstances,
  savePageValueEntry,
  savePageValuesMap,
} from '@/utils/pageStorage';
import { projectUiPageValuesMap } from '@/utils/pageValuesMemory';
import { refreshPageValuesStatus } from '@/utils/pageStatus';
import { sanitizePageValuesMapPhotos } from '@/utils/persistAlbumPhoto';
import {
  canonicalizeProjectPageImages,
  prefetchRemotePhotoUris,
} from '@/utils/crossDeviceMedia';
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
import { scheduleDeferredAlbumCloudSync, addProjectToSyncedList } from '@/utils/account-sync';
import { runDedupedAlbumProjectCreation } from '@/utils/albumProjectCreationLock';
import { getDiaryInteriorImageUris } from '@/utils/diaryInteriors';

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
  /** Form/preview/photos: в React — полная только эта страница, остальные stubs. */
  activeInstanceId?: string;
};

function getCelebrationTitle(celebration: string): string {
  const titles: Record<string, string> = {
    pregnancy: 'Дневник беременности',
    kids: 'Детский фотоальбом',
    family: 'Семейный альбом',
    wedding: 'Свадебный альбом',
    holidays: 'Праздничный альбом',
    diary: 'Дневник',
  };
  return titles[celebration] ?? 'Мой альбом';
}

export function useAlbumProject(params: UseAlbumProjectParams) {
  const { projectId, celebration, coverType, interiorType, eventDate, activeInstanceId } = params;

  const [effectiveProjectId, setEffectiveProjectId] = useState(projectId ?? '');
  const [meta, setMeta] = useState<AlbumProjectMeta | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [instances, setInstances] = useState<PageInstance[]>([]);
  /** UI-проекция: stubs на списке / одна полная страница на form. Полный map — в latestStateRef + snapshot. */
  const [pageValuesMap, setPageValuesMapState] = useState<Record<string, PageValues>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const activeInstanceIdRef = useRef(activeInstanceId);
  activeInstanceIdRef.current = activeInstanceId;
  const latestStateRef = useRef({ images, instances, pageValuesMap: {} as Record<string, PageValues> });
  // images/instances зеркалим; pageValuesMap в ref всегда полный (не UI-stubs).
  latestStateRef.current = {
    images,
    instances,
    pageValuesMap: latestStateRef.current.pageValuesMap,
  };

  const uiPageValuesMapRef = useRef<Record<string, PageValues>>({});

  const commitFullPageValuesMap = useCallback((full: Record<string, PageValues>) => {
    latestStateRef.current = {
      ...latestStateRef.current,
      pageValuesMap: full,
    };
    const nextUi = projectUiPageValuesMap(
      full,
      activeInstanceIdRef.current,
      uiPageValuesMapRef.current,
    );
    uiPageValuesMapRef.current = nextUi;
    setPageValuesMapState(nextUi);
  }, []);

  /** Только RAM — без setState (для плавного «Просмотр страницы»). */
  const applyFullPageValuesMapMemory = useCallback((full: Record<string, PageValues>) => {
    latestStateRef.current = {
      ...latestStateRef.current,
      pageValuesMap: full,
    };
  }, []);

  useEffect(() => {
    const full = latestStateRef.current.pageValuesMap;
    if (Object.keys(full).length === 0) return;
    const nextUi = projectUiPageValuesMap(
      full,
      activeInstanceId,
      uiPageValuesMapRef.current,
    );
    uiPageValuesMapRef.current = nextUi;
    setPageValuesMapState(nextUi);
  }, [activeInstanceId]);

  const lineGuideId = useMemo(
    () =>
      resolveLineGuideId(
        meta?.interiorType ?? meta?.albumId ?? interiorType,
        meta?.category ?? celebration,
      ),
    [meta, celebration, interiorType],
  );

  const loadImagesForAlbum = useCallback(async (albumId: string, category?: string): Promise<string[]> => {
    // Brown/purple interiors — всегда по явному id (не путать с cover / category only).
    if (albumId.startsWith('diary_interior_')) {
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

  const normalizeBlankImageUris = useCallback(
    async (albumId: string, category: string | undefined, imageUris: string[]): Promise<string[]> => {
      const lineGuide = resolveLineGuideId(albumId, category);
      if (!isBlankInteriorAlbum(lineGuide, category)) {
        return imageUris;
      }

      const blankUri = await getBlankInteriorPageUri(lineGuide);
      if (!blankUri) {
        return imageUris;
      }

      const count = imageUris.length > 0 ? imageUris.length : getAlbumPageCount(lineGuide);
      return Array(count).fill(blankUri);
    },
    [],
  );

  const persistAll = useCallback(
    async (
      pid: string,
      nextImages: string[],
      nextInstances: PageInstance[],
      nextValues: Record<string, PageValues>,
      nextMeta?: AlbumProjectMeta | null,
      options?: { changedInstanceId?: string; flushFullMap?: boolean },
    ) => {
      setIsSaving(true);
      try {
        // Не cancel payload здесь: параллельный schedule во время записи должен дожить до re-flush.
        const setItem = (k: string, v: string) => AsyncStorage.setItem(k, v);
        const incrementalOnly =
          options?.changedInstanceId &&
          !options.flushFullMap &&
          nextValues[options.changedInstanceId];

        if (incrementalOnly && options.changedInstanceId) {
          await savePageValueEntry(
            setItem,
            pid,
            options.changedInstanceId,
            nextValues[options.changedInstanceId],
          );
        } else {
          await savePageInstances(setItem, pid, nextInstances);
          await savePageValuesMap(setItem, pid, nextValues);
          await AsyncStorage.setItem(`@project_images_${pid}`, JSON.stringify(nextImages));
        }

        if (nextMeta && !incrementalOnly) {
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
        scheduleDeferredAlbumCloudSync();
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const scheduleSave = useCallback(
    (
      nextImages: string[],
      nextInstances: PageInstance[],
      nextValues: Record<string, PageValues>,
      changedInstanceId?: string,
    ) => {
      if (!effectiveProjectId) return;
      scheduleAlbumProjectPersist(
        effectiveProjectId,
        {
          images: nextImages,
          instances: nextInstances,
          pageValuesMap: nextValues,
          meta: metaRef.current,
          changedInstanceId,
        },
        async (payload) => {
          await persistAll(
            effectiveProjectId,
            payload.images,
            payload.instances,
            payload.pageValuesMap,
            payload.meta,
            {
              changedInstanceId: payload.changedInstanceId,
              flushFullMap: false,
            },
          );
        }
      );
    },
    [effectiveProjectId, persistAll]
  );

  const skipSnapshotEchoRef = useRef(false);
  const snapshotPublishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistAfterUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPersistInstanceIdRef = useRef<string | null>(null);

  const publishSnapshot = useCallback(
    (
      nextValues: Record<string, PageValues>,
      nextInstances?: PageInstance[],
      nextImages?: string[],
      options?: { notify?: boolean },
    ) => {
      if (!effectiveProjectId) return;
      const latest = latestStateRef.current;
      const notify = options?.notify !== false;
      if (notify) {
        skipSnapshotEchoRef.current = true;
      }
      patchAlbumProjectSnapshot(
        effectiveProjectId,
        {
          pageValuesMap: nextValues,
          instances: nextInstances ?? latest.instances,
          images: nextImages ?? latest.images,
        },
        { notify },
      );
      if (notify) {
        skipSnapshotEchoRef.current = false;
      }
    },
    [effectiveProjectId],
  );

  const scheduleSnapshotPublish = useCallback(() => {
    if (!effectiveProjectId) return;
    if (snapshotPublishTimerRef.current) {
      clearTimeout(snapshotPublishTimerRef.current);
    }
    snapshotPublishTimerRef.current = setTimeout(() => {
      snapshotPublishTimerRef.current = null;
      const latest = latestStateRef.current;
      publishSnapshot(latest.pageValuesMap, latest.instances, latest.images);
    }, 250);
  }, [effectiveProjectId, publishSnapshot]);

  const schedulePersistAfterUpdate = useCallback(
    (instanceId: string) => {
      pendingPersistInstanceIdRef.current = instanceId;
      if (persistAfterUpdateTimerRef.current) {
        clearTimeout(persistAfterUpdateTimerRef.current);
      }
      // После батча React-апдейтеров latestStateRef уже финальный — не теряем 2-й патч.
      persistAfterUpdateTimerRef.current = setTimeout(() => {
        persistAfterUpdateTimerRef.current = null;
        const changedId = pendingPersistInstanceIdRef.current;
        pendingPersistInstanceIdRef.current = null;
        const latest = latestStateRef.current;
        scheduleSave(latest.images, latest.instances, latest.pageValuesMap, changedId ?? undefined);
        scheduleSnapshotPublish();
      }, 0);
    },
    [scheduleSave, scheduleSnapshotPublish],
  );

  const reloadProjectData = useCallback(async () => {
    if (!effectiveProjectId) return;

    await flushAlbumProjectPersist(effectiveProjectId);

    const memorySnapshot = getAlbumProjectSnapshot(effectiveProjectId);

    const [loadedInstances, savedImagesRaw] = await Promise.all([
      loadPageInstances((k) => AsyncStorage.getItem(k), effectiveProjectId),
      AsyncStorage.getItem(`@project_images_${effectiveProjectId}`),
    ]);
    const instanceIdsForMerge =
      (memorySnapshot?.instances?.length ? memorySnapshot.instances : loadedInstances).map(
        (item) => item.instanceId,
      );
    const loadedValues = await loadPageValuesMapMerged(
      (k) => AsyncStorage.getItem(k),
      effectiveProjectId,
      instanceIdsForMerge,
    );

    const diskImages = savedImagesRaw ? (JSON.parse(savedImagesRaw) as string[]) : [];
    const mergedInstances =
      memorySnapshot?.instances?.length && memorySnapshot.instances.length >= loadedInstances.length
        ? memorySnapshot.instances
        : loadedInstances;
    const mergedValues = memorySnapshot?.pageValuesMap
      ? { ...loadedValues, ...memorySnapshot.pageValuesMap }
      : loadedValues;
    const mergedImages =
      memorySnapshot?.images?.length && memorySnapshot.images.length >= diskImages.length
        ? memorySnapshot.images
        : diskImages.length > 0
          ? diskImages
          : images;
    const birthdayMigrated = migrateBirthdayPageValuesMap(
      mergedInstances,
      mergedValues,
      lineGuideId,
    );
    const valuesAfterBirthdayMigration = birthdayMigrated.pageValuesMap;
    setInstances(mergedInstances);
    commitFullPageValuesMap(valuesAfterBirthdayMigration);
    if (mergedImages.length > 0) {
      setImages(mergedImages);
    }
    publishAlbumProjectSnapshot(effectiveProjectId, {
      pageValuesMap: valuesAfterBirthdayMigration,
      instances: mergedInstances,
      images: mergedImages,
    });
  }, [effectiveProjectId, images, commitFullPageValuesMap]);

  useEffect(() => {
    if (!effectiveProjectId) return;

    return subscribeAlbumProjectSnapshot(effectiveProjectId, (snapshot) => {
      if (skipSnapshotEchoRef.current) return;
      latestStateRef.current = {
        pageValuesMap: snapshot.pageValuesMap,
        instances: snapshot.instances,
        images: snapshot.images,
      };
      const nextUi = projectUiPageValuesMap(
        snapshot.pageValuesMap,
        activeInstanceIdRef.current,
        uiPageValuesMapRef.current,
      );
      uiPageValuesMapRef.current = nextUi;
      setPageValuesMapState(nextUi);
      setInstances(snapshot.instances);
      setImages(snapshot.images);
    });
  }, [effectiveProjectId]);

  useEffect(() => {
    const pid = effectiveProjectId;
    return () => {
      // Таймеры 0ms/250ms: при unmount в том же тике, что edit, иначе теряем диск и RAM-snapshot.
      if (persistAfterUpdateTimerRef.current) {
        clearTimeout(persistAfterUpdateTimerRef.current);
        persistAfterUpdateTimerRef.current = null;
        const changedId = pendingPersistInstanceIdRef.current;
        pendingPersistInstanceIdRef.current = null;
        if (pid) {
          const latest = latestStateRef.current;
          scheduleSave(
            latest.images,
            latest.instances,
            latest.pageValuesMap,
            changedId ?? undefined,
          );
        }
      }
      if (snapshotPublishTimerRef.current) {
        clearTimeout(snapshotPublishTimerRef.current);
        snapshotPublishTimerRef.current = null;
        if (pid) {
          const latest = latestStateRef.current;
          publishSnapshot(latest.pageValuesMap, latest.instances, latest.images);
        }
      }
      if (pid) {
        void flushAlbumProjectPersist(pid);
      }
    };
  }, [effectiveProjectId, scheduleSave, publishSnapshot]);

  const updatePageValues = useCallback(
    (instanceId: string, updater: (prev: PageValues) => PageValues) => {
      const full = latestStateRef.current.pageValuesMap;
      const current =
        full[instanceId] ??
        ({
          fields: {},
          photoBlocks: {},
          status: 'empty',
          updatedAt: new Date().toISOString(),
        } satisfies PageValues);
      const next = {
        ...updater(current),
        updatedAt: new Date().toISOString(),
      };
      commitFullPageValuesMap({ ...full, [instanceId]: next });
      schedulePersistAfterUpdate(instanceId);
    },
    [schedulePersistAfterUpdate, commitFullPageValuesMap],
  );

  const savePageValuesNow = useCallback(
    async (
      instanceId: string,
      values: PageValues,
      options?: { awaitPersist?: boolean },
    ) => {
      const awaitPersist = options?.awaitPersist !== false;
      const latestBefore = latestStateRef.current;
      const instance =
        latestBefore.instances.find((i) => i.instanceId === instanceId) ??
        instances.find((i) => i.instanceId === instanceId);
      const schema = instance ? getSchemaForInstance(instance, lineGuideId) : undefined;
      const refreshed = schema ? refreshPageValuesStatus(schema, values) : values;

      const merged = {
        ...latestBefore.pageValuesMap,
        [instanceId]: refreshed,
      };

      if (effectiveProjectId) {
        // Инкрементально: только эта страница — full map stringify блокировал JS на 60 стр. с фото
        const persistWork = async () => {
          await flushAlbumProjectPersist(effectiveProjectId);
          await persistAll(
            effectiveProjectId,
            latestStateRef.current.images,
            latestStateRef.current.instances,
            latestStateRef.current.pageValuesMap,
            metaRef.current,
            {
              changedInstanceId: instanceId,
              flushFullMap: false,
            },
          );
        };
        // «Просмотр страницы»: RAM + quiet snapshot сразу; UI setState и notify — после кадра,
        // чтобы не подвешивать JS перерисовкой списка/формы перед router.push.
        if (!awaitPersist) {
          applyFullPageValuesMapMemory(merged);
          publishSnapshot(
            merged,
            latestStateRef.current.instances,
            latestStateRef.current.images,
            { notify: false },
          );
          requestAnimationFrame(() => {
            commitFullPageValuesMap(latestStateRef.current.pageValuesMap);
          });
          // Android: диск позже — иначе AsyncStorage/JSON конкурирует с decode preview.
          // iOS справляется с более ранним persist без заметного jank.
          const persistDelayMs = Platform.OS === 'android' ? 420 : 64;
          setTimeout(() => {
            void persistWork();
          }, persistDelayMs);
          return refreshed;
        }

        commitFullPageValuesMap(merged);
        publishSnapshot(merged, latestStateRef.current.instances, latestStateRef.current.images);
        await persistWork();
        return refreshed;
      }

      commitFullPageValuesMap(merged);
      return refreshed;
    },
    [
      instances,
      lineGuideId,
      effectiveProjectId,
      persistAll,
      publishSnapshot,
      commitFullPageValuesMap,
      applyFullPageValuesMapMemory,
    ],
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

      const fullValues = latestStateRef.current.pageValuesMap;
      const result = insertPageAtIndex({
        instances,
        pageValuesMap: fullValues,
        images,
        insertAfterIndex: params.insertAfterIndex,
        newImageUri: sourceUri,
        schemaPageId,
        sourcePageNumber,
        titleOverride: params.titleOverride,
        templateLibraryId: params.templateLibraryId,
        lineGuideId,
      });

      setImages(result.images);
      setInstances(result.instances);
      commitFullPageValuesMap(result.pageValuesMap);
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
      images,
      effectiveProjectId,
      meta,
      lineGuideId,
      celebration,
      loadImagesForAlbum,
      persistAll,
      commitFullPageValuesMap,
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
        pageValuesMap: latestStateRef.current.pageValuesMap,
        images,
        pageIndex,
      });
      if (!result) return false;

      setImages(result.images);
      setInstances(result.instances);
      commitFullPageValuesMap(result.pageValuesMap);
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
    [instances, images, effectiveProjectId, meta, persistAll, commitFullPageValuesMap]
  );

  const duplicatePage = useCallback(
    async (instanceId: string) => {
      const pageIndex = instances.findIndex((item) => item.instanceId === instanceId);
      if (pageIndex < 0 || !effectiveProjectId) return null;

      const result = duplicatePageAtIndex({
        instances,
        pageValuesMap: latestStateRef.current.pageValuesMap,
        images,
        pageIndex,
        lineGuideId,
      });
      if (!result) return null;

      setImages(result.images);
      setInstances(result.instances);
      commitFullPageValuesMap(result.pageValuesMap);
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
    [instances, images, effectiveProjectId, meta, lineGuideId, persistAll, commitFullPageValuesMap]
  );

  const renamePage = useCallback(
    async (instanceId: string, title: string) => {
      if (!effectiveProjectId) return false;
      const nextInstances = renamePageInstance({ instances, instanceId, titleOverride: title });
      if (!nextInstances) return false;
      const fullValues = latestStateRef.current.pageValuesMap;
      setInstances(nextInstances);
      publishAlbumProjectSnapshot(effectiveProjectId, {
        pageValuesMap: fullValues,
        instances: nextInstances,
        images,
      });
      await persistAll(effectiveProjectId, images, nextInstances, fullValues, meta);
      return true;
    },
    [instances, images, effectiveProjectId, meta, persistAll]
  );

  const changePageTemplate = useCallback(
    async (instanceId: string, templateLibraryId: string, title: string) => {
      if (!effectiveProjectId) return false;
      const index = instances.findIndex((item) => item.instanceId === instanceId);
      const instance = instances[index];
      if (!instance) return false;

      const schemaPageId = `${lineGuideId}_lib_${templateLibraryId}_${Date.now()}`;
      const nextInstances = [...instances];
      nextInstances[index] = {
        ...instance,
        schemaPageId,
        templateLibraryId,
        titleOverride: title,
      };
      const nextPageValuesMap = {
        ...latestStateRef.current.pageValuesMap,
        [instanceId]: createEmptyPageValues(),
      };

      setInstances(nextInstances);
      commitFullPageValuesMap(nextPageValuesMap);
      publishAlbumProjectSnapshot(effectiveProjectId, {
        pageValuesMap: nextPageValuesMap,
        instances: nextInstances,
        images,
      });
      await persistAll(effectiveProjectId, images, nextInstances, nextPageValuesMap, meta);
      return true;
    },
    [instances, images, effectiveProjectId, meta, lineGuideId, persistAll, commitFullPageValuesMap]
  );

  const movePage = useCallback(
    async (instanceId: string, toIndex: number) => {
      const fromIndex = instances.findIndex((item) => item.instanceId === instanceId);
      if (fromIndex < 0 || !effectiveProjectId) return false;
      if (!instances[fromIndex]?.addedByUser) return false;

      const result = movePageAtIndex({
        instances,
        pageValuesMap: latestStateRef.current.pageValuesMap,
        images,
        fromIndex,
        toIndex,
      });
      if (!result) return false;

      setImages(result.images);
      setInstances(result.instances);
      commitFullPageValuesMap(result.pageValuesMap);
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
    [instances, images, effectiveProjectId, meta, persistAll, commitFullPageValuesMap]
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
      const values =
        latestStateRef.current.pageValuesMap[instanceId] ?? pageValuesMap[instanceId];
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
          const memorySnapshot = getAlbumProjectSnapshot(projectId);
          if (
            memorySnapshot?.instances.length &&
            memorySnapshot.images.length &&
            Object.keys(memorySnapshot.pageValuesMap).length > 0
          ) {
            setEffectiveProjectId(projectId);
            setInstances(memorySnapshot.instances);
            setImages(memorySnapshot.images);
            latestStateRef.current = {
              images: memorySnapshot.images,
              instances: memorySnapshot.instances,
              pageValuesMap: memorySnapshot.pageValuesMap,
            };
            {
              const nextUi = projectUiPageValuesMap(
                memorySnapshot.pageValuesMap,
                activeInstanceIdRef.current,
              );
              uiPageValuesMapRef.current = nextUi;
              setPageValuesMapState(nextUi);
            }

            // Meta нужна сразу для lineGuideId → аннотаций превью. Без неё повторный вход
            // показывал форму с данными, а preview — пустые слоты (Android race).
            let nextMeta: AlbumProjectMeta | null = memorySnapshot.meta ?? null;
            if (!nextMeta) {
              const projectRaw = await AsyncStorage.getItem(`@project_${projectId}`);
              if (cancelled) return;
              if (projectRaw) {
                try {
                  nextMeta = JSON.parse(projectRaw) as AlbumProjectMeta;
                } catch {
                  nextMeta = null;
                }
              }
            }
            if (!nextMeta && (interiorType || celebration)) {
              nextMeta = {
                id: projectId,
                title: '',
                interiorType,
                albumId: interiorType,
                category: celebration,
                coverType,
              };
            }
            if (nextMeta) {
              setMeta(nextMeta);
              publishAlbumProjectSnapshot(projectId, {
                pageValuesMap: memorySnapshot.pageValuesMap,
                instances: memorySnapshot.instances,
                images: memorySnapshot.images,
                meta: nextMeta,
              });
            }

            const resolvedGuide = resolveLineGuideId(
              nextMeta?.interiorType ?? nextMeta?.albumId ?? interiorType,
              nextMeta?.category ?? celebration,
            );
            // Не отдаём UI без lineGuideId — иначе preview пустой до 2–5 захода.
            if (!resolvedGuide) {
              // fall through to full disk load
            } else {
              setIsLoading(false);
              return;
            }
          }

          await migrateProjectToPageValues(projectId);
          const [projectRaw, savedImages, loadedInstances] = await Promise.all([
            AsyncStorage.getItem(`@project_${projectId}`),
            AsyncStorage.getItem(`@project_images_${projectId}`),
            loadPageInstances((k) => AsyncStorage.getItem(k), projectId),
          ]);
          const loadedValues = await loadPageValuesMapMerged(
            (k) => AsyncStorage.getItem(k),
            projectId,
            loadedInstances.map((item) => item.instanceId),
          );
          if (!projectRaw) {
            if (!memorySnapshot?.instances.length) {
              setIsLoading(false);
            }
            return;
          }
          const project = JSON.parse(projectRaw) as AlbumProjectMeta;
          if (cancelled) return;
          setMeta(project);
          setEffectiveProjectId(projectId);

          const albumKey = project.interiorType ?? project.albumId ?? '';
          const lineGuideForImages = resolveLineGuideId(albumKey, project.category);
          let imageUris: string[] = [];
          // Дневники: всегда из бандла (ASCII require). Старые @project_images_ с Unicode-путями
          // на Android схлопываются в один ассет → «фиолетовый вместо коричневого» / пустые стр.
          if (lineGuideForImages.startsWith('diary_interior_')) {
            imageUris = await loadImagesForAlbum(lineGuideForImages, project.category);
            void AsyncStorage.setItem(`@project_images_${projectId}`, JSON.stringify(imageUris));
          } else if (savedImages) {
            imageUris = await normalizeBlankImageUris(
              albumKey,
              project.category,
              JSON.parse(savedImages),
            );
            const canonicalPages = await canonicalizeProjectPageImages({
              albumId: albumKey,
              category: project.category,
              imageUris,
            });
            if (canonicalPages.changed) {
              imageUris = canonicalPages.uris;
            }
            void AsyncStorage.setItem(`@project_images_${projectId}`, JSON.stringify(imageUris));
          } else {
            imageUris = await loadImagesForAlbum(albumKey, project.category);
          }
          setImages(imageUris);

          let nextInstances = loadedInstances;
          let nextValues = loadedValues;

          const lgId = resolveLineGuideId(project.interiorType ?? project.albumId, project.category);
          if (nextInstances.length === 0 && imageUris.length > 0) {
            nextInstances = buildInitialPageInstances(lgId, imageUris.length);
            nextValues = buildInitialPageValuesMap(nextInstances);
            await savePageInstances((k, v) => AsyncStorage.setItem(k, v), projectId, nextInstances);
            await savePageValuesMap((k, v) => AsyncStorage.setItem(k, v), projectId, nextValues);
          }

          const memorySnapshotAfterLoad = getAlbumProjectSnapshot(projectId);
          const mergedValues = memorySnapshotAfterLoad?.pageValuesMap
            ? { ...nextValues, ...memorySnapshotAfterLoad.pageValuesMap }
            : nextValues;
          const mergedInstances =
            memorySnapshotAfterLoad?.instances?.length &&
            memorySnapshotAfterLoad.instances.length >= nextInstances.length
              ? memorySnapshotAfterLoad.instances
              : nextInstances;
          let mergedImages =
            memorySnapshotAfterLoad?.images?.length &&
            memorySnapshotAfterLoad.images.length >= imageUris.length &&
            !lgId.startsWith('diary_interior_')
              ? memorySnapshotAfterLoad.images
              : imageUris;

          {
            const albumKey = project.interiorType ?? project.albumId ?? '';
            const canonicalMerged = await canonicalizeProjectPageImages({
              albumId: albumKey,
              category: project.category,
              imageUris: mergedImages,
            });
            if (canonicalMerged.changed) {
              mergedImages = canonicalMerged.uris;
              void AsyncStorage.setItem(
                `@project_images_${projectId}`,
                JSON.stringify(mergedImages),
              );
            }
          }

          let finalValues = mergedValues;
          const birthdayMigrated = migrateBirthdayPageValuesMap(
            mergedInstances,
            finalValues,
            lgId,
          );
          if (birthdayMigrated.changed) {
            finalValues = birthdayMigrated.pageValuesMap;
            for (const instance of mergedInstances) {
              const schema = getSchemaForInstance(instance, lgId);
              const current = finalValues[instance.instanceId];
              if (schema && current) {
                finalValues[instance.instanceId] = refreshPageValuesStatus(schema, current);
              }
            }
            await savePageValuesMap(
              (k, v) => AsyncStorage.setItem(k, v),
              projectId,
              finalValues,
            );
          }

          const sanitizedPhotos = await sanitizePageValuesMapPhotos(projectId, finalValues);
          if (sanitizedPhotos.changed) {
            finalValues = { ...sanitizedPhotos.pageValuesMap };
            for (const instance of mergedInstances) {
              const schema = getSchemaForInstance(instance, lgId);
              const current = finalValues[instance.instanceId];
              if (schema && current) {
                finalValues[instance.instanceId] = refreshPageValuesStatus(schema, current);
              }
            }
            await savePageValuesMap(
              (k, v) => AsyncStorage.setItem(k, v),
              projectId,
              finalValues,
            );
          }

          // После логина на другом устройстве HTTPS-фото уже в page_values — прогреем кэш.
          {
            const remotePhotoUris: string[] = [];
            for (const values of Object.values(finalValues)) {
              for (const block of Object.values(values.photoBlocks ?? {})) {
                for (const slot of block?.slots ?? []) {
                  if (typeof slot === 'string') remotePhotoUris.push(slot);
                }
              }
              for (const el of values.freeElements ?? []) {
                if (el.type === 'image' && typeof el.content === 'string') {
                  remotePhotoUris.push(el.content);
                }
              }
            }
            void prefetchRemotePhotoUris([...mergedImages, ...remotePhotoUris]);
          }

          setInstances(mergedInstances);
          setImages(mergedImages);
          latestStateRef.current = {
            images: mergedImages,
            instances: mergedInstances,
            pageValuesMap: finalValues,
          };
          {
            const nextUi = projectUiPageValuesMap(
              finalValues,
              activeInstanceIdRef.current,
            );
            uiPageValuesMapRef.current = nextUi;
            setPageValuesMapState(nextUi);
          }
          publishAlbumProjectSnapshot(projectId, {
            pageValuesMap: finalValues,
            instances: mergedInstances,
            images: mergedImages,
            meta: project,
          });
          setIsLoading(false);
          return;
        }

        if (!celebration) {
          setIsLoading(false);
          return;
        }

        const newProjectId = await runDedupedAlbumProjectCreation(
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

            await addProjectToSyncedList(createdProjectId);
            scheduleDeferredAlbumCloudSync();

            if (eventDate && celebration) {
              try {
                await linkNewProjectToEventReminders(createdProjectId, celebration, eventDate);
              } catch {
                /* ignore */
              }
            }

            return createdProjectId;
          },
        );

        if (cancelled) return;

        const albumId = resolveInteriorAlbumId(interiorType ?? coverType, celebration);
        const [projectRaw, imageUrisRaw, loadedInstancesRaw, loadedValuesRaw] = await Promise.all([
          AsyncStorage.getItem(`@project_${newProjectId}`),
          AsyncStorage.getItem(`@project_images_${newProjectId}`),
          loadPageInstances((k) => AsyncStorage.getItem(k), newProjectId),
          loadPageValuesMap((k) => AsyncStorage.getItem(k), newProjectId),
        ]);

        const lgIdForNew = resolveLineGuideId(albumId, celebration);
        const imageUris =
          lgIdForNew.startsWith('diary_interior_')
            ? (await loadImagesForAlbum(lgIdForNew, celebration)) ?? []
            : imageUrisRaw
              ? await normalizeBlankImageUris(
                  interiorType ?? albumId,
                  celebration,
                  JSON.parse(imageUrisRaw) as string[],
                )
              : (await loadImagesForAlbum(albumId, celebration)) ?? [];

        await AsyncStorage.setItem(`@project_images_${newProjectId}`, JSON.stringify(imageUris));

        const lgId = lgIdForNew;
        const loadedInstances =
          loadedInstancesRaw.length > 0
            ? loadedInstancesRaw
            : buildInitialPageInstances(lgId, imageUris.length);
        const loadedValues =
          Object.keys(loadedValuesRaw).length > 0
            ? loadedValuesRaw
            : buildInitialPageValuesMap(loadedInstances);

        const projectData = projectRaw
          ? (JSON.parse(projectRaw) as AlbumProjectMeta)
          : null;

        setImages(imageUris);
        setInstances(loadedInstances);
        latestStateRef.current = {
          images: imageUris,
          instances: loadedInstances,
          pageValuesMap: loadedValues,
        };
        {
          const nextUi = projectUiPageValuesMap(
            loadedValues,
            activeInstanceIdRef.current,
          );
          uiPageValuesMapRef.current = nextUi;
          setPageValuesMapState(nextUi);
        }
        setMeta(projectData);
        setEffectiveProjectId(newProjectId);
        publishAlbumProjectSnapshot(newProjectId, {
          pageValuesMap: loadedValues,
          instances: loadedInstances,
          images: imageUris,
          meta: projectData,
        });

        setIsLoading(false);

        router.replace({
          pathname: '/album-intro',
          params: {
            id: newProjectId,
            celebration,
            coverType,
            interiorType,
            eventDate,
          },
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
  }, [projectId, celebration, coverType, interiorType, eventDate, loadImagesForAlbum, normalizeBlankImageUris]);

  const getInstanceTitleForProject = useCallback(
    (instance: PageInstance) => getInstanceTitle(instance, lineGuideId),
    [lineGuideId],
  );

  const getSchemaForInstanceBound = useCallback(
    (instance: PageInstance) => getSchemaForInstance(instance, lineGuideId),
    [lineGuideId],
  );

  const setPageValuesMap = useCallback(
    (
      next:
        | Record<string, PageValues>
        | ((prev: Record<string, PageValues>) => Record<string, PageValues>),
    ) => {
      const fullPrev = latestStateRef.current.pageValuesMap;
      const fullNext = typeof next === 'function' ? next(fullPrev) : next;
      commitFullPageValuesMap(fullNext);
      if (effectiveProjectId) {
        publishAlbumProjectSnapshot(effectiveProjectId, {
          pageValuesMap: fullNext,
          instances: latestStateRef.current.instances,
          images: latestStateRef.current.images,
        });
      }
    },
    [commitFullPageValuesMap, effectiveProjectId],
  );

  return useMemo(
    () => ({
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
      changePageTemplate,
      movePage,
      setPageExcluded,
      markDraftSaved,
      getPageAnnotations,
      getInstanceTitle: getInstanceTitleForProject,
      getSchemaForInstance: getSchemaForInstanceBound,
      reloadProjectData,
      persistAll,
      setInstances,
      setImages,
      setPageValuesMap,
    }),
    [
      effectiveProjectId,
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
      changePageTemplate,
      movePage,
      setPageExcluded,
      markDraftSaved,
      getPageAnnotations,
      getInstanceTitleForProject,
      getSchemaForInstanceBound,
      reloadProjectData,
      persistAll,
      setInstances,
      setImages,
      setPageValuesMap,
    ],
  );
}
