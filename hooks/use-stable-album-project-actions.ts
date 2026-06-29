import { useCallback, useRef } from 'react';

import type { useAlbumProject } from '@/hooks/use-album-project';
import type { PageValues } from '@/types/album-page-schema';

type AlbumProject = ReturnType<typeof useAlbumProject>;

/** Стабильные ссылки на методы project — колбэки формы не пересоздаются при каждом keystroke. */
export function useStableAlbumProjectActions(project: AlbumProject) {
  const updatePageValuesRef = useRef(project.updatePageValues);
  updatePageValuesRef.current = project.updatePageValues;

  const savePageValuesNowRef = useRef(project.savePageValuesNow);
  savePageValuesNowRef.current = project.savePageValuesNow;

  const commitFields = useCallback((instanceId: string, fields: Record<string, string>) => {
    updatePageValuesRef.current(instanceId, (prev) => ({
      ...prev,
      fields,
    }));
  }, []);

  const commitCaption = useCallback((instanceId: string, caption: string) => {
    updatePageValuesRef.current(instanceId, (prev) => ({
      ...prev,
      caption,
    }));
  }, []);

  const commitPhotoCaptions = useCallback((instanceId: string, photoCaptions: (string | null)[]) => {
    updatePageValuesRef.current(instanceId, (prev) => ({
      ...prev,
      photoCaptions,
    }));
  }, []);

  const commitPagePatch = useCallback(
    (instanceId: string, updater: (prev: PageValues) => PageValues) => {
      updatePageValuesRef.current(instanceId, updater);
    },
    [],
  );

  const saveNow = useCallback(
    (instanceId: string, values: PageValues) =>
      savePageValuesNowRef.current(instanceId, values),
    [],
  );

  return {
    commitFields,
    commitCaption,
    commitPhotoCaptions,
    commitPagePatch,
    saveNow,
  };
}
