import { resolveBundledPreviewUri } from '@/constants/generated/preview-asset-registry';
import { githubRawFileUrl } from '@/utils/githubRawAssets';

const remoteUriCache = new Map<string, string>();

/**
 * Preview PNG: bundled asset (instant) → GitHub raw (prod, cached by expo-image).
 */
export function resolvePreviewAssetUri(relativePath: string): string {
  const bundled = resolveBundledPreviewUri(relativePath);
  if (bundled) {
    remoteUriCache.set(relativePath, bundled);
    return bundled;
  }

  const cached = remoteUriCache.get(relativePath);
  if (cached) return cached;

  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }

  return githubRawFileUrl(relativePath);
}

export function isBundledPreviewUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('asset://') || uri.includes('localhost');
}
