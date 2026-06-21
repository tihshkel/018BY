import { resolvePreviewAssetUri } from '@/utils/previewAssetUri';

import kids48DesignManifestJson from '@/constants/generated/kids-48-design-manifest.json';
import pregnancy60DesignManifestJson from '@/constants/generated/pregnancy-60-design-manifest.json';

type DesignManifest = Record<string, string>;

const pregnancy60DesignManifest = pregnancy60DesignManifestJson as DesignManifest;

const kids48DesignManifest = kids48DesignManifestJson as DesignManifest;

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
