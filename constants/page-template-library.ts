import type { PageTemplateLibraryItem } from '@/types/album-page-schema';
import {
  getTemplateLayout,
  getTemplateMeta,
  PHOTO_PAGE_TEMPLATE_IDS,
  resolvePhotoPageTemplateId,
  type PhotoPageTemplateId,
} from '@/utils/photoPageTemplateManifest';

function buildLibraryItem(id: PhotoPageTemplateId): PageTemplateLibraryItem {
  const meta = getTemplateMeta(id)!;
  const layout18 = getTemplateLayout(id, '18x24')!;
  const hasCaption = Boolean(
    layout18.perPhotoCaptions ||
      layout18.textBlocks?.some((b) => b.type === 'caption') ||
      layout18.events?.length,
  );
  const hasTextBlock = Boolean(
    layout18.textBlocks?.some((b) => b.type === 'title' || b.type === 'longText') ||
      layout18.pageType === 'text_page' ||
      layout18.pageType === 'free_page',
  );

  return {
    id,
    title: meta.title,
    description: meta.description,
    pageType: layout18.pageType ?? 'photo',
    pageFormat: '18x24',
    maxPhotos: meta.maxPhotos,
    photoSlots: meta.maxPhotos,
    hasCaption,
    hasTextBlock,
  };
}

export const PAGE_TEMPLATE_LIBRARY: PageTemplateLibraryItem[] =
  PHOTO_PAGE_TEMPLATE_IDS.map((id) => buildLibraryItem(id));

export function getPageTemplateById(id: string): PageTemplateLibraryItem | undefined {
  const resolved = resolvePhotoPageTemplateId(id);
  return PAGE_TEMPLATE_LIBRARY.find((item) => item.id === resolved);
}

export function getDefaultTemplateId(): string {
  return 'SinglePhotoTemplate';
}
