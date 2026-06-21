export type PageFormat = '18x24' | '21x21';

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
  | 'godparents_page'
  | 'timeline_page'
  | 'text_page'
  | 'free_page'
  | 'birthday_free_page'
  | 'travel_map_page';

export type FieldType = 'text' | 'date' | 'time' | 'number' | 'radio';

export type TemplateTextBlockType = 'caption' | 'title' | 'longText' | 'date';

export type TemplateMinFilledRule = {
  minPhotos?: number;
  minTextFields?: number;
  minTimelineEvents?: number;
  minAnyContent?: boolean;
};

export type PageStatus =
  | 'empty'
  | 'continue'
  | 'draft'
  | 'filled'
  | 'locked'
  | 'excluded';

export type PhotoBlockLayoutKind = 'collage' | 'circle_tree';

export type PhotoSlotBranch = 'child' | 'mother' | 'father';

export type PhotoSlotShape = 'rect' | 'circle';

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
  layoutKind?: PhotoBlockLayoutKind;
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
  /** Birthday free pages — default custom field definitions (labels editable in UI). */
  customFieldDefs?: BirthdayCustomFieldDef[];
}

export type BirthdayCustomFieldDef = {
  id: string;
  defaultLabel: string;
  fieldType: 'short_text' | 'long_text';
  maxLabelLength?: number;
  maxValueLength?: number;
};

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
  pageType: PageType;
  pageFormat: PageFormat;
  maxPhotos: number;
  hasCaption: boolean;
  hasTextBlock: boolean;
  /** @deprecated use maxPhotos */
  photoSlots: number;
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
  /** Per-slot pinch/pan transform (key: blockId_slotIndex) */
  photoSlotTransforms?: Record<string, PhotoSlotTransform>;
  /** Shared transform for multi-photo layouts */
  photoGroupTransform?: PhotoSlotTransform;
  /** ID шрифта из AVAILABLE_FONTS для всего текста страницы */
  textFontFamily?: string;
  status: PageStatus;
  updatedAt: string;
  excludedFromExport?: boolean;
  /** Set when user taps «Редактировать позже» — distinguishes Черновик from Продолжить */
  draftSavedAt?: string;
  /** FreePageTemplate — произвольные элементы на canvas */
  freeElements?: FreePageElement[];
  /** Birthday free pages — user-editable field labels and values */
  customFields?: BirthdayCustomFieldValue[];
  /** Travel map page — pins on the world map (normalized within map bounds). */
  mapMarkers?: TravelMapMarker[];
}

export type TravelMapMarker = {
  id: string;
  nx: number;
  ny: number;
  label?: string;
};

export type BirthdayCustomFieldValue = {
  id: string;
  label: string;
  value: string;
  fieldType: 'short_text' | 'long_text';
};

export type FreePageElement = {
  id: string;
  type: 'image' | 'text';
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  zIndex?: number;
  content?: string;
  crop?: PhotoSlotTransform;
};

export type PhotoSlotTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export const PAGE_SCHEMA_VERSION = '2.0.0';
