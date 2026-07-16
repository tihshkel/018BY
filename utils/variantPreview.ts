import type { PhotoBlockSchema } from '@/types/album-page-schema';
import { resolveBundledPreviewUri } from '@/constants/generated/preview-asset-registry';
import { hasSparsePhotoConfig, usesBlankPagePhotoFallback } from '@/constants/sparse-photo-album-config';
import { resolvePreviewAssetUri } from '@/utils/previewAssetUri';

export type VariantPreviewThumbnail = {
  variantId: string;
  label: string;
  uri: string;
  selectedUri?: string;
};

type GlobalVariantManifestEntry = {
  default: string;
  selected: string;
};

type GlobalVariantManifest = Record<string, GlobalVariantManifestEntry>;

type LegacyPageManifest = Record<string, Record<string, string>>;

const globalLayoutPreviewManifest = require('../assets/photo-layout-previews/manifest.json') as GlobalVariantManifest;

const pregnancy60PreviewVariantsManifest = require('../assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/preview_variants/pregnancy_60_variants_manifest.json') as LegacyPageManifest;

const kids48PreviewVariantsManifest = require('../assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/preview_variants/kids_48_variants_manifest.json') as LegacyPageManifest;

const LEGACY_MANIFESTS: Record<string, LegacyPageManifest> = {
  pregnancy_60: pregnancy60PreviewVariantsManifest,
  kids_48: kids48PreviewVariantsManifest,
};

/** Per-page variant PNG folders (multi-page PDF without «Место для фото»). */
const PREVIEW_VARIANT_ALBUM_FOLDERS: Record<string, string> = {
  pregnancy_60: 'assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр',
  kids_48: 'assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр',
};

/** Maps saved / legacy variant IDs to the unified standard IDs. */
export const DESIGNED_ALBUM_VARIANT_ALIASES: Record<string, string> = {
  two_photos: 'two_vertical',
  two_horizontal: 'two_vertical',
  two_vertical_separate: 'two_vertical',
  one_horizontal: 'one_large',
  one_horizontal_common: 'one_large',
  four_vertical: 'four_grid',
};

export function normalizeDesignedAlbumVariantId(variantId: string): string {
  return DESIGNED_ALBUM_VARIANT_ALIASES[variantId] ?? variantId;
}

/** PNG-превью стандартных раскладок (assets/photo-layout-previews). */
export function resolveGlobalLayoutPreviewUri(
  variantId: string,
  selected = false,
): string | null {
  const key = normalizeDesignedAlbumVariantId(variantId);
  const entry = globalLayoutPreviewManifest[key];
  if (!entry) return null;
  const path = selected ? entry.selected : entry.default;
  return path ? resolveManifestPath(path) : null;
}

function usesGlobalLayoutPreviews(lineGuideId: string): boolean {
  return hasSparsePhotoConfig(lineGuideId) && !usesBlankPagePhotoFallback(lineGuideId);
}

function manifestVariantKey(lineGuideId: string, variantId: string): string {
  if (usesGlobalLayoutPreviews(lineGuideId)) {
    return normalizeDesignedAlbumVariantId(variantId);
  }
  return variantId;
}

function resolveSchemaVariantForManifestKey(
  lineGuideId: string,
  manifestKey: string,
  variants: PhotoBlockSchema['variants'],
): (typeof variants)[number] | undefined {
  return (
    variants.find((v) => manifestVariantKey(lineGuideId, v.variantId) === manifestKey) ??
    variants.find((v) => v.variantId === manifestKey)
  );
}

export function resolvePhotoBlockVariant(
  variants: PhotoBlockSchema['variants'],
  requestedVariantId: string,
  lineGuideId?: string,
): (typeof variants)[number] | undefined {
  const direct = variants.find((v) => v.variantId === requestedVariantId);
  if (direct) return direct;

  const normalizedId = normalizeDesignedAlbumVariantId(requestedVariantId);
  const byNormalized = variants.find((v) => v.variantId === normalizedId);
  if (byNormalized) return byNormalized;

  if (lineGuideId) {
    const requestedKey = manifestVariantKey(lineGuideId, requestedVariantId);
    const byKey = variants.find(
      (v) => manifestVariantKey(lineGuideId, v.variantId) === requestedKey,
    );
    if (byKey) return byKey;
  }

  return undefined;
}

function resolveManifestPath(relativePath: string): string {
  return resolvePreviewAssetUri(relativePath);
}

/** Per-page legacy manifests use native variant ids (one_horizontal, two_horizontal). */
function perPageManifestVariantKey(lineGuideId: string, variantId: string): string {
  if (LEGACY_MANIFESTS[lineGuideId]) {
    return variantId;
  }
  return manifestVariantKey(lineGuideId, variantId);
}

function resolveConventionalPerPageVariantUri(params: {
  lineGuideId: string;
  sourcePageNumber: number;
  variantId?: string | null;
}): string | null {
  const folder = PREVIEW_VARIANT_ALBUM_FOLDERS[params.lineGuideId];
  if (!folder) return null;

  const page = String(params.sourcePageNumber).padStart(3, '0');
  const candidateKeys: string[] = [];
  if (params.variantId) {
    candidateKeys.push(params.variantId);
    const normalized = perPageManifestVariantKey(params.lineGuideId, params.variantId);
    if (normalized !== params.variantId) {
      candidateKeys.push(normalized);
    }
  }
  candidateKeys.push('one_large');
  candidateKeys.push('one_horizontal');

  for (const key of candidateKeys) {
    const relativePath = `${folder}/preview_variants/page_${page}_${key}.png`;
    if (resolveBundledPreviewUri(relativePath)) {
      return resolveManifestPath(relativePath);
    }
  }

  return null;
}

export function getVariantPreviewManifest(lineGuideId: string): LegacyPageManifest | null {
  return LEGACY_MANIFESTS[lineGuideId] ?? null;
}

export function hasVariantPreviewManifest(
  lineGuideId: string,
  sourcePageNumber: number,
): boolean {
  const legacyManifest = LEGACY_MANIFESTS[lineGuideId];
  if (legacyManifest) {
    const entry = legacyManifest[String(sourcePageNumber)];
    return !!entry && Object.keys(entry).length > 0;
  }

  if (PREVIEW_VARIANT_ALBUM_FOLDERS[lineGuideId]) {
    return (
      resolveConventionalPerPageVariantUri({
        lineGuideId,
        sourcePageNumber,
        variantId: null,
      }) != null
    );
  }

  return false;
}

/** Per-page variant PNG without «Место для фото» — not global layout chips. */
export function resolvePerPageVariantBackgroundUri(params: {
  lineGuideId?: string | null;
  sourcePageNumber?: number | null;
  variantId?: string | null;
}): string | null {
  const { lineGuideId, sourcePageNumber, variantId } = params;
  if (!lineGuideId || !sourcePageNumber || sourcePageNumber < 1) return null;

  const manifest = LEGACY_MANIFESTS[lineGuideId];
  const pageEntry = manifest?.[String(sourcePageNumber)];

  if (pageEntry) {
    if (variantId) {
      const directPath = pageEntry[variantId];
      if (directPath) return resolveManifestPath(directPath);

      const key = perPageManifestVariantKey(lineGuideId, variantId);
      if (key !== variantId) {
        const aliasedPath = pageEntry[key];
        if (aliasedPath) return resolveManifestPath(aliasedPath);
      }
    }

    const firstKey = Object.keys(pageEntry)[0];
    if (firstKey) return resolveManifestPath(pageEntry[firstKey]);
  }

  return resolveConventionalPerPageVariantUri({
    lineGuideId,
    sourcePageNumber,
    variantId,
  });
}

export function resolveVariantPreviewBackgroundUri(params: {
  lineGuideId?: string | null;
  sourcePageNumber?: number | null;
  variantId?: string | null;
}): string | null {
  const { lineGuideId, sourcePageNumber, variantId } = params;
  if (!lineGuideId || !sourcePageNumber || sourcePageNumber < 1) return null;

  if (usesGlobalLayoutPreviews(lineGuideId) && variantId) {
    const key = manifestVariantKey(lineGuideId, variantId);
    const entry = globalLayoutPreviewManifest[key];
    if (entry?.default) return resolveManifestPath(entry.default);
  }

  const manifest = LEGACY_MANIFESTS[lineGuideId];
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
  photoBlock?: PhotoBlockSchema,
): string | null {
  const schemaVariant = photoBlock?.variants[0]?.variantId;
  if (usesGlobalLayoutPreviews(lineGuideId)) {
    if (schemaVariant) return schemaVariant;
    return photoBlock?.variants[0]?.variantId ?? 'one_large';
  }

  const manifest = LEGACY_MANIFESTS[lineGuideId]?.[String(sourcePageNumber)];
  if (!manifest) return photoBlock?.variants[0]?.variantId ?? null;

  if (schemaVariant) {
    const key = manifestVariantKey(lineGuideId, schemaVariant);
    if (manifest[key]) return schemaVariant;
  }

  const firstManifestKey = Object.keys(manifest)[0];
  if (!firstManifestKey) return schemaVariant ?? null;

  const schemaMatch = photoBlock?.variants.find(
    (v) => manifestVariantKey(lineGuideId, v.variantId) === firstManifestKey,
  );
  return schemaMatch?.variantId ?? firstManifestKey;
}

export function getVariantPreviewThumbnails(params: {
  lineGuideId: string;
  sourcePageNumber: number;
  photoBlock?: PhotoBlockSchema;
}): VariantPreviewThumbnail[] {
  const { lineGuideId, sourcePageNumber, photoBlock } = params;
  const variants = photoBlock?.variants ?? [];
  const labelById = Object.fromEntries(variants.map((v) => [v.variantId, v.label]));

  if (usesGlobalLayoutPreviews(lineGuideId)) {
    return variants
      .map((variant) => {
        const key = manifestVariantKey(lineGuideId, variant.variantId);
        const entry = globalLayoutPreviewManifest[key];
        if (!entry) return null;

        return {
          variantId: variant.variantId,
          label: variant.label ?? labelById[variant.variantId] ?? key,
          uri: resolveManifestPath(entry.default),
          selectedUri: resolveManifestPath(entry.selected),
        };
      })
      .filter((item): item is VariantPreviewThumbnail => item != null);
  }

  const pageEntry = LEGACY_MANIFESTS[lineGuideId]?.[String(sourcePageNumber)];

  if (pageEntry && Object.keys(pageEntry).length > 0) {
    return Object.entries(pageEntry)
      .map(([manifestKey, relativePath]) => {
        const schemaVariant = resolveSchemaVariantForManifestKey(
          lineGuideId,
          manifestKey,
          variants,
        );
        if (!schemaVariant) return null;

        return {
          variantId: schemaVariant.variantId,
          label: schemaVariant.label ?? labelById[schemaVariant.variantId] ?? manifestKey,
          uri: resolveManifestPath(relativePath),
        };
      })
      .filter((item): item is VariantPreviewThumbnail => item != null);
  }

  if (variants.length <= 1) return [];

  return variants.map((variant) => ({
    variantId: variant.variantId,
    label: variant.label,
    uri: '',
  }));
}
