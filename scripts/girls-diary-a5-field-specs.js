/**
 * Field specifications for Girls Diary A5 and shared brown templates.
 * Labels from TZ docx — mapped to templateLineStart via slot order.
 */

const USER_QUESTIONNAIRE_FIELDS = [
  ['name', 'Имя', 'text', 1],
  ['birthDate', 'Дата рождения', 'date', 1],
  ['zodiac', 'Знак зодиака', 'text', 1],
  ['phone', 'Номер телефона', 'text', 1],
  ['favoriteColor', 'Любимый цвет', 'text', 1],
  ['favoriteSeason', 'Любимое время года', 'text', 1],
  ['pets', 'Питомцы (если есть)', 'text', 1],
  ['favoriteFlowers', 'Любимые цветы', 'text', 1],
  ['favoriteAnimal', 'Любимое животное', 'text', 1],
  ['bestFriend', 'Лучшая подруга', 'text', 1],
  ['bestFriendMale', 'Лучший друг', 'text', 1],
  ['careerWish', 'Кем я хочу стать', 'text', 1],
];

const PARENT_MOM_FIELDS = [
  ['name', 'Имя мамы', 'text', 1],
  ['birthDate', 'Дата рождения', 'date', 1],
  ['zodiac', 'Знак зодиака', 'text', 1],
  ['phone', 'Номер телефона', 'text', 1],
  ['favoriteColor', 'Любимый цвет', 'text', 1],
  ['favoriteSeason', 'Любимое время года', 'text', 1],
  ['hobby', 'Хобби', 'text', 1],
  ['favoriteFood', 'Любимая еда', 'text', 1],
  ['favoriteMovie', 'Любимый фильм', 'text', 1],
  ['favoriteBook', 'Любимая книга', 'text', 1],
  ['wishForDaughter', 'Пожелание дочери', 'text', 2],
];

const PARENT_DAD_FIELDS = [
  ['name', 'Имя папы', 'text', 1],
  ['birthDate', 'Дата рождения', 'date', 1],
  ['zodiac', 'Знак зодиака', 'text', 1],
  ['phone', 'Номер телефона', 'text', 1],
  ['favoriteColor', 'Любимый цвет', 'text', 1],
  ['favoriteSeason', 'Любимое время года', 'text', 1],
  ['hobby', 'Хобби', 'text', 1],
  ['favoriteFood', 'Любимая еда', 'text', 1],
  ['favoriteMovie', 'Любимый фильм', 'text', 1],
  ['favoriteBook', 'Любимая книга', 'text', 1],
  ['wishForDaughter', 'Пожелание дочери', 'text', 2],
];

const HOBBY_FIELDS = [
  ['mainHobby', 'Моё главное хобби', 'text', 1],
  ['sport', 'Любимый вид спорта', 'text', 1],
  ['creative', 'Творческое занятие', 'text', 1],
  ['club', 'Кружок / секция', 'text', 1],
  ['favoriteBook', 'Любимая книга', 'text', 1],
  ['favoriteMovie', 'Любимый фильм', 'text', 1],
  ['favoriteMusic', 'Любимая музыка', 'text', 1],
  ['dreamSkill', 'Чему хочу научиться', 'text', 1],
  ['freeTime', 'Чем занимаюсь в свободное время', 'text', 2],
  ['proudOf', 'Чем горжусь', 'text', 2],
];

const PETS_FIELDS = [
  ['petName', 'Кличка питомца', 'text', 1],
  ['petType', 'Вид / порода', 'text', 1],
  ['petAge', 'Возраст', 'text', 1],
  ['petCharacter', 'Характер', 'text', 1],
  ['petFood', 'Любимая еда', 'text', 1],
  ['petStory', 'История знакомства', 'text', 3],
];

const SOCIAL_NETWORKS_FIELDS = [
  ['nickname', 'Ник в соцсетях', 'text', 1],
  ['instagram', 'Instagram', 'text', 1],
  ['vk', 'ВКонтакте', 'text', 1],
  ['tiktok', 'TikTok', 'text', 1],
  ['telegram', 'Telegram', 'text', 1],
  ['other', 'Другие соцсети', 'text', 1],
];

const MOOD_FIELDS = [
  ['moodNote', 'Моё настроение сегодня', 'text', 1],
  ['whatMadeHappy', 'Что меня порадовало', 'text', 2],
  ['whatMadeSad', 'Что расстроило', 'text', 2],
  ['gratitude', 'За что я благодарна', 'text', 2],
  ['tomorrowWish', 'Чего жду завтра', 'text', 2],
];

const STYLE_FIELDS = [
  ['style', 'Мой стиль', 'text', 1],
  ['favoriteColors', 'Любимые цвета в одежде', 'text', 1],
  ['favoriteBrands', 'Любимые бренды', 'text', 1],
  ['favoriteOutfit', 'Любимый наряд', 'text', 1],
  ['accessories', 'Любимые аксессуары', 'text', 1],
  ['shopping', 'Где люблю покупать одежду', 'text', 2],
  ['inspiration', 'Кто вдохновляет мой стиль', 'text', 2],
];

const FIRST_LOVE_FIELDS = [
  ['name', 'Имя', 'text', 1],
  ['whenMet', 'Когда познакомились', 'text', 1],
  ['whereMet', 'Где познакомились', 'text', 1],
  ['feelings', 'Мои чувства', 'text', 2],
  ['memory', 'Самое тёплое воспоминание', 'text', 3],
  ['letter', 'Письмо (необязательно)', 'text', 3],
];

const SCHOOL_LIFE_FIELDS = [
  ['schoolName', 'Название школы', 'text', 1],
  ['className', 'Класс', 'text', 1],
  ['favoriteSubject', 'Любимый предмет', 'text', 1],
  ['favoriteTeacher', 'Любимый учитель', 'text', 1],
  ['bestClassmate', 'Лучший одноклассник', 'text', 1],
  ['bestClassmateGirl', 'Лучшая одноклассница', 'text', 1],
  ['achievements', 'Мои достижения', 'text', 2],
  ['dreamProfession', 'Кем хочу стать', 'text', 1],
  ['afterSchool', 'Чем занимаюсь после школы', 'text', 2],
  ['schoolMemory', 'Школьное воспоминание', 'text', 2],
];

const SUNDAY_SCHEDULE_FIELDS = [
  ['morningPlans', 'Утренние планы', 'text', 1],
  ['dayPlans', 'Дневные дела', 'text', 1],
  ['familyTime', 'Время с семьёй', 'text', 1],
  ['rest', 'Отдых', 'text', 1],
  ['notes', 'Заметки', 'text', 1],
];

const GRANDPARENT_FIELDS = [
  ['name', 'Имя', 'text', 1],
  ['birthDate', 'Дата рождения', 'date', 1],
  ['phone', 'Телефон', 'text', 1],
  ['hobby', 'Хобби', 'text', 1],
  ['favoriteFood', 'Любимая еда', 'text', 1],
  ['favoriteMemory', 'Любимое воспоминание со мной', 'text', 2],
  ['wish', 'Пожелание', 'text', 2],
];

const DREAMS_FIELDS = [
  ['dream1', 'Мечта №1', 'text', 2],
  ['dream2', 'Мечта №2', 'text', 2],
  ['dream3', 'Мечта №3', 'text', 2],
  ['steps', 'Что для этого делаю', 'text', 3],
];

const TRAVEL_FIELDS = [
  ['favoritePlace', 'Любимое место', 'text', 1],
  ['visitedCountries', 'Страны, где была', 'text', 2],
  ['dreamTrip', 'Куда мечтаю поехать', 'text', 1],
  ['bestTrip', 'Лучшее путешествие', 'text', 3],
  ['travelBuddy', 'С кем люблю путешествовать', 'text', 1],
];

const DIARY_RULES_FIELDS = [
  ['rule1', 'Правило 1', 'text', 1],
  ['rule2', 'Правило 2', 'text', 1],
  ['rule3', 'Правило 3', 'text', 1],
];

const WEEKLY_SCHEDULE_DAY_PAIRS = {
  24: ['Понедельник', 'Вторник'],
  25: ['Среда', 'Четверг'],
  26: ['Пятница', 'Суббота'],
};

const BROWN_WEEKLY_SCHEDULE_PAGES = {
  34: ['Понедельник', 'Вторник'],
  35: ['Среда', 'Четверг'],
  36: ['Пятница', 'Суббота'],
};

function buildWeeklyScheduleSpec(day1, day2, slots) {
  const total = slots?.length ?? 12;
  const perDay = Math.max(4, Math.floor(total / 2));
  const spec = [];
  for (let i = 0; i < perDay; i += 1) {
    spec.push([`d1_l${i + 1}`, `${day1}: урок ${i + 1}`, 'text', 1]);
  }
  for (let i = 0; i < perDay; i += 1) {
    spec.push([`d2_l${i + 1}`, `${day2}: урок ${i + 1}`, 'text', 1]);
  }
  return spec.slice(0, total);
}

function buildBrownWeeklyScheduleWithNoteSpec(slots) {
  const scheduleSpec = buildWeeklyScheduleSpec('Пятница', 'Суббота', slots);
  const noteLines = Math.max(1, (slots?.length ?? 0) - scheduleSpec.length);
  return [
    ...scheduleSpec,
    ['weekNote', 'Заметки на неделю', 'text', noteLines],
  ].slice(0, slots?.length ?? scheduleSpec.length + 1);
}

module.exports = {
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
};
