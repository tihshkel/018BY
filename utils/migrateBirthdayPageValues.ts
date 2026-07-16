import type { AlbumPageSchema, PageInstance, PageValues } from '@/types/album-page-schema';
import { getSchemaForInstance } from '@/utils/albumProjectInit';

/** Переносит legacy customFields в schema.fields для фиксированных страниц дня рождения. */
export function migrateBirthdayPageValues(
  schema: AlbumPageSchema,
  values: PageValues,
): PageValues {
  if (schema.pageType !== 'birthday_free_page') return values;
  if (!(schema.fields?.length)) return values;

  const customFields = values.customFields;
  if (!customFields?.some((field) => field.value?.trim())) {
    return values;
  }

  const nextFields = { ...values.fields };
  let migrated = false;

  for (const schemaField of schema.fields) {
    if (nextFields[schemaField.fieldId]?.trim()) continue;

    const customField = customFields.find((field) =>
      schemaField.fieldId.endsWith(`_${field.id}`),
    );
    const text = customField?.value?.trim();
    if (!text) continue;

    nextFields[schemaField.fieldId] = text;
    migrated = true;
  }

  if (!migrated) return values;

  return {
    ...values,
    fields: nextFields,
    customFields: [],
  };
}

/** Сливает legacy «Дополнительная строка» в основное поле путешествий. */
export function migrateTravelPageValues(
  schema: AlbumPageSchema,
  values: PageValues,
): PageValues {
  if (schema.pageType !== 'travel_map_page') return values;

  const fieldEntries = Object.entries(values.fields);
  const mainKey = fieldEntries.find(
    ([key]) => key.endsWith('_favorite_travel_memory') && !key.endsWith('_line2'),
  )?.[0];
  const line2Key = fieldEntries.find(([key]) => key.endsWith('_favorite_travel_memory_line2'))?.[0];
  const hasMarkers = (values.mapMarkers ?? []).length > 0;

  if (!mainKey && !line2Key && !hasMarkers) return values;

  const nextFields = { ...values.fields };
  const mainText = mainKey ? (nextFields[mainKey] ?? '').trim() : '';
  const line2Text = line2Key ? (nextFields[line2Key] ?? '').trim() : '';
  const merged = [mainText, line2Text].filter(Boolean).join(' ');

  if (mainKey) {
    nextFields[mainKey] = merged;
  }
  if (line2Key) {
    delete nextFields[line2Key];
  }

  return {
    ...values,
    fields: nextFields,
    mapMarkers: [],
  };
}

/** Legacy diary field IDs after 09.06.26 spec alignment. */
const DIARY_FIELD_ID_ALIASES: Record<string, string> = {
  diary_interior_brown_p13_mainHobby: 'diary_interior_brown_p13_hobbiesStory',
  diary_interior_brown_p13_sport: 'diary_interior_brown_p13_favoriteSports',
  diary_interior_brown_p13_creative: 'diary_interior_brown_p13_aloneActivity',
  diary_interior_brown_p13_club: 'diary_interior_brown_p13_favoriteCartoon',
  diary_interior_brown_p13_favoriteMusic: 'diary_interior_brown_p13_favoriteMusic',
  diary_interior_brown_p13_dreamSkill: 'diary_interior_brown_p13_favoriteWriter',
  diary_interior_brown_p13_freeTime: 'diary_interior_brown_p13_favoriteCompany',
  diary_interior_brown_p13_proudOf: 'diary_interior_brown_p13_favoriteMusic',
  diary_interior_brown_p31_schoolName: 'diary_interior_brown_p31_likesStudying',
  diary_interior_brown_p31_className: 'diary_interior_brown_p31_favoriteSubject',
  diary_interior_brown_p31_bestClassmate: 'diary_interior_brown_p31_classSize',
  diary_interior_brown_p31_bestClassmateGirl: 'diary_interior_brown_p31_classmateFriends',
  diary_interior_brown_p31_achievements: 'diary_interior_brown_p31_schoolEvents',
  diary_interior_brown_p31_dreamProfession: 'diary_interior_brown_p31_recessActivity',
  diary_interior_brown_p31_afterSchool: 'diary_interior_brown_p31_schoolMemory',
  diary_interior_brown_p41_favoriteMusician: 'diary_interior_brown_p41_favoriteCartoon',
  diary_interior_brown_p42_favoriteMusician: 'diary_interior_brown_p42_favoriteCartoon',
  diary_interior_brown_p43_favoriteMusician: 'diary_interior_brown_p43_favoriteCartoon',
  diary_interior_brown_p44_favoriteMusician: 'diary_interior_brown_p44_favoriteCartoon',
};

const PURPLE_FRIEND_PAGES = [28, 29, 30, 31, 32, 33] as const;

/** Legacy field layouts (suffix + start + count) before semantic remaps. */
const DIARY_LEGACY_POSITIONAL_LAYOUTS: Record<
  string,
  ReadonlyArray<{ id: string; start: number; count: number }>
> = {
  diary_interior_brown_p24: [
    { id: 'moodNote', start: 0, count: 1 },
    { id: 'whatMadeHappy', start: 1, count: 2 },
    { id: 'whatMadeSad', start: 3, count: 2 },
    { id: 'gratitude', start: 5, count: 2 },
    { id: 'tomorrowWish', start: 7, count: 2 },
  ],
  diary_interior_purple_p14: [
    { id: 'moodNote', start: 0, count: 1 },
    { id: 'whatMadeHappy', start: 1, count: 2 },
    { id: 'whatMadeSad', start: 3, count: 2 },
    { id: 'gratitude', start: 5, count: 2 },
    { id: 'tomorrowWish', start: 7, count: 2 },
  ],
  diary_interior_brown_p17: [
    { id: 'petName', start: 0, count: 1 },
    { id: 'petType', start: 1, count: 1 },
    { id: 'petAge', start: 2, count: 1 },
    { id: 'petCharacter', start: 3, count: 1 },
    { id: 'petFood', start: 4, count: 1 },
    { id: 'petStory', start: 5, count: 3 },
  ],
  diary_interior_brown_p21: [
    { id: 'favoritePlace', start: 0, count: 1 },
    { id: 'visitedCountries', start: 1, count: 2 },
    { id: 'dreamTrip', start: 3, count: 1 },
    { id: 'bestTrip', start: 4, count: 3 },
    { id: 'travelBuddy', start: 7, count: 1 },
  ],
  diary_interior_brown_p26: [
    { id: 'style', start: 0, count: 1 },
    { id: 'favoriteColors', start: 1, count: 1 },
    { id: 'favoriteBrands', start: 2, count: 1 },
    { id: 'favoriteOutfit', start: 3, count: 1 },
    { id: 'accessories', start: 4, count: 1 },
    { id: 'shopping', start: 5, count: 2 },
    { id: 'inspiration', start: 7, count: 2 },
  ],
};

const LEGACY_MY_DAY_MOOD_OPTIONS = ['😢', '😕', '😐', '🙂', '😄', '🥰'] as const;
const NEXT_MY_DAY_MOOD_OPTIONS = ['😊', '😢', '😐', '😃', '😄', '😅', '😠', '😟', '😁'] as const;

function migratePurpleFriendQuestionnaireFields(values: PageValues, pageNumber: number): PageValues {
  if (!PURPLE_FRIEND_PAGES.includes(pageNumber as (typeof PURPLE_FRIEND_PAGES)[number])) {
    return values;
  }

  const prefix = `diary_interior_purple_p${pageNumber}_`;
  const nextFields = { ...values.fields };
  let migrated = false;

  const cartoonId = `${prefix}favoriteCartoon`;
  const musicianId = `${prefix}favoriteMusician`;
  const cartoonText = nextFields[cartoonId]?.trim();
  if (cartoonText && !nextFields[musicianId]?.trim()) {
    nextFields[musicianId] = cartoonText;
    delete nextFields[cartoonId];
    migrated = true;
  }

  if (!migrated) return values;
  return { ...values, fields: nextFields };
}

function spreadFieldTextAcrossSlots(text: string, count: number): string[] {
  const lines = text.split(/\n/).map((line) => line.trim());
  const slots = Array.from({ length: count }, () => '');
  if (lines.length >= count) {
    for (let i = 0; i < count; i += 1) slots[i] = lines[i] ?? '';
    return slots;
  }
  if (lines.length === 1) {
    slots[0] = lines[0] ?? '';
    return slots;
  }
  for (let i = 0; i < lines.length && i < count; i += 1) {
    slots[i] = lines[i] ?? '';
  }
  return slots;
}

function migrateDiaryPositionalFields(schema: AlbumPageSchema, values: PageValues): PageValues {
  const pageNumber = schema.sourcePageNumber;
  const albumId = schema.lineGuideId ?? '';
  if (!albumId.startsWith('diary_interior_')) return values;

  const layoutKey = `${albumId}_p${pageNumber}`;
  const legacyLayout = DIARY_LEGACY_POSITIONAL_LAYOUTS[layoutKey];
  if (!legacyLayout?.length) return values;

  const prefix = `${albumId}_p${pageNumber}_`;
  const nextFields = { ...values.fields };
  const schemaFields = (schema.fields ?? []).filter((field) => field.type !== 'radio');
  if (!schemaFields.length) return values;

  const hasLegacy = legacyLayout.some((entry) => nextFields[`${prefix}${entry.id}`]?.trim());
  if (!hasLegacy) return values;

  // Skip if any new semantic id already filled (except when only legacy ids exist).
  const hasNewSemantic = schemaFields.some((field) => {
    const suffix = field.fieldId.slice(prefix.length);
    const isLegacy = legacyLayout.some((entry) => entry.id === suffix);
    return !isLegacy && nextFields[field.fieldId]?.trim();
  });
  if (hasNewSemantic) return values;

  const slotTexts: string[] = [];
  for (const entry of legacyLayout) {
    const legacyId = `${prefix}${entry.id}`;
    const text = nextFields[legacyId]?.trim() ?? '';
    const parts = text ? spreadFieldTextAcrossSlots(text, entry.count) : Array.from({ length: entry.count }, () => '');
    for (let i = 0; i < entry.count; i += 1) {
      slotTexts[entry.start + i] = parts[i] ?? '';
    }
    delete nextFields[legacyId];
  }

  for (const field of schemaFields) {
    const start = field.templateLineStart ?? 0;
    const count = field.templateLineCount ?? 1;
    const chunks: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const chunk = slotTexts[start + i]?.trim();
      if (chunk) chunks.push(chunk);
    }
    if (!chunks.length) continue;
    if (nextFields[field.fieldId]?.trim()) continue;
    nextFields[field.fieldId] = chunks.join('\n');
  }

  return { ...values, fields: nextFields };
}

function migratePurpleMyDayDateIntoStory(schema: AlbumPageSchema, values: PageValues): PageValues {
  if (schema.lineGuideId !== 'diary_interior_purple') return values;
  const pageNumber = schema.sourcePageNumber;
  const prefix = `diary_interior_purple_p${pageNumber}_`;
  const dateId = `${prefix}date`;
  const storyId = `${prefix}day_story`;
  const dateText = values.fields[dateId]?.trim() ?? '';
  if (!dateText) return values;

  const nextFields = { ...values.fields };
  const storyText = nextFields[storyId]?.trim() ?? '';
  if (!storyText) {
    nextFields[storyId] = dateText;
  } else if (!storyText.startsWith(dateText)) {
    nextFields[storyId] = `${dateText} ${storyText}`;
  }
  delete nextFields[dateId];
  return { ...values, fields: nextFields };
}

function migrateMyDayMoodOptionValue(schema: AlbumPageSchema, values: PageValues): PageValues {
  if (!schema.lineGuideId?.startsWith('diary_interior_')) return values;
  const moodField = schema.fields?.find((field) => field.fieldId.endsWith('_mood') && field.type === 'radio');
  if (!moodField) return values;

  const current = values.fields[moodField.fieldId]?.trim();
  if (!current) return values;
  if ((moodField.options ?? []).includes(current)) return values;

  const legacyIndex = LEGACY_MY_DAY_MOOD_OPTIONS.indexOf(
    current as (typeof LEGACY_MY_DAY_MOOD_OPTIONS)[number],
  );
  if (legacyIndex < 0) return values;

  // Old 6 options mapped onto the middle of the printed 9-face row.
  const nextOption = NEXT_MY_DAY_MOOD_OPTIONS[Math.min(legacyIndex + 1, NEXT_MY_DAY_MOOD_OPTIONS.length - 1)];
  return {
    ...values,
    fields: {
      ...values.fields,
      [moodField.fieldId]: nextOption,
    },
  };
}

export function migrateDiaryFieldValues(
  values: PageValues,
  pageNumber?: number,
  schema?: AlbumPageSchema | null,
): PageValues {
  let next = values;

  if (pageNumber != null) {
    next = migratePurpleFriendQuestionnaireFields(next, pageNumber);
  }

  if (schema) {
    next = migrateDiaryPositionalFields(schema, next);
    next = migratePurpleMyDayDateIntoStory(schema, next);
    next = migrateMyDayMoodOptionValue(schema, next);
  }

  const nextFields = { ...next.fields };
  let migrated = false;

  for (const [legacyId, nextId] of Object.entries(DIARY_FIELD_ID_ALIASES)) {
    const legacyText = nextFields[legacyId]?.trim();
    if (!legacyText || nextFields[nextId]?.trim()) continue;
    nextFields[nextId] = legacyText;
    delete nextFields[legacyId];
    migrated = true;
  }

  if (!migrated && next === values) return values;
  return migrated ? { ...next, fields: nextFields } : next;
}

export function migrateBirthdayPageValuesMap(
  instances: PageInstance[],
  pageValuesMap: Record<string, PageValues>,
  lineGuideId: string,
): { pageValuesMap: Record<string, PageValues>; changed: boolean } {
  let changed = false;
  const nextMap = { ...pageValuesMap };

  for (const instance of instances) {
    const values = nextMap[instance.instanceId];
    if (!values) continue;

    const schema = getSchemaForInstance(instance, lineGuideId);
    if (!schema) continue;
    let migrated = migrateBirthdayPageValues(schema, values);
    migrated = migrateTravelPageValues(schema, migrated);
    migrated = migrateDiaryFieldValues(migrated, schema.sourcePageNumber, schema);
    if (migrated === values) continue;

    nextMap[instance.instanceId] = migrated;
    changed = true;
  }

  return { pageValuesMap: changed ? nextMap : pageValuesMap, changed };
}
