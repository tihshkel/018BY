/**
 * Field/photo builders for diary_interior_brown 60-page TZ manifest.
 * Used by generate-page-schemas.js
 */

const { DESIGNED_ALBUM_PHOTO_BLOCK } = require('./photo-block-presets-data');
const {
  USER_QUESTIONNAIRE_FIELDS,
  PARENT_MOM_FIELDS,
  PARENT_DAD_FIELDS,
  HOBBY_FIELDS,
  PETS_FIELDS,
  SOCIAL_NETWORKS_FIELDS,
  MOOD_FIELDS,
  STYLE_FIELDS,
  FIRST_LOVE_FIELDS,
  SCHOOL_LIFE_FIELDS,
  SUNDAY_SCHEDULE_FIELDS,
  GRANDPARENT_FIELDS,
  DREAMS_FIELDS,
  TRAVEL_FIELDS,
  DIARY_RULES_FIELDS,
  WEEKLY_SCHEDULE_DAY_PAIRS,
  BROWN_WEEKLY_SCHEDULE_PAGES,
  buildWeeklyScheduleSpec,
  buildBrownWeeklyScheduleWithNoteSpec,
} = require('./girls-diary-a5-field-specs');

const FREE_PHOTO_NOTES_BLOCK = {
  blockId: 'free_photo_notes',
  label: 'Фото для страницы',
  variants: [
    {
      variantId: 'single_horizontal',
      label: '1 горизонтальное фото',
      slots: 1,
      slotIndices: [0],
    },
    {
      variantId: 'single_vertical',
      label: '1 вертикальное фото',
      slots: 1,
      slotIndices: [0],
    },
    {
      variantId: 'two_vertical',
      label: '2 вертикальных фото',
      slots: 2,
      slotIndices: [0, 1],
    },
    {
      variantId: 'four_vertical',
      label: '4 вертикальных фото',
      slots: 4,
      slotIndices: [0, 1, 2, 3],
    },
  ],
};

const MOOD_OPTIONS = ['😢', '😕', '😐', '🙂', '😄', '🥰'];

const FRIEND_FIELDS = [
  ['name', 'Имя', 'text', 1],
  ['birthDate', 'Дата рождения', 'date', 1],
  ['zodiac', 'Знак зодиака', 'text', 1],
  ['phone', 'Номер телефона', 'text', 1],
  ['favoriteColor', 'Любимый цвет', 'text', 1],
  ['pet', 'Питомец (если есть)', 'text', 1],
  ['favoriteFlower', 'Любимый цветок', 'text', 1],
  ['favoriteAnimal', 'Любимое животное', 'text', 1],
  ['hobby', 'Хобби', 'text', 1],
  ['favoriteFood', 'Любимая еда', 'text', 1],
  ['favoriteMovie', 'Любимый фильм', 'text', 1],
  ['favoriteMusician', 'Любимый музыкант', 'text', 1],
  ['favoriteBook', 'Любимая книга', 'text', 1],
  ['bestGirlfriend', 'Лучшая подруга', 'text', 1],
  ['bestFriend', 'Лучший друг', 'text', 1],
  ['wishes', 'Пожелания хозяйке анкеты', 'text', 2],
];

const FOOD_FIELDS = [
  ['favoriteFood', 'Перечисли самую вкусную для тебя еду', 'text', 1],
  ['favoriteSweet', 'Что ты любишь из сладенького?', 'text', 1],
  ['sweetTooth', 'Ты считаешь себя сладкоежкой', 'text', 1],
  ['recipeStory', 'Ты уже пробовала готовить? Если да, то поделись рецептом', 'text', 2],
  ['favoriteCafeOrder', 'Ты любишь кушать в кафе? Если да, то что ты чаще всего заказываешь?', 'text', 2],
  ['futureCookingPlans', 'Что ты чаще всего будешь готовить, когда вырастешь?', 'text', 2],
];

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

function buildDiaryOwnerFields(lineGuideId, pageNumber, slots) {
  return [
    buildField(
      lineGuideId,
      pageNumber,
      'owner_name',
      'Этот дневник принадлежит',
      'text',
      0,
      1,
      slots
    ),
  ];
}

function buildMyDayFields(lineGuideId, pageNumber, slots) {
  const maxLines = slots?.length ?? 12;
  return [
    buildField(lineGuideId, pageNumber, 'date', 'Дата', 'date', 0, 1, slots),
    buildField(
      lineGuideId,
      pageNumber,
      'day_story',
      'Как прошёл сегодняшний день',
      'text',
      Math.min(1, maxLines - 1),
      Math.min(5, Math.max(1, maxLines - 4)),
      slots
    ),
    {
      fieldId: `${lineGuideId}_p${pageNumber}_mood`,
      label: 'Настроение',
      type: 'radio',
      required: false,
      options: MOOD_OPTIONS,
      templateLineStart: Math.min(6, maxLines - 1),
      templateLineCount: 1,
    },
    buildField(
      lineGuideId,
      pageNumber,
      'things_that_made_smile',
      'Вещи, которые заставили сегодня улыбаться',
      'text',
      Math.min(7, maxLines - 1),
      Math.min(4, Math.max(1, maxLines - 7)),
      slots
    ),
  ];
}

function buildFreePhotoNotes(pageNumber, slots, lineGuideId, tzEntry) {
  return {
    replaceFields: true,
    title: tzEntry.title,
    pageType: 'caption_photo_page',
    editable: true,
    fields: [],
    photoBlocks: [FREE_PHOTO_NOTES_BLOCK],
    canDuplicate: true,
    captionEnabled: true,
  };
}

function buildFriendQuestionnaire(pageNumber, slots, lineGuideId, tzEntry) {
  return {
    replaceFields: true,
    replacePhotoBlocks: true,
    photoBlocks: undefined,
    title: tzEntry.title,
    pageType: 'structured',
    editable: true,
    fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, FRIEND_FIELDS),
    canDuplicate: true,
  };
}

function buildFoodQuestionnaire(pageNumber, slots, lineGuideId, tzEntry) {
  return {
    replaceFields: true,
    replacePhotoBlocks: true,
    photoBlocks: undefined,
    title: tzEntry.title,
    pageType: 'structured',
    editable: true,
    fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, FOOD_FIELDS),
    canDuplicate: false,
  };
}

function buildStaticPage(tzEntry) {
  return {
    replaceFields: true,
    title: tzEntry.title,
    pageType: 'non_editable',
    editable: false,
    fields: [],
    photoBlocks: [],
    canDuplicate: false,
  };
}

function buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, spec) {
  return {
    replaceFields: true,
    replacePhotoBlocks: true,
    photoBlocks: undefined,
    title: tzEntry.title,
    pageType: 'structured',
    editable: true,
    fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, spec),
    formHint: tzEntry.formHint,
    canDuplicate: tzEntry.canDuplicate ?? false,
  };
}

function buildWeeklyScheduleTwoDays(pageNumber, slots, lineGuideId, tzEntry, dayPairs) {
  const dayPair = dayPairs[pageNumber];
  if (!dayPair) return null;
  const spec = buildWeeklyScheduleSpec(dayPair[0], dayPair[1], slots);
  return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, spec);
}

function buildWeeklyScheduleSunday(pageNumber, slots, lineGuideId, tzEntry) {
  return buildStructuredFromSpec(
    pageNumber,
    slots,
    lineGuideId,
    tzEntry,
    SUNDAY_SCHEDULE_FIELDS,
  );
}

function buildPhotoPage(pageNumber, slots, lineGuideId, tzEntry) {
  return {
    replaceFields: true,
    title: tzEntry.title,
    pageType: 'photo',
    editable: true,
    fields: [],
    photoBlocks: [DESIGNED_ALBUM_PHOTO_BLOCK],
    canDuplicate: tzEntry.canDuplicate ?? false,
  };
}

const STATIC_TEMPLATES = new Set([
  'StaticIntroTemplate',
  'StaticSecretWishTemplate',
  'StaticEnvelopeTemplate',
  'StaticFinalTemplate',
  'StaticPageTemplate',
]);

function applyDiary60TzManifest(pageNumber, slots, tzEntry, lineGuideId) {
  const result = buildDiary60TzOverride(pageNumber, slots, tzEntry, lineGuideId);
  if (!result) return null;
  return { replaceFields: true, ...result };
}

function buildDiary60TzOverride(pageNumber, slots, tzEntry, lineGuideId) {
  if (!tzEntry) return null;

  const template = tzEntry.template;

  if (STATIC_TEMPLATES.has(template)) {
    return buildStaticPage(tzEntry);
  }

  if (template === 'FreePhotoNotesTemplate') {
    return buildFreePhotoNotes(pageNumber, slots, lineGuideId, tzEntry);
  }

  if (template === 'FriendQuestionnaireTemplate') {
    return buildFriendQuestionnaire(pageNumber, slots, lineGuideId, tzEntry);
  }

  if (template === 'FoodTemplate') {
    return buildFoodQuestionnaire(pageNumber, slots, lineGuideId, tzEntry);
  }

  if (template === 'MyDayTemplate') {
    return {
      replaceFields: true,
      replacePhotoBlocks: true,
      photoBlocks: undefined,
      title: tzEntry.title,
      pageType: 'structured',
      editable: true,
      fields: buildMyDayFields(lineGuideId, pageNumber, slots),
      canDuplicate: true,
    };
  }

  if (template === 'DiaryOwnerTemplate') {
    return {
      title: tzEntry.title,
      pageType: 'structured',
      editable: true,
      fields: buildDiaryOwnerFields(lineGuideId, pageNumber, slots),
      canDuplicate: false,
    };
  }

  if (template === 'PersonalPhotoTemplate' || template === 'FamilyPhotosTemplate' || template === 'PetPhotosTemplate') {
    return buildPhotoPage(pageNumber, slots, lineGuideId, tzEntry);
  }

  if (template === 'GirlProfileTemplate') {
    return buildStructuredFromSpec(
      pageNumber,
      slots,
      lineGuideId,
      tzEntry,
      USER_QUESTIONNAIRE_FIELDS,
    );
  }

  if (template === 'ParentProfileTemplate_Mom') {
    return buildStructuredFromSpec(
      pageNumber,
      slots,
      lineGuideId,
      { ...tzEntry, formHint: 'Анкета про маму: контакты, профессия, любимые вещи и пожелания.' },
      PARENT_MOM_FIELDS,
    );
  }

  if (template === 'ParentProfileTemplate_Dad') {
    return buildStructuredFromSpec(
      pageNumber,
      slots,
      lineGuideId,
      { ...tzEntry, formHint: 'Анкета про папу: контакты, профессия, любимые вещи и пожелания.' },
      PARENT_DAD_FIELDS,
    );
  }

  if (
    template === 'GrandparentProfileTemplate_Grandma' ||
    template === 'GrandparentProfileTemplate_Grandpa'
  ) {
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, GRANDPARENT_FIELDS);
  }

  if (template === 'DiaryRulesTemplate') {
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, DIARY_RULES_FIELDS);
  }

  if (template === 'HobbyTemplate' || template === 'HobbyQuestionnaireTemplate') {
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, HOBBY_FIELDS);
  }

  if (template === 'PetsTemplate' || template === 'PetsQuestionnaireTemplate') {
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, PETS_FIELDS);
  }

  if (template === 'SocialNetworksTemplate') {
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, SOCIAL_NETWORKS_FIELDS);
  }

  if (template === 'MoodTemplate' || template === 'MoodQuestionnaireTemplate') {
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, MOOD_FIELDS);
  }

  if (template === 'StyleTemplate' || template === 'StyleQuestionnaireTemplate') {
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, STYLE_FIELDS);
  }

  if (template === 'FirstLoveTemplate') {
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, FIRST_LOVE_FIELDS);
  }

  if (template === 'SchoolLifeTemplate' || template === 'SchoolLifeQuestionnaireTemplate') {
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, SCHOOL_LIFE_FIELDS);
  }

  if (template === 'DreamsTemplate') {
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, DREAMS_FIELDS);
  }

  if (template === 'TravelTemplate') {
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, TRAVEL_FIELDS);
  }

  if (template === 'UserQuestionnaireTemplate') {
    return buildStructuredFromSpec(
      pageNumber,
      slots,
      lineGuideId,
      tzEntry,
      USER_QUESTIONNAIRE_FIELDS,
    );
  }

  if (template === 'ParentQuestionnaireTemplate') {
    const spec = pageNumber === 6 ? PARENT_MOM_FIELDS : PARENT_DAD_FIELDS;
    const formHint =
      pageNumber === 6
        ? 'Анкета про маму: контакты, профессия, любимые вещи и пожелания.'
        : 'Анкета про папу: контакты, профессия, любимые вещи и пожелания.';
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, { ...tzEntry, formHint }, spec);
  }

  if (template === 'WeeklyScheduleTwoDaysTemplate') {
    return buildWeeklyScheduleTwoDays(
      pageNumber,
      slots,
      lineGuideId,
      tzEntry,
      WEEKLY_SCHEDULE_DAY_PAIRS,
    );
  }

  if (template === 'WeeklyScheduleTemplate') {
    return buildWeeklyScheduleTwoDays(
      pageNumber,
      slots,
      lineGuideId,
      tzEntry,
      BROWN_WEEKLY_SCHEDULE_PAGES,
    );
  }

  if (template === 'WeeklyScheduleSundayTemplate') {
    return buildWeeklyScheduleSunday(pageNumber, slots, lineGuideId, tzEntry);
  }

  if (template === 'WeeklyScheduleWithNoteTemplate') {
    const spec = buildBrownWeeklyScheduleWithNoteSpec(slots);
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, spec);
  }

  if (tzEntry.hasPhoto && (tzEntry.pageType === 'photo' || tzEntry.pageType === 'caption_photo_page')) {
    return buildPhotoPage(pageNumber, slots, lineGuideId, tzEntry);
  }

  return {
    title: tzEntry.title,
    pageType: tzEntry.pageType ?? 'structured',
    editable: tzEntry.editable !== false,
    canDuplicate: tzEntry.canDuplicate ?? false,
    requiredInExport: tzEntry.requiredInExport ?? false,
  };
}

module.exports = {
  applyDiary60TzManifest,
  FREE_PHOTO_NOTES_BLOCK,
  FRIEND_FIELDS,
  FOOD_FIELDS,
};
