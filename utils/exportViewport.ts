import AsyncStorage from '@react-native-async-storage/async-storage';

import { spacing } from '@/constants/design-tokens';
import { getEditorPageViewportWidth, isTabletDevice } from '@/utils/responsive';

export type EditorCoordinateViewport = {
  width: number;
  height: number;
};

export function getProjectViewportStorageKey(projectId: string): string {
  return `@project_viewport_${projectId}`;
}

export function getDefaultPageAspectRatio(params?: {
  lineGuideId?: string | null;
  sourceWidth?: number;
  sourceHeight?: number;
}): number {
  if (params?.lineGuideId === 'family_blank_21x21') {
    return 1;
  }
  if (params?.lineGuideId === 'kids_48') {
    return 1;
  }
  if (
    params?.lineGuideId === 'diary_interior_brown' ||
    params?.lineGuideId === 'diary_interior_purple'
  ) {
    return 240 / 180;
  }
  if (
    params?.sourceWidth &&
    params?.sourceHeight &&
    params.sourceWidth > 0 &&
    Math.abs(params.sourceWidth - params.sourceHeight) < 2
  ) {
    return 1;
  }
  return 1.414;
}

/**
 * Coordinate space for page layout (matches useAlbumPagePreviewLayout).
 * Width is fixed on tablet (390); height follows source PNG aspect ratio.
 */
export function resolveEditorCoordinateViewport(params: {
  windowWidth: number;
  sourceWidth?: number;
  sourceHeight?: number;
  imageAspectRatio?: number;
  lineGuideId?: string | null;
}): EditorCoordinateViewport {
  const { windowWidth, sourceWidth, sourceHeight, imageAspectRatio, lineGuideId } = params;
  const isTablet = isTabletDevice(windowWidth);
  const phoneCoordinateWidth = Math.max(windowWidth - spacing.md * 2, 280);
  const coordinateWidth = isTablet
    ? getEditorPageViewportWidth(windowWidth)
    : phoneCoordinateWidth;

  let aspect = imageAspectRatio;
  if (!aspect || aspect <= 0) {
    if (sourceWidth && sourceHeight && sourceWidth > 0) {
      aspect = sourceHeight / sourceWidth;
    } else {
      aspect = getDefaultPageAspectRatio({ lineGuideId, sourceWidth, sourceHeight });
    }
  }

  return {
    width: coordinateWidth,
    height: coordinateWidth * aspect,
  };
}

export async function loadProjectViewport(
  projectId: string,
): Promise<EditorCoordinateViewport | null> {
  const raw = await AsyncStorage.getItem(getProjectViewportStorageKey(projectId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { width?: number; height?: number };
    if (
      typeof parsed.width === 'number' &&
      typeof parsed.height === 'number' &&
      parsed.width > 0 &&
      parsed.height > 0
    ) {
      return { width: parsed.width, height: parsed.height };
    }
  } catch {
    /* ignore */
  }

  return null;
}

export async function persistProjectViewport(
  projectId: string,
  viewport: EditorCoordinateViewport,
): Promise<void> {
  await AsyncStorage.setItem(
    getProjectViewportStorageKey(projectId),
    JSON.stringify(viewport),
  );
}

export async function resolveProjectViewportForExport(
  projectId: string,
  sourceWidth?: number,
  sourceHeight?: number,
  windowWidth?: number,
  lineGuideId?: string | null,
): Promise<EditorCoordinateViewport> {
  const saved = await loadProjectViewport(projectId);
  if (saved) {
    if (sourceWidth && sourceHeight && sourceWidth > 0 && sourceHeight > 0) {
      const savedAspect = saved.height / saved.width;
      const sourceAspect = sourceHeight / sourceWidth;
      if (Math.abs(savedAspect - sourceAspect) < 0.02) {
        return saved;
      }
    } else {
      return saved;
    }
  }

  const fallbackWidth = windowWidth ?? 390;
  return resolveEditorCoordinateViewport({
    windowWidth: fallbackWidth,
    sourceWidth,
    sourceHeight,
    lineGuideId,
  });
}
