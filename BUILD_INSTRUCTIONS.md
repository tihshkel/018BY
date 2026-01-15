# Инструкции по сборке приложения

## Предварительные требования

1. **Установите EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Войдите в аккаунт Expo:**
   ```bash
   eas login
   ```

3. **Инициализируйте проект:**
   ```bash
   eas init
   ```
   Это создаст `projectId`, который нужно добавить в `app.json` в поле `extra.eas.projectId`.

## Профили сборки

### Development (для разработки)
```bash
npm run build:preview:ios
npm run build:preview:android
```
или
```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Preview (для внутреннего тестирования)
```bash
npm run build:preview:ios
npm run build:preview:android
```
или
```bash
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

### Production (для публикации)
```bash
npm run build:ios
npm run build:android
```
или
```bash
eas build --profile production --platform ios
eas build --profile production --platform android
```

## Отправка в магазины

### App Store
```bash
npm run submit:ios
```
или
```bash
eas submit --platform ios
```

### Google Play
```bash
npm run submit:android
```
или
```bash
eas submit --platform android
```

## Обновление версии

При каждом обновлении приложения обновите версии:

1. **app.json:**
   ```json
   {
     "expo": {
       "version": "1.0.1",  // Увеличьте версию
       "ios": {
         "buildNumber": "2"  // Увеличьте buildNumber
       },
       "android": {
         "versionCode": 2  // Увеличьте versionCode
       }
     }
   }
   ```

2. **package.json:**
   ```json
   {
     "version": "1.0.1"  // Синхронизируйте с app.json
   }
   ```

## Проверка статуса сборки

```bash
eas build:list
```

## Просмотр логов сборки

```bash
eas build:view [BUILD_ID]
```

## Полезные команды

```bash
# Проверка конфигурации
eas build:configure

# Обновление EAS CLI
npm install -g eas-cli@latest

# Просмотр информации о проекте
eas project:info
```

## Решение проблем

### Ошибка: "No project ID found"
Выполните `eas init` и добавьте полученный `projectId` в `app.json`.

### Ошибка: "Build failed"
Проверьте логи сборки: `eas build:view [BUILD_ID]`

### Ошибка при отправке в App Store
Убедитесь, что:
- У вас есть Apple Developer Account
- Bundle ID зарегистрирован в App Store Connect
- Все метаданные заполнены

### Ошибка при отправке в Google Play
Убедитесь, что:
- У вас есть Google Play Developer Account
- Package name зарегистрирован в Google Play Console
- Все метаданные заполнены
- Контентный рейтинг получен
