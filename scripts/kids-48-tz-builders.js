/**
 * Field/photo builders for kids_48 TZ manifest — used by generate-page-schemas.js
 */

const {
  DESIGNED_ALBUM_PHOTO_BLOCK,
  EVENT_PHOTO_BLOCK,
  PARENTS_PHOTO_BLOCK,
  SINGLE_HORIZONTAL_PHOTO_BLOCK,
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

const TEETH_LABELS_RU = [
  'Верхний левый крайний моляр',
  'Верхний левый 1-й моляр',
  'Верхний левый клык',
  'Верхний левый 2-й резец',
  'Верхний левый 1-й резец',
  'Верхний правый 1-й резец',
  'Верхний правый 2-й резец',
  'Верхний правый клык',
  'Верхний правый 1-й моляр',
  'Верхний правый крайний моляр',
  'Нижний левый крайний моляр',
  'Нижний левый 1-й моляр',
  'Нижний левый клык',
  'Нижний левый 2-й резец',
  'Нижний левый 1-й резец',
  'Нижний правый 1-й резец',
  'Нижний правый 2-й резец',
  'Нижний правый клык',
  'Нижний правый 1-й моляр',
  'Нижний правый крайний моляр',
];

function buildTeethFields(lineGuideId, pageNumber, slots) {
  /** iOS e24a739: форма left→right, bake-слоты — другой порядок L/R. */
  const KIDS_48_TEETH_FIELD_SLOT_INDEX = [
    8, 6, 4, 2, 1,
    3, 5, 7, 9, 0,
    19, 16, 14, 12, 10,
    11, 13, 15, 17, 18,
  ];
  const slotCount = slots?.length ?? 22;
  const fields = TEETH_SLOT_IDS.map((id, index) => ({
    fieldId: `${lineGuideId}_p${pageNumber}_${id}`,
    label: TEETH_LABELS_RU[index] ?? id.replace(/_/g, ' '),
    type: 'date',
    required: false,
    templateLineStart: KIDS_48_TEETH_FIELD_SLOT_INDEX[index] ?? Math.min(index, slotCount - 1),
    templateLineCount: 1,
  }));
  fields.push({
    fieldId: `${lineGuideId}_p${pageNumber}_first_brushing`,
    label: 'Первая чистка зубов',
    type: 'date',
    required: false,
    // p10: 20 дат (0–19) + первая чистка (20) + число зубов (21).
    templateLineStart: Math.max(0, slotCount - 2),
    templateLineCount: 1,
  });
  fields.push({
    fieldId: `${lineGuideId}_p${pageNumber}_teeth_count`,
    label: 'В годик было зубов',
    type: 'number',
    required: false,
    templateLineStart: Math.max(0, slotCount - 1),
    templateLineCount: 1,
  });
  return fields;
}

function buildGrowthFields(lineGuideId, pageNumber, slots) {
  const fields = [];
  for (let month = 1; month <= 12; month += 1) {
    // Макет: сверху «1 год», снизу «1 мес.»
    const heightStart = (12 - month) * 2;
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
  const loveLineStart = slots?.length >= 3 ? 1 : 0;
  const canLineStart = slots?.length >= 3 ? 2 : Math.max(1, (slots?.length ?? 2) - 1);
  return [
    {
      fieldId: `${lineGuideId}_p${pageNumber}_i_love`,
      label: 'Я люблю',
      type: 'text',
      required: false,
      templateLineStart: loveLineStart,
      templateLineCount: 1,
    },
    {
      fieldId: `${lineGuideId}_p${pageNumber}_i_can`,
      label: 'Я умею',
      type: 'text',
      required: false,
      templateLineStart: canLineStart,
      templateLineCount: 1,
    },
  ];
}

function buildFamilyTreeFields(lineGuideId, pageNumber, slots) {
  // Порядок = индексы circle slots / line slots (0–14), включая нижние extra_*.
  // iOS e24a739 — 15 полей под 15 кругами.
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
    ['mother_name', 'Мама'],
    ['mother_extra', 'Ещё родственник (линия мамы)'],
    ['father_name', 'Папа'],
    ['father_extra_a', 'Ещё родственник (линия папы)'],
    ['father_extra_b', 'Ещё родственник (линия папы)'],
    ['child_extra', 'Ещё родственник'],
  ];
  return relatives.map(([id, label], index) => ({
    fieldId: `${lineGuideId}_p${pageNumber}_${id}`,
    label,
    type: 'text',
    required: false,
    maxLength: 7,
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

function buildPage3Fields(lineGuideId, pageNumber, _slots) {
  return [
    {
      fieldId: `${lineGuideId}_p${pageNumber}_due_date`,
      label: 'ПДР',
      type: 'date',
      required: false,
      templateLineStart: 0,
      templateLineCount: 1,
    },
    {
      fieldId: `${lineGuideId}_p${pageNumber}_first_kicks`,
      label: 'Первые пиночки',
      type: 'text',
      required: false,
      templateLineStart: 1,
      templateLineCount: 1,
    },
    {
      fieldId: `${lineGuideId}_p${pageNumber}_mother_guess`,
      label: 'Мама думала',
      type: 'radio',
      required: false,
      templateLineStart: 2,
      templateLineCount: 1,
      options: ['Мальчик', 'Девочка'],
    },
    {
      fieldId: `${lineGuideId}_p${pageNumber}_father_guess`,
      label: 'Папа думал',
      type: 'radio',
      required: false,
      templateLineStart: 3,
      templateLineCount: 1,
      options: ['Мальчик', 'Девочка'],
    },
  ];
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

function buildAchievementsFields(lineGuideId, pageNumber, slots) {
  const milestones = [
    ['achievement_date', '(ДАТА)', 'date', 0, 1],
    ['holds_head', 'Держу голову', 'text', 1, 1],
    ['rolls_over', 'Переворачиваюсь на животик', 'text', 2, 1],
    ['crawls', 'Ползаю', 'text', 3, 1],
    ['sits_alone', 'Сижу самостоятельно', 'text', 4, 1],
    ['stands_with_support', 'Стою у опоры', 'text', 5, 1],
    ['first_steps', 'Первые шаги', 'text', 6, 1],
    ['first_word', 'Первое слово (какое?)', 'text', 7, 1],
  ];

  const maxSlot = Math.max(0, (slots?.length ?? 9) - 1);
  return milestones.map(([id, label, type, start, lineCount]) => ({
    fieldId: `${lineGuideId}_p${pageNumber}_${id}`,
    label,
    type,
    required: false,
    templateLineStart: Math.min(start, maxSlot),
    templateLineCount: Math.min(lineCount, Math.max(1, (slots?.length ?? 9) - start)),
  }));
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
    case 8:
      fields = buildDateField(lineGuideId, pageNumber, 'Дата', 0);
      photoBlocks = [DESIGNED_ALBUM_PHOTO_BLOCK];
      break;
    case 14:
      fields = buildDateField(lineGuideId, pageNumber, 'Дата', 0);
      photoBlocks = [DESIGNED_ALBUM_PHOTO_BLOCK];
      break;
    case 15:
      fields = buildDateField(lineGuideId, pageNumber, 'Дата', 0);
      photoBlocks = [DESIGNED_ALBUM_PHOTO_BLOCK];
      break;
    case 16:
      fields = buildDateField(lineGuideId, pageNumber, 'Дата', 0);
      photoBlocks = [DESIGNED_ALBUM_PHOTO_BLOCK];
      break;
    case 17:
      fields = buildDateField(lineGuideId, pageNumber, 'Дата', 0);
      photoBlocks = [DESIGNED_ALBUM_PHOTO_BLOCK];
      break;
    case 18:
      fields = buildDateField(lineGuideId, pageNumber, 'Дата', 0);
      photoBlocks = [DESIGNED_ALBUM_PHOTO_BLOCK];
      break;
    case 19:
      fields = buildDateField(lineGuideId, pageNumber, 'Дата', 0);
      photoBlocks = [DESIGNED_ALBUM_PHOTO_BLOCK];
      break;
    case 10:
      fields = buildTeethFields(lineGuideId, pageNumber, slots);
      photoBlocks = [];
      break;
    case 11:
      fields = buildGrowthFields(lineGuideId, pageNumber, slots);
      break;
    case 12:
      fields = buildDateField(lineGuideId, pageNumber, 'Дата', 0);
      photoBlocks = [SINGLE_HORIZONTAL_PHOTO_BLOCK];
      break;
    case 13:
      fields = buildAchievementsFields(lineGuideId, pageNumber, slots);
      photoBlocks = [PARENTS_PHOTO_BLOCK];
      break;
    case 20:
      fields = buildDateField(lineGuideId, pageNumber, 'Дата крещения', 0);
      photoBlocks = [DESIGNED_ALBUM_PHOTO_BLOCK];
      break;
    case 21:
      fields = buildGodparentsFields(lineGuideId, pageNumber);
      photoBlocks = [GODPARENTS_PHOTO_BLOCK];
      break;
    default:
      if (pageType === 'month_page') {
        fields = buildMonthPageFields(lineGuideId, pageNumber, slots);
        photoBlocks = [DESIGNED_ALBUM_PHOTO_BLOCK];
      } else if (pageType === 'event_photo' || pageType === 'baptism_page') {
        fields = tzEntry.hasDate ? buildDateField(lineGuideId, pageNumber, 'Дата', 0) : [];
        photoBlocks = [DESIGNED_ALBUM_PHOTO_BLOCK];
      } else if (pageType === 'free_photo_caption') {
        fields = buildCaptionField(lineGuideId, pageNumber);
        photoBlocks = [DESIGNED_ALBUM_PHOTO_BLOCK];
      } else if (pageType === 'caption_photo_page') {
        fields = [];
        photoBlocks = [DESIGNED_ALBUM_PHOTO_BLOCK];
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
    replaceFields: true,
    title: tzEntry.title,
    pageType,
    editable,
    fields: fields ?? [],
    photoBlocks,
    canDuplicate: tzEntry.canDuplicate ?? false,
    captionEnabled: pageType === 'free_photo_caption' || pageType === 'caption_photo_page',
    requiredInExport: tzEntry.requiredInExport ?? false,
  };
}

module.exports = {
  applyKids48TzManifest,
  DESIGNED_ALBUM_PHOTO_BLOCK,
  EVENT_PHOTO_BLOCK,
};
