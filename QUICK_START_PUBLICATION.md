# Быстрый старт: Публикация приложения

## Шаг 1: Установка EAS CLI

```bash
npm install -g eas-cli
```

## Шаг 2: Вход в Expo

```bash
eas login
```

## Шаг 3: Инициализация проекта

```bash
eas init
```

Это создаст `projectId` в `app.json`. Скопируйте его из вывода команды.

## Шаг 4: Обновление app.json

Добавьте полученный `projectId` в `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "ВАШ_PROJECT_ID_ЗДЕСЬ"
      }
    }
  }
}
```

## Шаг 5: Сборка приложения

### iOS:
```bash
eas build --profile production --platform ios
```

### Android:
```bash
eas build --profile production --platform android
```

## Шаг 6: Отправка в магазины

### App Store:
```bash
eas submit --platform ios
```

### Google Play:
```bash
eas submit --platform android
```

## Важно перед публикацией:

1. ✅ Подготовьте скриншоты для магазинов
2. ✅ Создайте политику конфиденциальности
3. ✅ Напишите описание приложения
4. ✅ Протестируйте приложение на реальных устройствах

Подробные инструкции смотрите в `PUBLICATION_GUIDE.md`
