/**
 * Field builders for pregnancy_60 — labels from TZ docx via pregnancy-60-field-specs.js
 */

const {
  WEEKLY_PAGE_FIELDS,
  PAGE1_FIELDS,
  ABOUT_ME_FIELDS,
  FUTURE_DAD_FIELDS,
  PAGE4_FIELDS,
  PAGE6_FIELDS,
  BIRTH_QUESTIONNAIRE_60,
  ALREADY_MOM_FIELDS,
  buildFieldsFromSpec,
  buildNameChoiceFields,
  buildShoppingListFields,
  buildTodoListFields,
  buildBirthStoryFields,
  buildAlreadyMomFields,
  isPregnancy60WeeklyPage,
  getPregnancy60WeekNumber,
  LETTER_TO_BABY_FIELDS,
} = require('./pregnancy-60-field-specs');

function tzOverride(partial) {
  return { replaceFields: true, ...partial };
}

function buildPregnancyStaticPage(title) {
  return tzOverride({
    title,
    pageType: 'non_editable',
    editable: false,
    fields: [],
    replacePhotoBlocks: true,
    photoBlocks: undefined,
  });
}

function applyPregnancy60PageFields(pageNumber, lineGuideId, slots = []) {
  if (isPregnancy60WeeklyPage(pageNumber)) {
    const week = getPregnancy60WeekNumber(pageNumber);
    return tzOverride({
      title: `${week}-я неделя`,
      pageType: 'structured',
      fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, WEEKLY_PAGE_FIELDS),
    });
  }

  switch (pageNumber) {
    case 1:
      return tzOverride({
        title: 'У нас будет малыш!',
        fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, PAGE1_FIELDS),
      });
    case 2:
      return tzOverride({
        title: 'Обо мне',
        fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, ABOUT_ME_FIELDS),
      });
    case 3:
      return tzOverride({
        title: 'Будущий папа',
        formHint: 'Анкета про папу малыша: личные данные, работа, увлечения и ожидания.',
        fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, FUTURE_DAD_FIELDS),
      });
    case 4:
      return tzOverride({
        title: 'Постановка на учёт',
        formHint: 'Заполните данные первого приёма, врача и график его работы по дням недели.',
        fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, PAGE4_FIELDS),
      });
    case 6:
      return tzOverride({
        title: 'Первое УЗИ',
        formHint: 'Данные первого УЗИ: дата, место, врач и ваши эмоции после встречи с малышом.',
        fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, PAGE6_FIELDS),
      });
    case 7:
      return tzOverride({
        title: 'Выбор имени',
        fields: buildNameChoiceFields(lineGuideId, pageNumber, slots),
      });
    case 50:
      return tzOverride({
        title: 'Список покупок',
        pageType: 'structured',
        fields: buildShoppingListFields(lineGuideId, pageNumber, slots),
      });
    case 51:
      return tzOverride({
        title: 'Список дел',
        pageType: 'structured',
        fields: buildTodoListFields(lineGuideId, pageNumber, slots),
      });
    case 52:
      return tzOverride({
        title: 'Анкета родов',
        pageType: 'structured',
        fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, BIRTH_QUESTIONNAIRE_60),
      });
    case 53:
      return tzOverride({
        title: 'История родов',
        pageType: 'structured',
        fields: buildBirthStoryFields(lineGuideId, pageNumber, slots),
      });
    case 54:
      return tzOverride({
        title: 'Уже мама',
        pageType: 'structured',
        fields: buildAlreadyMomFields(lineGuideId, pageNumber, slots),
      });
    case 5:
      return buildPregnancyStaticPage('Триместры');
    case 8:
      return buildPregnancyStaticPage('1 триместр');
    case 18:
      return buildPregnancyStaticPage('2 триместр');
    case 33:
      return buildPregnancyStaticPage('3 триместр');
    case 48:
      return buildPregnancyStaticPage('Сумка маме');
    case 49:
      return buildPregnancyStaticPage('Сумки малышу');
    case 55:
      return tzOverride({
        title: 'Памятные моменты',
        pageType: 'photo',
        editable: true,
        fields: [],
      });
    case 56:
    case 57:
    case 58:
    case 59:
      return tzOverride({
        pageType: 'photo',
        fields: [],
      });
    case 60:
      return tzOverride({
        title: 'Письмо малышу',
        pageType: 'text_page',
        editable: true,
        fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, LETTER_TO_BABY_FIELDS),
        replacePhotoBlocks: true,
        photoBlocks: undefined,
      });
    default:
      return null;
  }
}

module.exports = {
  applyPregnancy60PageFields,
  tzOverride,
  buildPregnancyStaticPage,
};
