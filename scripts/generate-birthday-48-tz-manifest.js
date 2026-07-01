#!/usr/bin/env node
/**
 * Generates scripts/birthday-48-tz-manifest.json from birthday-48-field-specs helpers.
 */
const fs = require('fs');
const path = require('path');
const {
  getBirthday48PageTitle,
  isBirthdayFreePage,
  isTravelPhotoPage,
  isYearMainPage,
} = require('./birthday-48-field-specs');

const root = path.join(__dirname, '..');
const outPath = path.join(root, 'scripts', 'birthday-48-tz-manifest.json');

function pageEntry(pageNumber) {
  const title = getBirthday48PageTitle(pageNumber);
  if (pageNumber === 1) {
    return {
      title,
      pageType: 'structured',
      editable: true,
      canDuplicate: false,
      hasPhoto: false,
    };
  }
  if (pageNumber === 2) {
    return {
      title,
      pageType: 'structured',
      editable: true,
      canDuplicate: false,
      hasPhoto: true,
    };
  }
  if (pageNumber === 3 || pageNumber === 5 || (pageNumber >= 7 && pageNumber <= 39 && pageNumber % 2 === 1)) {
    return {
      title,
      pageType: 'birthday_free_page',
      editable: true,
      canDuplicate: true,
      hasPhoto: true,
    };
  }
  if (pageNumber === 4 || isYearMainPage(pageNumber)) {
    return {
      title,
      pageType: 'structured',
      editable: true,
      canDuplicate: false,
      hasPhoto: true,
    };
  }
  if (pageNumber === 40) {
    return {
      title,
      pageType: 'travel_map_page',
      editable: true,
      canDuplicate: false,
      hasPhoto: false,
    };
  }
  if (isTravelPhotoPage(pageNumber)) {
    return {
      title: 'Свободная фотостраница',
      pageType: 'caption_photo_page',
      editable: true,
      canDuplicate: true,
      hasPhoto: true,
    };
  }
  if (pageNumber === 48) {
    return {
      title,
      pageType: 'text_page',
      editable: true,
      canDuplicate: false,
      hasPhoto: false,
    };
  }
  return {
    title,
    pageType: 'structured',
    editable: true,
    canDuplicate: false,
    hasPhoto: false,
  };
}

const manifest = {};
for (let page = 1; page <= 48; page += 1) {
  manifest[String(page)] = pageEntry(page);
}

fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outPath} (${Object.keys(manifest).length} pages)`);
