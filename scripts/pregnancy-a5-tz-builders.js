/**
 * Field builders for pregnancy_a5 — reuses pregnancy-60-field-specs.js (A5 TZ docx).
 */

const {
  WEEKLY_PAGE_FIELDS,
  PAGE1_FIELDS,
  ABOUT_ME_FIELDS,
  buildFieldsFromSpec,
  buildBirthStoryFields,
  buildBirthQuestionnaireA5Fields,
  buildAlreadyMomFields,
  isPregnancyA5WeeklyPage,
  getPregnancyA5WeekNumber,
} = require('./pregnancy-60-field-specs');
const { tzOverride, buildPregnancyStaticPage } = require('./pregnancy-60-tz-builders');
const { DESIGNED_ALBUM_PHOTO_BLOCK } = require('./photo-block-presets-data');

const PREGNANCY_A5_STATIC_PAGES = {
  2: 'Триместры беременности',
  4: '1 триместр',
  14: '2 триместр',
  29: '3 триместр',
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
        pageType: 'structured',
        fields: buildBirthQuestionnaireA5Fields(lineGuideId, pageNumber, slots),
        replacePhotoBlocks: true,
        photoBlocks: undefined,
      });
    case 45:
      return tzOverride({
        title: 'История родов',
        fields: buildBirthStoryFields(lineGuideId, pageNumber, slots),
      });
    case 46:
      return tzOverride({
        title: 'Уже мама',
        fields: buildAlreadyMomFields(lineGuideId, pageNumber, slots),
        photoBlocks: [DESIGNED_ALBUM_PHOTO_BLOCK],
      });
    case 47:
    case 48:
      return tzOverride({
        title: 'Памятные моменты',
        pageType: 'photo',
        editable: true,
        fields: [],
      });
    default:
      return null;
  }
}

module.exports = {
  applyPregnancyA5PageFields,
};
