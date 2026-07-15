const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../constants/photo-page-template-manifest.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const t = data.templates;

function set(templateId, format, patch) {
  const layout = t[templateId]?.[format];
  if (!layout) {
    console.warn('missing', templateId, format);
    return;
  }
  Object.assign(layout, patch);
}

set('SinglePhotoTemplate', '18x24', {
  photoSlots: [{ id: 'photo1', type: 'image', required: true, x: 0.06, y: 0.05, w: 0.88, h: 0.8 }],
  textBlocks: [
    { id: 'caption1', type: 'caption', required: false, maxLength: 32, x: 0.1, y: 0.87, w: 0.8, h: 0.06 },
  ],
});
set('SinglePhotoTemplate', '21x21', {
  photoSlots: [{ id: 'photo1', type: 'image', required: true, x: 0.06, y: 0.05, w: 0.88, h: 0.78 }],
  textBlocks: [
    { id: 'caption1', type: 'caption', required: false, maxLength: 120, x: 0.1, y: 0.86, w: 0.8, h: 0.06 },
  ],
});

set('TwoVerticalPhotosTemplate', '18x24', {
  photoSlots: [
    { id: 'photo1', type: 'image', required: true, x: 0.05, y: 0.05, w: 0.43, h: 0.8 },
    { id: 'photo2', type: 'image', required: true, x: 0.52, y: 0.05, w: 0.43, h: 0.8 },
  ],
  textBlocks: [
    { id: 'caption1', type: 'caption', required: false, maxLength: 80, x: 0.05, y: 0.87, w: 0.43, h: 0.06 },
    { id: 'caption2', type: 'caption', required: false, maxLength: 80, x: 0.52, y: 0.87, w: 0.43, h: 0.06 },
  ],
  perPhotoCaptions: true,
  pageType: 'caption_photo_page',
});
set('TwoVerticalPhotosTemplate', '21x21', {
  photoSlots: [
    { id: 'photo1', type: 'image', required: true, x: 0.05, y: 0.04, w: 0.43, h: 0.8 },
    { id: 'photo2', type: 'image', required: true, x: 0.52, y: 0.04, w: 0.43, h: 0.8 },
  ],
  textBlocks: [
    { id: 'caption1', type: 'caption', required: false, maxLength: 80, x: 0.05, y: 0.86, w: 0.43, h: 0.06 },
    { id: 'caption2', type: 'caption', required: false, maxLength: 80, x: 0.52, y: 0.86, w: 0.43, h: 0.06 },
  ],
  perPhotoCaptions: true,
  pageType: 'caption_photo_page',
});

set('TwoHorizontalPhotosTemplate', '18x24', {
  photoSlots: [
    { id: 'photo1', type: 'image', required: true, x: 0.06, y: 0.04, w: 0.88, h: 0.4 },
    { id: 'photo2', type: 'image', required: true, x: 0.06, y: 0.46, w: 0.88, h: 0.4 },
  ],
  textBlocks: [
    { id: 'caption1', type: 'caption', required: false, maxLength: 90, x: 0.1, y: 0.88, w: 0.8, h: 0.05 },
  ],
});
set('TwoHorizontalPhotosTemplate', '21x21', {
  photoSlots: [
    { id: 'photo1', type: 'image', required: true, x: 0.06, y: 0.03, w: 0.88, h: 0.38 },
    { id: 'photo2', type: 'image', required: true, x: 0.06, y: 0.48, w: 0.88, h: 0.38 },
  ],
  textBlocks: [
    { id: 'caption1', type: 'caption', required: false, maxLength: 90, x: 0.1, y: 0.42, w: 0.8, h: 0.045 },
    { id: 'caption2', type: 'caption', required: false, maxLength: 90, x: 0.1, y: 0.88, w: 0.8, h: 0.045 },
  ],
  perPhotoCaptions: true,
  pageType: 'caption_photo_page',
});

set('ThreePhotosTemplate', '18x24', {
  photoSlots: [
    { id: 'photo1', type: 'image', required: true, x: 0.06, y: 0.04, w: 0.88, h: 0.48 },
    { id: 'photo2', type: 'image', required: false, x: 0.06, y: 0.55, w: 0.42, h: 0.32 },
    { id: 'photo3', type: 'image', required: false, x: 0.52, y: 0.55, w: 0.42, h: 0.32 },
  ],
});
set('ThreePhotosTemplate', '21x21', {
  photoSlots: [
    { id: 'photo1', type: 'image', required: true, x: 0.06, y: 0.04, w: 0.88, h: 0.46 },
    { id: 'photo2', type: 'image', required: false, x: 0.06, y: 0.54, w: 0.42, h: 0.34 },
    { id: 'photo3', type: 'image', required: false, x: 0.52, y: 0.54, w: 0.42, h: 0.34 },
  ],
});

set('FourPhotosTemplate', '18x24', {
  photoSlots: [
    { id: 'photo1', type: 'image', required: false, x: 0.05, y: 0.05, w: 0.43, h: 0.4 },
    { id: 'photo2', type: 'image', required: false, x: 0.52, y: 0.05, w: 0.43, h: 0.4 },
    { id: 'photo3', type: 'image', required: false, x: 0.05, y: 0.48, w: 0.43, h: 0.4 },
    { id: 'photo4', type: 'image', required: false, x: 0.52, y: 0.48, w: 0.43, h: 0.4 },
  ],
  textBlocks: [
    { id: 'caption1', type: 'caption', required: false, maxLength: 120, x: 0.1, y: 0.9, w: 0.8, h: 0.05 },
  ],
});
set('FourPhotosTemplate', '21x21', {
  photoSlots: [
    { id: 'photo1', type: 'image', required: true, x: 0.05, y: 0.04, w: 0.43, h: 0.4 },
    { id: 'photo2', type: 'image', required: true, x: 0.52, y: 0.04, w: 0.43, h: 0.4 },
    { id: 'photo3', type: 'image', required: true, x: 0.05, y: 0.48, w: 0.43, h: 0.4 },
    { id: 'photo4', type: 'image', required: true, x: 0.52, y: 0.48, w: 0.43, h: 0.4 },
  ],
  textBlocks: [
    { id: 'caption1', type: 'caption', required: false, maxLength: 120, x: 0.1, y: 0.9, w: 0.8, h: 0.05 },
  ],
});

set('CaptionGalleryTemplate', '18x24', {
  photoSlots: [
    { id: 'photo1', type: 'image', required: false, x: 0.05, y: 0.04, w: 0.43, h: 0.34 },
    { id: 'photo2', type: 'image', required: false, x: 0.52, y: 0.04, w: 0.43, h: 0.34 },
    { id: 'photo3', type: 'image', required: false, x: 0.05, y: 0.48, w: 0.43, h: 0.34 },
    { id: 'photo4', type: 'image', required: false, x: 0.52, y: 0.48, w: 0.43, h: 0.34 },
  ],
  textBlocks: [
    { id: 'caption1', type: 'caption', required: false, maxLength: 70, x: 0.05, y: 0.39, w: 0.43, h: 0.06 },
    { id: 'caption2', type: 'caption', required: false, maxLength: 70, x: 0.52, y: 0.39, w: 0.43, h: 0.06 },
    { id: 'caption3', type: 'caption', required: false, maxLength: 70, x: 0.05, y: 0.83, w: 0.43, h: 0.06 },
    { id: 'caption4', type: 'caption', required: false, maxLength: 70, x: 0.52, y: 0.83, w: 0.43, h: 0.06 },
  ],
  perPhotoCaptions: true,
  pageType: 'caption_photo_page',
});
set('CaptionGalleryTemplate', '21x21', {
  photoSlots: [
    { id: 'photo1', type: 'image', required: true, x: 0.05, y: 0.03, w: 0.43, h: 0.34 },
    { id: 'photo2', type: 'image', required: true, x: 0.52, y: 0.03, w: 0.43, h: 0.34 },
    { id: 'photo3', type: 'image', required: true, x: 0.05, y: 0.47, w: 0.43, h: 0.34 },
    { id: 'photo4', type: 'image', required: true, x: 0.52, y: 0.47, w: 0.43, h: 0.34 },
  ],
  textBlocks: [
    { id: 'caption1', type: 'caption', required: false, maxLength: 70, x: 0.05, y: 0.38, w: 0.43, h: 0.06 },
    { id: 'caption2', type: 'caption', required: false, maxLength: 70, x: 0.52, y: 0.38, w: 0.43, h: 0.06 },
    { id: 'caption3', type: 'caption', required: false, maxLength: 70, x: 0.05, y: 0.82, w: 0.43, h: 0.06 },
    { id: 'caption4', type: 'caption', required: false, maxLength: 70, x: 0.52, y: 0.82, w: 0.43, h: 0.06 },
  ],
  perPhotoCaptions: true,
  pageType: 'caption_photo_page',
});

set('PhotoStoryTemplate', '18x24', {
  photoSlots: [{ id: 'photo1', type: 'image', required: true, x: 0.06, y: 0.04, w: 0.88, h: 0.52 }],
});
set('PhotoStoryTemplate', '21x21', {
  photoSlots: [{ id: 'photo1', type: 'image', required: true, x: 0.06, y: 0.04, w: 0.88, h: 0.52 }],
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
console.log('Updated blank photo templates OK');
