#!/usr/bin/env node
/**
 * Verify preview variant manifests cover all photo pages in schemas.
 * node scripts/verify-preview-variants.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
    return;
  }
  console.log(`OK: ${message}`);
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

const photoPages = readJson('constants/photo-pages-by-album.json');
const pregnancyManifest = readJson(
  'assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/preview_variants/pregnancy_60_variants_manifest.json',
);
const kidsManifest = readJson(
  'assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/preview_variants/kids_48_variants_manifest.json',
);

const manifests = {
  pregnancy_60: pregnancyManifest,
  kids_48: kidsManifest,
};

for (const [albumId, pages] of Object.entries(photoPages)) {
  const manifest = manifests[albumId];
  if (!manifest) continue;

  for (const page of pages) {
    const key = String(page);
    assert(manifest[key], `${albumId} page ${page}: manifest entry exists`);
    if (manifest[key]) {
      const variantCount = Object.keys(manifest[key]).length;
      assert(variantCount >= 1, `${albumId} page ${page}: at least 1 variant (${variantCount})`);
    }
  }
}

const designManifest = readJson(
  'assets/pdfs/Блок БЕРЕМЕННОСТЬ 60 стр/design_previews/pregnancy_60_design_manifest.json',
);
assert(Object.keys(designManifest).length === 60, 'pregnancy_60 design manifest: 60 pages');
assert(designManifest['1'], 'pregnancy_60 design manifest: page 1');

const kidsDesignManifest = readJson(
  'assets/pdfs/Блок БОХО_ДЕТ.ФОТОАЛЬБОМ_ 48 стр/design_previews/kids_48_design_manifest.json',
);
assert(Object.keys(kidsDesignManifest).length === 48, 'kids_48 design manifest: 48 pages');

const designPreviewSource = fs.readFileSync(
  path.join(root, 'utils/designPreview.ts'),
  'utf8',
);
assert(designPreviewSource.includes('resolveDesignPreviewUri'), 'designPreview: resolveDesignPreviewUri');

const pagePreviewBgSource = fs.readFileSync(
  path.join(root, 'utils/pagePreviewBackground.ts'),
  'utf8',
);
assert(pagePreviewBgSource.includes("quality?: 'full' | 'thumbnail'"), 'pagePreviewBackground: quality modes');
assert(pagePreviewBgSource.includes('preferCleanPhotoBackground'), 'pagePreviewBackground: clean photo background');
assert(pagePreviewBgSource.includes('resolvePageOutputBackgroundUri'), 'pagePreviewBackground: output background helper');
assert(pagePreviewBgSource.includes('resolvePhotoPageCleanBackgroundUri'), 'pagePreviewBackground: per-page variant PNG');
assert(pagePreviewBgSource.includes("quality === 'thumbnail'"), 'pagePreviewBackground: thumbnail vs full quality modes');
assert(
  pagePreviewBgSource.includes('hasVariantPreviewManifest'),
  'pagePreviewBackground: sparse pages prefer per-page variant for layout preview',
);

const registrySource = fs.readFileSync(
  path.join(root, 'constants/generated/preview-asset-registry.ts'),
  'utf8',
);
assert(registrySource.includes('resolveBundledPreviewUri'), 'preview-asset-registry exists');
assert(registrySource.includes('PREVIEW_ASSET_COUNT'), 'preview-asset-registry count');

const previewAssetUriSource = fs.readFileSync(path.join(root, 'utils/previewAssetUri.ts'), 'utf8');
assert(previewAssetUriSource.includes('resolveBundledPreviewUri'), 'previewAssetUri: bundled first');

const previewScreenSource = fs.readFileSync(path.join(root, 'app/album-page-preview.tsx'), 'utf8');
assert(previewScreenSource.includes("quality: 'full'"), 'album-page-preview: full-quality background');
assert(previewScreenSource.includes('preferCleanPhotoBackground'), 'album-page-preview: clean photo background');
assert(previewScreenSource.includes('PageRenderer'), 'album-page-preview: PageRenderer for export parity');

const unifiedEditorSource = fs.readFileSync(
  path.join(root, 'components/album/album-page-unified-editor.tsx'),
  'utf8',
);
assert(unifiedEditorSource.includes('AlbumVariantBar'), 'unified editor: VariantBar');
assert(unifiedEditorSource.includes('AlbumPhotoSlotGrid'), 'unified editor: PhotoSlotGrid');

// Runtime API surface
const variantPreviewSource = fs.readFileSync(
  path.join(root, 'utils/variantPreview.ts'),
  'utf8',
);
assert(variantPreviewSource.includes('kids_48'), 'variantPreview: kids_48 manifest');
assert(
  variantPreviewSource.includes('getVariantPreviewThumbnails'),
  'variantPreview: getVariantPreviewThumbnails',
);
assert(
  variantPreviewSource.includes('getDefaultVariantIdForPage'),
  'variantPreview: getDefaultVariantIdForPage',
);

const adapterSource = fs.readFileSync(path.join(root, 'utils/pageValuesAdapter.ts'), 'utf8');
assert(adapterSource.includes('photoSlotTransforms'), 'pageValuesAdapter: photoSlotTransforms');
assert(adapterSource.includes('imageSlotTransform'), 'pageValuesAdapter: imageSlotTransform');

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll preview variant checks passed.');
