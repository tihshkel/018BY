import type { AlbumPageSchema, PageInstance, PageValues } from '@/types/album-page-schema';
import { getSchemaForInstance } from '@/utils/albumProjectInit';
import { isPregnancyWeeklyStructuredPage } from '@/utils/textLineSlots';

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
  diary_interior_brown_p15_steps: 'diary_interior_brown_p15_dream4',
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
  diary_interior_brown_p21_favoritePlace: 'diary_interior_brown_p21_likedMost',
  diary_interior_brown_p21_bestTrip: 'diary_interior_brown_p21_travelImpressions',
};

const PURPLE_FRIEND_PAGES = [28, 29, 30, 31, 32, 33] as const;

/**
 * Seed: «Сердце…» сидит в wishes (линия у «Ники…»), «Было…» в Instagram, VK пуст.
 * Опускаем только эти два значения: wishes→IG, IG→VK. Слоты пожеланий не меняем.
 */
function migratePurpleFriendSocialRowShift(values: PageValues, pageNumber: number): PageValues {
  if (!PURPLE_FRIEND_PAGES.includes(pageNumber as (typeof PURPLE_FRIEND_PAGES)[number])) {
    return values;
  }

  const prefix = `diary_interior_purple_p${pageNumber}_`;
  const markerId = `${prefix}social_row_shift_v4`;
  if (values.fields[markerId] === '1') return values;

  const wishesId = `${prefix}wishes`;
  const igId = `${prefix}instagram`;
  const vkId = `${prefix}vk`;
  const ttId = `${prefix}tiktok`;

  const wish = values.fields[wishesId]?.trim() ?? '';
  const ig = values.fields[igId]?.trim() ?? '';
  const vk = values.fields[vkId]?.trim() ?? '';
  const tt = values.fields[ttId]?.trim() ?? '';
  const clip = (text: string) => text.slice(0, 15);

  if (!vk && wish && ig) {
    return {
      ...values,
      fields: {
        ...values.fields,
        [wishesId]: '',
        [igId]: clip(wish),
        [vkId]: clip(ig),
        [ttId]: clip(tt),
        [markerId]: '1',
      },
    };
  }

  if (ig.length > 15 || vk.length > 15 || tt.length > 15) {
    return {
      ...values,
      fields: {
        ...values.fields,
        [igId]: clip(ig),
        [vkId]: clip(vk),
        [ttId]: clip(tt),
      },
    };
  }

  return values;
}

function migratePurpleFriendQuestionnaireFields(values: PageValues, pageNumber: number): PageValues {
  if (!PURPLE_FRIEND_PAGES.includes(pageNumber as (typeof PURPLE_FRIEND_PAGES)[number])) {
    return values;
  }

  let next = migratePurpleFriendSocialRowShift(values, pageNumber);

  const prefix = `diary_interior_purple_p${pageNumber}_`;
  const nextFields = { ...next.fields };
  let migrated = next !== values;

  const cartoonId = `${prefix}favoriteCartoon`;
  const musicianId = `${prefix}favoriteMusician`;
  const cartoonText = nextFields[cartoonId]?.trim();
  if (cartoonText && !nextFields[musicianId]?.trim()) {
    nextFields[musicianId] = cartoonText;
    delete nextFields[cartoonId];
    migrated = true;
  }

  if (!migrated) return values;
  return { ...next, fields: nextFields };
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

/** Недельные стр. pregnancy: plans_header + plans_body → plans (78 символов, 3 строки макета). */
export const PREGNANCY_WEEKLY_PLANS_MAX_LENGTH = 78;

export function migratePregnancyWeeklyPlansFields(
  schema: Pick<AlbumPageSchema, 'lineGuideId' | 'sourcePageNumber' | 'fields'>,
  values: PageValues,
): PageValues {
  if (!isPregnancyWeeklyStructuredPage(schema.lineGuideId, schema.sourcePageNumber)) {
    return values;
  }

  const plansField = schema.fields?.find((field) => field.fieldId.endsWith('_plans'));
  if (!plansField) return values;

  const prefix = plansField.fieldId.replace(/_plans$/, '');
  const plansKey = `${prefix}_plans`;
  const headerKey = `${prefix}_plans_header`;
  const bodyKey = `${prefix}_plans_body`;

  const legacyHeader = values.fields[headerKey]?.trim() ?? '';
  const legacyBody = values.fields[bodyKey]?.trim() ?? '';
  if (!legacyHeader && !legacyBody) return values;

  const existingPlans = values.fields[plansKey]?.trim() ?? '';
  const nextFields = { ...values.fields };

  if (!existingPlans) {
    nextFields[plansKey] = [legacyHeader, legacyBody]
      .filter(Boolean)
      .join(' ')
      .slice(0, PREGNANCY_WEEKLY_PLANS_MAX_LENGTH);
  }

  delete nextFields[headerKey];
  delete nextFields[bodyKey];

  return { ...values, fields: nextFields };
}

/** «Уже мама»: до v2 не было eye_color — слоты zodiac/zodiac_year были сдвинуты на 1. */
export function migrateAlreadyMomPageValues(
  schema: Pick<AlbumPageSchema, 'title' | 'lineGuideId' | 'fields'>,
  values: PageValues,
): PageValues {
  if (schema.title !== 'Уже мама') return values;
  if (schema.lineGuideId !== 'pregnancy_60' && schema.lineGuideId !== 'pregnancy_a5') {
    return values;
  }

  const eyeField = schema.fields.find((field) => field.fieldId.endsWith('_eye_color'));
  if (!eyeField) return values;

  const prefix = eyeField.fieldId.replace(/_eye_color$/, '');
  const eyeKey = `${prefix}_eye_color`;
  const zodiacKey = `${prefix}_zodiac`;
  const yearKey = `${prefix}_zodiac_year`;

  if (values.fields[eyeKey]?.trim()) return values;

  const legacyZodiac = values.fields[zodiacKey]?.trim() ?? '';
  const legacyYear = values.fields[yearKey]?.trim() ?? '';
  if (!legacyZodiac && !legacyYear) return values;

  return {
    ...values,
    fields: {
      ...values.fields,
      [eyeKey]: legacyZodiac,
      [zodiacKey]: legacyYear,
      [yearKey]: '',
    },
  };
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
    migrated = migrateAlreadyMomPageValues(schema, migrated);
    migrated = migratePregnancyWeeklyPlansFields(schema, migrated);
    if (migrated === values) continue;

    nextMap[instance.instanceId] = migrated;
    changed = true;
  }

  return { pageValuesMap: changed ? nextMap : pageValuesMap, changed };
}
