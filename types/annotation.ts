import type { PhotoSlotTransform } from '@/types/album-page-schema';

export interface Annotation {
  id: string;
  type: 'text' | 'image' | 'drawing';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  imageUri?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  zIndex: number;
  page?: number | string;
  templateLineStart?: number;
  templateLineCount?: number;
  sourcePageNumber?: number;
  textAlign?: 'left' | 'center' | 'right';
  imageContentFit?: 'cover' | 'fill';
  clipShape?: 'circle';
  fillColor?: string;
  fillOpacity?: number;
  /** Corner radius as a fraction of min(width, height) for rect fills. */
  fillCornerRadiusRatio?: number;
  imageSlotTransform?: PhotoSlotTransform;
}

export type AnnotationTextAlign = 'left' | 'center' | 'right';
