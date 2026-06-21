# Нативный Google Sign-In (iOS / Android)

Приложение использует `@react-native-google-signin/google-signin` и Supabase `signInWithIdToken`.
На **Expo Go** и **web** остаётся прежний вход через браузер (Supabase OAuth).

---

## Шаг 1. Google Cloud Console

Откройте [Google Cloud Console](https://console.cloud.google.com/) → ваш проект → **APIs & Services** → **Credentials**.

Нужны **три** OAuth 2.0 Client ID:

| Тип | Для чего | Параметры |
|-----|----------|-----------|
| **Web application** | Supabase + Android (`webClientId`) | Уже должен быть (тот же, что в Supabase → Google provider) |
| **Android** | Нативный вход на Android | Package: `com.tihshkel.app018by` + SHA-1 отпечаток |
| **iOS** | Нативный вход на iOS | Bundle ID: `com.tihshkel.x018BY` |

### SHA-1 для Android

Получите отпечаток сертификата, которым подписывается сборка:

```bash
# EAS (рекомендуется)
npx eas-cli credentials -p android

# или локально debug keystore
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Добавьте SHA-1 в Android OAuth client. Для production используйте SHA-1 из **Google Play App Signing** (Play Console → Release → Setup → App signing).

---

## Шаг 2. Supabase

1. **Authentication** → **Providers** → **Google** — провайдер **включён**.
2. В поле **Client ID** укажите **Web client ID** (тот же, что `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`).
3. **Client Secret** — secret от Web client.
4. Redirect URL `018by://` можно оставить для fallback через браузер.

Нативный вход не требует отдельного redirect — Supabase принимает `idToken` напрямую.

---

## Шаг 3. Переменные окружения

В `.env` (локально):

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-abc.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789-ios.apps.googleusercontent.com
```

- **Web client ID** — обязателен (Android + Supabase).
- **iOS client ID** — обязателен для iOS (добавляет URL scheme в Info.plist через Expo plugin).

Для EAS подставьте реальные значения в `eas.json` (поля `EXPO_PUBLIC_GOOGLE_*`) или задайте секреты:

```bash
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "YOUR_WEB_CLIENT_ID"
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value "YOUR_IOS_CLIENT_ID"
```

---

## Шаг 4. Новая нативная сборка

Нативный модуль **не работает в Expo Go**. Нужен dev client или production build:

```bash
# preview APK / TestFlight
npm run build:preview:android
npm run build:preview:ios

# store
npm run build:android
npm run build:ios
```

После смены client ID или SHA-1 — **пересоберите** приложение.

---

## Шаг 5. Проверка

1. Установите свежую сборку (не Expo Go).
2. Экран **Вход** или **Регистрация** → **Google**.
3. Должен открыться **системный** выбор аккаунта Google (без страницы Supabase в браузере).
4. После выбора аккаунта — переход в приложение.

### Типичные ошибки

| Симптом | Решение |
|---------|---------|
| `DEVELOPER_ERROR` на Android | Неверный package name или SHA-1 в Android OAuth client |
| `GOOGLE_NOT_CONFIGURED` | Нет `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` в `.env` / EAS |
| В Expo Go открывается браузер Supabase | Ожидаемо — нативный вход только в custom/dev/production build |
| `GOOGLE_PLAY_SERVICES_NOT_AVAILABLE` | Обновить Google Play Services на устройстве |

---

## Как это устроено в коде

- `utils/google-auth-config.ts` — чтение client ID из `extra` / env
- `utils/google-native-sign-in.ts` — `GoogleSignin.signIn()` → `supabase.auth.signInWithIdToken()`
- `utils/auth-session.ts` — Google на устройстве → нативно; Apple и fallback → браузер
- `app.config.js` — Expo plugin с `iosUrlScheme` из iOS client ID
