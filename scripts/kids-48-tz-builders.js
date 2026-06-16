/**
 * Field/photo builders for kids_48 TZ manifest — used by generate-page-schemas.js
 */

const {
  EVENT_PHOTO_BLOCK,
  PARENTS_PHOTO_BLOCK,
  GODPARENTS_PHOTO_BLOCK,
} = require('./photo-block-presets-data');

const FAMILY_TREE_PHOTO_BLOCK = {
  blockId: 'family_tree_photos',
  label: 'Фото родственников',
  layoutKind: 'circle_tree',
  variants: [
    {
      variantId: 'tree',
      label: 'Семейное дерево',
      slots: 15,
      slotIndices: Array.from({ length: 15 }, (_, index) => index),
    },
  ],
};

const TEETH_SLOT_IDS = [
  'upper_01_left_outer_molar_8',
  'upper_02_left_molar_5',
  'upper_03_left_canine_7',
  'upper_04_left_lateral_3',
  'upper_05_left_central_2',
  'upper_06_right_central_2',
  'upper_07_right_lateral_3',
  'upper_08_right_canine_7',
  'upper_09_right_molar_5',
  'upper_10_right_outer_molar_8',
  'lower_01_left_outer_molar_8',
  'lower_02_left_molar_6',
  'lower_03_left_canine_7',
  'lower_04_left_lateral_4',
  'lower_05_left_central_1',
  'lower_06_right_central_1',
  'lower_07_right_lateral_4',
  'lower_08_right_canine_7',
  'lower_09_right_molar_6',
  'lower_10_right_outer_molar_8',
];

function buildTeethFields(lineGuideId, pageNumber, slots) {
  const fields = TEETH_SLOT_IDS.map((id, index) => ({
    fieldId: `${lineGuideId}_p${pageNumber}_${id}`,
    label: id.replace(/_/g, ' '),
    type: 'date',
    required: false,
    templateLineStart: Math.min(index, (slots?.length ?? 1) - 1),
    templateLineCount: 1,
  }));
  fields.push({
    fieldId: `${lineGuideId}_p${pageNumber}_first_brushing`,
    label: 'Первая чистка зубов',
    type: 'date',
    required: false,
    templateLineStart: Math.max(0, (slots?.length ?? 22) - 2),
    templateLineCount: 1,
  });
  fields.push({
    fieldId: `${lineGuideId}_p${pageNumber}_teeth_count`,
    label: 'В годик было зубов',
    type: 'number',
    required: false,
    templateLineStart: Math.max(0, (slots?.length ?? 22) - 1),
    templateLineCount: 1,
  });
  return fields;
}

function buildGrowthFields(lineGuideId, pageNumber, slots) {
  const fields = [];
  for (let month = 1; month <= 12; month += 1) {
    const heightStart = (month - 1) * 2;
    fields.push({
      fieldId: `${lineGuideId}_p${pageNumber}_month_${String(month).padStart(2, '0')}_height`,
      label: `${month === 12 ? '1 год' : `${month} мес.`} — рост (см)`,
      type: 'number',
      required: false,
      templateLineStart: Math.min(heightStart, Math.max(0, (slots?.length ?? 24) - 2)),
      templateLineCount: 1,
    });
    fields.push({
      fieldId: `${lineGuideId}_p${pageNumber}_month_${String(month).padStart(2, '0')}_weight`,
      label: `${month === 12 ? '1 год' : `${month} мес.`} — вес (кг)`,
      type: 'number',
      required: false,
      templateLineStart: Math.min(heightStart + 1, Math.max(0, (slots?.length ?? 24) - 1)),
      templateLineCount: 1,
    });
  }
  return fields;
}

function buildMonthPageFields(lineGuideId, pageNumber, slots) {
  return [
    {
      fieldId: `${lineGuideId}_p${pageNumber}_i_love`,
      label: 'Я люблю',
      type: 'text',
      required: false,
      templateLineStart: 0,
      templateLineCount: Math.min(2, slots?.length ?? 2),
    },
    {
      fieldId: `${lineGuideId}_p${pageNumber}_i_can`,
      label: 'Я умею',
      type: 'text',
      required: false,
      templateLineStart: Math.min(2, Math.max(0, (slots?.length ?? 2) - 1)),
      templateLineCount: 1,
    },
  ];
}

function buildFamilyTreeFields(lineGuideId, pageNumber, slots) {
  const relatives = [
    ['child_name', 'Имя ребенка'],
    ['mother_great_grandmother', 'Прабабушка (линия мамы)'],
    ['mother_great_grandfather', 'Прадедушка (линия мамы)'],
    ['mother_grandmother', 'Бабушка (линия мамы)'],
    ['mother_grandfather', 'Дедушка (линия мамы)'],
    ['father_great_grandmother', 'Прабабушка (линия папы)'],
    ['father_great_grandfather', 'Прадедушка (линия папы)'],
    ['father_grandmother', 'Бабушка (линия папы)'],
    ['father_grandfather', 'Дедушка (линия папы)'],
  ];
  return relatives.map(([id, label], index) => ({
    fieldId: `${lineGuideId}_p${pageNumber}_${id}`,
    label,
    type: 'text',
    required: false,
    templateLineStart: index,
    templateLineCount: 1,
  }));
}

function buildPage1Fields(lineGuideId, pageNumber, slots) {
  const labels = [
    ['child_name', 'Имя ребенка / ФИО', 'text', 0],
    ['birth_date', 'Дата рождения', 'date', 1],
    ['birth_time', 'Время рождения', 'time', 2],
    ['weight', 'Вес', 'text', 3],
    ['height', 'Рост', 'text', 4],
  ];
  return labels.map(([id, label, type, start]) => ({
    fieldId: `${lineGuideId}_p${pageNumber}_${id}`,
    label,
    type,
    required: false,
    templateLineStart: Math.min(start, Math.max(0, (slots?.length ?? 5) - 1)),
    templateLineCount: 1,
  }));
}

function buildPage3Fields(lineGuideId, pageNumber, slots) {
  return [
    { fieldId: `${lineGuideId}_p${pageNumber}_due_date`, label: 'ПДР', type: 'date', required: false, templateLineStart: 0, templateLineCount: 1 },
    { fieldId: `${lineGuideId}_p${pageNumber}_first_kicks`, label: 'Первые пиночки', type: 'text', required: false, templateLineStart: 1, templateLineCount: 1 },
    { fieldId: `${lineGuideId}_p${pageNumber}_mother_guess`, label: 'Мама думала', type: 'radio', required: false, templateLineStart: 2, templateLineCount: 1, options: ['Мальчик', 'Девочка'] },
    { fieldId: `${lineGuideId}_p${pageNumber}_father_guess`, label: 'Папа думал', type: 'radio', required: false, templateLineStart: 3, templateLineCount: 1, options: ['Мальчик', 'Девочка'] },
  ].map((f) => ({
    ...f,
    templateLineStart: Math.min(f.templateLineStart, Math.max(0, (slots?.length ?? 4) - 1)),
  }));
}

function buildPage4Fields(lineGuideId, pageNumber) {
  return [
    { fieldId: `${lineGuideId}_p${pageNumber}_mother_name`, label: 'Имя мамы', type: 'text', required: false, templateLineStart: 0, templateLineCount: 1 },
    { fieldId: `${lineGuideId}_p${pageNumber}_father_name`, label: 'Имя папы', type: 'text', required: false, templateLineStart: 1, templateLineCount: 1 },
  ];
}

function buildGodparentsFields(lineGuideId, pageNumber) {
  return [
    { fieldId: `${lineGuideId}_p${pageNumber}_godmother_name`, label: 'Имя крестной', type: 'text', required: false, templateLineStart: 0, templateLineCount: 1 },
    { fieldId: `${lineGuideId}_p${pageNumber}_godfather_name`, label: 'Имя крестного', type: 'text', required: false, templateLineStart: 1, templateLineCount: 1 },
  ];
}

function buildDateField(lineGuideId, pageNumber, label, slotIndex) {
  return [{
    fieldId: `${lineGuideId}_p${pageNumber}_event_date`,
    label,
    type: 'date',
    required: false,
    templateLineStart: slotIndex,
    templateLineCount: 1,
  }];
}

function buildCaptionField(lineGuideId, pageNumber) {
  return [{
    fieldId: `${lineGuideId}_p${pageNumber}_caption`,
    label: 'Подпись под фото',
    type: 'text',
    required: false,
    templateLineStart: 0,
    templateLineCount: 1,
  }];
}

function applyKids48TzManifest(pageNumber, slots, tzEntry, lineGuideId) {
  if (!tzEntry) return null;

  const pageType = tzEntry.pageType;
  const editable = pageType !== 'non_editable';
  let fields;
  let photoBlocks;

  switch (pageNumber) {
    case 1:
      fields = buildPage1Fields(lineGuideId, pageNumber, slots);
      photoBlocks = [PARENTS_PHOTO_BLOCK];
      break;
    case 3:
      fields = buildPage3Fields(lineGuideId, pageNumber, slots);
      photoBlocks = [{ ...PARENTS_PHOTO_BLOCK, blockId: 'ultrasound_photo', label: 'Фото УЗИ' }];
      break;
    case 4:
      fields = buildPage4Fields(lineGuideId, pageNumber);
      photoBlocks = [{ ...PARENTS_PHOTO_BLOCK, blockId: 'parents_photo', label: 'Фото мамы и папы' }];
      break;
    case 5:
      fields = buildFamilyTreeFields(lineGuideId, pageNumber, slots);
      photoBlocks = [FAMILY_TREE_PHOTO_BLOCK];
      break;
    case 10:
      fields = buildTeethFields(lineGuideId, pageNumber, slots);
      break;
    case 11:
      fields = buildGrowthFields(lineGuideId, pageNumber, slots);
      break;
    case 12:
      fields = buildDateField(lineGuideId, pageNumber, 'Дата', 0);
      photoBlocks = [PARENTS_PHOTO_BLOCK];
      break;
    case 13:
      fields = [];
      photoBlocks = [PARENTS_PHOTO_BLOCK];
      break;
    case 20:
      fields = buildDateField(lineGuideId, pageNumber, 'Дата крещения', 0);
      photoBlocks = [EVENT_PHOTO_BLOCK];
      break;
    case 21:
      fields = buildGodparentsFields(lineGuideId, pageNumber);
      photoBlocks = [GODPARENTS_PHOTO_BLOCK];
      break;
    default:
      if (pageType === 'month_page') {
        fields = buildMonthPageFields(lineGuideId, pageNumber, slots);
        photoBlocks = [EVENT_PHOTO_BLOCK];
      } else if (pageType === 'event_photo' || pageType === 'baptism_page') {
        fields = tzEntry.hasDate ? buildDateField(lineGuideId, pageNumber, 'Дата', 0) : [];
        photoBlocks = [EVENT_PHOTO_BLOCK];
      } else if (pageType === 'free_photo_caption') {
        fields = buildCaptionField(lineGuideId, pageNumber);
        photoBlocks = [EVENT_PHOTO_BLOCK];
      } else if (pageType === 'caption_photo_page') {
        fields = [];
        photoBlocks = [EVENT_PHOTO_BLOCK];
      } else if (pageType === 'non_editable') {
        fields = [];
      }
      break;
  }

  if (tzEntry.photoBlockPreset === 'parents' && !photoBlocks) {
    photoBlocks = [PARENTS_PHOTO_BLOCK];
  }
  if (tzEntry.photoBlockPreset === 'godparents' && !photoBlocks) {
    photoBlocks = [GODPARENTS_PHOTO_BLOCK];
  }

  return {
    title: tzEntry.title,
    pageType,
    editable,
    fields: fields?.length ? fields : undefined,
    photoBlocks,
    canDuplicate: tzEntry.canDuplicate ?? false,
    captionEnabled: pageType === 'free_photo_caption' || pageType === 'caption_photo_page',
    requiredInExport: tzEntry.requiredInExport ?? false,
  };
}

module.exports = {
  applyKids48TzManifest,
  EVENT_PHOTO_BLOCK,
};
