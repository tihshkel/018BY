/**
 * Field specifications for pregnancy_60 and pregnancy_a5 — labels from TZ docx.
 * Format: [fieldId, label, type, templateLineCount]
 */

const WEEKLY_PAGE_FIELDS = [
  ['date', 'Дата', 'date', 1],
  ['weight', 'Вес', 'number', 1],
  ['plans', 'Планы на неделю', 'text', 3, 78],
  ['belly', 'Обхват животика:', 'number', 1],
  ['feelings', 'Мои ощущения, чувства, мысли', 'text', 3],
];

const PAGE1_FIELDS = [
  ['news_date', 'Мы узнали о тебе (дата)', 'date', 1],
  ['reaction', 'Наша реакция', 'text', 3],
  ['due_date', 'ПДР', 'date', 1],
  ['name', 'Меня зовут', 'text', 1],
  ['age', 'Мой возраст в начале беременности (лет)', 'text', 1],
];

const ABOUT_ME_FIELDS = [
  ['birth_date', 'Дата рождения', 'date', 1],
  ['eye_color', 'Цвет глаз', 'text', 1],
  ['hair_color', 'Цвет волос', 'text', 1],
  ['blood_type', 'Группа крови', 'text', 1],
  ['height', 'Рост', 'number', 1],
  ['weight', 'Вес', 'number', 1],
  ['education', 'Образование', 'text', 1],
  ['workplace', 'Место работы', 'text', 1],
  ['position', 'Должность', 'text', 1],
  ['hobby', 'Хобби', 'text', 1],
  ['love', 'Я люблю', 'text', 1],
  ['dislike', 'Я не люблю', 'text', 1],
  ['want_child', 'Когда я поняла, что хочу ребенка', 'text', 2],
  ['want_count', 'Я хотела бы иметь', 'text', 1],
  ['gender', 'Это будет (пол)', 'text', 1],
  ['birth_date_baby', 'Он(а) родится (дата)', 'date', 1],
  ['baby_weight', 'Вес будет (гр)', 'number', 1],
  ['baby_height', 'Рост будет (см)', 'number', 1],
  ['baby_hair', 'Цвет волос будет', 'text', 1],
  ['baby_eyes', 'Цвет глаз будет', 'text', 1],
  ['look_like', 'Будет похож на', 'text', 1],
];

const FUTURE_DAD_FIELDS = [
  ['name', 'Имя папы', 'text', 1],
  ['birth_date', 'Дата рождения папы', 'date', 1],
  ['eye_color', 'Цвет глаз папы', 'text', 1],
  ['hair_color', 'Цвет волос папы', 'text', 1],
  ['education', 'Образование папы', 'text', 1],
  ['workplace', 'Место работы папы', 'text', 1],
  ['position', 'Должность папы', 'text', 1],
  ['hobby', 'Хобби папы', 'text', 1],
  ['want_child', 'Когда папа понял, что хочет ребенка', 'text', 2],
  ['want_count', 'Сколько детей папа хотел бы иметь', 'text', 1],
];

const PAGE4_FIELDS = [
  ['date', 'Дата', 'date', 1],
  ['term', 'Акушерский срок', 'text', 1],
  ['weight', 'Вес', 'number', 1],
  ['wellbeing', 'Моё самочувствие', 'text', 3],
  ['fio', 'ФИО врача / акушерки', 'text', 1],
  ['cabinet', 'Кабинет врача', 'text', 1],
  ['phone', 'Телефон врача или регистратуры', 'text', 1],
  ['mon', 'График врача: понедельник', 'text', 1],
  ['thu', 'График врача: четверг', 'text', 1],
  ['tue', 'График врача: вторник', 'text', 1],
  ['fri', 'График врача: пятница', 'text', 1],
  ['wed', 'График врача: среда', 'text', 1],
  ['sat', 'График врача: суббота', 'text', 1],
  ['recommendations', 'Рекомендации врача', 'text', 3],
];

const PAGE6_FIELDS = [
  ['date', 'Дата', 'date', 1],
  ['place', 'Место проведения', 'text', 1],
  ['doctor', 'Врач-узист', 'text', 1],
  ['emotions', 'Мои эмоции', 'text', 6],
];

const BIRTH_QUESTIONNAIRE_60 = [
  ['age', 'Возраст на момент родов', 'text', 1],
  ['weight_before', 'Вес до беременности', 'number', 1],
  ['weight_gain', 'Прибавка веса', 'number', 1],
  ['due_date', 'ПДР', 'date', 1],
  ['birth_date', 'Дата родов', 'date', 1],
  ['term_weeks', 'Срок беременности на момент родов (нед.)', 'text', 1],
  ['hospital', 'Роддом', 'text', 1],
  ['admission_date', 'Дата поступления в дородовое отделение', 'date', 2],
  ['baby_weight', 'Вес', 'number', 1],
  ['baby_height', 'Рост', 'number', 1],
  ['weekday', 'День недели', 'text', 1],
  ['birth_time', 'Время', 'time', 1],
  ['delivery_type', 'Естественные роды / Кесарево', 'text', 1],
  ['cord', 'Обвитие', 'text', 1],
  ['condition', 'Общее состояние', 'text', 1],
  ['discharge_date', 'Дата выписки из роддома', 'date', 1],
  ['days_in_hospital', 'Сколько дней провела в роддоме', 'text', 1],
  ['discharge_guests', 'Кто пришёл на выписку', 'text', 1],
];

const BIRTH_QUESTIONNAIRE_A5 = [
  ['age', 'Возраст на момент родов', 'text', 1],
  ['weight_before', 'Вес до беременности', 'number', 1],
  ['weight_gain', 'Прибавка веса', 'number', 1],
  ['due_date', 'ПДР', 'date', 1],
  ['birth_date', 'Дата родов', 'date', 1],
  ['term_weeks', 'Срок беременности на момент родов (нед.)', 'text', 1],
  ['hospital', 'Роддом', 'text', 1],
  ['admission_date', 'Дата поступления в дородовое отделение', 'date', 1],
  ['baby_weight', 'Вес', 'number', 1],
  ['baby_gender', 'Пол', 'text', 1],
  ['baby_height', 'Рост', 'number', 1],
  ['weekday', 'День недели', 'text', 1],
  ['birth_time', 'Время', 'time', 1],
  ['delivery_type', 'Естественные роды / Кесарево', 'text', 1],
  ['cord', 'Обвитие', 'text', 1],
  ['condition', 'Общее состояние', 'text', 1],
  ['discharge_date', 'Дата выписки из роддома', 'date', 1],
  ['days_in_hospital', 'Сколько дней провела в роддоме', 'text', 1],
  ['discharge_guests', 'Кто пришёл на выписку', 'text', 1],
];

const ALREADY_MOM_FIELDS = [
  ['name', 'Имя', 'text', 1],
  ['hair_color', 'Цвет волос', 'text', 1],
  ['eye_color', 'Цвет глаз', 'text', 1],
  ['zodiac', 'Знак зодиака', 'text', 1],
  ['zodiac_year', 'Год (по восточному календарю)', 'text', 1],
  ['wishes', 'Пожелания от мамы и папы', 'text', 4],
];

const PREGNANCY_FORM_FILL = '#E8C4A8';
const YES_NO_OPTIONS = ['Да', 'Нет'];
const GENDER_OPTIONS = ['Мальчик', 'Девочка'];
const DELIVERY_OPTIONS = ['Ер', 'Кс'];

const TODO_LIST_ITEMS = [
  'Выспаться',
  'Посмотреть интересный сериал',
  'Сходить на фотосессию',
  'Насладиться беременностью',
  'Встретиться с подругами',
  'Сходить в кино или театр',
  'День без соцсетей',
  'Прочитать интересную книгу',
  'Отправиться в путешествие',
  'Избавиться от ненужных вещей',
  'Погулять в парке',
  'Кушать вкусняшки',
  'Испечь пирог',
  'Выпить чай/какао под пледом',
  'День шоппинга',
];

const SHOPPING_ITEM_LABEL = 'К рождению малыша';

function buildField(lineGuideId, pageNumber, id, label, type, start, count, slots, maxLength) {
  const maxStart = Math.max(0, (slots?.length ?? 1) - 1);
  const field = {
    fieldId: `${lineGuideId}_p${pageNumber}_${id}`,
    label,
    type,
    required: false,
    templateLineStart: Math.min(start, maxStart),
    templateLineCount: count,
  };
  if (maxLength != null) {
    field.maxLength = maxLength;
  }
  return field;
}

function buildFieldsFromSpec(lineGuideId, pageNumber, slots, spec, startOffset = 0) {
  let cursor = startOffset;
  const fields = [];
  for (const entry of spec) {
    const [id, label, type, count, maxLength] = entry;
    fields.push(
      buildField(lineGuideId, pageNumber, id, label, type, cursor, count, slots, maxLength),
    );
    cursor += count;
  }
  return fields;
}

function buildNameChoiceFields(lineGuideId, pageNumber, slots) {
  const slotCount = slots?.length ?? 33;
  const namePairCount = Math.max(0, Math.floor((slotCount - 1) / 2));
  const spec = [];
  for (let index = 1; index <= namePairCount; index += 1) {
    spec.push([`name_${index}`, `Имя ${index}`, 'text', 1]);
    spec.push([`name_forms_${index}`, `Формы имени ${index}`, 'text', 1]);
  }
  const fields = buildFieldsFromSpec(lineGuideId, pageNumber, slots, spec);
  const chosenNameSlot = namePairCount * 2;
  if (chosenNameSlot < slotCount) {
    fields.push(
      buildField(
        lineGuideId,
        pageNumber,
        'chosen_name',
        'Выбранное имя',
        'text',
        chosenNameSlot,
        1,
        slots,
      ),
    );
  }
  return fields;
}

function buildShoppingListFields(lineGuideId, pageNumber, slots) {
  const lineCount = slots?.length ?? 36;
  const fields = [];
  for (let index = 0; index < lineCount; index += 1) {
    fields.push(
      buildField(
        lineGuideId,
        pageNumber,
        `item_${index + 1}`,
        SHOPPING_ITEM_LABEL,
        'text',
        index,
        1,
        slots,
      ),
    );
  }
  return fields;
}

function buildTodoCheckboxField(lineGuideId, pageNumber, id, label) {
  return {
    fieldId: `${lineGuideId}_p${pageNumber}_${id}`,
    label,
    type: 'checkbox',
    required: false,
    templateLineStart: 0,
    templateLineCount: 1,
  };
}

function buildTodoListFields(lineGuideId, pageNumber, _slots) {
  return TODO_LIST_ITEMS.map((label, index) =>
    buildTodoCheckboxField(lineGuideId, pageNumber, `todo_${index + 1}`, label),
  );
}

function buildRadioField(lineGuideId, pageNumber, id, label, options) {
  return {
    fieldId: `${lineGuideId}_p${pageNumber}_${id}`,
    label,
    type: 'radio',
    required: false,
    templateLineStart: 0,
    templateLineCount: 1,
    options,
  };
}

function buildAlreadyMomFields(lineGuideId, pageNumber, slots) {
  return [
    buildField(lineGuideId, pageNumber, 'name', 'Имя', 'text', 0, 1, slots),
    buildField(lineGuideId, pageNumber, 'hair_color', 'Цвет волос', 'text', 1, 1, slots),
    buildField(lineGuideId, pageNumber, 'eye_color', 'Цвет глаз', 'text', 2, 1, slots),
    buildField(lineGuideId, pageNumber, 'zodiac', 'Знак зодиака', 'text', 3, 1, slots),
    buildField(
      lineGuideId,
      pageNumber,
      'zodiac_year',
      'Год (по восточному календарю)',
      'text',
      4,
      1,
      slots,
    ),
    buildField(
      lineGuideId,
      pageNumber,
      'wishes',
      'Пожелания от мамы и папы',
      'text',
      5,
      4,
      slots,
    ),
  ];
}

/** pregnancy_60 p52 / A5 p44: grid layout — explicit slot indices, not sequential cursor. */
function buildBirthQuestionnaire60Fields(lineGuideId, pageNumber, slots) {
  return buildBirthQuestionnaireA5Fields(lineGuideId, pageNumber, slots);
}

/** A5 p44: grid layout — explicit slot indices, not sequential cursor. */
function buildBirthQuestionnaireA5Fields(lineGuideId, pageNumber, slots) {
  return [
    buildField(lineGuideId, pageNumber, 'age', 'Возраст на момент родов', 'text', 0, 1, slots),
    buildField(
      lineGuideId,
      pageNumber,
      'weight_before',
      'Вес до беременности',
      'number',
      1,
      1,
      slots,
    ),
    buildField(lineGuideId, pageNumber, 'weight_gain', 'Прибавка веса', 'number', 2, 1, slots),
    buildField(lineGuideId, pageNumber, 'due_date', 'ПДР', 'date', 3, 1, slots),
    buildField(lineGuideId, pageNumber, 'birth_date', 'Дата родов', 'date', 4, 1, slots),
    buildField(
      lineGuideId,
      pageNumber,
      'term_weeks',
      'Срок беременности на момент родов (нед.)',
      'text',
      5,
      1,
      slots,
    ),
    buildField(lineGuideId, pageNumber, 'hospital', 'Роддом', 'text', 6, 1, slots),
    buildField(
      lineGuideId,
      pageNumber,
      'admission_date',
      'Дата поступления в дородовое отделение',
      'date',
      7,
      1,
      slots,
    ),
    buildRadioField(lineGuideId, pageNumber, 'baby_gender', 'Пол', GENDER_OPTIONS),
    buildField(lineGuideId, pageNumber, 'baby_weight', 'Вес', 'number', 8, 1, slots),
    buildField(lineGuideId, pageNumber, 'baby_height', 'Рост', 'number', 9, 1, slots),
    buildField(lineGuideId, pageNumber, 'weekday', 'День недели', 'text', 10, 1, slots),
    buildField(lineGuideId, pageNumber, 'birth_time', 'Время', 'time', 11, 1, slots),
    buildField(
      lineGuideId,
      pageNumber,
      'delivery_type',
      'Естественные роды / Кесарево',
      'text',
      12,
      1,
      slots,
    ),
    buildRadioField(lineGuideId, pageNumber, 'stimulation', 'Стимуляция', YES_NO_OPTIONS),
    buildRadioField(lineGuideId, pageNumber, 'tears', 'Разрывы', YES_NO_OPTIONS),
    buildRadioField(lineGuideId, pageNumber, 'cord', 'Обвитие', YES_NO_OPTIONS),
    buildField(lineGuideId, pageNumber, 'condition', 'Общее состояние', 'text', 13, 1, slots),
    buildField(
      lineGuideId,
      pageNumber,
      'discharge_date',
      'Дата выписки из роддома',
      'date',
      14,
      1,
      slots,
    ),
    buildField(
      lineGuideId,
      pageNumber,
      'days_in_hospital',
      'Сколько дней провела в роддоме',
      'text',
      15,
      1,
      slots,
    ),
    buildField(
      lineGuideId,
      pageNumber,
      'discharge_guests',
      'Кто пришёл на выписку',
      'text',
      16,
      3,
      slots,
    ),
  ];
}

function buildBirthStoryFields(lineGuideId, pageNumber, slots) {
  return [
    buildField(
      lineGuideId,
      pageNumber,
      'story',
      'Как это было',
      'text',
      0,
      Math.min(15, slots?.length ?? 15),
      slots,
    ),
  ];
}

function isPregnancy60WeeklyPage(pageNumber) {
  return (
    (pageNumber >= 9 && pageNumber <= 17) ||
    (pageNumber >= 19 && pageNumber <= 32) ||
    (pageNumber >= 34 && pageNumber <= 47)
  );
}

function isPregnancyA5WeeklyPage(pageNumber) {
  return (
    (pageNumber >= 5 && pageNumber <= 13) ||
    (pageNumber >= 15 && pageNumber <= 28) ||
    (pageNumber >= 30 && pageNumber <= 43)
  );
}

function getPregnancy60WeekNumber(pageNumber) {
  if (pageNumber >= 9 && pageNumber <= 17) return pageNumber - 3;
  if (pageNumber >= 19 && pageNumber <= 32) return pageNumber - 4;
  if (pageNumber >= 34 && pageNumber <= 47) return pageNumber - 5;
  return null;
}

const LETTER_TO_BABY_FIELDS = [['letter_text', 'Письмо малышу', 'text', 12]];

function getPregnancyA5WeekNumber(pageNumber) {
  if (pageNumber >= 5 && pageNumber <= 13) return pageNumber + 1;
  if (pageNumber >= 15 && pageNumber <= 28) return pageNumber;
  if (pageNumber >= 30 && pageNumber <= 43) return pageNumber - 1;
  return null;
}

module.exports = {
  WEEKLY_PAGE_FIELDS,
  PREGNANCY_WEEKLY_PLANS_MAX_LENGTH: 78,
  PAGE1_FIELDS,
  ABOUT_ME_FIELDS,
  FUTURE_DAD_FIELDS,
  PAGE4_FIELDS,
  PAGE6_FIELDS,
  BIRTH_QUESTIONNAIRE_60,
  BIRTH_QUESTIONNAIRE_A5,
  ALREADY_MOM_FIELDS,
  TODO_LIST_ITEMS,
  SHOPPING_ITEM_LABEL,
  buildField,
  buildFieldsFromSpec,
  buildNameChoiceFields,
  buildShoppingListFields,
  buildTodoListFields,
  buildBirthStoryFields,
  buildBirthQuestionnaireA5Fields,
  buildBirthQuestionnaire60Fields,
  buildAlreadyMomFields,
  buildRadioField,
  PREGNANCY_FORM_FILL,
  isPregnancy60WeeklyPage,
  isPregnancyA5WeeklyPage,
  getPregnancy60WeekNumber,
  getPregnancyA5WeekNumber,
  LETTER_TO_BABY_FIELDS,
};
