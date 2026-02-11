/**
 * Скрипт для анализа страниц альбомов и определения координат текстовых полей
 * 
 * Этот скрипт помогает определить координаты, где должен начинаться текст на каждой странице.
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * 1. Откройте изображение страницы альбома
 * 2. Определите места, где должен начинаться текст
 * 3. Запишите координаты в формате:
 *    - x: горизонтальная позиция (0.0 = левый край, 1.0 = правый край)
 *    - y: вертикальная позиция (0.0 = верхний край, 1.0 = нижний край)
 *    - width: ширина поля (0.0 - 1.0)
 * 
 * ПРИМЕР:
 * Если на странице есть поле для ввода даты в левом верхнем углу:
 * { x: 0.1, y: 0.15, width: 0.3, label: 'Дата' }
 * 
 * Если поле находится в центре страницы:
 * { x: 0.2, y: 0.5, width: 0.6, label: 'Текст в центре' }
 */

const fs = require('fs');
const path = require('path');

/**
 * Структура данных для координат текстовых полей
 */
const TEXT_FIELD_COORDINATES_TEMPLATE = {
  // Формат:
  // albumId: [
  //   {
  //     page: 1,
  //     fields: [
  //       { x: 0.1, y: 0.2, width: 0.8, label: 'Описание поля' },
  //       // ... другие поля
  //     ],
  //   },
  //   // ... другие страницы
  // ],
};

/**
 * Функция для генерации JSON файла с координатами
 */
function generateCoordinatesFile(outputPath) {
  const content = `/**
 * Координаты текстовых полей для каждой страницы альбомов
 * 
 * Этот файл генерируется скриптом analyze-text-fields.js
 * 
 * Координаты нормализованы (0.0 - 1.0):
 * - x: 0.0 = левый край страницы, 1.0 = правый край
 * - y: 0.0 = верхний край страницы, 1.0 = нижний край
 * - width: ширина поля относительно ширины страницы
 */

export interface TextFieldCoordinate {
  x: number;
  y: number;
  width: number;
  label?: string;
}

export interface PageTextFields {
  page: number;
  fields: TextFieldCoordinate[];
}

export const TEXT_FIELD_COORDINATES: Record<string, PageTextFields[]> = ${JSON.stringify(TEXT_FIELD_COORDINATES_TEMPLATE, null, 2)};
`;

  fs.writeFileSync(outputPath, content, 'utf8');
  console.log(`Файл координат создан: ${outputPath}`);
}

/**
 * Интерактивный режим для ввода координат
 */
function interactiveMode() {
  console.log('=== Анализ координат текстовых полей ===\n');
  console.log('Инструкция:');
  console.log('1. Откройте изображение страницы альбома');
  console.log('2. Определите места, где должен начинаться текст');
  console.log('3. Введите координаты в формате: x,y,width,label');
  console.log('   Пример: 0.1,0.2,0.8,Дата\n');
  console.log('Для выхода введите "exit"\n');

  // Здесь можно добавить интерактивный ввод координат
  // или использовать инструменты для визуального анализа изображений
}

if (require.main === module) {
  const outputPath = path.join(__dirname, '../constants/text-field-coordinates.ts');
  
  if (process.argv.includes('--interactive')) {
    interactiveMode();
  } else {
    generateCoordinatesFile(outputPath);
    console.log('\nСледующие шаги:');
    console.log('1. Откройте файл constants/text-field-coordinates.ts');
    console.log('2. Для каждого альбома и страницы определите координаты текстовых полей');
    console.log('3. Заполните массив TEXT_FIELD_COORDINATES координатами');
    console.log('\nФормат координат:');
    console.log('  { x: 0.1, y: 0.2, width: 0.8, label: "Описание" }');
    console.log('\nГде:');
    console.log('  - x: горизонтальная позиция (0.0 = левый край, 1.0 = правый край)');
    console.log('  - y: вертикальная позиция (0.0 = верхний край, 1.0 = нижний край)');
    console.log('  - width: ширина поля (0.0 - 1.0)');
    console.log('  - label: описание поля (опционально)');
  }
}

module.exports = { generateCoordinatesFile, interactiveMode };
