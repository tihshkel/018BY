/**
 * TZ builders for holidays_birthday_60 — 48-page 21×21 «Дни рождения» album.
 */

const { FULL_PHOTO_BLOCK } = require('./photo-block-presets-data');
const {
  OWNER_FIELDS,
  HELLO_WORLD_FIELDS,
  AGE_ONE_YEAR_FIELDS,
  YEAR_MAIN_FIELDS,
  TRAVEL_MAP_FIELDS,
  LETTER_FIELDS,
  INTRO_FREE_CUSTOM_FIELD_DEFS,
  FREE_PAGE_5_CUSTOM_FIELD_DEFS,
  YEAR_FREE_CUSTOM_FIELD_DEFS,
  buildFieldsFromSpec,
  buildOwnerFields,
  buildAgeMainFields,
  getBirthday48PageTitle,
  isBirthdayFreePage,
  isTravelPhotoPage,
  isYearMainPage,
} = require('./birthday-48-field-specs');

const HELLO_PHOTO_BLOCK = {
  blockId: 'main_photo',
  label: 'Горизонтальная фотография',
  variants: [
    {
      variantId: 'one_horizontal',
      label: '1 горизонтальное фото',
      slots: 1,
      slotIndices: [0],
    },
  ],
};

const SINGLE_AGE_PHOTO_BLOCK = {
  blockId: 'main_photo',
  label: 'Главное фото',
  variants: [
    {
      variantId: 'one_large',
      label: 'Одно фото',
      slots: 1,
      slotIndices: [0],
    },
  ],
};

function tzOverride(partial) {
  return {
    replaceFields: true,
    replacePhotoBlocks: true,
    editable: true,
    ...partial,
  };
}

function getFreeCustomFieldDefs(pageNumber) {
  if (pageNumber === 3) return INTRO_FREE_CUSTOM_FIELD_DEFS;
  if (pageNumber === 5) return FREE_PAGE_5_CUSTOM_FIELD_DEFS;
  return YEAR_FREE_CUSTOM_FIELD_DEFS;
}

function buildBirthdayFreePage(pageNumber, lineGuideId) {
  return tzOverride({
    title: getBirthday48PageTitle(pageNumber),
    pageType: 'birthday_free_page',
    templateLibraryId: 'CaptionGalleryTemplate',
    fields: [],
    customFieldDefs: getFreeCustomFieldDefs(pageNumber),
    photoBlocks: [FULL_PHOTO_BLOCK],
    captionEnabled: true,
    canDuplicate: true,
    canAddAfter: true,
  });
}

function applyBirthday48PageFields(pageNumber, lineGuideId, slots = []) {
  switch (pageNumber) {
    case 1:
      return tzOverride({
        title: 'Этот альбом принадлежит',
        pageType: 'structured',
        templateLibraryId: 'TextPageTemplate',
        fields: buildOwnerFields(lineGuideId, pageNumber, slots),
        photoBlocks: undefined,
        canDuplicate: false,
        canAddAfter: false,
      });
    case 2:
      return tzOverride({
        title: 'Привет, мир!',
        pageType: 'structured',
        templateLibraryId: 'SinglePhotoTemplate',
        fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, HELLO_WORLD_FIELDS),
        photoBlocks: [HELLO_PHOTO_BLOCK],
        canDuplicate: false,
        canAddAfter: false,
      });
    case 3:
      return buildBirthdayFreePage(pageNumber, lineGuideId);
    case 4:
      return tzOverride({
        title: 'Мне 1 годик',
        pageType: 'structured',
        templateLibraryId: 'SinglePhotoTemplate',
        fields: buildAgeMainFields(lineGuideId, pageNumber, slots, AGE_ONE_YEAR_FIELDS),
        photoBlocks: [SINGLE_AGE_PHOTO_BLOCK],
        captionEnabled: true,
        canDuplicate: false,
        canAddAfter: false,
      });
    case 5:
      return buildBirthdayFreePage(pageNumber, lineGuideId);
    case 40:
      return tzOverride({
        title: 'Мои путешествия',
        pageType: 'travel_map_page',
        templateLibraryId: 'TextPageTemplate',
        fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, TRAVEL_MAP_FIELDS),
        photoBlocks: undefined,
        canDuplicate: false,
        canAddAfter: false,
      });
    case 48:
      return tzOverride({
        title: 'Письмо во взрослую жизнь',
        pageType: 'text_page',
        templateLibraryId: 'TextPageTemplate',
        fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, LETTER_FIELDS),
        photoBlocks: undefined,
        canDuplicate: false,
        canAddAfter: false,
      });
    default:
      break;
  }

  if (isYearMainPage(pageNumber)) {
    return tzOverride({
      title: getBirthday48PageTitle(pageNumber),
      pageType: 'structured',
      templateLibraryId: 'SinglePhotoTemplate',
      fields: buildAgeMainFields(lineGuideId, pageNumber, slots, YEAR_MAIN_FIELDS),
      photoBlocks: [SINGLE_AGE_PHOTO_BLOCK],
      captionEnabled: true,
      canDuplicate: false,
      canAddAfter: false,
    });
  }

  if (isBirthdayFreePage(pageNumber)) {
    return buildBirthdayFreePage(pageNumber, lineGuideId);
  }

  if (isTravelPhotoPage(pageNumber)) {
    return tzOverride({
      title: 'Свободная фотостраница',
      pageType: 'caption_photo_page',
      templateLibraryId: 'CaptionGalleryTemplate',
      fields: [],
      photoBlocks: [FULL_PHOTO_BLOCK],
      captionEnabled: true,
      canDuplicate: true,
      canAddAfter: true,
    });
  }

  return null;
}

module.exports = {
  applyBirthday48PageFields,
  tzOverride,
};
