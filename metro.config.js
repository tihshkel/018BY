const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Windows + Android Studio: Gradle создаёт/удаляет android/.gradle/* во время сборки.
// Стандартный blockList Expo матчит только сам каталог, не вложенные пути → Metro падает с ENOENT.
const gradleArtifacts = [
  /android[\\/]\.gradle[\\/].*/,
  /android[\\/]build[\\/].*/,
  /android[\\/]app[\\/]build[\\/].*/,
  new RegExp(
    `^${path.resolve(__dirname, 'android', '.gradle').replace(/\\/g, '\\\\')}[\\\\/].*`
  ),
];
const existingBlockList = config.resolver.blockList;
config.resolver.blockList = Array.isArray(existingBlockList)
  ? [...existingBlockList, ...gradleArtifacts]
  : existingBlockList
    ? [existingBlockList, ...gradleArtifacts]
    : gradleArtifacts;

// Добавляем поддержку дополнительных папок с изображениями и PDF
config.resolver.assetExts.push(
  // изображения
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
  // шрифты
  'ttf', 'otf', 'woff', 'woff2',
  // PDF файлы
  'pdf',
  // другие ресурсы
  'mp4', 'mp3', 'wav', 'aac', 'm4a'
);

// Добавляем дополнительные пути для поиска ресурсов
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Добавляем поддержку PDF файлов в assets
config.resolver.sourceExts.push('pdf');

module.exports = config;
