import manifest from '@/scripts/diary-60-tz-manifest.json';

type DiaryManifestPage = {
  template?: string;
};

const PAGE_TEMPLATES: Record<number, string> = Object.fromEntries(
  Object.entries(manifest as Record<string, DiaryManifestPage>).map(([pageKey, entry]) => [
    Number(pageKey),
    entry.template ?? '',
  ]),
);

export function getDiaryBrownPageTemplate(page: number | undefined): string | undefined {
  if (page == null || page < 1) return undefined;
  const template = PAGE_TEMPLATES[page];
  return template || undefined;
}

export const DIARY_BROWN_QUESTIONNAIRE_TEMPLATES = new Set([
  'GirlProfileTemplate',
  'ParentProfileTemplate_Mom',
  'ParentProfileTemplate_Dad',
  'GrandparentProfileTemplate',
  'FriendQuestionnaireTemplate',
  'HobbyTemplate',
  'DreamsTemplate',
  'PetsTemplate',
  'TravelTemplate',
  'MoodTemplate',
  'FoodTemplate',
]);

export const DIARY_BROWN_MY_DAY_TEMPLATE = 'MyDayTemplate';
export const DIARY_BROWN_SCHOOL_LIFE_TEMPLATE = 'SchoolLifeTemplate';
export const DIARY_BROWN_WEEKLY_SCHEDULE_TEMPLATES = new Set([
  'WeeklyScheduleTemplate',
  'WeeklyScheduleWithNoteTemplate',
]);
