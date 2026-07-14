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
  PURPLE_HOBBY_FIELDS,
  PETS_FIELDS,
  PURPLE_PETS_FIELDS,
  SOCIAL_NETWORKS_FIELDS,
  PURPLE_SOCIAL_NETWORKS_FIELDS,
  FRIEND_SOCIAL_FIELDS,
  PURPLE_FRIEND_FIELDS,
  MOOD_FIELDS,
  PURPLE_MOOD_FIELDS,
  STYLE_FIELDS,
  PURPLE_STYLE_FIELDS,
  FIRST_LOVE_FIELDS,
  PURPLE_FIRST_LOVE_FIELDS,
  SCHOOL_LIFE_FIELDS,
  PURPLE_SCHOOL_LIFE_FIELDS,
  SUNDAY_SCHEDULE_FIELDS,
  GRANDPARENT_FIELDS,
  DREAMS_FIELDS,
  TRAVEL_FIELDS,
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
  ['favoriteCartoon', 'Любимый мультфильм', 'text', 1],
  ['favoriteBook', 'Любимая книга', 'text', 1],
  ['bestGirlfriend', 'Лучшая подруга', 'text', 1],
  ['bestFriend', 'Лучший друг', 'text', 1],
  ['wishes', 'Пожелания хозяйке анкеты', 'text', 2],
];

const PURPLE_FRIEND_QUESTIONNAIRE_PAGES = new Set([28, 29, 30, 31, 32, 33]);

function countSpecLines(spec) {
  return spec.reduce((sum, [, , , count]) => sum + count, 0);
}

function friendFieldsSpecForPage(lineGuideId, pageNumber, slots) {
  if (
    lineGuideId !== 'diary_interior_purple' ||
    !PURPLE_FRIEND_QUESTIONNAIRE_PAGES.has(pageNumber)
  ) {
    return FRIEND_FIELDS;
  }

  // Пожелания — 2 строки (≈44 символа) + Instagram / VK / TikTok при достаточных слотах.
  const baseLines = countSpecLines(PURPLE_FRIEND_FIELDS);
  const slotCount = slots?.length ?? 0;

  if (slotCount - baseLines >= FRIEND_SOCIAL_FIELDS.length) {
    return [...PURPLE_FRIEND_FIELDS, ...FRIEND_SOCIAL_FIELDS];
  }

  return PURPLE_FRIEND_FIELDS;
}

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
  const field = {
    fieldId: `${lineGuideId}_p${pageNumber}_${id}`,
    label,
    type,
    required: false,
    templateLineStart: Math.min(start, maxStart),
    templateLineCount: count,
  };
  // «Пожелания хозяйке анкеты» — ровно 2 строки ≈ 44 символа.
  if (
    id === 'wishes' &&
    lineGuideId === 'diary_interior_purple' &&
    PURPLE_FRIEND_QUESTIONNAIRE_PAGES.has(pageNumber)
  ) {
    field.maxLength = 44;
  }
  // Instagram / VK / TikTok — короткие ники, 15 символов.
  if (
    (id === 'instagram' || id === 'vk' || id === 'tiktok') &&
    lineGuideId === 'diary_interior_purple' &&
    PURPLE_FRIEND_QUESTIONNAIRE_PAGES.has(pageNumber)
  ) {
    field.maxLength = 15;
  }
  return field;
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
  const fields = [
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
  if ((slots?.length ?? 0) >= 2) {
    fields.push(
      buildField(
        lineGuideId,
        pageNumber,
        'owner_phone',
        'Номер телефона',
        'text',
        1,
        1,
        slots
      )
    );
  }
  return fields;
}

function buildMyDayFields(lineGuideId, pageNumber, slots) {
  const maxLines = slots?.length ?? 12;

  if (lineGuideId === 'diary_interior_purple') {
    // Линии письма: 0–7 день, 8–14 улыбка.
    // Дата — runtime-слот в конце (index 15); не через buildField,
    // иначе Math.min(..., slots.length-1) сжимает 15→14 (в JSON ещё нет хвоста даты).
    const dayStoryLines = 8;
    const smileStart = dayStoryLines;
    const smileLines = 7;
    const dateSlotIndex = dayStoryLines + smileLines; // 15
    return [
      {
        fieldId: `${lineGuideId}_p${pageNumber}_date`,
        label: 'Дата',
        type: 'date',
        required: false,
        templateLineStart: dateSlotIndex,
        templateLineCount: 1,
      },
      buildField(
        lineGuideId,
        pageNumber,
        'day_story',
        'Как прошёл сегодняшний день',
        'text',
        0,
        dayStoryLines,
        slots,
      ),
      {
        fieldId: `${lineGuideId}_p${pageNumber}_mood`,
        label: 'Настроение',
        type: 'radio',
        required: false,
        options: MOOD_OPTIONS,
        templateLineStart: 0,
        templateLineCount: 1,
      },
      buildField(
        lineGuideId,
        pageNumber,
        'things_that_made_smile',
        'Вещи, которые заставили сегодня улыбаться',
        'text',
        smileStart,
        smileLines,
        slots,
      ),
    ];
  }

  // Коричневый (6+5): дата вливается в day_story.
  if (lineGuideId === 'diary_interior_brown') {
    const dayStoryLines = Math.min(6, Math.max(1, maxLines));
    const smileStart = dayStoryLines;
    const smileLines = Math.max(1, maxLines - smileStart);
    return [
      buildField(lineGuideId, pageNumber, 'date', 'Дата', 'date', 0, 1, slots),
      buildField(
        lineGuideId,
        pageNumber,
        'day_story',
        'Как прошёл сегодняшний день',
        'text',
        0,
        dayStoryLines,
        slots,
      ),
      {
        fieldId: `${lineGuideId}_p${pageNumber}_mood`,
        label: 'Настроение',
        type: 'radio',
        required: false,
        options: MOOD_OPTIONS,
        templateLineStart: 0,
        templateLineCount: 1,
      },
      buildField(
        lineGuideId,
        pageNumber,
        'things_that_made_smile',
        'Вещи, которые заставили сегодня улыбаться',
        'text',
        smileStart,
        smileLines,
        slots,
      ),
    ];
  }

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
  const spec = friendFieldsSpecForPage(lineGuideId, pageNumber, slots);
  return {
    replaceFields: true,
    replacePhotoBlocks: true,
    photoBlocks: undefined,
    title: tzEntry.title,
    pageType: 'structured',
    editable: true,
    fields: buildFieldsFromSpec(lineGuideId, pageNumber, slots, spec),
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
    return buildStaticPage(tzEntry);
  }

  if (template === 'HobbyTemplate' || template === 'HobbyQuestionnaireTemplate') {
    const hobbySpec =
      lineGuideId === 'diary_interior_purple' ? PURPLE_HOBBY_FIELDS : HOBBY_FIELDS;
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, hobbySpec);
  }

  if (template === 'PetsTemplate' || template === 'PetsQuestionnaireTemplate') {
    const petsSpec =
      lineGuideId === 'diary_interior_purple' ? PURPLE_PETS_FIELDS : PETS_FIELDS;
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, petsSpec);
  }

  if (template === 'SocialNetworksTemplate') {
    const socialSpec =
      lineGuideId === 'diary_interior_purple'
        ? PURPLE_SOCIAL_NETWORKS_FIELDS
        : SOCIAL_NETWORKS_FIELDS;
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, socialSpec);
  }

  if (template === 'MoodTemplate' || template === 'MoodQuestionnaireTemplate') {
    const moodSpec =
      lineGuideId === 'diary_interior_purple' ? PURPLE_MOOD_FIELDS : MOOD_FIELDS;
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, moodSpec);
  }

  if (template === 'StyleTemplate' || template === 'StyleQuestionnaireTemplate' || template === 'FashionStyleQuestionnaireTemplate') {
    const styleSpec =
      lineGuideId === 'diary_interior_purple' ? PURPLE_STYLE_FIELDS : STYLE_FIELDS;
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, styleSpec);
  }

  if (template === 'FirstLoveTemplate') {
    const loveSpec =
      lineGuideId === 'diary_interior_purple' ? PURPLE_FIRST_LOVE_FIELDS : FIRST_LOVE_FIELDS;
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, loveSpec);
  }

  if (template === 'SchoolLifeTemplate' || template === 'SchoolLifeQuestionnaireTemplate') {
    const schoolFields =
      lineGuideId === 'diary_interior_purple' ? PURPLE_SCHOOL_LIFE_FIELDS : SCHOOL_LIFE_FIELDS;
    return buildStructuredFromSpec(pageNumber, slots, lineGuideId, tzEntry, schoolFields);
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
