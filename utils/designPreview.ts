import { resolvePreviewAssetUri } from '@/utils/previewAssetUri';

type DesignManifest = Record<string, string>;

const pregnancy60DesignManifest = require('../assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/design_previews/pregnancy_60_design_manifest.json') as DesignManifest;

const kids48DesignManifest = require('../assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/design_previews/kids_48_design_manifest.json') as DesignManifest;

const DESIGN_MANIFESTS: Record<string, DesignManifest> = {
  pregnancy_60: pregnancy60DesignManifest,
  kids_48: kids48DesignManifest,
};

function resolveDesignPath(relativePath: string): string {
  return resolvePreviewAssetUri(relativePath);
}

export function hasDesignPreviewManifest(
  lineGuideId: string,
  sourcePageNumber: number,
): boolean {
  const manifest = DESIGN_MANIFESTS[lineGuideId];
  return !!manifest?.[String(sourcePageNumber)];
}

export function resolveDesignPreviewUri(params: {
  lineGuideId?: string | null;
  sourcePageNumber?: number | null;
}): string | null {
  const { lineGuideId, sourcePageNumber } = params;
  if (!lineGuideId || !sourcePageNumber || sourcePageNumber < 1) return null;

  const relativePath = DESIGN_MANIFESTS[lineGuideId]?.[String(sourcePageNumber)];
  if (!relativePath) return null;
  return resolveDesignPath(relativePath);
}

export function getDesignPreviewManifest(lineGuideId: string): DesignManifest | null {
  return DESIGN_MANIFESTS[lineGuideId] ?? null;
}
