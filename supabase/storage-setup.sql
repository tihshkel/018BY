-- Storage bucket для фотографий пользователей
-- Выполните в Supabase Dashboard → SQL Editor (после schema.sql)
-- Или создайте bucket вручную: Storage → New bucket → id: account-images, Public: true

INSERT INTO storage.buckets (id, name, public)
VALUES ('account-images', 'account-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Политики для Storage (anon — приложение без Supabase Auth)
DROP POLICY IF EXISTS "018by_upload_images" ON storage.objects;
CREATE POLICY "018by_upload_images" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'account-images');

DROP POLICY IF EXISTS "018by_read_images" ON storage.objects;
CREATE POLICY "018by_read_images" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'account-images');

DROP POLICY IF EXISTS "018by_update_images" ON storage.objects;
CREATE POLICY "018by_update_images" ON storage.objects
  FOR UPDATE TO anon USING (bucket_id = 'account-images');
