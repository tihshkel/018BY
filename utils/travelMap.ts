import {
  TRAVEL_MAP_PAGE_BOUNDS,
  TRAVEL_MAP_PIN_SIZE,
  type TravelMapMarker,
} from '@/constants/travel-world-map';
import { mapSourceNormToViewport, type ContentRect } from '@/utils/imageContentRect';

export function mapMarkerToPageNorm(marker: TravelMapMarker): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const centerX = TRAVEL_MAP_PAGE_BOUNDS.x + marker.nx * TRAVEL_MAP_PAGE_BOUNDS.width;
  const centerY = TRAVEL_MAP_PAGE_BOUNDS.y + marker.ny * TRAVEL_MAP_PAGE_BOUNDS.height;
  const topNormY = centerY - TRAVEL_MAP_PIN_SIZE / 2;
  const leftNormX = centerX - TRAVEL_MAP_PIN_SIZE / 2;
  return {
    x: leftNormX,
    y: topNormY,
    width: TRAVEL_MAP_PIN_SIZE,
    height: TRAVEL_MAP_PIN_SIZE,
  };
}

export function mapMarkerToViewport(
  marker: TravelMapMarker,
  contentRect: ContentRect,
): { x: number; y: number; width: number; height: number } {
  const norm = mapMarkerToPageNorm(marker);
  return mapSourceNormToViewport(norm.x, norm.y, norm.width, norm.height, contentRect);
}

export function clampMapMarker(marker: Pick<TravelMapMarker, 'nx' | 'ny'>): {
  nx: number;
  ny: number;
} {
  return {
    nx: Math.min(1, Math.max(0, marker.nx)),
    ny: Math.min(1, Math.max(0, marker.ny)),
  };
}

export function isTravelMapPage(
  lineGuideId: string | undefined,
  sourcePageNumber: number,
  pageType?: string,
): boolean {
  if (pageType === 'travel_map_page') return true;
  return lineGuideId === 'holidays_birthday_60' && sourcePageNumber === 40;
}
