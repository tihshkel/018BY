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
  ['careerWish', 'Кем я хочу стать', 'text', 2],
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

/**
 * Коричневый дневник 60 стр. (HobbyQuestionnaireTemplate, стр. 13).
 * После «одна?» — одна полная линия ответа; следующая штрих-линия уже «Любимый мультфильм».
 * «Какая музыка…» — короткий хвост + полная линия ниже (2 слота).
 */
const HOBBY_FIELDS = [
  ['hobbiesStory', 'Расскажи о своих хобби', 'text', 2],
  ['favoriteSports', 'Какими видами спорта тебе нравится заниматься?', 'text', 1],
  ['aloneActivity', 'Что ты больше всего любишь делать, когда остаёшься одна?', 'text', 1],
  ['favoriteCartoon', 'Любимый мультфильм', 'text', 1],
  ['favoriteSeries', 'Самый интересный сериал', 'text', 1],
  ['favoriteToy', 'Любимая игрушка', 'text', 1],
  ['favoriteBoardGame', 'Любимая настольная игра', 'text', 1],
  ['likesSinging', 'Ты любишь петь?', 'text', 1],
  ['favoriteBook', 'Самая интересная книга', 'text', 1],
  ['favoriteWriter', 'Любимый писатель (если есть)', 'text', 1],
  ['favoriteMusic', 'Какая музыка тебе больше всего нравится', 'text', 2],
  ['favoriteCompany', 'С кем тебе нравится проводить время?', 'text', 2],
  ['recessHobby', 'Чем ты любишь заниматься на переменах?', 'text', 3],
];

/**
 * Фиолетовый A5 (стр. 8) — поля из TZ Page_08_HobbyQuestionnaire.
 * Первое поле на 2 линии (хвост после подписи + продолжение).
 */
const PURPLE_HOBBY_FIELDS = [
  ['hobbiesStory', 'Расскажи о своих хобби', 'text', 2],
  // После подписи есть хвост на той же строке + полная линия ниже.
  ['favoriteSports', 'Какими видами спорта тебе нравится заниматься?', 'text', 2],
  ['aloneActivity', 'Что ты больше всего любишь делать, когда остаёшься одна?', 'text', 2],
  ['favoriteMovie', 'Твой любимый фильм', 'text', 1],
  ['favoriteSeries', 'Самый интересный сериал', 'text', 1],
  ['favoriteActor', 'Любимый актер', 'text', 1],
  ['favoriteActress', 'Любимая актриса', 'text', 1],
  ['favoriteCartoon', 'Любимый мультфильм', 'text', 1],
  ['favoriteBook', 'Самая интересная книга', 'text', 1],
  ['favoriteWriter', 'Любимый писатель (если есть)', 'text', 1],
  ['favoriteMusicStyle', 'Какой стиль музыки тебе нравится', 'text', 1],
  ['favoriteSingerFemale', 'Любимая певица', 'text', 1],
  ['favoriteSingerMale', 'Любимый певец', 'text', 1],
  ['favoriteBand', 'Лучшая музыкальная группа', 'text', 1],
];

const PETS_FIELDS = [
  ['likesAnimals', 'Ты любишь животных?', 'text', 1],
  ['favoriteAnimals', 'Какие животные тебе нравятся больше всего?', 'text', 1],
  ['hasPets', 'У тебя есть питомцы?', 'text', 1],
  ['petNames', 'Напиши их клички', 'text', 1],
  ['petBreed', 'Какая порода у твоих питомцев?', 'text', 1],
  // История / уход: без микро-хвостов PDF — только полноценные строки.
  ['petStory', 'Расскажи историю, как они у вас появились', 'text', 2],
  ['petCare', 'Как ты ухаживаешь за своими питомцами?', 'text', 1],
  ['futurePet', 'Если питомца у тебя нет, поделись, кого бы тебе хотелось завести', 'text', 2],
];

/** Фиолетовый A5 стр. 10 — поля из TZ PetsQuestionnaire. */
const PURPLE_PETS_FIELDS = [
  ['likesAnimals', 'Ты любишь животных?', 'text', 1],
  ['favoriteAnimals', 'Какие животные тебе нравятся больше всего?', 'text', 1],
  ['hasPets', 'У тебя есть питомцы?', 'text', 1],
  ['petNames', 'Напиши их клички', 'text', 1],
  ['petBreed', 'Какая порода у твоих питомцев?', 'text', 1],
  ['petStory', 'Расскажи историю, как они у вас появились', 'text', 3],
  ['petCare', 'Как ты ухаживаешь за своими питомцами?', 'text', 2],
  ['futurePet', 'Если питомца у тебя нет, поделись, кого бы тебе хотелось завести', 'text', 1],
];

const SOCIAL_NETWORKS_FIELDS = [
  ['nickname', 'Ник в соцсетях', 'text', 1],
  ['instagram', 'Instagram', 'text', 1],
  ['vk', 'ВКонтакте', 'text', 1],
  ['tiktok', 'TikTok', 'text', 1],
  ['telegram', 'Telegram', 'text', 1],
  ['other', 'Другие соцсети', 'text', 1],
];

/** Фиолетовый A5 стр. 12 — поля из TZ Social Networks. */
const PURPLE_SOCIAL_NETWORKS_FIELDS = [
  ['internetTime', 'Ты много времени проводишь в интернете?', 'text', 1],
  ['internetActivities', 'Чем чаще всего ты занимаешься в интернете?', 'text', 1],
  ['mostInterestingOnline', 'Расскажи, что в интернете кажется тебе самым интересным?', 'text', 1],
  ['favoriteSocialNetwork', 'Какая социальная сеть твоя любимая? Почему?', 'text', 1],
  ['favoriteYoutubeChannels', 'Твои любимые youtube-каналы', 'text', 1],
  ['favoriteBloggers', 'Твои любимые блогеры', 'text', 2],
  ['likesPhotography', 'Тебе нравится фотографировать?', 'text', 1],
  ['photoSubjects', 'Что ты фотографируешь чаще всего?', 'text', 2],
  ['socialNicknamesGeneral', 'Твои ники в социальных сетях', 'text', 2],
  ['instagramNickname', 'Instagram', 'text', 1],
  ['vkNickname', 'ВКонтакте', 'text', 1],
  ['tiktokNickname', 'TikTok', 'text', 1],
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

const MOOD_FIELDS = [
  ['makesLaugh', 'Что или кто тебя смешит?', 'text', 1],
  ['likesComedies', 'Ты любишь комедии?', 'text', 1],
  ['favoriteComedy', 'Какая твоя любимая комедия?', 'text', 1],
  ['watchesFunnyYoutube', 'Ты смотришь видео на Youtube?', 'text', 1],
  ['favoriteFunnyVideos', 'Какие смешные видео тебе нравятся?', 'text', 1],
  ['funniestFamilyMember', 'Кто самый веселый в вашей семье?', 'text', 1],
  ['moodBooster1', 'Список: что поднимает настроение — 1', 'text', 1],
  ['moodBooster2', 'Список: что поднимает настроение — 2', 'text', 1],
  ['moodBooster3', 'Список: что поднимает настроение — 3', 'text', 1],
  ['moodBooster4', 'Список: что поднимает настроение — 4', 'text', 1],
  ['moodBooster5', 'Список: что поднимает настроение — 5', 'text', 1],
];

/** Фиолетовый A5 стр. 14 — поля из TZ Mood. */
const PURPLE_MOOD_FIELDS = [
  ['makesLaugh', 'Что или кто тебя смешит?', 'text', 1],
  ['likesComedies', 'Ты любишь комедии?', 'text', 1],
  ['favoriteComedy', 'Твоя любимая комедия', 'text', 1],
  ['watchesFunnyYoutube', 'Ты смотришь смешные видео на youtube?', 'text', 1],
  ['favoriteFunnyVideos', 'Какие смешные видео тебе нравятся?', 'text', 2],
  ['funniestFamilyMember', 'Кто самый веселый в вашей семье?', 'text', 3],
  ['moodBooster1', 'Список: что поднимает настроение — 1', 'text', 1],
  ['moodBooster2', 'Список: что поднимает настроение — 2', 'text', 1],
  ['moodBooster3', 'Список: что поднимает настроение — 3', 'text', 1],
  ['moodBooster4', 'Список: что поднимает настроение — 4', 'text', 1],
];

const STYLE_FIELDS = [
  ['trendFollow', 'Ты следишь за модными трендами?', 'text', 2],
  ['comfortableClothes', 'Какая одежда для тебя самая удобная?', 'text', 2],
  // Длинный вопрос без хвоста — только одна полная линия ответа.
  ['favoriteColorCombos', 'Какие сочетания цветов в одежде тебе нравятся?', 'text', 1],
  ['homeClothes', 'Твоя любимая одежда для дома', 'text', 2],
  ['holidayClothes', 'Любимая одежда для праздника', 'text', 2],
  ['friendsWalkClothes', 'Любимая одежда для прогулки с друзьями', 'text', 2],
  ['schoolClothes', 'Любимая одежда для школы', 'text', 2],
  ['wearsJewelry', 'Ты носишь украшения? Если да, то какие?', 'text', 2],
];

/** Фиолетовый A5 стр. 16 — поля из TZ Fashion/Style. */
const PURPLE_STYLE_FIELDS = [
  ['trendFollow', 'Следишь ли ты за модными тенденциями?', 'text', 1],
  ['comfortableClothes', 'Какая одежда для тебя самая удобная?', 'text', 1],
  ['favoriteColorCombos', 'Какие сочетания цветов тебе нравятся?', 'text', 1],
  ['homeClothes', 'Любимая одежда для дома', 'text', 1],
  ['holidayClothes', 'Любимая одежда для праздника', 'text', 1],
  ['friendsWalkClothes', 'Любимая одежда для прогулки с друзьями', 'text', 1],
  ['schoolClothes', 'Любимая одежда для школы', 'text', 1],
  ['wearsJewelry', 'Носишь ли ты украшения?', 'text', 1],
  ['fashionDreams', 'Твои модные мечты', 'text', 4],
];

const FIRST_LOVE_FIELDS = [
  ['name', 'Имя', 'text', 1],
  ['whenMet', 'Когда познакомились', 'text', 1],
  ['whereMet', 'Где познакомились', 'text', 1],
  ['feelings', 'Мои чувства', 'text', 2],
  ['memory', 'Самое тёплое воспоминание', 'text', 3],
  ['letter', 'Письмо (необязательно)', 'text', 3],
];

/** Фиолетовый A5 стр. 18 — поля из TZ First Love. */
const PURPLE_FIRST_LOVE_FIELDS = [
  ['qualitiesInPeople', 'Какие качества ты больше всего ценишь в людях?', 'text', 2],
  ['loveAtFirstSight', 'Веришь ли ты в любовь с первого взгляда?', 'text', 1],
  ['whatIsLove', 'И вообще, что такое любовь?', 'text', 1],
  ['classCrush', 'Кого в классе ты считаешь симпатичным?', 'text', 1],
  ['attentionSigns', 'Может, кто-то оказывает тебе знаки внимания? Какие?', 'text', 1],
  ['whoLikesMe', 'Как ты думаешь, кому ты нравишься?', 'text', 2],
  ['whyThinkSo', 'Почему ты так считаешь?', 'text', 2],
  ['freeThoughts', 'Свободные записи', 'text', 5],
];

const SCHOOL_LIFE_FIELDS = [
  ['likesStudying', 'Тебе нравится учиться? Почему?', 'text', 2],
  ['favoriteSubject', 'Любимый предмет в школе', 'text', 1],
  ['favoriteTeacher', 'Любимый учитель', 'text', 1],
  ['classSize', 'Сколько человек в твоём классе?', 'text', 1],
  ['classmateFriends', 'С кем из одноклассников дружишь?', 'text', 1],
  ['schoolEvents', 'Какие школьные мероприятия тебе нравятся?', 'text', 2],
  ['recessActivity', 'Чем чаще всего ты занимаешься на перемене?', 'text', 2],
  ['schoolMemory', 'Расскажи о самом интересном событии из твоей школьной жизни', 'text', 4],
];

/** Фиолетовый A5 стр. 22 — линии из PDF (14 штрихов). */
const PURPLE_SCHOOL_LIFE_FIELDS = [
  ['likesStudying', 'Тебе нравится учиться? Почему?', 'text', 2],
  ['favoriteSubject', 'Любимый предмет в школе', 'text', 1],
  ['favoriteTeacher', 'Любимый учитель', 'text', 1],
  ['classSize', 'Сколько человек в твоём классе?', 'text', 1],
  ['classmateFriends', 'С кем из одноклассников дружишь?', 'text', 1],
  ['schoolEvents', 'Какие школьные мероприятия тебе нравятся?', 'text', 2],
  ['recessActivity', 'Чем чаще всего ты занимаешься на перемене?', 'text', 2],
  ['schoolMemory', 'Расскажи о самом интересном событии из твоей школьной жизни', 'text', 4],
];

const SUNDAY_SCHEDULE_FIELDS = [
  ['morningPlans', 'Утренние планы', 'text', 1],
  ['dayPlans', 'Дневные дела', 'text', 1],
  ['familyTime', 'Время с семьёй', 'text', 1],
  ['rest', 'Отдых', 'text', 1],
  ['notes', 'Заметки', 'text', 1],
];

/** Коричневый дневник 60 стр.: анкета бабушки/дедушки — тот же макет, что мама/папа. */
const GRANDPARENT_FIELDS = [
  ['name', 'Имя', 'text', 1],
  ['birthDate', 'Дата рождения', 'date', 1],
  ['phone', 'Номер телефона', 'text', 1],
  ['zodiac', 'Знак зодиака', 'text', 1],
  ['profession', 'Профессия', 'text', 1],
  ['favoriteFlowers', 'Любимые цветы', 'text', 1],
  ['favoriteAnimal', 'Любимое животное', 'text', 1],
  ['favoriteColor', 'Любимый цвет', 'text', 1],
  ['favoriteSeason', 'Любимое время года', 'text', 1],
  ['hobby', 'Хобби', 'text', 1],
  ['favoriteDrink', 'Любимый напиток', 'text', 1],
  ['favoriteDish', 'Любимое блюдо', 'text', 1],
  ['wishes', 'Пожелания хозяйке дневника', 'text', 4],
];

/** Коричневый дневник 60 стр. «Мечты» (стр. 15): 4 блока мечт + «Самое сокровенное». */
const DREAMS_FIELDS = [
  ['dream1', 'Мечта №1', 'text', 3],
  ['dream2', 'Мечта №2', 'text', 3],
  ['dream3', 'Мечта №3', 'text', 4],
  ['dream4', 'Мечта №4', 'text', 12],
  ['secretMost', 'Самое сокровенное', 'text', 1],
];

/** Коричневый дневник стр. 21 — все вопросы макета + хвосты/продолжение на линиях PDF. */
const TRAVEL_FIELDS = [
  ['likesTravel', 'Ты любишь путешествовать?', 'text', 1],
  ['visitedCountries', 'Перечисли страны, в которых ты успела побывать?', 'text', 2],
  ['likedMost', 'Где тебе понравилось больше всего?', 'text', 2],
  ['flewPlane', 'Ты летала на самолете?', 'text', 1],
  ['trainTravel', 'Ты путешествовала на поезде?', 'text', 1],
  [
    'favoriteTransport',
    'Какой вид транспорта тебе понравился больше и почему?',
    'text',
    2,
  ],
  [
    'seaImpressions',
    'Ты была на море? Поделись своими впечатлениями',
    'text',
    2,
  ],
  ['travelBuddy', 'С кем ты чаще всего ездишь отдыхать?', 'text', 1],
  ['dreamTrip', 'Куда бы ты хотела поехать в будущем?', 'text', 2],
  [
    'travelImpressions',
    'Поделись своими впечатлениями о путешествиях!',
    'text',
    4,
  ],
];

const DIARY_RULES_FIELDS = [];

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
  const total = slots?.length ?? 17;
  const scheduleSlots = Array.from({ length: Math.max(8, total - 1) });
  const scheduleSpec = buildWeeklyScheduleSpec('Пятница', 'Суббота', scheduleSlots);
  const noteLines = Math.max(1, total - scheduleSpec.length);
  return [...scheduleSpec, ['weekNote', 'Заметки на неделю', 'text', noteLines]];
}

module.exports = {
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
  DIARY_RULES_FIELDS,
  WEEKLY_SCHEDULE_DAY_PAIRS,
  BROWN_WEEKLY_SCHEDULE_PAGES,
  buildWeeklyScheduleSpec,
  buildBrownWeeklyScheduleWithNoteSpec,
};
