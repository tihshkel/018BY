import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions } from 'react-native';

import { spacing } from '@/constants/design-tokens';
import { getEditorPageViewportWidth, isTabletLayout } from '@/utils/responsive';

export type EditorCoordinateViewport = {
  width: number;
  height: number;
};

export function getProjectViewportStorageKey(projectId: string): string {
  return `@project_viewport_${projectId}`;
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
}): EditorCoordinateViewport {
  const { windowWidth, sourceWidth, sourceHeight, imageAspectRatio } = params;
  const isTablet = isTabletLayout(windowWidth);
  const phoneCoordinateWidth = Math.max(windowWidth - spacing.md * 2, 280);
  const coordinateWidth = isTablet
    ? getEditorPageViewportWidth(windowWidth)
    : phoneCoordinateWidth;

  let aspect = imageAspectRatio;
  if (!aspect || aspect <= 0) {
    if (sourceWidth && sourceHeight && sourceWidth > 0) {
      aspect = sourceHeight / sourceWidth;
    } else {
      aspect = 1.414;
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
): Promise<EditorCoordinateViewport> {
  const saved = await loadProjectViewport(projectId);
  if (saved) return saved;

  const { width: windowWidth } = Dimensions.get('window');
  return resolveEditorCoordinateViewport({
    windowWidth,
    sourceWidth,
    sourceHeight,
  });
}
