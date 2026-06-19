import { resolveInteriorAlbumId } from '@/utils/albumImages';

const PREGNANCY_INTRO_LABELS: Record<number, string> = {
  1: 'Новость',
  2: 'Обо мне',
  3: 'О папе',
  4: 'На учёте',
  5: 'Триместры',
  6: 'Первое УЗИ',
  7: 'Имена',
};

const PREGNANCY_60_SPECIAL: Record<number, string> = {
  8: '1 триместр',
  18: '2 триместр',
  33: '3 триместр',
  48: 'Сумка маме',
  49: 'Сумки малышу',
  50: 'Покупки',
  51: 'Список дел',
  52: 'Анкета родов',
  53: 'История родов',
  54: 'Первая фото',
  55: 'Памятные моменты',
  56: 'Для фото',
  57: 'Для фото',
  58: 'Для фото',
  59: 'Для фото',
  60: 'Письмо',
};

function getPregnancy60PageLabel(pageNumber: number): string {
  if (PREGNANCY_INTRO_LABELS[pageNumber]) {
    return PREGNANCY_INTRO_LABELS[pageNumber];
  }
  if (PREGNANCY_60_SPECIAL[pageNumber]) {
    return PREGNANCY_60_SPECIAL[pageNumber];
  }
  if (pageNumber >= 9 && pageNumber <= 17) {
    return `${pageNumber - 3} неделя`;
  }
  if (pageNumber >= 19 && pageNumber <= 32) {
    return `${pageNumber - 4} неделя`;
  }
  if (pageNumber >= 34 && pageNumber <= 47) {
    return `${pageNumber - 5} неделя`;
  }
  return `Страница ${pageNumber}`;
}

/** A5-блок: те же вводные страницы, далее недельные страницы и декоративная последняя. */
function getPregnancyA5PageLabel(pageNumber: number): string {
  if (PREGNANCY_INTRO_LABELS[pageNumber]) {
    return PREGNANCY_INTRO_LABELS[pageNumber];
  }
  if (pageNumber >= 8 && pageNumber <= 39) {
    return `${pageNumber} неделя`;
  }
  if (pageNumber >= 40 && pageNumber <= 47) {
    return `${pageNumber - 1} неделя`;
  }
  if (pageNumber === 48) {
    return 'Для фото';
  }
  return `Страница ${pageNumber}`;
}

const KIDS_48_LABELS: Partial<Record<number, string>> = {
  1: 'Титул',
  2: 'О малыше',
  3: 'Родители',
  4: 'Родственники',
  5: 'Первая фото',
};

function getBirthday48PageLabel(pageNumber: number): string {
  if (pageNumber === 1) return 'Этот альбом принадлежит';
  if (pageNumber === 2) return 'Привет, мир!';
  if (pageNumber === 40) return 'Мои путешествия';
  if (pageNumber === 48) return 'Письмо во взрослую жизнь';
  if (
    pageNumber === 3 ||
    pageNumber === 5 ||
    (pageNumber >= 7 && pageNumber <= 39 && pageNumber % 2 === 1) ||
    (pageNumber >= 41 && pageNumber <= 47)
  ) {
    return 'Свободная страница';
  }
  if (pageNumber === 4) return 'Мне 1 годик';
  if (pageNumber >= 6 && pageNumber <= 38 && pageNumber % 2 === 0) {
    const age = (pageNumber - 4) / 2 + 1;
    if (age >= 2 && age <= 4) return `Мне ${age} года!`;
    return `Мне ${age} лет!`;
  }
  return `Страница ${pageNumber}`;
}

const DIARY_BROWN_LABELS: Partial<Record<number, string>> = {
  1: 'Обо мне',
  6: 'Анкета',
  7: 'Папа',
  8: 'Мама',
  9: 'Бабушка',
  10: 'Дедушка',
  13: 'Пожелания',
  15: 'Мечты',
  45: 'Мечты',
  60: 'Пожелания',
};

const DIARY_PURPLE_LABELS: Partial<Record<number, string>> = {
  1: 'Обо мне',
  4: 'Анкета',
  5: 'Папа',
  6: 'Мама',
  7: 'Бабушка',
  8: 'Дедушка',
  28: 'Пожелания',
  29: 'Мечты',
  40: 'Пожелания',
};

function getLabelFromMap(
  pageNumber: number,
  map: Partial<Record<number, string>>,
  emptyLabel = 'Для фото'
): string {
  if (map[pageNumber]) {
    return map[pageNumber]!;
  }
  return emptyLabel;
}

/**
 * Короткое название шаблонной страницы (1–2 слова) для выбора при добавлении.
 * @param pageIndex индекс в массиве templatePages (с нуля)
 */
export function getAlbumPageLabel(
  albumId: string | null | undefined,
  pageIndex: number,
  category?: string | null
): string {
  const pageNumber = pageIndex + 1;
  const interiorId = resolveInteriorAlbumId(albumId, category);

  switch (interiorId) {
    case 'pregnancy_60':
      return getPregnancy60PageLabel(pageNumber);
    case 'pregnancy_a5':
      return getPregnancyA5PageLabel(pageNumber);
    case 'kids_48':
      return getLabelFromMap(pageNumber, KIDS_48_LABELS, 'Фото');
    case 'holidays_birthday_60':
      return getBirthday48PageLabel(pageNumber);
    case 'diary_interior_brown':
      return getLabelFromMap(pageNumber, DIARY_BROWN_LABELS, 'Для фото');
    case 'diary_interior_purple':
      return getLabelFromMap(pageNumber, DIARY_PURPLE_LABELS, 'Для фото');
    case 'family_blank':
      return 'Белый лист';
    case 'holidays_blank':
      return 'Белый лист';
    default:
      if (albumId?.startsWith('diary_interior_')) {
        return 'Для фото';
      }
      return `Страница ${pageNumber}`;
  }
}
