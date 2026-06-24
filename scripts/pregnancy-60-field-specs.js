/**
 * Field specifications for pregnancy_60 and pregnancy_a5 — labels from TZ docx.
 * Format: [fieldId, label, type, templateLineCount]
 */

const WEEKLY_PAGE_FIELDS = [
  ['date', 'Дата', 'date', 1],
  ['plans_header', 'Главные планы на неделю', 'text', 1],
  ['plans_body', 'Подробные заметки и дела на неделю', 'text', 3],
  ['belly', 'Обхват животика:', 'text', 1],
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
  ['phone', 'Телефон врача или регистратуры', 'text', 2],
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
  ['zodiac', 'Знак зодиака', 'text', 1],
  ['zodiac_year', 'Год (по восточному календарю)', 'text', 1],
  ['wishes', 'Пожелания от мамы и папы', 'text', 2],
];

const TODO_LIST_ITEMS = [
  'Список дел',
  'Посмотреть сериал',
  'Сделать фотосессию',
  'Погулять с подругами',
  'Написать пост в соцсетях',
  'Прочитать книгу',
  'Съездить в путешествие',
  'Выбросить ненужные вещи',
  'Испечь пирог',
  'Посидеть под пледом',
  'Сходить за шоппингом',
];

const SHOPPING_ITEM_LABEL = 'К рождению малыша';

function buildField(lineGuideId, pageNumber, id, label, type, start, count, slots) {
  const maxStart = Math.max(0, (slots?.length ?? 1) - 1);
  return {
    fieldId: `${lineGuideId}_p${pageNumber}_${id}`,
    label,
    type,
    required: false,
    templateLineStart: Math.min(start, maxStart),
    templateLineCount: count,
  };
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

function buildNameChoiceFields(lineGuideId, pageNumber, slots, nameCount = 17) {
  const spec = [];
  for (let index = 1; index <= nameCount; index += 1) {
    spec.push([`name_${index}`, `Имя ${index}`, 'text', 1]);
    spec.push([`name_forms_${index}`, `Формы имени ${index}`, 'text', 1]);
  }
  return buildFieldsFromSpec(lineGuideId, pageNumber, slots, spec);
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

function buildTodoListFields(lineGuideId, pageNumber, slots) {
  const lineCount = slots?.length ?? TODO_LIST_ITEMS.length;
  const fields = [];
  for (let index = 0; index < lineCount; index += 1) {
    const label = TODO_LIST_ITEMS[Math.min(index, TODO_LIST_ITEMS.length - 1)];
    fields.push(
      buildField(lineGuideId, pageNumber, `todo_${index + 1}`, label, 'text', index, 1, slots),
    );
  }
  return fields;
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
  isPregnancy60WeeklyPage,
  isPregnancyA5WeeklyPage,
  getPregnancy60WeekNumber,
  getPregnancyA5WeekNumber,
  LETTER_TO_BABY_FIELDS,
};
