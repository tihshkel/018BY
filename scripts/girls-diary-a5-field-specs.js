/**
 * Field specifications for Girls Diary A5 and shared brown templates.
 * Labels from TZ docx — mapped to templateLineStart via slot order.
 * Album-specific mood/pets/travel/etc. live in diary-semantic-field-map.js.
 */

const {
  BROWN_MOOD_FIELDS,
  PURPLE_MOOD_FIELDS,
  BROWN_PETS_FIELDS,
  BROWN_TRAVEL_FIELDS,
  BROWN_HOBBY_FIELDS,
  BROWN_STYLE_FIELDS,
  PURPLE_STYLE_FIELDS,
  PURPLE_PETS_FIELDS,
  BROWN_FOOD_FIELDS,
  BROWN_DREAMS_FIELDS,
  MY_DAY_MOOD_OPTIONS,
} = require('./diary-semantic-field-map');

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
  ['birthDate', 'Дата рождения мамы', 'date', 1],
  ['phone', 'Номер телефона мамы', 'text', 1],
  ['zodiac', 'Знак зодиака мамы', 'text', 1],
  ['profession', 'Профессия мамы', 'text', 1],
  ['favoriteFlowers', 'Любимые цветы мамы', 'text', 1],
  ['favoriteAnimal', 'Любимое животное мамы', 'text', 1],
  ['favoriteColor', 'Любимый цвет мамы', 'text', 1],
  ['favoriteSeason', 'Любимое время года мамы', 'text', 1],
  ['hobby', 'Хобби мамы', 'text', 1],
  ['favoriteDrink', 'Любимый напиток мамы', 'text', 1],
  ['favoriteDish', 'Любимое блюдо мамы', 'text', 1],
  ['wishes', 'Пожелания мамы хозяйке дневника', 'text', 4],
];

const PARENT_DAD_FIELDS = [
  ['name', 'Имя папы', 'text', 1],
  ['birthDate', 'Дата рождения папы', 'date', 1],
  ['phone', 'Номер телефона папы', 'text', 1],
  ['zodiac', 'Знак зодиака папы', 'text', 1],
  ['profession', 'Профессия папы', 'text', 1],
  ['favoriteFlowers', 'Любимые цветы папы', 'text', 1],
  ['favoriteAnimal', 'Любимое животное папы', 'text', 1],
  ['favoriteColor', 'Любимый цвет папы', 'text', 1],
  ['favoriteSeason', 'Любимое время года папы', 'text', 1],
  ['hobby', 'Хобби папы', 'text', 1],
  ['favoriteDrink', 'Любимый напиток папы', 'text', 1],
  ['favoriteDish', 'Любимое блюдо папы', 'text', 1],
  ['wishes', 'Пожелания папы хозяйке дневника', 'text', 4],
];

/** Purple hobby page keeps the shorter TZ set; brown uses BROWN_HOBBY_FIELDS. */
const HOBBY_FIELDS = [
  ['hobbiesStory', 'Расскажи о своих хобби', 'text', 1],
  ['favoriteSports', 'Какими видами спорта тебе нравится заниматься?', 'text', 1],
  ['aloneActivity', 'Что ты больше всего любишь делать, когда остаёшься одна?', 'text', 1],
  ['favoriteCartoon', 'Любимый мультфильм', 'text', 1],
  ['favoriteSeries', 'Самый интересный сериал', 'text', 1],
  ['favoriteToy', 'Любимая игрушка', 'text', 1],
  ['favoriteBoardGame', 'Любимая настольная игра', 'text', 1],
  ['likesSinging', 'Ты любишь петь?', 'text', 1],
  ['favoriteBook', 'Самая интересная книга', 'text', 1],
  ['favoriteWriter', 'Любимый писатель (если есть)', 'text', 1],
  ['favoriteMusic', 'Какая музыка тебе больше всего нравится', 'text', 1],
  ['favoriteCompany', 'С кем тебе нравится проводить время?', 'text', 1],
];

/** @deprecated Prefer BROWN_PETS_FIELDS / PURPLE_PETS_FIELDS. */
const PETS_FIELDS = PURPLE_PETS_FIELDS;

const SOCIAL_NETWORKS_FIELDS = [
  ['nickname', 'Ник в соцсетях', 'text', 1],
  ['instagram', 'Instagram', 'text', 1],
  ['vk', 'ВКонтакте', 'text', 1],
  ['tiktok', 'TikTok', 'text', 1],
  ['telegram', 'Telegram', 'text', 1],
  ['other', 'Другие соцсети', 'text', 1],
];

/** Соцсети внизу «Анкеты для друзей» (фиолетовый A5). */
const FRIEND_SOCIAL_FIELDS = [
  ['instagram', 'Instagram', 'text', 1],
  ['vk', 'ВКонтакте', 'text', 1],
  ['tiktok', 'TikTok', 'text', 1],
];

/** Анкета для друзей — макет фиолетового A5 (стр. 28–33). */
const PURPLE_FRIEND_FIELDS = [
  ['name', 'Имя', 'text', 1],
  ['birthDate', 'Дата рождения', 'date', 1],
  ['zodiac', 'Знак зодиака', 'text', 1],
  ['phone', 'Номер телефона', 'text', 1],
  ['favoriteSeason', 'Любимое время года', 'text', 1],
  ['pet', 'Питомец (если есть)', 'text', 1],
  ['favoriteColor', 'Любимый цвет', 'text', 1],
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

/** @deprecated Prefer BROWN_MOOD_FIELDS / PURPLE_MOOD_FIELDS. */
const MOOD_FIELDS = BROWN_MOOD_FIELDS;

const STYLE_FIELDS = PURPLE_STYLE_FIELDS;

const FIRST_LOVE_FIELDS = [
  ['name', 'Имя', 'text', 1],
  ['whenMet', 'Когда познакомились', 'text', 1],
  ['whereMet', 'Где познакомились', 'text', 1],
  ['feelings', 'Мои чувства', 'text', 2],
  ['memory', 'Самое тёплое воспоминание', 'text', 3],
  ['letter', 'Письмо (необязательно)', 'text', 3],
];

const SCHOOL_LIFE_FIELDS = [
  ['likesStudying', 'Тебе нравится учиться? Почему?', 'text', 2],
  ['favoriteSubject', 'Любимый предмет в школе', 'text', 1],
  ['favoriteTeacher', 'Любимый учитель', 'text', 1],
  ['classSize', 'Сколько человек в твоём классе?', 'text', 2],
  ['classmateFriends', 'С кем из одноклассников дружишь?', 'text', 2],
  ['schoolEvents', 'Какие школьные мероприятия тебе нравятся?', 'text', 2],
  ['recessActivity', 'Чем лучше всего ты занимаешься на перемене?', 'text', 1],
  ['schoolMemory', 'Расскажи о самом интересном событии из твоей школьной жизни', 'text', 3],
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

const DREAMS_FIELDS = BROWN_DREAMS_FIELDS;

const TRAVEL_FIELDS = BROWN_TRAVEL_FIELDS;

const DIARY_RULES_FIELDS = [
  ['diary_start_date', 'Дата начала заполнения дневника', 'date', 1],
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
  const list = Array.isArray(slots) ? slots : [];
  const total = list.length || 12;
  // Split by the large vertical gap between the two day boxes (not equal halves —
  // Monday/Tuesday can be 6+7, Wednesday/Thursday 7+7, etc.).
  const ys = list
    .map((s) => (s && typeof s.y === 'number' ? s.y : null))
    .filter((y) => y != null)
    .sort((a, b) => a - b);
  let splitAt = Math.floor(total / 2);
  for (let i = 1; i < ys.length; i += 1) {
    if (ys[i] - ys[i - 1] > 0.08) {
      splitAt = i;
      break;
    }
  }
  const day1Count = Math.max(1, Math.min(splitAt, total - 1));
  const day2Count = Math.max(1, total - day1Count);
  const spec = [];
  for (let i = 0; i < day1Count; i += 1) {
    spec.push([`d1_l${i + 1}`, `${day1}: урок ${i + 1}`, 'text', 1]);
  }
  for (let i = 0; i < day2Count; i += 1) {
    spec.push([`d2_l${i + 1}`, `${day2}: урок ${i + 1}`, 'text', 1]);
  }
  return spec;
}

function buildBrownWeeklyScheduleWithNoteSpec(slots) {
  const list = Array.isArray(slots) ? slots : [];
  const total = list.length || 17;
  // Last slot(s) are the week note; schedule lines are everything before the note band.
  const scheduleSlots = list.filter((s) => s && typeof s.y === 'number' && s.y < 0.55);
  const scheduleCount = scheduleSlots.length > 0
    ? scheduleSlots.length
    : Math.max(8, total - 1);
  const scheduleSpec = buildWeeklyScheduleSpec(
    'Пятница',
    'Суббота',
    scheduleSlots.length > 0
      ? scheduleSlots
      : Array.from({ length: scheduleCount }, (_, i) => ({ y: i < scheduleCount / 2 ? 0.2 + i * 0.04 : 0.6 + i * 0.04 })),
  );
  const noteLines = Math.max(1, total - scheduleSpec.length);
  return [...scheduleSpec, ['weekNote', 'Заметки на неделю', 'text', noteLines]];
}

module.exports = {
  USER_QUESTIONNAIRE_FIELDS,
  PARENT_MOM_FIELDS,
  PARENT_DAD_FIELDS,
  HOBBY_FIELDS,
  BROWN_HOBBY_FIELDS,
  PETS_FIELDS,
  BROWN_PETS_FIELDS,
  SOCIAL_NETWORKS_FIELDS,
  FRIEND_SOCIAL_FIELDS,
  PURPLE_FRIEND_FIELDS,
  MOOD_FIELDS,
  BROWN_MOOD_FIELDS,
  PURPLE_MOOD_FIELDS,
  STYLE_FIELDS,
  BROWN_STYLE_FIELDS,
  PURPLE_STYLE_FIELDS,
  PURPLE_PETS_FIELDS,
  BROWN_FOOD_FIELDS,
  FIRST_LOVE_FIELDS,
  SCHOOL_LIFE_FIELDS,
  SUNDAY_SCHEDULE_FIELDS,
  GRANDPARENT_FIELDS,
  DREAMS_FIELDS,
  BROWN_DREAMS_FIELDS,
  TRAVEL_FIELDS,
  BROWN_TRAVEL_FIELDS,
  MY_DAY_MOOD_OPTIONS,
  DIARY_RULES_FIELDS,
  WEEKLY_SCHEDULE_DAY_PAIRS,
  BROWN_WEEKLY_SCHEDULE_PAGES,
  buildWeeklyScheduleSpec,
  buildBrownWeeklyScheduleWithNoteSpec,
};
