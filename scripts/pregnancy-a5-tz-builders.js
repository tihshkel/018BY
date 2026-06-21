/**
 * Field builders for pregnancy_a5 — reuses pregnancy-60-field-specs.js (A5 TZ docx).
 */

const {
  WEEKLY_PAGE_FIELDS,
  PAGE1_FIELDS,
  ABOUT_ME_FIELDS,
  BIRTH_QUESTIONNAIRE_A5,
  ALREADY_MOM_FIELDS,
  buildFieldsFromSpec,
  buildBirthStoryFields,
  isPregnancyA5WeeklyPage,
  getPregnancyA5WeekNumber,
} = require('./pregnancy-60-field-specs');
const { tzOverride, buildPregnancyStaticPage } = require('./pregnancy-60-tz-builders');

const PREGNANCY_A5_STATIC_PAGES = {
  2: 'Триместры беременности',
  4: '1 триместр',
  14: '2 триместр',
  29: '3 триместр',
  47: '46 неделя',
};

function applyPregnancyA5PageFields(pageNumber, lineGuideId, slots = []) {
  if (isPregnancyA5WeeklyPage(pageNumber)) {
    const week = getPregnancyA5WeekNumber(pageNumber);
    return tzOverride({
      title: `${week}-я неделя`,
      pageType: 'structured',
      fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, WEEKLY_PAGE_FIELDS),
    });
  }

  if (PREGNANCY_A5_STATIC_PAGES[pageNumber]) {
    return buildPregnancyStaticPage(PREGNANCY_A5_STATIC_PAGES[pageNumber]);
  }

  switch (pageNumber) {
    case 1:
      return tzOverride({
        title: 'У нас будет малыш!',
        fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, PAGE1_FIELDS),
      });
    case 3:
      return tzOverride({
        title: 'Обо мне',
        fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, ABOUT_ME_FIELDS),
      });
    case 44:
      return tzOverride({
        title: 'Анкета родов',
        fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, BIRTH_QUESTIONNAIRE_A5),
      });
    case 45:
      return tzOverride({
        title: 'История родов',
        fields: buildBirthStoryFields(lineGuideId, pageNumber, slots),
      });
    case 46:
      return tzOverride({
        title: 'Уже мама',
        fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, ALREADY_MOM_FIELDS),
      });
    case 48:
      return tzOverride({ fields: [] });
    default:
      return null;
  }
}

module.exports = {
  applyPregnancyA5PageFields,
};
