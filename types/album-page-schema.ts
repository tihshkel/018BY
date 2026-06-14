export type PageType =
  | 'structured'
  | 'non_editable'
  | 'photo'
  | 'free'
  | 'event_photo'
  | 'month_page'
  | 'family_tree'
  | 'teeth'
  | 'growth_weight'
  | 'free_photo_caption'
  | 'caption_photo_page'
  | 'baptism_page'
  | 'godparents_page';

export type PageStatus =
  | 'empty'
  | 'continue'
  | 'draft'
  | 'filled'
  | 'locked'
  | 'excluded';

export type FieldType = 'text' | 'date' | 'time' | 'number' | 'radio';

export interface AlbumPageField {
  fieldId: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  templateLineStart: number;
  templateLineCount: number;
  options?: string[];
}

export interface PhotoBlockVariant {
  variantId: string;
  label: string;
  slots: number;
  slotIndices: number[];
}

export interface PhotoBlockSchema {
  blockId: string;
  label: string;
  variants: PhotoBlockVariant[];
}

export interface AlbumPageSchema {
  pageId: string;
  title: string;
  pageType: PageType;
  order: number;
  editable: boolean;
  lineGuideId: string;
  sourcePageNumber: number;
  fields?: AlbumPageField[];
  photoBlocks?: PhotoBlockSchema[];
  canDuplicate: boolean;
  canAddAfter: boolean;
  templateLibraryId?: string;
  captionEnabled?: boolean;
  /** Always included in electronic export even when empty (e.g. kids p2). */
  requiredInExport?: boolean;
}

export interface AlbumSectionDefinition {
  sectionId: string;
  title: string;
  pageRange: [number, number];
  order: number;
}

export interface PageTemplateLibraryItem {
  id: string;
  title: string;
  description: string;
  pageType: 'photo' | 'free';
  photoSlots: number;
  hasCaption: boolean;
  hasTextBlock: boolean;
}

export interface PageInstance {
  instanceId: string;
  schemaPageId: string;
  sourcePageNumber: number;
  order: number;
  addedByUser: boolean;
  imageIndex: number;
  titleOverride?: string;
}

export interface PageValues {
  fields: Record<string, string>;
  photoBlocks: Record<
    string,
    {
      variantId: string;
      slots: (string | null)[];
    }
  >;
  caption?: string;
  /** Per-photo captions for caption_photo_page */
  photoCaptions?: (string | null)[];
  /** ID шрифта из AVAILABLE_FONTS для всего текста страницы */
  textFontFamily?: string;
  status: PageStatus;
  updatedAt: string;
  excludedFromExport?: boolean;
  /** Set when user taps «Редактировать позже» — distinguishes Черновик from Продолжить */
  draftSavedAt?: string;
}

export const PAGE_SCHEMA_VERSION = '2.0.0';
