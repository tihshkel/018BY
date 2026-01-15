# 018BY - Приложение для создания фотоальбомов

Приложение для создания персональных фотоальбомов для беременности и детства (0-7 лет).

## Возможности

- 📸 Создание альбомов для беременности и детства
- 🎨 Красивые шаблоны и дизайны обложек
- ✏️ Редактирование страниц с фотографиями и текстом
- 📄 Экспорт в PDF для печати в профессиональных типографиях
- 🔔 Умные напоминания о важных моментах
- 🔄 Синхронизация между устройствами через QR-код
- 💾 Безопасное хранение ваших воспоминаний

## Разработка

### Установка зависимостей

```bash
npm install
```

### Запуск приложения

```bash
npx expo start
```

### Запуск на конкретной платформе

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## Публикация

Приложение готово к публикации в App Store и Google Play.

### Быстрый старт

См. `QUICK_START_PUBLICATION.md` для быстрого начала работы.

### Подробное руководство

См. `PUBLICATION_GUIDE.md` для полного руководства по публикации.

### Чеклист

См. `PRE_RELEASE_CHECKLIST.md` для проверки готовности к публикации.

## Технологии

- [Expo](https://expo.dev) - фреймворк для разработки
- [React Native](https://reactnative.dev) - кроссплатформенная разработка
- [Expo Router](https://docs.expo.dev/router/introduction/) - файловая маршрутизация
- [TypeScript](https://www.typescriptlang.org/) - типизация
- [EAS Build](https://docs.expo.dev/build/introduction/) - облачная сборка

## Структура проекта

```
018BY/
├── app/              # Экраны приложения (file-based routing)
├── components/        # Переиспользуемые компоненты
├── utils/            # Утилиты и хелперы
├── constants/        # Константы и конфигурация
├── assets/           # Изображения, шрифты, PDF
├── scripts/          # Вспомогательные скрипты
├── app.json          # Конфигурация Expo
├── eas.json          # Конфигурация EAS Build
└── package.json      # Зависимости проекта
```

## Документация

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

## Лицензия

Private - Все права защищены
