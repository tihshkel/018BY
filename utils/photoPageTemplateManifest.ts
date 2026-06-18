import type {
  PageFormat,
  PageType,
  TemplateMinFilledRule,
  TemplateTextBlockType,
} from '@/types/album-page-schema';

export type TemplateFrame = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type TemplatePhotoSlotDef = TemplateFrame & {
  id: string;
  type: 'image';
  required?: boolean;
};

export type TemplateTextBlockDef = TemplateFrame & {
  id: string;
  type: TemplateTextBlockType;
  maxLength?: number;
  required?: boolean;
};

export type TemplateTimelineEventDef = {
  id: string;
  photo: TemplatePhotoSlotDef;
  date: TemplateTextBlockDef;
  description: TemplateTextBlockDef;
};

export type TemplateLayoutDef = {
  photoSlots?: TemplatePhotoSlotDef[];
  textBlocks?: TemplateTextBlockDef[];
  events?: TemplateTimelineEventDef[];
  freeCanvas?: TemplateFrame;
  limits?: { maxPhotos: number; maxTextBlocks: number; maxRotationDegrees?: number };
  minFilledRule?: TemplateMinFilledRule;
  pageType?: PageType;
  perPhotoCaptions?: boolean;
};

type ManifestFile = {
  meta: Record<
    string,
    { title: string; description: string; maxPhotos: number }
  >;
  templates: Record<string, Record<PageFormat, TemplateLayoutDef>>;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const manifest = require('../constants/photo-page-template-manifest.json') as ManifestFile;

export const PHOTO_PAGE_TEMPLATE_IDS = Object.keys(manifest.meta) as PhotoPageTemplateId[];

export type PhotoPageTemplateId = keyof typeof manifest.meta;

export const LEGACY_TEMPLATE_ID_MAP: Record<string, PhotoPageTemplateId> = {
  '1_photo_caption': 'SinglePhotoTemplate',
  '2_photos': 'TwoVerticalPhotosTemplate',
  '4_photos': 'FourPhotosTemplate',
  photo_note: 'PhotoStoryTemplate',
  note_only: 'TextPageTemplate',
  memory: 'PhotoStoryTemplate',
  event: 'TwoHorizontalPhotosTemplate',
  month: 'FourPhotosTemplate',
  holiday: 'CaptionGalleryTemplate',
};

export function resolvePhotoPageTemplateId(templateId: string): PhotoPageTemplateId {
  if (manifest.meta[templateId]) return templateId as PhotoPageTemplateId;
  return LEGACY_TEMPLATE_ID_MAP[templateId] ?? 'SinglePhotoTemplate';
}

export function getTemplateMeta(templateId: string) {
  const resolved = resolvePhotoPageTemplateId(templateId);
  return manifest.meta[resolved];
}

export function getTemplateLayout(
  templateId: string,
  format: PageFormat,
): TemplateLayoutDef | undefined {
  const resolved = resolvePhotoPageTemplateId(templateId);
  return manifest.templates[resolved]?.[format];
}

export function getPageFormatForLineGuide(lineGuideId: string): PageFormat {
  if (lineGuideId === 'family_blank_21x21') return '21x21';
  if (lineGuideId === 'family_blank' || lineGuideId === 'holidays_blank') return '18x24';
  return '18x24';
}

export function isBlankTemplateLineGuide(lineGuideId: string): boolean {
  return (
    lineGuideId === 'family_blank' ||
    lineGuideId === 'holidays_blank' ||
    lineGuideId === 'family_blank_21x21'
  );
}

export function listTemplatesForFormat(format: PageFormat): Array<{
  id: PhotoPageTemplateId;
  title: string;
  description: string;
  maxPhotos: number;
  layout: TemplateLayoutDef;
}> {
  return PHOTO_PAGE_TEMPLATE_IDS.filter((id) => manifest.templates[id]?.[format]).map((id) => ({
    id,
    title: manifest.meta[id].title,
    description: manifest.meta[id].description,
    maxPhotos: manifest.meta[id].maxPhotos,
    layout: manifest.templates[id][format],
  }));
}
