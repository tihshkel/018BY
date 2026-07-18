import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';

import { clearAllAlbumProjectSnapshots } from '@/utils/albumProjectStateSync';

export type AlbumFlowParams = {
  id?: string;
  celebration?: string;
  coverType?: string;
  interiorType?: string;
  eventDate?: string;
  /** После добавления страницы — баннер + прокрутка к карточке. */
  highlightInstanceId?: string;
  /** После сохранения — только прокрутка к карточке (без баннера). */
  scrollToInstanceId?: string;
};

export function buildAlbumPagesHref(params: AlbumFlowParams): Href {
  return {
    pathname: '/album-pages',
    params: {
      id: params.id,
      celebration: params.celebration,
      coverType: params.coverType,
      interiorType: params.interiorType,
      eventDate: params.eventDate,
      highlightInstanceId: params.highlightInstanceId,
      scrollToInstanceId: params.scrollToInstanceId,
    },
  } as unknown as Href;
}

export function buildAlbumIntroHref(params: AlbumFlowParams): Href {
  return {
    pathname: '/album-intro',
    params: {
      id: params.id,
      celebration: params.celebration,
      coverType: params.coverType,
      interiorType: params.interiorType,
      eventDate: params.eventDate,
    },
  } as unknown as Href;
}

export function buildAlbumStructureGridHref(params: AlbumFlowParams): Href {
  return {
    pathname: '/album-structure-grid',
    params: {
      id: params.id,
      celebration: params.celebration,
      coverType: params.coverType,
      interiorType: params.interiorType,
      eventDate: params.eventDate,
    },
  } as unknown as Href;
}

export function buildExportReviewHref(params: AlbumFlowParams): Href {
  return {
    pathname: '/export-review',
    params: {
      id: params.id,
      celebration: params.celebration,
      coverType: params.coverType,
      interiorType: params.interiorType,
    },
  } as unknown as Href;
}

export function navigateToAlbumPages(params: AlbumFlowParams): void {
  router.replace(buildAlbumPagesHref(params));
}

export function navigateToHomeFromAlbum(): void {
  // Сбрасываем RAM-снимки проектов + native image memory cache (п.1/п.2 давление памяти).
  clearAllAlbumProjectSnapshots();
  void Image.clearMemoryCache();
  router.replace('/(tabs)' as Href);
}

export function navigateToAlbumEntry(params: AlbumFlowParams, introSeen: boolean): void {
  router.replace(introSeen ? buildAlbumPagesHref(params) : buildAlbumIntroHref(params));
}
