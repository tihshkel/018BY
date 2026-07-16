/**
 * Semantic field map for diary_interior_brown / diary_interior_purple.
 * Labels and line counts follow the printed 09.06.26 PDF layouts.
 * Spec tuple: [id, label, type, templateLineCount]
 */

const BROWN_MOOD_FIELDS = [
  ['whatMakesLaugh', 'Что или кто тебя смешит?', 'text', 1],
  ['likesComedies', 'Ты любишь комедии?', 'text', 1],
  ['favoriteComedy', 'Какая твоя любимая комедия?', 'text', 1],
  ['watchesYoutube', 'Ты смотришь видео на Youtube?', 'text', 1],
  ['funnyVideos', 'Какие смешные видео тебе нравятся?', 'text', 1],
  ['funniestInFamily', 'Кто самый веселый в вашей семье?', 'text', 1],
  ['moodLift1', 'Что поднимает настроение — 1', 'text', 1],
  ['moodLift2', 'Что поднимает настроение — 2', 'text', 1],
  ['moodLift3', 'Что поднимает настроение — 3', 'text', 1],
  ['moodLift4', 'Что поднимает настроение — 4', 'text', 1],
  ['moodLift5', 'Что поднимает настроение — 5', 'text', 1],
];

/** Purple «Твоё настроение»: 6 вопросов (часть с continuation) + список 1–4. */
const PURPLE_MOOD_FIELDS = [
  ['whatMakesLaugh', 'Что или кто тебя смешит?', 'text', 2],
  ['likesComedies', 'Ты любишь комедии?', 'text', 1],
  ['favoriteComedy', 'Твоя любимая комедия', 'text', 1],
  ['watchesYoutube', 'Ты смотришь смешные видео на youtube?', 'text', 2],
  ['funnyVideos', 'Какие смешные видео тебе нравятся?', 'text', 2],
  ['funniestInFamily', 'Кто самый веселый в вашей семье?', 'text', 2],
  ['moodLift1', 'Что поднимает настроение — 1', 'text', 1],
  ['moodLift2', 'Что поднимает настроение — 2', 'text', 1],
  ['moodLift3', 'Что поднимает настроение — 3', 'text', 1],
  ['moodLift4', 'Что поднимает настроение — 4', 'text', 1],
];

const BROWN_PETS_FIELDS = [
  ['lovesAnimals', 'Ты любишь животных?', 'text', 1],
  ['favoriteAnimals', 'Какие животные тебе нравятся больше всего?', 'text', 2],
  ['hasPets', 'У тебя есть питомцы?', 'text', 1],
  ['petNames', 'Напиши их клички:', 'text', 1],
  ['petBreed', 'Какая порода у твоих питомцев?', 'text', 1],
  ['howAppeared', 'Расскажи историю, как они у вас появились:', 'text', 2],
  ['howCare', 'Как ты ухаживаешь за своими питомцами?', 'text', 2],
  ['wantPet', 'Если питомца у тебя нет, поделись, кого бы тебе хотелось завести:', 'text', 2],
];

const BROWN_TRAVEL_FIELDS = [
  ['likesTravel', 'Ты любишь путешествовать?', 'text', 1],
  ['visitedCountries', 'Перечисли страны, в которых ты успела побывать?', 'text', 2],
  ['likedMost', 'Где тебе понравилось больше всего?', 'text', 2],
  ['flewPlane', 'Ты летала на самолете?', 'text', 1],
  ['traveledTrain', 'Ты путешествовала на поезде?', 'text', 1],
  ['favoriteTransport', 'Какой вид транспорта тебе понравился больше и почему?', 'text', 2],
  ['beenToSea', 'Ты была на море? Поделись своими впечатлениями', 'text', 2],
  ['travelWith', 'С кем ты чаще всего ездишь отдыхать?', 'text', 1],
  ['futureTrip', 'Куда бы ты хотела поехать в будущем?', 'text', 2],
  ['impressions', 'Поделись своими впечатлениями о путешествиях!', 'text', 4],
];

const BROWN_HOBBY_FIELDS = [
  ['hobbiesStory', 'Расскажи о своих хобби!', 'text', 2],
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
  ['recessActivity', 'Чем ты любишь заниматься на переменах?', 'text', 3],
];

const BROWN_STYLE_FIELDS = [
  ['followsTrends', 'Ты следишь за модными трендами?', 'text', 2],
  ['comfortableClothes', 'Какая одежда для тебя самая удобная?', 'text', 2],
  ['colorCombos', 'Какие сочетания цветов в одежде тебе нравятся?', 'text', 2],
  ['homeClothes', 'Твоя любимая одежда для дома:', 'text', 2],
  ['partyClothes', 'Любимая одежда для праздника:', 'text', 2],
  ['friendsClothes', 'Любимая одежда для прогулки с друзьями:', 'text', 2],
  ['schoolClothes', 'Любимая одежда для школы:', 'text', 2],
  ['jewelry', 'Ты носишь украшения? Если да, то какие?', 'text', 2],
];

/** Purple style: 8 single-line answers + «модные мечты» block. */
const PURPLE_STYLE_FIELDS = [
  ['followsTrends', 'Ты следишь за модными трендами?', 'text', 1],
  ['comfortableClothes', 'Какая одежда для тебя самая удобная?', 'text', 1],
  ['colorCombos', 'Какие сочетания цветов в одежде тебе нравятся?', 'text', 1],
  ['homeClothes', 'Твоя любимая одежда для дома:', 'text', 1],
  ['partyClothes', 'Любимая одежда для праздника:', 'text', 1],
  ['friendsClothes', 'Любимая одежда для прогулки с друзьями:', 'text', 1],
  ['schoolClothes', 'Любимая одежда для школы:', 'text', 1],
  ['jewelry', 'Ты носишь украшения? Если да, то какие?', 'text', 1],
  ['fashionDreams', 'Твои модные мечты', 'text', 4],
];

/** Purple pets — same questions, layout has 10 writable strokes. */
const PURPLE_PETS_FIELDS = [
  ['lovesAnimals', 'Ты любишь животных?', 'text', 1],
  ['favoriteAnimals', 'Какие животные тебе нравятся больше всего?', 'text', 1],
  ['hasPets', 'У тебя есть питомцы?', 'text', 1],
  ['petNames', 'Напиши их клички:', 'text', 1],
  ['petBreed', 'Какая порода у твоих питомцев?', 'text', 1],
  ['howAppeared', 'Расскажи историю, как они у вас появились:', 'text', 2],
  ['howCare', 'Как ты ухаживаешь за своими питомцами?', 'text', 1],
  ['wantPet', 'Если питомца у тебя нет, поделись, кого бы тебе хотелось завести:', 'text', 2],
];

const BROWN_FOOD_FIELDS = [
  ['favoriteFood', 'Перечисли самую вкусную для тебя еду', 'text', 2],
  ['favoriteSweet', 'Что ты любишь из сладенького?', 'text', 2],
  ['sweetTooth', 'Ты считаешь себя сладкоежкой', 'text', 1],
  ['recipeStory', 'Ты уже пробовала готовить? Если да, то поделись рецептом', 'text', 2],
  ['favoriteCafeOrder', 'Ты любишь кушать в кафе? Если да, то что ты чаще всего заказываешь?', 'text', 1],
  ['futureCookingPlans', 'Что ты чаще всего будешь готовить, когда вырастешь?', 'text', 5],
];

const BROWN_DREAMS_FIELDS = [
  ['dream1', 'Мечта 1', 'text', 3],
  ['dream2', 'Мечта 2', 'text', 3],
  ['dream3', 'Мечта 3', 'text', 3],
  ['dreamNotes', 'Расскажи подробнее о мечтах', 'text', 12],
  ['secretDream', 'Самое сокровенное', 'text', 1],
];

/** 9 printed mood faces on MyDay pages (left → right). */
const MY_DAY_MOOD_OPTIONS = ['😊', '😢', '😐', '😃', '😄', '😅', '😠', '😟', '😁'];

const EXPECTED_QUESTION_HINTS = {
  diary_interior_brown: {
    13: ['хобби', 'спорта', 'мультфильм', 'переменах'],
    15: ['мечта', 'сокровенн'],
    17: ['любишь животных', 'кличк', 'пород'],
    21: ['путешествовать', 'самолете', 'поезде', 'будущем'],
    24: ['смешит', 'комеди', 'youtube', 'настроение'],
    26: ['модн', 'одежда', 'украшен'],
    38: ['еду', 'сладеньк', 'сладкоеж', 'кафе'],
  },
  diary_interior_purple: {
    9: ['прошёл', 'день', 'улыбаться'],
    10: ['животн', 'кличк'],
    14: ['смешит', 'комеди', 'youtube', 'настроение'],
    16: ['модн', 'одежда', 'украшен', 'мечт'],
  },
};

module.exports = {
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
  EXPECTED_QUESTION_HINTS,
};
