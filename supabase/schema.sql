-- Таблица аккаунтов: код доступа и имя пользователя
-- Выполните этот SQL в Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS accounts (
  access_code TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого поиска по коду (уже есть primary key)
-- RLS: разрешаем чтение и запись (anon key)
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

-- Таблица синхронизации данных аккаунта (проекты, альбомы, напоминания и т.д.)
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
