# Настройка Supabase для синхронизации

Supabase сохраняет **код доступа** и **имя пользователя** в облаке. Это позволяет:
- Входить по коду на новом устройстве
- Видеть своё имя после входа по коду

## Шаг 1: Создать проект в Supabase

1. Зайдите на [supabase.com](https://supabase.com)
2. Войдите или зарегистрируйтесь
3. Создайте новый проект (Organization → New project)
4. Запомните пароль к базе данных

## Шаг 2: Выполнить SQL

1. В Supabase Dashboard откройте **SQL Editor**
2. Скопируйте **всё** содержимое файла `supabase/schema.sql` (таблицы `accounts`, `account_sync`, `account_project_data`; в `accounts` есть поле `avatar_url`)
3. Вставьте в редактор и нажмите **Run**
4. Затем выполните `supabase/storage-setup.sql` — создаст bucket для фотографий

Если у вас уже были созданы таблицы по старой схеме, тот же `schema.sql` добавит колонку `avatar_url` в `accounts` и создаст таблицу `account_project_data`.

## Шаг 3: Получить ключи

1. В Supabase Dashboard откройте **Project Settings** (иконка шестерёнки)
2. Перейдите в раздел **API**
3. Скопируйте:
   - **Project URL** (например, `https://xxxxx.supabase.co`)
   - **anon public** ключ (длинная строка)

## Шаг 4: Настроить приложение

1. Скопируйте `.env.example` в `.env`:
   ```
   cp .env.example .env
   ```

2. Откройте `.env` и вставьте свои значения:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://ваш-проект.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=ваш-anon-ключ
   ```

3. Перезапустите приложение (`npx expo start --clear`)

## Результат

- При **регистрации** (ввод имени) — код и имя сохраняются в Supabase
- При **входе по коду** на новом устройстве — имя загружается из Supabase
- Если Supabase не настроен — приложение работает как раньше (без облачной синхронизации)
