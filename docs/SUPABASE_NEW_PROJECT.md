# Настройка нового проекта Supabase (новый аккаунт)

Выполните по порядку в **Supabase Dashboard** вашего нового проекта.

---

## 1. Создать таблицы в БД

1. Откройте проект в [Supabase Dashboard](https://supabase.com/dashboard).
2. Слева выберите **SQL Editor** → **New query**.
3. Скопируйте **весь** текст из файла `supabase/schema.sql` в репозитории и вставьте в редактор.
4. Нажмите **Run** (или Ctrl+Enter).
5. Должно появиться сообщение об успешном выполнении. В **Table Editor** появятся таблицы: `accounts`, `account_sync`, `account_project_data`.

---

## 2. Настроить Storage (фото и PDF)

1. В том же проекте снова откройте **SQL Editor** → **New query**.
2. Скопируйте **весь** текст из файла `supabase/storage-setup.sql` и вставьте в редактор.
3. Нажмите **Run**.
4. В разделе **Storage** должен появиться bucket `account-images` (публичный).

---

## 3. Взять ключи проекта

1. Слева откройте **Project Settings** (иконка шестерёнки).
2. Перейдите в **API**.
3. Скопируйте:
   - **Project URL** (например `https://xbjssrfenkaefudhlgks.supabase.co`);
   - **Project API keys** → **anon** **public** / Publishable key (длинный ключ).

---

## 4. Подставить ключи в приложение

1. В корне проекта создайте файл `.env` (если его нет — скопируйте из `.env.example`).
2. Откройте `.env` и задайте (подставьте свои значения из шага 3):

```env
EXPO_PUBLIC_SUPABASE_URL=https://xbjssrfenkaefudhlgks.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=ваш-publishable-ключ-из-Supabase-API
```

3. Сохраните файл. Файл `.env` в Git не попадает — это правильно.

---

## 5. Перезапустить приложение

В терминале в папке проекта:

```bash
npx expo start --clear
```

Или при сборке под Android/iOS после изменения ключей сделайте новую сборку.

---

## Проверка

- В приложении: после ввода имени и сохранения проекта данные должны появляться в **Table Editor** и **Storage** в Supabase.
- В **Database** → **Tables**: есть `accounts`, `account_sync`, `account_project_data`.
- В **Storage**: есть bucket `account-images`.
