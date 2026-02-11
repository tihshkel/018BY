/**
 * Координаты текстовых полей для каждой страницы альбомов
 * 
 * Формат:
 * - albumId: ID альбома
 * - page: номер страницы (начиная с 1)
 * - fields: массив текстовых полей на странице
 *   - x: горизонтальная позиция начала текста (0.0 - 1.0, нормализованная)
 *   - y: вертикальная позиция начала текста (0.0 - 1.0, нормализованная)
 *   - width: ширина текстового поля (0.0 - 1.0, нормализованная)
 *   - label: описание поля (опционально, для отладки)
 */

export interface TextFieldCoordinate {
  x: number; // Нормализованная X координата (0.0 - 1.0)
  y: number; // Нормализованная Y координата (0.0 - 1.0)
  width: number; // Нормализованная ширина (0.0 - 1.0)
  label?: string; // Описание поля для отладки
}

export interface PageTextFields {
  page: number;
  fields: TextFieldCoordinate[];
}

export interface AlbumTextFields {
  albumId: string;
  pages: PageTextFields[];
}

/**
 * Координаты текстовых полей для всех альбомов
 * 
 * ВАЖНО: Эти координаты нужно заполнить вручную, анализируя каждую страницу альбома.
 * Координаты нормализованы (0.0 - 1.0), где:
 * - x: 0.0 = левый край, 1.0 = правый край
 * - y: 0.0 = верхний край, 1.0 = нижний край
 * - width: ширина поля относительно ширины страницы
 */
export const TEXT_FIELD_COORDINATES: Record<string, PageTextFields[]> = {
  // Альбом беременности 60 страниц
  pregnancy_60: [
    {
      page: 1,
      fields: [
        // Координаты нужно определить, анализируя изображение страницы
        // Пример для первой страницы (заполнить вручную после анализа):
        // { x: 0.1, y: 0.2, width: 0.8, label: 'Заголовок' },
        // { x: 0.15, y: 0.35, width: 0.7, label: 'Дата' },
        // { x: 0.1, y: 0.5, width: 0.8, label: 'Текст' },
      ],
    },
    // Добавить координаты для остальных страниц (2-60)...
  ],
  
  // Альбом беременности A5
  pregnancy_a5: [
    // Аналогично pregnancy_60, но с координатами для формата A5
  ],
  
  // Детские альбомы (kids_48 используется как единый ID)
  kids_48: [
    // Координаты для детских альбомов
  ],
  
  // Дневники
  diary_interior_brown: [
    // Координаты для дневников
  ],
  
  // Для других альбомов добавить аналогично
};

/**
 * Получить координаты текстовых полей для конкретной страницы альбома
 */
export function getTextFieldsForPage(
  albumId: string,
  page: number
): TextFieldCoordinate[] {
  const albumFields = TEXT_FIELD_COORDINATES[albumId];
  if (!albumFields) return [];

  const pageFields = albumFields.find((p) => p.page === page);
  return pageFields?.fields || [];
}

/**
 * Получить ближайшее текстовое поле к указанным координатам
 */
export function getNearestTextField(
  albumId: string,
  page: number,
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number
): TextFieldCoordinate | null {
  const fields = getTextFieldsForPage(albumId, page);
  if (fields.length === 0) return null;

  // Нормализуем координаты
  const normalizedX = x / viewportWidth;
  const normalizedY = y / viewportHeight;

  let nearest: TextFieldCoordinate | null = null;
  let minDistance = Infinity;

  for (const field of fields) {
    // Вычисляем расстояние до центра поля
    const fieldCenterX = field.x + field.width / 2;
    const fieldCenterY = field.y;
    
    const distance = Math.sqrt(
      Math.pow(normalizedX - fieldCenterX, 2) + Math.pow(normalizedY - fieldCenterY, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = field;
    }
  }

  // Возвращаем ближайшее поле, если оно достаточно близко (в пределах 0.1 от нормализованных координат)
  return minDistance < 0.1 ? nearest : null;
}

/**
 * Получить координаты для позиционирования текста в текстовом поле
 */
export function getTextFieldPosition(
  field: TextFieldCoordinate,
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number; width: number } {
  return {
    x: field.x * viewportWidth,
    y: field.y * viewportHeight,
    width: field.width * viewportWidth,
  };
}
