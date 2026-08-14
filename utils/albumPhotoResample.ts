import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { ALBUM_DESIGN_DPI } from '@/utils/exportPageDimensions';
import { resolvePageSourceSize, setPageSourceSize } from '@/utils/pageSourceDimensions';
import { getNormalizedPhotoSlot } from '@/utils/photoSlots';
import { getSlotAspectRatio } from '@/utils/photoVariantAspect';
import { MAX_PHOTO_SCALE } from '@/utils/photoSlotTransform';

/** JPEG при сохранении пользовательского фото (~72 DPI эквивалент по размеру слота). */
export const ALBUM_PHOTO_JPEG_QUALITY = 0.92;

const MIN_PHOTO_SIDE_PX = 64;
/** Android: меньше bitmap при вставке; 1600px хватает для печати слота при 72 DPI. */
const MAX_PHOTO_SIDE_PX = Platform.OS === 'android' ? 1600 : 2048;

export type PhotoTargetPixels = {
  maxWidth: number;
  maxHeight: number;
};

function clampPhotoSidePx(value: number): number {
  return Math.max(MIN_PHOTO_SIDE_PX, Math.min(MAX_PHOTO_SIDE_PX, Math.round(value)));
}

/** Физический размер страницы альбома в мм (как в Corel/PDF). */
export function getAlbumPageSizeMm(lineGuideId: string): { widthMm: number; heightMm: number } {
  if (
    lineGuideId === 'family_blank_21x21' ||
    lineGuideId === 'kids_48' ||
    lineGuideId === 'holidays_birthday_60'
  ) {
    return { widthMm: 210, heightMm: 210 };
  }

  if (
    lineGuideId === 'diary_interior_brown' ||
    lineGuideId === 'diary_interior_purple' ||
    lineGuideId === 'family_blank' ||
    lineGuideId === 'holidays_blank'
  ) {
    return { widthMm: 180, heightMm: 240 };
  }

  return { widthMm: 148, heightMm: 210 };
}

export function mmToPixelsAtDpi(mm: number, dpi: number): number {
  return (mm / 25.4) * dpi;
}

function buildTargetPixels(
  widthMm: number,
  heightMm: number,
  dpi: number,
  coverScaleHeadroom: number,
): PhotoTargetPixels {
  return {
    maxWidth: clampPhotoSidePx(mmToPixelsAtDpi(widthMm * coverScaleHeadroom, dpi)),
    maxHeight: clampPhotoSidePx(mmToPixelsAtDpi(heightMm * coverScaleHeadroom, dpi)),
  };
}

/**
 * Целевое разрешение фото для слота шаблона: физический размер слота × design DPI × запас на зум.
 */
export function computePhotoSlotTargetPixels(params: {
  lineGuideId: string;
  page: number;
  variantId: string;
  slotIndex: number;
  templateLibraryId?: string;
  dpi?: number;
  coverScaleHeadroom?: number;
}): PhotoTargetPixels | null {
  const dpi = params.dpi ?? ALBUM_DESIGN_DPI;
  const headroom = params.coverScaleHeadroom ?? MAX_PHOTO_SCALE;
  const pageMm = getAlbumPageSizeMm(params.lineGuideId);

  const slot = getNormalizedPhotoSlot(
    params.lineGuideId,
    params.page,
    params.variantId,
    params.slotIndex,
    params.templateLibraryId,
  );

  if (slot) {
    const widthMm = pageMm.widthMm * slot.width;
    const heightMm = pageMm.heightMm * slot.height;
    return buildTargetPixels(widthMm, heightMm, dpi, headroom);
  }

  const aspect = getSlotAspectRatio({
    lineGuideId: params.lineGuideId,
    page: params.page,
    variantId: params.variantId,
    slotIndex: params.slotIndex,
  });
  if (!aspect) return null;

  const fallbackWidthMm = pageMm.widthMm * 0.45;
  const fallbackHeightMm = fallbackWidthMm * (aspect[1] / aspect[0]);
  return buildTargetPixels(fallbackWidthMm, fallbackHeightMm, dpi, headroom);
}

/** Целевое разрешение для свободно размещённого фото (blank-страницы). */
export function computeFreeElementTargetPixels(params: {
  lineGuideId: string;
  elementWidth: number;
  elementHeight: number;
  dpi?: number;
  coverScaleHeadroom?: number;
}): PhotoTargetPixels {
  const dpi = params.dpi ?? ALBUM_DESIGN_DPI;
  const headroom = params.coverScaleHeadroom ?? MAX_PHOTO_SCALE;
  const pageMm = getAlbumPageSizeMm(params.lineGuideId);
  const widthMm = pageMm.widthMm * params.elementWidth;
  const heightMm = pageMm.heightMm * params.elementHeight;
  return buildTargetPixels(widthMm, heightMm, dpi, headroom);
}

function normalizeFileUri(path: string): string {
  if (path.startsWith('file://')) return path;
  return `file://${path}`;
}

/**
 * Нормализует EXIF-ориентацию и уменьшает фото до целевого размера (если нужно).
 * Без targetPixels — только EXIF-fix с ALBUM_PHOTO_JPEG_QUALITY.
 */
export async function resamplePhotoForAlbumStorage(
  sourceUri: string,
  targetPixels?: PhotoTargetPixels | null,
): Promise<string> {
  if (!sourceUri.trim()) return sourceUri;

  const size = await resolvePageSourceSize(sourceUri);
  if (!size) {
    return normalizePhotoOrientationOnly(sourceUri);
  }

  if (!targetPixels) {
    return normalizePhotoOrientationOnly(sourceUri);
  }

  const scale = Math.min(
    targetPixels.maxWidth / size.width,
    targetPixels.maxHeight / size.height,
    1,
  );

  const actions: ImageManipulator.Action[] =
    scale < 0.99
      ? [
          {
            resize: {
              width: Math.max(1, Math.round(size.width * scale)),
              height: Math.max(1, Math.round(size.height * scale)),
            },
          },
        ]
      : [];

  try {
    const result = await ImageManipulator.manipulateAsync(sourceUri, actions, {
      compress: ALBUM_PHOTO_JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    if (result?.uri) {
      const outUri = normalizeFileUri(result.uri);
      if (result.width > 0 && result.height > 0) {
        setPageSourceSize(outUri, { width: result.width, height: result.height });
      }
      return outUri;
    }
  } catch (error) {
    console.warn('[resamplePhotoForAlbumStorage] failed, keeping source URI', error);
  }

  return sourceUri;
}

async function normalizePhotoOrientationOnly(sourceUri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(sourceUri, [], {
      compress: ALBUM_PHOTO_JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    if (result?.uri) {
      const outUri = normalizeFileUri(result.uri);
      if (result.width > 0 && result.height > 0) {
        setPageSourceSize(outUri, { width: result.width, height: result.height });
      }
      return outUri;
    }
  } catch (error) {
    console.warn('[normalizePhotoOrientationOnly] failed, keeping source URI', error);
  }
  return sourceUri;
}
