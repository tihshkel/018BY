import type { AlbumSectionDefinition } from '@/types/album-page-schema';

export const KIDS_48_SECTIONS: AlbumSectionDefinition[] = [
  {
    sectionId: 'beginning',
    title: 'Начало истории',
    pageRange: [1, 21],
    order: 1,
  },
  {
    sectionId: 'first_year',
    title: 'Первый год жизни',
    pageRange: [1, 33],
    order: 2,
  },
  {
    sectionId: 'seasons',
    title: 'Времена года, праздники и путешествия',
    pageRange: [34, 41],
    order: 3,
  },
  {
    sectionId: 'memories',
    title: 'Памятные моменты и завершение',
    pageRange: [42, 48],
    order: 4,
  },
];

/** Fix page range for first_year section */
KIDS_48_SECTIONS[1] = {
  ...KIDS_48_SECTIONS[1],
  pageRange: [22, 33],
};

export const DIARY_BROWN_60_SECTIONS: AlbumSectionDefinition[] = [
  { sectionId: 'intro', title: 'Знакомство с дневником', pageRange: [1, 5], order: 1 },
  { sectionId: 'family', title: 'Я и моя семья', pageRange: [6, 12], order: 2 },
  { sectionId: 'interests', title: 'Мои интересы и мечты', pageRange: [13, 19], order: 3 },
  { sectionId: 'days_travel', title: 'Дни, путешествия и настроение', pageRange: [20, 28], order: 4 },
  { sectionId: 'secret', title: 'Секретный блок', pageRange: [29, 30], order: 5 },
  { sectionId: 'school', title: 'Школа и расписание', pageRange: [31, 38], order: 6 },
  { sectionId: 'friends', title: 'Друзья', pageRange: [39, 44], order: 7 },
  { sectionId: 'my_days', title: 'Мои дни', pageRange: [45, 56], order: 8 },
  { sectionId: 'finale', title: 'Свободные страницы и финал', pageRange: [57, 60], order: 9 },
];

export const DIARY_PURPLE_A5_SECTIONS: AlbumSectionDefinition[] = [
  { sectionId: 'intro', title: 'Знакомство с дневником', pageRange: [1, 4], order: 1 },
  { sectionId: 'about_family', title: 'Обо мне и семья', pageRange: [5, 7], order: 2 },
  { sectionId: 'interests_days', title: 'Интересы и дни', pageRange: [8, 19], order: 3 },
  { sectionId: 'secret', title: 'Заветное желание', pageRange: [20, 21], order: 4 },
  { sectionId: 'school', title: 'Школа и расписание', pageRange: [22, 27], order: 5 },
  { sectionId: 'friends', title: 'Анкеты друзей', pageRange: [28, 33], order: 6 },
  { sectionId: 'diary_block', title: 'Дневниковый блок', pageRange: [34, 39], order: 7 },
  { sectionId: 'finale', title: 'Завершение', pageRange: [40, 40], order: 8 },
];

export const BIRTHDAY_48_SECTIONS: AlbumSectionDefinition[] = [
  { sectionId: 'intro', title: 'Вступление', pageRange: [1, 3], order: 1 },
  { sectionId: 'ages_1_6', title: 'Дни рождения 1–6 лет', pageRange: [4, 15], order: 2 },
  { sectionId: 'ages_7_12', title: 'Дни рождения 7–12 лет', pageRange: [16, 27], order: 3 },
  { sectionId: 'ages_13_18', title: 'Дни рождения 13–18 лет', pageRange: [28, 39], order: 4 },
  { sectionId: 'travel', title: 'Мои путешествия', pageRange: [40, 47], order: 5 },
  { sectionId: 'letter', title: 'Письмо во взрослую жизнь', pageRange: [48, 48], order: 6 },
];

export function getAlbumSections(lineGuideId: string): AlbumSectionDefinition[] {
  if (lineGuideId === 'kids_48') {
    return KIDS_48_SECTIONS;
  }

  if (lineGuideId === 'diary_interior_brown') {
    return DIARY_BROWN_60_SECTIONS;
  }

  if (lineGuideId === 'diary_interior_purple') {
    return DIARY_PURPLE_A5_SECTIONS;
  }

  if (lineGuideId === 'holidays_birthday_60') {
    return BIRTHDAY_48_SECTIONS;
  }

  const pageCounts: Record<string, number> = {
    pregnancy_60: 60,
    pregnancy_a5: 48,
    holidays_birthday_60: 48,
    diary_interior_brown: 60,
    diary_interior_purple: 40,
    family_blank: 20,
    holidays_blank: 20,
    family_blank_21x21: 20,
  };

  const total = pageCounts[lineGuideId] ?? 48;
  const chunkSize = total <= 24 ? total : 15;
  const sections: AlbumSectionDefinition[] = [];
  let order = 1;

  for (let start = 1; start <= total; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, total);
    sections.push({
      sectionId: `section_${start}`,
      title: `Страницы ${start}–${end}`,
      pageRange: [start, end],
      order: order++,
    });
  }

  if (sections.length === 1) {
    sections[0] = { ...sections[0], title: 'Все страницы' };
  }

  return sections;
}

export function getSectionForPageNumber(
  lineGuideId: string,
  pageNumber: number
): AlbumSectionDefinition | undefined {
  return getAlbumSections(lineGuideId).find(
    (s) => pageNumber >= s.pageRange[0] && pageNumber <= s.pageRange[1]
  );
}

export const INTRO_SEEN_KEY_PREFIX = '@album_intro_seen_';
