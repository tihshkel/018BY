#!/usr/bin/env node
/**
 * Resolves expected field labels for a page — TZ builders primary, album-page-content fallback.
 */
const fs = require('fs');
const path = require('path');
const { applyKids48TzManifest } = require('./kids-48-tz-builders');
const { applyDiary60TzManifest } = require('./diary-60-tz-builders');
const { applyGirlsDiaryA5TzManifest } = require('./girls-diary-a5-tz-builders');
const { applyPregnancy60PageFields } = require('./pregnancy-60-tz-builders');
const { applyPregnancyA5PageFields } = require('./pregnancy-a5-tz-builders');
const { applyHolidaysBirthday60PageFields } = require('./holidays-birthday-60-tz-builders');

const TZ_ALBUMS = new Set([
  'kids_48',
  'diary_interior_brown',
  'diary_interior_purple',
  'pregnancy_60',
  'pregnancy_a5',
  'holidays_birthday_60',
]);

function loadJson(root, rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

function resolveExpectedFields(albumId, pageNumber, slots, resources) {
  const pageKey = String(pageNumber);
  const {
    kidsTzManifest,
    diary60TzManifest,
    girlsDiaryA5TzManifest,
    pageContent,
  } = resources;

  if (albumId === 'kids_48' && kidsTzManifest[pageKey]) {
    const tz = applyKids48TzManifest(pageNumber, slots, kidsTzManifest[pageKey], albumId);
    if (tz?.fields) return { source: 'tz', fields: tz.fields };
    if (tz?.replaceFields) return { source: 'tz', fields: tz.fields ?? [] };
  }

  if (albumId === 'diary_interior_brown' && diary60TzManifest[pageKey]) {
    const tz = applyDiary60TzManifest(pageNumber, slots, diary60TzManifest[pageKey], albumId);
    if (tz) return { source: 'tz', fields: tz.fields ?? [] };
  }

  if (albumId === 'diary_interior_purple' && girlsDiaryA5TzManifest[pageKey]) {
    const tz = applyGirlsDiaryA5TzManifest(pageNumber, slots, girlsDiaryA5TzManifest[pageKey], albumId);
    if (tz) return { source: 'tz', fields: tz.fields ?? [] };
  }

  if (albumId === 'pregnancy_60') {
    const tz = applyPregnancy60PageFields(pageNumber, albumId, slots);
    if (tz) return { source: 'tz', fields: tz.fields ?? [] };
  }

  if (albumId === 'pregnancy_a5') {
    const tz = applyPregnancyA5PageFields(pageNumber, albumId, slots);
    if (tz) return { source: 'tz', fields: tz.fields ?? [] };
  }

  if (albumId === 'holidays_birthday_60') {
    const tz = applyHolidaysBirthday60PageFields(pageNumber);
    if (tz) return { source: 'tz', fields: tz.fields ?? [] };
  }

  const content = pageContent[albumId]?.[pageKey];
  if (content?.fields?.length) {
    return {
      source: 'content',
      fields: content.fields.map((field) => ({
        label: field.label,
        type: field.type,
        templateLineStart: field.templateLineStart,
        templateLineCount: field.templateLineCount ?? 1,
      })),
    };
  }

  return { source: 'none', fields: [] };
}

function loadFieldLabelResources(root) {
  return {
    kidsTzManifest: loadJson(root, 'constants/kids-48-tz-manifest.json'),
    diary60TzManifest: loadJson(root, 'scripts/diary-60-tz-manifest.json'),
    girlsDiaryA5TzManifest: loadJson(root, 'scripts/girls-diary-a5-tz-manifest.json'),
    pageContent: fs.existsSync(path.join(root, 'constants/album-page-content.json'))
      ? loadJson(root, 'constants/album-page-content.json')
      : {},
  };
}

function normalizeLabel(label) {
  return String(label ?? '')
    .replace(/\u0000/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isGenericLabel(label) {
  return /^поле \d+$/i.test(String(label ?? '').trim());
}

module.exports = {
  TZ_ALBUMS,
  resolveExpectedFields,
  loadFieldLabelResources,
  normalizeLabel,
  isGenericLabel,
};
