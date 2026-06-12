export type PageType = 'structured' | 'non_editable' | 'photo' | 'free';
export type PageStatus = 'empty' | 'draft' | 'filled' | 'locked';
export type FieldType = 'text' | 'date' | 'time' | 'number';

export interface AlbumPageField {
  fieldId: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  templateLineStart: number;
  templateLineCount: number;
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
  status: PageStatus;
  updatedAt: string;
}

export const PAGE_SCHEMA_VERSION = '1.0.0';
