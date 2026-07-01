/* eslint-disable no-console */
/**
 * Builds constants/photo-page-template-manifest.json from TZ coordinates.
 * node scripts/build-photo-page-template-manifest.js
 */
const fs = require('fs');
const path = require('path');

function frame(x, y, w, h, extra = {}) {
  return { x, y, w, h, ...extra };
}

function slot(id, x, y, w, h, required = true) {
  return { id, type: 'image', required, ...frame(x, y, w, h) };
}

function text(id, type, x, y, w, h, maxLength, required = false) {
  return { id, type, required, maxLength, ...frame(x, y, w, h) };
}

function event(id, photo, dateY, descY, h = 0.18) {
  return {
    id,
    photo: slot(`${id}_photo`, 0.09, photo, 0.28, h, false),
    date: text(`${id}_date`, 'date', 0.41, dateY, 0.54, 0.04, 30),
    description: text(`${id}_description`, 'longText', 0.41, descY + 0.05, 0.54, h - 0.05, 200),
  };
}

const LAYOUTS_18X24 = {
  SinglePhotoTemplate: {
    photoSlots: [slot('photo1', 0.08, 0.1, 0.84, 0.72)],
    textBlocks: [text('caption1', 'caption', 0.12, 0.84, 0.76, 0.06, 120)],
    minFilledRule: { minPhotos: 1 },
    pageType: 'photo',
  },
  PhotoStoryTemplate: {
    photoSlots: [slot('photo1', 0.08, 0.1, 0.84, 0.46)],
    textBlocks: [
      text('title', 'title', 0.12, 0.6, 0.76, 0.07, 80),
      text('story', 'longText', 0.12, 0.68, 0.76, 0.22, 700),
    ],
    minFilledRule: { minPhotos: 1 },
    pageType: 'free',
  },
  TwoVerticalPhotosTemplate: {
    photoSlots: [
      slot('photo1', 0.08, 0.13, 0.39, 0.68),
      slot('photo2', 0.53, 0.13, 0.39, 0.68),
    ],
    textBlocks: [
      text('caption1', 'caption', 0.08, 0.83, 0.39, 0.05, 80),
      text('caption2', 'caption', 0.53, 0.83, 0.39, 0.05, 80),
    ],
    minFilledRule: { minPhotos: 2 },
    pageType: 'photo',
  },
  TwoHorizontalPhotosTemplate: {
    photoSlots: [
      slot('photo1', 0.08, 0.12, 0.84, 0.32),
      slot('photo2', 0.08, 0.49, 0.84, 0.32),
    ],
    textBlocks: [text('caption1', 'caption', 0.12, 0.84, 0.76, 0.06, 90)],
    minFilledRule: { minPhotos: 2 },
    pageType: 'photo',
  },
  ThreePhotosTemplate: {
    photoSlots: [
      slot('photo1', 0.08, 0.1, 0.84, 0.42),
      slot('photo2', 0.08, 0.56, 0.4, 0.29, false),
      slot('photo3', 0.52, 0.56, 0.4, 0.29, false),
    ],
    textBlocks: [text('caption1', 'caption', 0.12, 0.88, 0.76, 0.05, 120)],
    minFilledRule: { minPhotos: 1 },
    pageType: 'photo',
  },
  FourPhotosTemplate: {
    photoSlots: [
      slot('photo1', 0.08, 0.12, 0.4, 0.32, false),
      slot('photo2', 0.52, 0.12, 0.4, 0.32, false),
      slot('photo3', 0.08, 0.48, 0.4, 0.32, false),
      slot('photo4', 0.52, 0.48, 0.4, 0.32, false),
    ],
    textBlocks: [text('caption1', 'caption', 0.12, 0.84, 0.76, 0.06, 120)],
    minFilledRule: { minPhotos: 1 },
    pageType: 'photo',
  },
  CaptionGalleryTemplate: {
    photoSlots: [
      slot('photo1', 0.08, 0.1, 0.4, 0.25, false),
      slot('photo2', 0.52, 0.1, 0.4, 0.25, false),
      slot('photo3', 0.08, 0.46, 0.4, 0.25, false),
      slot('photo4', 0.52, 0.46, 0.4, 0.25, false),
    ],
    textBlocks: [
      text('caption1', 'caption', 0.08, 0.36, 0.4, 0.05, 70),
      text('caption2', 'caption', 0.52, 0.36, 0.4, 0.05, 70),
      text('caption3', 'caption', 0.08, 0.72, 0.4, 0.05, 70),
      text('caption4', 'caption', 0.52, 0.72, 0.4, 0.05, 70),
    ],
    minFilledRule: { minPhotos: 1 },
    pageType: 'caption_photo_page',
    perPhotoCaptions: true,
  },
  TimelineTemplate: {
    events: [
      event('event1', 0.12, 0.12, 0.12),
      event('event2', 0.39, 0.39, 0.39),
      event('event3', 0.66, 0.66, 0.66),
    ],
    minFilledRule: { minTimelineEvents: 1 },
    pageType: 'timeline_page',
  },
  TextPageTemplate: {
    photoSlots: [],
    textBlocks: [
      text('title', 'title', 0.12, 0.14, 0.76, 0.1, 90),
      text('body', 'longText', 0.12, 0.28, 0.76, 0.58, 1800),
    ],
    minFilledRule: { minTextFields: 1 },
    pageType: 'text_page',
  },
  FreePageTemplate: {
    freeCanvas: { x: 0.06, y: 0.06, w: 0.88, h: 0.88 },
    limits: { maxPhotos: 4, maxTextBlocks: 5, maxRotationDegrees: 15 },
    minFilledRule: { minAnyContent: true },
    pageType: 'free_page',
  },
};

function scale1000(v) {
  return Math.round(v) / 1000;
}

/** 21×21 cm page — 15 mm margin on all sides (customer TZ). */
const PAGE21_MM = 210;
const MARGIN21_MM = 15;
const INNER21_MM = PAGE21_MM - MARGIN21_MM * 2;

function n21(mm) {
  return mm / PAGE21_MM;
}

function slot21(id, xMm, yMm, wMm, hMm, required = true) {
  return slot(id, n21(xMm), n21(yMm), n21(wMm), n21(hMm), required);
}

function text21(id, type, xMm, yMm, wMm, hMm, maxLength, required = false) {
  return text(id, type, n21(xMm), n21(yMm), n21(wMm), n21(hMm), maxLength, required);
}

function from21(slots, texts, extra = {}) {
  return {
    photoSlots: slots ?? [],
    textBlocks: texts ?? [],
    ...extra,
  };
}

function event21(id, photoYmm, dateYmm, descYmm, photoHmm = 38) {
  const photoWmm = 58;
  return {
    id,
    photo: slot21(`${id}_photo`, MARGIN21_MM, photoYmm, photoWmm, photoHmm, false),
    date: text21(`${id}_date`, 'date', MARGIN21_MM + photoWmm + 4, dateYmm, INNER21_MM - photoWmm - 4, 8, 30),
    description: text21(
      `${id}_description`,
      'longText',
      MARGIN21_MM + photoWmm + 4,
      descYmm,
      INNER21_MM - photoWmm - 4,
      photoHmm - 4,
      200,
    ),
  };
}

const LAYOUTS_21X21 = {
  SinglePhotoTemplate: from21(
    [slot21('photo1', MARGIN21_MM, 12, INNER21_MM, 148)],
    [text21('caption1', 'caption', MARGIN21_MM, 168, INNER21_MM, 22, 120)],
    { minFilledRule: { minPhotos: 1 }, pageType: 'photo' },
  ),
  PhotoStoryTemplate: from21(
    [slot21('photo1', MARGIN21_MM, 12, INNER21_MM, 88)],
    [
      text21('title', 'title', MARGIN21_MM, 106, INNER21_MM, 14, 80),
      text21('story', 'longText', MARGIN21_MM, 123, INNER21_MM, 67, 700),
    ],
    { minFilledRule: { minPhotos: 1 }, pageType: 'free' },
  ),
  TwoVerticalPhotosTemplate: from21(
    [
      slot21('photo1', MARGIN21_MM, 12, 86, 148),
      slot21('photo2', MARGIN21_MM + 94, 12, 86, 148),
    ],
    [
      text21('caption1', 'caption', MARGIN21_MM, 166, 86, 18, 80),
      text21('caption2', 'caption', MARGIN21_MM + 94, 166, 86, 18, 80),
    ],
    { minFilledRule: { minPhotos: 2 }, pageType: 'photo' },
  ),
  TwoHorizontalPhotosTemplate: from21(
    [
      slot21('photo1', MARGIN21_MM, 12, INNER21_MM, 72),
      slot21('photo2', MARGIN21_MM, 92, INNER21_MM, 72),
    ],
    [
      text21('caption1', 'caption', MARGIN21_MM, 84, INNER21_MM, 10, 90),
      text21('caption2', 'caption', MARGIN21_MM, 164, INNER21_MM, 10, 90),
    ],
    { minFilledRule: { minPhotos: 2 }, pageType: 'photo' },
  ),
  ThreePhotosTemplate: from21(
    [
      slot21('photo1', MARGIN21_MM, 12, INNER21_MM, 92),
      slot21('photo2', MARGIN21_MM, 112, 86, 58),
      slot21('photo3', MARGIN21_MM + 94, 112, 86, 58),
    ],
    [text21('caption1', 'caption', MARGIN21_MM, 176, INNER21_MM, 12, 120)],
    { minFilledRule: { minPhotos: 1 }, pageType: 'photo' },
  ),
  FourPhotosTemplate: from21(
    [
      slot21('photo1', MARGIN21_MM, 12, 86, 72),
      slot21('photo2', MARGIN21_MM + 94, 12, 86, 72),
      slot21('photo3', MARGIN21_MM, 92, 86, 72),
      slot21('photo4', MARGIN21_MM + 94, 92, 86, 72),
    ],
    [text21('caption1', 'caption', MARGIN21_MM, 170, INNER21_MM, 14, 120)],
    { minFilledRule: { minPhotos: 1 }, pageType: 'photo' },
  ),
  CaptionGalleryTemplate: from21(
    [
      slot21('photo1', MARGIN21_MM, 12, 86, 58),
      slot21('photo2', MARGIN21_MM + 94, 12, 86, 58),
      slot21('photo3', MARGIN21_MM, 88, 86, 58),
      slot21('photo4', MARGIN21_MM + 94, 88, 86, 58),
    ],
    [
      text21('caption1', 'caption', MARGIN21_MM, 72, 86, 12, 70),
      text21('caption2', 'caption', MARGIN21_MM + 94, 72, 86, 12, 70),
      text21('caption3', 'caption', MARGIN21_MM, 148, 86, 12, 70),
      text21('caption4', 'caption', MARGIN21_MM + 94, 148, 86, 12, 70),
    ],
    { minFilledRule: { minPhotos: 1 }, pageType: 'caption_photo_page', perPhotoCaptions: true },
  ),
  TimelineTemplate: {
    events: [event21('event1', 12, 14, 16), event21('event2', 72, 74, 76), event21('event3', 132, 134, 136)],
    minFilledRule: { minTimelineEvents: 1 },
    pageType: 'timeline_page',
  },
  TextPageTemplate: from21(
    [],
    [
      text21('title', 'title', MARGIN21_MM, 12, INNER21_MM, 18, 90),
      text21('body', 'longText', MARGIN21_MM, 34, INNER21_MM, 156, 1800),
    ],
    { minFilledRule: { minTextFields: 1 }, pageType: 'text_page' },
  ),
  FreePageTemplate: {
    freeCanvas: { x: n21(MARGIN21_MM), y: n21(MARGIN21_MM), w: n21(INNER21_MM), h: n21(INNER21_MM) },
    limits: { maxPhotos: 4, maxTextBlocks: 5, maxRotationDegrees: 15 },
    minFilledRule: { minAnyContent: true },
    pageType: 'free_page',
  },
};

const TEMPLATE_META = {
  SinglePhotoTemplate: { title: 'Большое фото', description: 'Одно крупное фото с подписью', maxPhotos: 1 },
  PhotoStoryTemplate: { title: 'Фото + история', description: 'Фото, заголовок и текст истории', maxPhotos: 1 },
  TwoVerticalPhotosTemplate: { title: 'Два фото вертикально', description: 'Два портретных фото рядом', maxPhotos: 2 },
  TwoHorizontalPhotosTemplate: { title: 'Два фото горизонтально', description: 'Два фото друг под другом', maxPhotos: 2 },
  ThreePhotosTemplate: { title: 'Три фото', description: 'Одно большое и два маленьких', maxPhotos: 3 },
  FourPhotosTemplate: { title: 'Четыре фото', description: 'Сетка 2×2', maxPhotos: 4 },
  CaptionGalleryTemplate: { title: 'Фото + подписи', description: 'Четыре фото с подписями', maxPhotos: 4 },
  TimelineTemplate: { title: 'Хронология события', description: 'Три события с датой и текстом', maxPhotos: 3 },
  TextPageTemplate: { title: 'Текстовая страница', description: 'Заголовок и большой текст', maxPhotos: 0 },
  FreePageTemplate: { title: 'Свободная страница', description: 'До 4 фото и 5 текстовых блоков', maxPhotos: 4 },
};

const manifest = { templates: {}, meta: TEMPLATE_META };

for (const templateId of Object.keys(TEMPLATE_META)) {
  manifest.templates[templateId] = {
    '18x24': LAYOUTS_18X24[templateId],
    '21x21': LAYOUTS_21X21[templateId],
  };
}

const outPath = path.join(__dirname, '..', 'constants', 'photo-page-template-manifest.json');
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log('Wrote', outPath);
