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

function from21(slots, texts, extra = {}) {
  return {
    photoSlots: (slots ?? []).map((s) =>
      slot(s.id, scale1000(s.frame.x), scale1000(s.frame.y), scale1000(s.frame.w), scale1000(s.frame.h), s.required !== false),
    ),
    textBlocks: (texts ?? []).map((t) =>
      text(t.id, t.type, scale1000(t.frame.x), scale1000(t.frame.y), scale1000(t.frame.w), scale1000(t.frame.h), t.maxLength ?? 120, t.required === true),
    ),
    ...extra,
  };
}

const LAYOUTS_21X21 = {
  SinglePhotoTemplate: from21(
    [{ id: 'photo1', required: true, frame: { x: 90, y: 100, w: 820, h: 700 } }],
    [{ id: 'caption1', type: 'caption', maxLength: 120, frame: { x: 140, y: 830, w: 720, h: 60 } }],
    { minFilledRule: { minPhotos: 1 }, pageType: 'photo' },
  ),
  PhotoStoryTemplate: from21(
    [{ id: 'photo1', required: true, frame: { x: 90, y: 90, w: 820, h: 480 } }],
    [
      { id: 'title', type: 'title', maxLength: 80, frame: { x: 90, y: 610, w: 820, h: 60 } },
      { id: 'story', type: 'longText', maxLength: 700, frame: { x: 90, y: 690, w: 820, h: 220 } },
    ],
    { minFilledRule: { minPhotos: 1 }, pageType: 'free' },
  ),
  TwoVerticalPhotosTemplate: from21(
    [
      { id: 'photo1', frame: { x: 90, y: 120, w: 390, h: 640 } },
      { id: 'photo2', frame: { x: 520, y: 120, w: 390, h: 640 } },
    ],
    [
      { id: 'caption1', type: 'caption', maxLength: 80, frame: { x: 90, y: 790, w: 390, h: 60 } },
      { id: 'caption2', type: 'caption', maxLength: 80, frame: { x: 520, y: 790, w: 390, h: 60 } },
    ],
    { minFilledRule: { minPhotos: 2 }, pageType: 'photo' },
  ),
  TwoHorizontalPhotosTemplate: from21(
    [
      { id: 'photo1', frame: { x: 90, y: 100, w: 820, h: 330 } },
      { id: 'photo2', frame: { x: 90, y: 510, w: 820, h: 330 } },
    ],
    [
      { id: 'caption1', type: 'caption', maxLength: 90, frame: { x: 120, y: 445, w: 760, h: 45 } },
      { id: 'caption2', type: 'caption', maxLength: 90, frame: { x: 120, y: 855, w: 760, h: 45 } },
    ],
    { minFilledRule: { minPhotos: 2 }, pageType: 'photo' },
  ),
  ThreePhotosTemplate: from21(
    [
      { id: 'photo1', frame: { x: 90, y: 90, w: 820, h: 420 } },
      { id: 'photo2', frame: { x: 90, y: 550, w: 390, h: 260 } },
      { id: 'photo3', frame: { x: 520, y: 550, w: 390, h: 260 } },
    ],
    [{ id: 'caption1', type: 'caption', maxLength: 120, frame: { x: 120, y: 845, w: 760, h: 55 } }],
    { minFilledRule: { minPhotos: 1 }, pageType: 'photo' },
  ),
  FourPhotosTemplate: from21(
    [
      { id: 'photo1', frame: { x: 90, y: 100, w: 390, h: 330 } },
      { id: 'photo2', frame: { x: 520, y: 100, w: 390, h: 330 } },
      { id: 'photo3', frame: { x: 90, y: 470, w: 390, h: 330 } },
      { id: 'photo4', frame: { x: 520, y: 470, w: 390, h: 330 } },
    ],
    [{ id: 'caption1', type: 'caption', maxLength: 120, frame: { x: 120, y: 840, w: 760, h: 55 } }],
    { minFilledRule: { minPhotos: 1 }, pageType: 'photo' },
  ),
  CaptionGalleryTemplate: from21(
    [
      { id: 'photo1', frame: { x: 90, y: 90, w: 370, h: 250 } },
      { id: 'photo2', frame: { x: 540, y: 90, w: 370, h: 250 } },
      { id: 'photo3', frame: { x: 90, y: 450, w: 370, h: 250 } },
      { id: 'photo4', frame: { x: 540, y: 450, w: 370, h: 250 } },
    ],
    [
      { id: 'caption1', type: 'caption', maxLength: 70, frame: { x: 90, y: 355, w: 370, h: 50 } },
      { id: 'caption2', type: 'caption', maxLength: 70, frame: { x: 540, y: 355, w: 370, h: 50 } },
      { id: 'caption3', type: 'caption', maxLength: 70, frame: { x: 90, y: 715, w: 370, h: 50 } },
      { id: 'caption4', type: 'caption', maxLength: 70, frame: { x: 540, y: 715, w: 370, h: 50 } },
    ],
    { minFilledRule: { minPhotos: 1 }, pageType: 'caption_photo_page', perPhotoCaptions: true },
  ),
  TimelineTemplate: {
    events: [
      event('event1', 0.09, 0.09, 0.09, 0.18),
      event('event2', 0.39, 0.39, 0.39, 0.18),
      event('event3', 0.69, 0.69, 0.69, 0.18),
    ],
    minFilledRule: { minTimelineEvents: 1 },
    pageType: 'timeline_page',
  },
  TextPageTemplate: from21(
    [],
    [
      { id: 'title', type: 'title', maxLength: 90, frame: { x: 90, y: 100, w: 820, h: 90 } },
      { id: 'body', type: 'longText', maxLength: 1800, frame: { x: 120, y: 230, w: 760, h: 600 } },
    ],
    { minFilledRule: { minTextFields: 1 }, pageType: 'text_page' },
  ),
  FreePageTemplate: {
    freeCanvas: { x: 0.06, y: 0.06, w: 0.88, h: 0.88 },
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
