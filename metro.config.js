const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

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
