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

/** Фиолетовый A5 стр. 8 — макет PDF: 2+2+1 сверху + 11 хвостов избранного. */
const PURPLE_HOBBY_FIELDS = [
  ['hobbiesStory', 'Расскажи о своих хобби', 'text', 2],
  ['favoriteSports', 'Какими видами спорта тебе нравится заниматься?', 'text', 2],
  ['aloneActivity', 'Что ты больше всего любишь делать, когда остаёшься одна?', 'text', 1],
  ['favoriteMovie', 'Твой любимый фильм', 'text', 1],
  ['favoriteSeries', 'Самый интересный сериал', 'text', 1],
  ['favoriteActor', 'Любимый актёр', 'text', 1],
  ['favoriteActress', 'Любимая актриса', 'text', 1],
  ['favoriteCartoon', 'Любимый мультфильм', 'text', 1],
  ['favoriteBook', 'Самая интересная книга', 'text', 1],
  ['favoriteWriter', 'Любимый писатель (если есть)', 'text', 1],
  ['favoriteMusic', 'Какой стиль музыки тебе нравится', 'text', 1],
  ['favoriteSingerF', 'Любимая певица', 'text', 1],
  ['favoriteSingerM', 'Любимый певец', 'text', 1],
  ['favoriteBand', 'Лучшая музыкальная группа', 'text', 1],
];

/** Коричневый A5 стр. 17 — слоты сверены с PNG: хвосты на вопросах + полные линии ответа. */
const BROWN_PETS_FIELDS = [
  // 10 слотов = overrides / runtime filter (без OCR-полос на вопросах).
  // loves: хвост + полная строка; favorite: одна линия под вопросом.
  ['lovesAnimals', 'Ты любишь животных?', 'text', 2],
  ['favoriteAnimals', 'Какие животные тебе нравятся больше всего?', 'text', 1],
  ['hasPets', 'У тебя есть питомцы?', 'text', 1],
  ['petNames', 'Напиши их клички', 'text', 1],
  ['petBreed', 'Какая порода у твоих питомцев?', 'text', 1],
  // «Расскажи историю…» — микро-хвост PDF отбрасываем; ответ на полной строке ниже.
  ['howAppeared', 'Расскажи историю, как они у вас появились', 'text', 1],
  ['howCare', 'Как ты ухаживаешь за своими питомцами?', 'text', 1],
  ['wantPet', 'Если питомца у тебя нет, поделись, кого бы тебе хотелось завести', 'text', 2],
];

const PETS_FIELDS = BROWN_PETS_FIELDS;

/** Фиолетовый A5 — поля из TZ PetsQuestionnaire (слоты PDF p10). */
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

/** Фиолетовый A5 стр. 12 — анкета по макету PDF (не 6 ников). */
const PURPLE_SOCIAL_NETWORKS_FIELDS = [
  ['internetTime', 'Ты много времени проводишь в интернете?', 'text', 1],
  ['onlineActivity', 'Чем чаще всего ты занимаешься в интернете?', 'text', 1],
  ['interestingOnline', 'Расскажи, что в интернете кажется тебе самым интересным?', 'text', 1],
  ['favoriteNetwork', 'Какая социальная сеть твоя любимая? Почему?', 'text', 1],
  ['youtubeChannels', 'Твои любимые youtube-каналы', 'text', 1],
  ['bloggers', 'Твои любимые блогеры', 'text', 2],
  ['likesPhoto', 'Тебе нравится фотографировать?', 'text', 1],
  ['photoSubjects', 'Что ты фотографируешь чаще всего?', 'text', 2],
  ['nicks', 'Твои ники в социальных сетях', 'text', 2],
  ['instagram', 'Instagram', 'text', 1],
  ['vk', 'ВКонтакте', 'text', 1],
  ['tiktok', 'TikTok', 'text', 1],
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
  ['moodNote', 'Моё настроение сегодня', 'text', 1],
  ['whatMadeHappy', 'Что меня порадовало', 'text', 2],
  ['whatMadeSad', 'Что расстроило', 'text', 2],
  ['gratitude', 'За что я благодарна', 'text', 2],
  ['tomorrowWish', 'Чего жду завтра', 'text', 2],
];
const BROWN_MOOD_FIELDS = MOOD_FIELDS;

/** Фиолетовый A5 стр. 14 — макет PDF «Твое настроение». */
const PURPLE_MOOD_FIELDS = [
  ['whatMakesLaugh', 'Что или кто тебя смешит?', 'text', 1],
  ['likesComedies', 'Ты любишь комедии?', 'text', 1],
  ['favoriteComedy', 'Твоя любимая комедия', 'text', 1],
  ['watchesYoutube', 'Ты смотришь смешные видео на youtube?', 'text', 2],
  ['funnyVideos', 'Какие смешные видео тебе нравятся?', 'text', 2],
  ['funniestFamily', 'Кто самый весёлый в вашей семье?', 'text', 2],
  ['moodBoost1', 'Список: поднимает настроение — 1', 'text', 1],
  ['moodBoost2', 'Список: поднимает настроение — 2', 'text', 1],
  ['moodBoost3', 'Список: поднимает настроение — 3', 'text', 1],
  ['moodBoost4', 'Список: поднимает настроение — 4', 'text', 1],
];

/** Коричневый A5 стр. 26 — хвосты после вопросов + полные строки ответа. */
const BROWN_STYLE_FIELDS = [
  ['followsTrends', 'Ты следишь за модными трендами?', 'text', 2],
  ['comfortableClothes', 'Какая одежда для тебя самая удобная?', 'text', 2],
  // Длинный вопрос без хвоста — только одна полная линия ответа.
  ['colorCombos', 'Какие сочетания цветов в одежде тебе нравятся?', 'text', 1],
  ['homeClothes', 'Твоя любимая одежда для дома', 'text', 2],
  ['partyClothes', 'Любимая одежда для праздника', 'text', 2],
  ['friendsClothes', 'Любимая одежда для прогулки с друзьями', 'text', 2],
  ['schoolClothes', 'Любимая одежда для школы', 'text', 2],
  ['jewelry', 'Ты носишь украшения? Если да, то какие?', 'text', 3],
];

const STYLE_FIELDS = BROWN_STYLE_FIELDS;

/** Фиолетовый A5 — поля из TZ Fashion/Style. */
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

/** Фиолетовый A5 — вопросы со страницы «Первая любовь». */
const PURPLE_FIRST_LOVE_FIELDS = [
  ['valuedQualities', 'Какие качества ты больше всего ценишь в людях?', 'text', 2],
  ['loveAtFirstSight', 'Веришь ли ты в любовь с первого взгляда?', 'text', 1],
  ['whatIsLove', 'И вообще, что такое любовь?', 'text', 2],
  ['classmateCrush', 'Кого в классе ты считаешь симпатичным?', 'text', 1],
  ['attentionSigns', 'Может, кто-то оказывает тебе знаки внимания? Какие?', 'text', 2],
  ['whoLikesYou', 'Как ты думаешь, кому ты нравишься?', 'text', 1],
  ['whyThinkSo', 'Почему ты так считаешь?', 'text', 1],
  ['moreThoughts', 'Дополнительно', 'text', 5],
];

const SCHOOL_LIFE_FIELDS = [
  ['likesStudying', 'Тебе нравится учиться? Почему?', 'text', 1],
  ['favoriteSubject', 'Любимый предмет в школе', 'text', 1],
  ['favoriteTeacher', 'Любимый учитель', 'text', 1],
  ['classSize', 'Сколько человек в твоём классе?', 'text', 1],
  ['classmateFriends', 'С кем из одноклассников дружишь?', 'text', 1],
  ['schoolEvents', 'Какие школьные мероприятия тебе нравятся?', 'text', 1],
  ['recessActivity', 'Чем лучше всего ты занимаешься на перемене?', 'text', 1],
  ['schoolMemory', 'Расскажи о самом интересном событии из твоей школьной жизни', 'text', 2],
];

/** Фиолетовый A5 — линии со страницы «Школьная жизнь». */
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
  ['eveningPlans', 'Вечерние планы', 'text', 1],
  ['morePlans', 'Другие планы', 'text', 1],
  ['notes', 'Заметки', 'text', 9],
];

/** Фиолетовое воскресенье: 6 линий в блоке + заметки ниже по зазору Y. */
function buildPurpleSundayScheduleSpec(slots) {
  const total = slots?.length ?? 0;
  if (total <= 0) return SUNDAY_SCHEDULE_FIELDS;

  let splitAt = Math.min(6, Math.max(1, total - 1));
  if (slots.length >= 2) {
    let bestGap = -1;
    let bestI = splitAt - 1;
    for (let i = 0; i < slots.length - 1; i += 1) {
      const gap = (slots[i + 1]?.y ?? 0) - (slots[i]?.y ?? 0);
      if (gap > bestGap) {
        bestGap = gap;
        bestI = i;
      }
    }
    if (bestGap >= 0.08) {
      splitAt = bestI + 1;
    }
  }

  const sundayLines = Math.max(1, Math.min(splitAt, total - 1));
  const noteLines = Math.max(1, total - sundayLines);
  const sundayIds = [
    ['morningPlans', 'Утренние планы'],
    ['dayPlans', 'Дневные дела'],
    ['familyTime', 'Время с семьёй'],
    ['rest', 'Отдых'],
    ['eveningPlans', 'Вечерние планы'],
    ['morePlans', 'Другие планы'],
  ];
  const spec = [];
  for (let i = 0; i < sundayLines; i += 1) {
    const [id, label] = sundayIds[i] ?? [`sun_l${i + 1}`, `Воскресенье: строка ${i + 1}`];
    spec.push([id, label, 'text', 1]);
  }
  spec.push(['notes', 'Заметки', 'text', noteLines]);
  return spec;
}

const GRANDMA_FIELDS = [
  ['name', 'Имя бабушки', 'text', 1],
  ['birthDate', 'Дата рождения бабушки', 'date', 1],
  ['phone', 'Номер телефона бабушки', 'text', 1],
  ['zodiac', 'Знак зодиака бабушки', 'text', 1],
  ['profession', 'Профессия бабушки', 'text', 1],
  ['favoriteFlowers', 'Любимые цветы бабушки', 'text', 1],
  ['favoriteAnimal', 'Любимое животное бабушки', 'text', 1],
  ['favoriteColor', 'Любимый цвет бабушки', 'text', 1],
  ['favoriteSeason', 'Любимое время года бабушки', 'text', 1],
  ['hobby', 'Хобби бабушки', 'text', 1],
  ['favoriteDrink', 'Любимый напиток бабушки', 'text', 1],
  ['favoriteDish', 'Любимое блюдо бабушки', 'text', 1],
  ['wishes', 'Пожелания бабушки хозяйке дневника', 'text', 4],
];

const GRANDPA_FIELDS = [
  ['name', 'Имя дедушки', 'text', 1],
  ['birthDate', 'Дата рождения дедушки', 'date', 1],
  ['phone', 'Номер телефона дедушки', 'text', 1],
  ['zodiac', 'Знак зодиака дедушки', 'text', 1],
  ['profession', 'Профессия дедушки', 'text', 1],
  ['favoriteFlowers', 'Любимые цветы дедушки', 'text', 1],
  ['favoriteAnimal', 'Любимое животное дедушки', 'text', 1],
  ['favoriteColor', 'Любимый цвет дедушки', 'text', 1],
  ['favoriteSeason', 'Любимое время года дедушки', 'text', 1],
  ['hobby', 'Хобби дедушки', 'text', 1],
  ['favoriteDrink', 'Любимый напиток дедушки', 'text', 1],
  ['favoriteDish', 'Любимое блюдо дедушки', 'text', 1],
  ['wishes', 'Пожелания дедушки хозяйке дневника', 'text', 4],
];

/** @deprecated identical printed template — use GRANDMA_FIELDS / GRANDPA_FIELDS */
const GRANDPARENT_FIELDS = GRANDMA_FIELDS;

const DREAMS_FIELDS = [
  ['dream1', 'Мечта №1', 'text', 2],
  ['dream2', 'Мечта №2', 'text', 2],
  ['dream3', 'Мечта №3', 'text', 2],
  ['steps', 'Что для этого делаю', 'text', 3],
];
const BROWN_DREAMS_FIELDS = DREAMS_FIELDS;

const TRAVEL_FIELDS = [
  ['favoritePlace', 'Любимое место', 'text', 1],
  ['visitedCountries', 'Страны, где была', 'text', 2],
  ['dreamTrip', 'Куда мечтаю поехать', 'text', 1],
  ['bestTrip', 'Лучшее путешествие', 'text', 3],
  ['travelBuddy', 'С кем люблю путешествовать', 'text', 1],
];
const BROWN_TRAVEL_FIELDS = TRAVEL_FIELDS;

const BROWN_FOOD_FIELDS = [
  ['favoriteFood', 'Перечисли самую вкусную для тебя еду', 'text', 2],
  ['favoriteSweet', 'Что ты любишь из сладенького?', 'text', 2],
  ['sweetTooth', 'Ты считаешь себя сладкоежкой', 'text', 1],
  ['recipeStory', 'Ты уже пробовала готовить? Если да, то поделись рецептом', 'text', 2],
  ['favoriteCafeOrder', 'Ты любишь кушать в кафе? Если да, то что ты чаще всего заказываешь?', 'text', 1],
  ['futureCookingPlans', 'Что ты чаще всего будешь готовить, когда вырастешь?', 'text', 5],
];

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
  const total = slots?.length ?? 12;
  // Реальные макеты PDF: 6+6 / 7+5 / 5+5 — делим по самому большому зазору между днями.
  let splitAt = Math.floor(total / 2);
  if (slots?.length >= 2) {
    let bestGap = -1;
    let bestI = splitAt - 1;
    for (let i = 0; i < slots.length - 1; i += 1) {
      const gap = (slots[i + 1]?.y ?? 0) - (slots[i]?.y ?? 0);
      if (gap > bestGap) {
        bestGap = gap;
        bestI = i;
      }
    }
    // Зазор между блоками дней обычно ≫ межстрочного шага (~0.044).
    if (bestGap >= 0.08) {
      splitAt = bestI + 1;
    }
  }
  const d1 = Math.max(1, Math.min(splitAt, total - 1));
  const d2 = Math.max(1, total - d1);
  const spec = [];
  for (let i = 0; i < d1; i += 1) {
    spec.push([`d1_l${i + 1}`, `${day1}: урок ${i + 1}`, 'text', 1]);
  }
  for (let i = 0; i < d2; i += 1) {
    spec.push([`d2_l${i + 1}`, `${day2}: урок ${i + 1}`, 'text', 1]);
  }
  return spec;
}

function buildBrownWeeklyScheduleWithNoteSpec(slots) {
  const total = slots?.length ?? 16;
  // Верхний блок — только воскресенье (6 линий); ниже — заметки на неделю.
  const sundayLines = Math.min(6, Math.max(1, total - 1));
  const noteLines = Math.max(1, total - sundayLines);
  const scheduleSpec = [];
  for (let i = 0; i < sundayLines; i += 1) {
    scheduleSpec.push([
      `sun_l${i + 1}`,
      `Воскресенье: урок ${i + 1}`,
      'text',
      1,
    ]);
  }
  return [...scheduleSpec, ['weekNote', 'Заметки на неделю', 'text', noteLines]];
}

module.exports = {
  USER_QUESTIONNAIRE_FIELDS,
  PARENT_MOM_FIELDS,
  PARENT_DAD_FIELDS,
  HOBBY_FIELDS,
  PURPLE_HOBBY_FIELDS,
  PETS_FIELDS,
  BROWN_PETS_FIELDS,
  PURPLE_PETS_FIELDS,
  SOCIAL_NETWORKS_FIELDS,
  PURPLE_SOCIAL_NETWORKS_FIELDS,
  FRIEND_SOCIAL_FIELDS,
  PURPLE_FRIEND_FIELDS,
  MOOD_FIELDS,
  BROWN_MOOD_FIELDS,
  PURPLE_MOOD_FIELDS,
  STYLE_FIELDS,
  BROWN_STYLE_FIELDS,
  PURPLE_STYLE_FIELDS,
  FIRST_LOVE_FIELDS,
  PURPLE_FIRST_LOVE_FIELDS,
  SCHOOL_LIFE_FIELDS,
  PURPLE_SCHOOL_LIFE_FIELDS,
  SUNDAY_SCHEDULE_FIELDS,
  buildPurpleSundayScheduleSpec,
  GRANDPARENT_FIELDS,
  GRANDMA_FIELDS,
  GRANDPA_FIELDS,
  DREAMS_FIELDS,
  BROWN_DREAMS_FIELDS,
  TRAVEL_FIELDS,
  BROWN_TRAVEL_FIELDS,
  BROWN_FOOD_FIELDS,
  DIARY_RULES_FIELDS,
  WEEKLY_SCHEDULE_DAY_PAIRS,
  BROWN_WEEKLY_SCHEDULE_PAGES,
  buildWeeklyScheduleSpec,
  buildBrownWeeklyScheduleWithNoteSpec,
};
