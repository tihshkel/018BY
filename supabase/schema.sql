-- Схема как в проекте (см. также файл `subd` в корне — этот файл для воспроизведения окружения).
-- Таблицы: profiles, user_sync, user_project_data
-- RLS и триггер handle_new_user совпадают с вашими запросами из `subd`.

-- Профиль: 1 строка = 1 пользователь Auth
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  login_username text,
  user_name text NOT NULL DEFAULT 'Пользователь',
  avatar_url text,
  referral_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_login_username_key
  ON public.profiles (login_username)
  WHERE login_username IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.user_sync (
  user_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  data_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_project_data (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  project_id text NOT NULL,
  data_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_project_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "user_sync_all_own" ON public.user_sync;
CREATE POLICY "user_sync_all_own" ON public.user_sync
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_project_data_all_own" ON public.user_project_data;
CREATE POLICY "user_project_data_all_own" ON public.user_project_data
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Триггер: при регистрации приложение передаёт в signUp options.data → raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, login_username, user_name, referral_source)
  VALUES (
    NEW.id,
    NULLIF(lower(trim(NEW.raw_user_meta_data->>'login_username')), ''),
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'user_name'), ''), 'Пользователь'),
    NULLIF(trim(NEW.raw_user_meta_data->>'referral_source'), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Опционально: проверка email перед сбросом пароля (как в `subd`)
CREATE OR REPLACE FUNCTION public.is_auth_email_registered(check_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE lower(trim(email)) = lower(trim(check_email))
  );
$$;

REVOKE ALL ON FUNCTION public.is_auth_email_registered(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_auth_email_registered(text) TO anon, authenticated;
