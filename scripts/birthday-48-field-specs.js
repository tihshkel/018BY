/**
 * Field specifications for holidays_birthday_60 (48-page 21×21 «Дни рождения» album).
 * Labels from TZ docx in tz/.
 */

const OWNER_FIELDS = [['ownerName', 'Имя владельца альбома', 'text', 1]];

const HELLO_WORLD_FIELDS = [
  ['dateOfBirth', 'Дата рождения', 'date', 1],
  ['birthTime', 'Время рождения', 'time', 1],
  ['birthWeight', 'Мой вес', 'text', 1],
  ['birthHeight', 'Мой рост', 'text', 1],
  ['birthPlace', 'Место рождения', 'text', 1],
];

const AGE_ONE_YEAR_FIELDS = [
  ['weight', 'Мой вес', 'text', 1],
  ['height', 'Мой рост', 'text', 1],
  ['teethCount', 'Кол-во зубов', 'number', 1],
];

const YEAR_MAIN_FIELDS = [
  ['weight', 'Мой вес', 'text', 1],
  ['height', 'Мой рост', 'text', 1],
];

const TRAVEL_MAP_FIELDS = [
  ['countries_count', 'Количество стран', 'number', 1],
  ['favorite_travel_memory', 'Мне больше всего понравилось в', 'text', 2],
];

const LETTER_FIELDS = [['letter_text', 'Письмо во взрослую жизнь', 'text', 12]];

const INTRO_FREE_CUSTOM_FIELD_DEFS = [
  { id: 'field_1', defaultLabel: 'Цвет волос', fieldType: 'short_text', maxLabelLength: 24, maxValueLength: 40 },
  { id: 'field_2', defaultLabel: 'Цвет глаз', fieldType: 'short_text', maxLabelLength: 24, maxValueLength: 40 },
];

const FREE_PAGE_5_CUSTOM_FIELD_DEFS = [
  { id: 'field_1', defaultLabel: 'Как прошёл этот день', fieldType: 'long_text', maxLabelLength: 40, maxValueLength: 300 },
  { id: 'field_2', defaultLabel: 'Дополнительное поле', fieldType: 'long_text', maxLabelLength: 40, maxValueLength: 300 },
  { id: 'field_3', defaultLabel: 'Мои подарки', fieldType: 'short_text', maxLabelLength: 40, maxValueLength: 300 },
];

const YEAR_FREE_CUSTOM_FIELD_DEFS = [
  { id: 'field_1', defaultLabel: 'Как прошёл этот день', fieldType: 'long_text', maxLabelLength: 40, maxValueLength: 300 },
  { id: 'field_2', defaultLabel: 'Мои подарки', fieldType: 'short_text', maxLabelLength: 40, maxValueLength: 120 },
];

function buildField(lineGuideId, pageNumber, id, label, type, start, count, slots) {
  const maxStart = Math.max(0, (slots?.length ?? 1) - 1);
  return {
    fieldId: `${lineGuideId}_p${pageNumber}_${id}`,
    label,
    type,
    required: false,
    placeholder: getPlaceholder(id, label),
    templateLineStart: Math.min(start, maxStart),
    templateLineCount: count,
  };
}

function getPlaceholder(id, label) {
  if (id === 'ownerName') return 'Например: Анна Ковалёва';
  if (id === 'birthWeight') return 'Например: 3420 г';
  if (id === 'birthHeight') return 'Например: 52 см';
  if (id === 'birthPlace') return 'Например: Минск';
  if (id === 'weight') return 'Например: 10,4 кг';
  if (id === 'height') return 'Например: 78 см';
  if (id === 'teethCount') return 'Например: 8';
  if (id === 'countries_count') return 'Например: 5';
  if (id === 'favorite_travel_memory') return 'Например: море, горы и поездка на поезде';
  if (id === 'letter_text') return 'Напишите письмо во взрослую жизнь: пожелания, мечты, важные слова';
  return undefined;
}

function lineCountForCustomFieldDef(def) {
  return def.fieldType === 'long_text' ? 2 : 1;
}

/** Fixed birthday free pages — same field model as structured album pages. */
function buildBirthdayFreeFieldsFromDefs(lineGuideId, pageNumber, slots, defs) {
  let cursor = 0;
  const fields = [];

  for (const def of defs) {
    if (pageNumber === 5 && def.id === 'field_2') continue;

    const count = lineCountForCustomFieldDef(def);
    const maxStart = Math.max(0, (slots?.length ?? count) - count);
    fields.push({
      fieldId: `${lineGuideId}_p${pageNumber}_${def.id}`,
      label: def.defaultLabel,
      type: 'text',
      required: false,
      maxLength: def.maxValueLength,
      templateLineStart: Math.min(cursor, maxStart),
      templateLineCount: count,
    });
    cursor += count;
  }

  return fields;
}

function buildFieldsFromSpec(lineGuideId, pageNumber, slots, spec, startOffset = 0) {
  let cursor = startOffset;
  const fields = [];
  for (const [id, label, type, count] of spec) {
    fields.push(buildField(lineGuideId, pageNumber, id, label, type, cursor, count, slots));
    cursor += count;
  }
  return fields;
}

/** Owner name sits on the central decorative line (slot 1), not the top OCR line. */
function buildOwnerFields(lineGuideId, pageNumber, slots) {
  return buildFieldsFromSpec(lineGuideId, pageNumber, slots, OWNER_FIELDS, 1);
}

/** Age pages reserve slot 0 for the printed «Мне N …» title block. */
function buildAgeMainFields(lineGuideId, pageNumber, slots, spec) {
  return buildFieldsFromSpec(lineGuideId, pageNumber, slots, spec, 1);
}

function getBirthdayAge(pageNumber) {
  if (pageNumber === 4) return 1;
  if (pageNumber >= 6 && pageNumber <= 38 && pageNumber % 2 === 0) {
    return (pageNumber - 4) / 2 + 1;
  }
  return null;
}

function getAgeTitle(age) {
  if (age === 1) return 'Мне 1 годик';
  if (age >= 2 && age <= 4) return `Мне ${age} года!`;
  return `Мне ${age} лет!`;
}

function isBirthdayFreePage(pageNumber) {
  if (pageNumber === 3 || pageNumber === 5) return true;
  if (pageNumber >= 7 && pageNumber <= 39 && pageNumber % 2 === 1) return true;
  return false;
}

function isTravelPhotoPage(pageNumber) {
  return pageNumber >= 41 && pageNumber <= 47;
}

function isYearMainPage(pageNumber) {
  return pageNumber === 4 || (pageNumber >= 6 && pageNumber <= 38 && pageNumber % 2 === 0);
}

function getBirthday48PageTitle(pageNumber) {
  if (pageNumber === 1) return 'Этот альбом принадлежит';
  if (pageNumber === 2) return 'Привет, мир!';
  if (pageNumber === 40) return 'Мои путешествия';
  if (pageNumber === 48) return 'Письмо во взрослую жизнь';
  if (isBirthdayFreePage(pageNumber) || isTravelPhotoPage(pageNumber)) {
    return 'Свободная страница';
  }
  const age = getBirthdayAge(pageNumber);
  if (age != null) return getAgeTitle(age);
  return `Страница ${pageNumber}`;
}

module.exports = {
  OWNER_FIELDS,
  HELLO_WORLD_FIELDS,
  AGE_ONE_YEAR_FIELDS,
  YEAR_MAIN_FIELDS,
  TRAVEL_MAP_FIELDS,
  LETTER_FIELDS,
  INTRO_FREE_CUSTOM_FIELD_DEFS,
  FREE_PAGE_5_CUSTOM_FIELD_DEFS,
  YEAR_FREE_CUSTOM_FIELD_DEFS,
  buildField,
  buildFieldsFromSpec,
  buildBirthdayFreeFieldsFromDefs,
  buildOwnerFields,
  buildAgeMainFields,
  getBirthdayAge,
  getAgeTitle,
  isBirthdayFreePage,
  isTravelPhotoPage,
  isYearMainPage,
  getBirthday48PageTitle,
};
