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

export function migrateDiaryFieldValues(values: PageValues, pageNumber?: number): PageValues {
  let next = values;

  if (pageNumber != null) {
    next = migratePurpleFriendQuestionnaireFields(next, pageNumber);
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
    migrated = migrateDiaryFieldValues(migrated, schema.sourcePageNumber);
    if (migrated === values) continue;

    nextMap[instance.instanceId] = migrated;
    changed = true;
  }

  return { pageValuesMap: changed ? nextMap : pageValuesMap, changed };
}
