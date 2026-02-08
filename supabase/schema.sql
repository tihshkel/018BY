-- Таблица аккаунтов: код доступа, имя, аватар (URL после загрузки в Storage)
-- Выполните этот SQL в Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS accounts (
  access_code TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert accounts" ON accounts;
CREATE POLICY "Allow insert accounts" ON accounts
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read accounts" ON accounts;
CREATE POLICY "Allow read accounts" ON accounts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow update accounts" ON accounts;
CREATE POLICY "Allow update accounts" ON accounts
  FOR UPDATE USING (true);

-- Ядро данных: напоминания, список проектов, беременность, история экспорта, флаги онбординга
-- Всё, что не привязано к конкретному проекту (без @project_*)
CREATE TABLE IF NOT EXISTS account_sync (
  access_code TEXT PRIMARY KEY REFERENCES accounts(access_code) ON DELETE CASCADE,
  data_json JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE account_sync ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert account_sync" ON account_sync;
CREATE POLICY "Allow insert account_sync" ON account_sync
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read account_sync" ON account_sync;
CREATE POLICY "Allow read account_sync" ON account_sync
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow update account_sync" ON account_sync;
CREATE POLICY "Allow update account_sync" ON account_sync
  FOR UPDATE USING (true);

-- Данные по каждому проекту отдельно (альбом: фото, аннотации, обложка, viewport и т.д.)
-- Избегаем одного огромного JSON и лимитов размера запроса
CREATE TABLE IF NOT EXISTS account_project_data (
  access_code TEXT NOT NULL REFERENCES accounts(access_code) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  data_json JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (access_code, project_id)
);

ALTER TABLE account_project_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert account_project_data" ON account_project_data;
CREATE POLICY "Allow insert account_project_data" ON account_project_data
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read account_project_data" ON account_project_data;
CREATE POLICY "Allow read account_project_data" ON account_project_data
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow update account_project_data" ON account_project_data;
CREATE POLICY "Allow update account_project_data" ON account_project_data
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete account_project_data" ON account_project_data;
CREATE POLICY "Allow delete account_project_data" ON account_project_data
  FOR DELETE USING (true);

-- Миграция: добавить avatar_url в accounts, если таблица уже была создана без него
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE accounts ADD COLUMN avatar_url TEXT;
  END IF;
END $$;
