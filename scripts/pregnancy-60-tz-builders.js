/**
 * Ручные поля для pregnancy_60 — страницы с OCR-ошибками в extract-album-page-content.
 */

function field(lineGuideId, pageNumber, groupIndex, label, templateLineStart, type, templateLineCount = 1) {
  return {
    fieldId: `${lineGuideId}_p${pageNumber}_g${groupIndex}`,
    label,
    type,
    required: false,
    templateLineStart,
    templateLineCount,
  };
}

/** Стр. 2 «Обо мне» — 19 полей, слоты 0–21 без дублей OCR. */
function buildAboutMeFields(lineGuideId, pageNumber) {
  return [
    field(lineGuideId, pageNumber, 1, 'Дата рождения', 0, 'date'),
    field(lineGuideId, pageNumber, 2, 'Цвет глаз', 1, 'text'),
    field(lineGuideId, pageNumber, 3, 'Цвет волос', 2, 'text'),
    field(lineGuideId, pageNumber, 4, 'Группа крови', 3, 'text'),
    field(lineGuideId, pageNumber, 5, 'Рост', 4, 'number'),
    field(lineGuideId, pageNumber, 6, 'Вес', 5, 'number'),
    field(lineGuideId, pageNumber, 7, 'Образование', 6, 'text'),
    field(lineGuideId, pageNumber, 8, 'Место работы', 7, 'text'),
    field(lineGuideId, pageNumber, 9, 'Должность', 8, 'text'),
    field(lineGuideId, pageNumber, 10, 'Хобби', 9, 'text'),
    field(lineGuideId, pageNumber, 11, 'Я люблю', 10, 'text'),
    field(lineGuideId, pageNumber, 12, 'Я не люблю', 11, 'text'),
    field(lineGuideId, pageNumber, 13, 'Когда я поняла, что хочу ребенка', 12, 'text', 2),
    field(lineGuideId, pageNumber, 14, 'Я хотела бы иметь', 14, 'text'),
    field(lineGuideId, pageNumber, 15, 'Это будет (пол)', 15, 'text'),
    field(lineGuideId, pageNumber, 16, 'Он(а) родится (дата)', 16, 'date'),
    field(lineGuideId, pageNumber, 17, 'Вес будет (гр)', 17, 'number'),
    field(lineGuideId, pageNumber, 18, 'Рост будет (см)', 18, 'number'),
    field(lineGuideId, pageNumber, 19, 'Цвет волос будет', 19, 'text'),
    field(lineGuideId, pageNumber, 20, 'Цвет глаз будет', 20, 'text'),
    field(lineGuideId, pageNumber, 21, 'Будет похож на', 21, 'text'),
  ];
}

/** Стр. 3 «Будущий папа» — 10 полей. */
function buildFutureDadFields(lineGuideId, pageNumber) {
  return [
    field(lineGuideId, pageNumber, 1, 'Имя', 0, 'text'),
    field(lineGuideId, pageNumber, 2, 'Дата рождения', 1, 'date'),
    field(lineGuideId, pageNumber, 3, 'Цвет глаз', 2, 'text'),
    field(lineGuideId, pageNumber, 4, 'Цвет волос', 3, 'text'),
    field(lineGuideId, pageNumber, 5, 'Образование', 4, 'text'),
    field(lineGuideId, pageNumber, 6, 'Место работы', 5, 'text'),
    field(lineGuideId, pageNumber, 7, 'Должность', 6, 'text'),
    field(lineGuideId, pageNumber, 8, 'Хобби', 7, 'text'),
    field(lineGuideId, pageNumber, 9, 'Когда понял, что хочет ребенка', 8, 'text', 2),
    field(lineGuideId, pageNumber, 10, 'Хотел бы иметь', 10, 'text'),
  ];
}

function applyPregnancy60PageFields(pageNumber, lineGuideId) {
  switch (pageNumber) {
    case 2:
      return {
        title: 'Обо мне',
        fields: buildAboutMeFields(lineGuideId, pageNumber),
      };
    case 3:
      return {
        title: 'Будущий папа',
        fields: buildFutureDadFields(lineGuideId, pageNumber),
      };
    default:
      return null;
  }
}

module.exports = {
  applyPregnancy60PageFields,
  buildAboutMeFields,
  buildFutureDadFields,
};
