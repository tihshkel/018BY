import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Annotation } from '@/components/pdf-annotations';
import {
  getContentRect,
  mapSourceNormToViewport,
  type ContentRect,
} from '@/utils/imageContentRect';
import { resolveSlotPageNumber } from '@/utils/albumImages';
import { resolvePageSourceSize } from '@/utils/pageSourceDimensions';
import { EDITOR_PAGE_VIEWPORT_WIDTH } from '@/utils/responsive';
import {
  getLineSlotsForPage,
  hasLineGuides,
  layoutAnnotationFromSlot,
} from '@/utils/textLineSlots';

export const LEGACY_VIEWPORT_WIDTH_THRESHOLD = 500;

export function viewportMigrationFlagKey(projectId: string): string {
  return `@project_viewport_migrated_${projectId}`;
}

export function shouldMigrateProjectViewport(
  savedViewport: { width: number; height: number } | null | undefined
): boolean {
  if (!savedViewport) return false;
  return savedViewport.width > LEGACY_VIEWPORT_WIDTH_THRESHOLD;
}

function migrateAnnotationInContentRects(
  ann: Annotation,
  oldRect: ContentRect,
  newRect: ContentRect
): Annotation {
  const boxHeight = ann.height ?? 20;
  const relW = oldRect.width > 0 ? ann.width / oldRect.width : 0;
  const relH = oldRect.height > 0 ? boxHeight / oldRect.height : 0;
  const nx = oldRect.width > 0 ? (ann.x - oldRect.offsetX) / oldRect.width : 0;
  const ny = oldRect.height > 0 ? (ann.y - oldRect.offsetY) / oldRect.height : 0;
  const mapped = mapSourceNormToViewport(nx, ny, relW, relH, newRect);
  const fontScale = oldRect.height > 0 ? newRect.height / oldRect.height : 1;

  return {
    ...ann,
    x: mapped.x,
    y: mapped.y,
    width: mapped.width,
    height: mapped.height,
    fontSize: ann.fontSize != null ? ann.fontSize * fontScale : ann.fontSize,
  };
}

function migrateInteriorAnnotation(
  ann: Annotation,
  oldViewport: { width: number; height: number },
  newViewport: { width: number; height: number },
  sourceWidth: number,
  sourceHeight: number,
  lineGuideId?: string | null,
  projectImages?: string[]
): Annotation {
  if (
    ann.type === 'text' &&
    typeof ann.templateLineStart === 'number' &&
    typeof ann.page === 'number' &&
    lineGuideId &&
    hasLineGuides(lineGuideId)
  ) {
    const imageUri = projectImages?.[ann.page - 1];
    const slotPage = resolveSlotPageNumber(imageUri, ann.page);
    const slots = getLineSlotsForPage({
      lineGuideId,
      page: slotPage,
      viewportWidth: newViewport.width,
      viewportHeight: newViewport.height,
      sourceWidth,
      sourceHeight,
    });
    const slot = slots[ann.templateLineStart];
    if (slot) {
      return { ...ann, ...layoutAnnotationFromSlot(slot) };
    }
  }

  const oldRect = getContentRect(
    oldViewport.width,
    oldViewport.height,
    sourceWidth,
    sourceHeight
  );
  const newRect = getContentRect(
    newViewport.width,
    newViewport.height,
    sourceWidth,
    sourceHeight
  );
  return migrateAnnotationInContentRects(ann, oldRect, newRect);
}

function migrateCoverAnnotation(
  ann: Annotation,
  oldViewport: { width: number; height: number },
  newViewport: { width: number; height: number }
): Annotation {
  const oldRect = getContentRect(
    oldViewport.width,
    oldViewport.height,
    oldViewport.width,
    oldViewport.height
  );
  const newRect = getContentRect(
    newViewport.width,
    newViewport.height,
    newViewport.width,
    newViewport.height
  );
  return migrateAnnotationInContentRects(ann, oldRect, newRect);
}

async function readSavedViewport(
  key: string
): Promise<{ width: number; height: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
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
    // ignore
  }
  return null;
}

export async function maybeMigrateProjectViewport(params: {
  projectId: string;
  lineGuideId: string | null;
  annotations: Annotation[];
  coverAnnotations: Annotation[];
  sampleImageUri?: string | null;
  projectImages?: string[];
}): Promise<{
  changed: boolean;
  annotations: Annotation[];
  coverAnnotations: Annotation[];
}> {
  const { projectId, lineGuideId, annotations, coverAnnotations, sampleImageUri, projectImages } =
    params;
  const flagKey = viewportMigrationFlagKey(projectId);

  if ((await AsyncStorage.getItem(flagKey)) === '1') {
    return { changed: false, annotations, coverAnnotations };
  }

  const pagesViewport = await readSavedViewport(`@project_viewport_${projectId}`);
  const coverViewport = await readSavedViewport(`@project_cover_viewport_${projectId}`);
  const needsPages = shouldMigrateProjectViewport(pagesViewport);
  const needsCover = shouldMigrateProjectViewport(coverViewport);

  if (!needsPages && !needsCover) {
    await AsyncStorage.setItem(flagKey, '1');
    return { changed: false, annotations, coverAnnotations };
  }

  let sourceWidth = 1417;
  let sourceHeight = 2000;
  if (sampleImageUri) {
    const size = await resolvePageSourceSize(sampleImageUri);
    if (size) {
      sourceWidth = size.width;
      sourceHeight = size.height;
    }
  }

  let nextAnnotations = annotations;
  let nextCoverAnnotations = coverAnnotations;

  if (needsPages && pagesViewport) {
    const newPagesViewport = {
      width: EDITOR_PAGE_VIEWPORT_WIDTH,
      height: pagesViewport.height,
    };
    nextAnnotations = annotations.map((ann) =>
      migrateInteriorAnnotation(
        ann,
        pagesViewport,
        newPagesViewport,
        sourceWidth,
        sourceHeight,
        lineGuideId,
        projectImages
      )
    );
    await AsyncStorage.setItem(
      `@project_viewport_${projectId}`,
      JSON.stringify(newPagesViewport)
    );
    await AsyncStorage.setItem(`@project_annotations_${projectId}`, JSON.stringify(nextAnnotations));
  }

  if (needsCover && coverViewport) {
    const newCoverViewport = {
      width: EDITOR_PAGE_VIEWPORT_WIDTH,
      height: coverViewport.height,
    };
    nextCoverAnnotations = coverAnnotations.map((ann) =>
      migrateCoverAnnotation(ann, coverViewport, newCoverViewport)
    );
    await AsyncStorage.setItem(
      `@project_cover_viewport_${projectId}`,
      JSON.stringify(newCoverViewport)
    );
    await AsyncStorage.setItem(
      `@project_cover_annotations_${projectId}`,
      JSON.stringify(nextCoverAnnotations)
    );
  }

  await AsyncStorage.setItem(flagKey, '1');
  return {
    changed: true,
    annotations: nextAnnotations,
    coverAnnotations: nextCoverAnnotations,
  };
}
