#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(projectRoot, 'constants', 'photo-page-template-manifest.json');
const schemasPath = path.join(projectRoot, 'constants', 'generated', 'album-page-schemas.ts');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const schemasSource = fs.readFileSync(schemasPath, 'utf8');

const REQUIRED_FORMATS = ['18x24', '21x21'];
const EXPECTED_TEMPLATE_COUNT = 10;
const MAX_PHOTOS_PER_PAGE = 4;
const FREE_PAGE_MAX_TEXT_BLOCKS = 5;

const errors = [];

function fail(message) {
  errors.push(message);
}

const templateIds = Object.keys(manifest.meta ?? {});
if (templateIds.length !== EXPECTED_TEMPLATE_COUNT) {
  fail(`Expected ${EXPECTED_TEMPLATE_COUNT} templates, got ${templateIds.length}`);
}

for (const templateId of templateIds) {
  const templateByFormat = manifest.templates?.[templateId];
  if (!templateByFormat) {
    fail(`${templateId}: missing template layouts`);
    continue;
  }

  for (const format of REQUIRED_FORMATS) {
    const layout = templateByFormat[format];
    if (!layout) {
      fail(`${templateId}: missing ${format} layout`);
      continue;
    }

    const photoCount =
      (layout.photoSlots?.length ?? 0) + (layout.events?.length ?? 0);
    if (photoCount > MAX_PHOTOS_PER_PAGE) {
      fail(`${templateId}/${format}: ${photoCount} photos exceeds ${MAX_PHOTOS_PER_PAGE}`);
    }

    for (const block of layout.textBlocks ?? []) {
      if (block.maxLength != null && block.maxLength <= 0) {
        fail(`${templateId}/${format}/${block.id}: maxLength must be positive`);
      }
    }

    for (const event of layout.events ?? []) {
      for (const block of [event.date, event.description]) {
        if (block.maxLength != null && block.maxLength <= 0) {
          fail(`${templateId}/${format}/${block.id}: maxLength must be positive`);
        }
      }
    }

    if (layout.pageType === 'free_page') {
      if ((layout.limits?.maxPhotos ?? 0) > MAX_PHOTOS_PER_PAGE) {
        fail(`${templateId}/${format}: FreePage maxPhotos exceeds ${MAX_PHOTOS_PER_PAGE}`);
      }
      if ((layout.limits?.maxTextBlocks ?? 0) > FREE_PAGE_MAX_TEXT_BLOCKS) {
        fail(`${templateId}/${format}: FreePage maxTextBlocks exceeds ${FREE_PAGE_MAX_TEXT_BLOCKS}`);
      }
      if ((layout.limits?.maxRotationDegrees ?? 15) > 15) {
        fail(`${templateId}/${format}: FreePage rotation exceeds 15 degrees`);
      }
    }
  }
}

for (const albumId of ['family_blank', 'family_blank_21x21']) {
  if (!schemasSource.includes(`"${albumId}"`)) {
    fail(`Generated schemas do not include ${albumId}`);
  }
  if (!schemasSource.includes(`"lineGuideId": "${albumId}"`)) {
    fail(`Generated schemas do not include lineGuideId ${albumId}`);
  }
  if (!schemasSource.includes('"templateLibraryId": "SinglePhotoTemplate"')) {
    fail('Generated blank schemas must keep SinglePhotoTemplate as default');
  }
}

if (errors.length > 0) {
  console.error('Blank template compliance failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Blank template compliance passed: ${templateIds.length} templates × ${REQUIRED_FORMATS.length} formats`,
);
