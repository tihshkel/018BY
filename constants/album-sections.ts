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

export function getAlbumSections(lineGuideId: string): AlbumSectionDefinition[] {
  if (lineGuideId === 'kids_48') {
    return KIDS_48_SECTIONS;
  }

  const pageCounts: Record<string, number> = {
    pregnancy_60: 60,
    pregnancy_a5: 48,
    holidays_birthday_60: 60,
    diary_interior_brown: 40,
    diary_interior_purple: 40,
    family_blank: 20,
    holidays_blank: 20,
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
