# Нативный Google / Apple Sign-In (iOS / Android)

Приложение использует `@react-native-google-signin/google-signin` и Supabase `signInWithIdToken`.
На **Expo Go** и при сбое нативного модуля вход идёт через браузер (Supabase OAuth).

Apple на iOS: `expo-apple-authentication` + `signInWithIdToken`; при сбое — браузерный OAuth.

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

```bash
npx eas-cli credentials -p android
```

Добавьте SHA-1 в Android OAuth client. Для production — SHA-1 из **Google Play App Signing**.

---

## Шаг 2. Supabase

1. **Authentication** → **Providers** → **Google** — **Enable**, Web Client ID + Secret.
2. **Authentication** → **Providers** → **Apple** — **Enable** (для native idToken достаточно Bundle ID).
3. Redirect URLs (браузерный fallback):
   - `app018by://auth/callback`
   - при разработке Expo: URL из `Linking.createURL('auth/callback')`

Нативный вход не требует redirect — Supabase принимает `idToken` напрямую.

### Частые ошибки в браузере

| Сообщение | Причина | Что сделать |
|-----------|---------|-------------|
| `Unsupported provider: provider is not enabled` | Google/Apple выключены в Supabase | Providers → Enable |
| `unexpected_failure` (500) | Неверный Client ID/Secret или сбой OAuth у провайдера | Перепроверьте credentials в Google Cloud / Apple Developer и вставьте заново в Supabase |
| Redirect / callback не открывает приложение | Нет URL в allow-list | Добавьте `app018by://auth/callback` |

---

## Шаг 3. Переменные окружения

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
```

Для EAS значения уже в `eas.json`.

---

## Шаг 4. Новая нативная сборка

Нативные модули **не работают в Expo Go**. После добавления Apple / Google plugin — пересоберите:

```bash
npm run build:preview:ios
npm run build:preview:android
```

---

## Код

- `utils/google-native-sign-in.ts` — Google idToken → Supabase
- `utils/apple-native-sign-in.ts` — Apple idToken → Supabase
- `utils/auth-session.ts` — native → fallback browser OAuth (`app018by://auth/callback`)
