import type { PhotoBlockSchema } from '@/types/album-page-schema';
import { resolvePreviewAssetUri } from '@/utils/previewAssetUri';

export type VariantPreviewThumbnail = {
  variantId: string;
  label: string;
  uri: string;
};

type VariantManifest = Record<string, Record<string, string>>;

const pregnancy60PreviewVariantsManifest = require('../assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/preview_variants/pregnancy_60_variants_manifest.json') as VariantManifest;

const kids48PreviewVariantsManifest = require('../assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/preview_variants/kids_48_variants_manifest.json') as VariantManifest;

const MANIFESTS: Record<string, VariantManifest> = {
  pregnancy_60: pregnancy60PreviewVariantsManifest,
  kids_48: kids48PreviewVariantsManifest,
};

const PREGNANCY_VARIANT_ALIASES: Record<string, string> = {
  one_horizontal: 'one_large',
  one_horizontal_common: 'one_large',
  two_horizontal: 'two_photos',
  two_vertical: 'two_photos',
  two_vertical_separate: 'two_photos',
  four_vertical: 'four_grid',
};

function manifestVariantKey(lineGuideId: string, variantId: string): string {
  if (lineGuideId === 'pregnancy_60') {
    return PREGNANCY_VARIANT_ALIASES[variantId] ?? variantId;
  }
  return variantId;
}

function resolveManifestPath(relativePath: string): string {
  return resolvePreviewAssetUri(relativePath);
}

export function getVariantPreviewManifest(lineGuideId: string): VariantManifest | null {
  return MANIFESTS[lineGuideId] ?? null;
}

export function hasVariantPreviewManifest(
  lineGuideId: string,
  sourcePageNumber: number
): boolean {
  const manifest = MANIFESTS[lineGuideId];
  if (!manifest) return false;
  const entry = manifest[String(sourcePageNumber)];
  return !!entry && Object.keys(entry).length > 0;
}

export function resolveVariantPreviewBackgroundUri(params: {
  lineGuideId?: string | null;
  sourcePageNumber?: number | null;
  variantId?: string | null;
}): string | null {
  const { lineGuideId, sourcePageNumber, variantId } = params;
  if (!lineGuideId || !sourcePageNumber || sourcePageNumber < 1) return null;
  const manifest = MANIFESTS[lineGuideId];
  if (!manifest) return null;

  const pageEntry = manifest[String(sourcePageNumber)];
  if (!pageEntry) return null;

  if (variantId) {
    const key = manifestVariantKey(lineGuideId, variantId);
    const path = pageEntry[key];
    if (path) return resolveManifestPath(path);
  }

  const firstKey = Object.keys(pageEntry)[0];
  if (!firstKey) return null;
  return resolveManifestPath(pageEntry[firstKey]);
}

export function getDefaultVariantIdForPage(
  lineGuideId: string,
  sourcePageNumber: number,
  photoBlock?: PhotoBlockSchema
): string | null {
  const manifest = MANIFESTS[lineGuideId]?.[String(sourcePageNumber)];
  if (!manifest) return photoBlock?.variants[0]?.variantId ?? null;

  const schemaVariant = photoBlock?.variants[0]?.variantId;
  if (schemaVariant) {
    const key = manifestVariantKey(lineGuideId, schemaVariant);
    if (manifest[key]) return schemaVariant;
  }

  const firstManifestKey = Object.keys(manifest)[0];
  if (!firstManifestKey) return schemaVariant ?? null;

  const schemaMatch = photoBlock?.variants.find(
    (v) => manifestVariantKey(lineGuideId, v.variantId) === firstManifestKey
  );
  return schemaMatch?.variantId ?? firstManifestKey;
}

export function getVariantPreviewThumbnails(params: {
  lineGuideId: string;
  sourcePageNumber: number;
  photoBlock?: PhotoBlockSchema;
}): VariantPreviewThumbnail[] {
  const { lineGuideId, sourcePageNumber, photoBlock } = params;
  const pageEntry = MANIFESTS[lineGuideId]?.[String(sourcePageNumber)];
  const variants = photoBlock?.variants ?? [];
  const labelById = Object.fromEntries(variants.map((v) => [v.variantId, v.label]));

  if (pageEntry && Object.keys(pageEntry).length > 0) {
    return Object.entries(pageEntry).map(([manifestKey, relativePath]) => {
      const schemaVariant =
        variants.find((v) => manifestVariantKey(lineGuideId, v.variantId) === manifestKey) ??
        variants.find((v) => v.variantId === manifestKey);

      const variantId = schemaVariant?.variantId ?? manifestKey;
      return {
        variantId,
        label: schemaVariant?.label ?? labelById[variantId] ?? manifestKey,
        uri: resolveManifestPath(relativePath),
      };
    });
  }

  if (variants.length <= 1) return [];

  return variants.map((variant) => ({
    variantId: variant.variantId,
    label: variant.label,
    uri: '',
  }));
}
