-- Storage bucket для фотографий пользователей
-- Выполните в Supabase Dashboard → SQL Editor (после schema.sql)
-- Или создайте bucket вручную: Storage → New bucket → id: account-images, Public: true

INSERT INTO storage.buckets (id, name, public)
VALUES ('account-images', 'account-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Публичное чтение (public bucket → HTTPS URL на любом устройстве)
DROP POLICY IF EXISTS "018by_read_images" ON storage.objects;
DROP POLICY IF EXISTS "018by_read_images_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "018by_public_read_images" ON storage.objects;
CREATE POLICY "018by_public_read_images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'account-images');

-- Upload / update / delete: приложение ходит как authenticated (Supabase Auth).
-- Старые политики только для anon ломали синхронизацию фото между устройствами.
DROP POLICY IF EXISTS "018by_upload_images" ON storage.objects;
DROP POLICY IF EXISTS "018by_upload_images_authenticated" ON storage.objects;
CREATE POLICY "018by_upload_images_authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'account-images');

DROP POLICY IF EXISTS "018by_update_images" ON storage.objects;
DROP POLICY IF EXISTS "018by_update_images_authenticated" ON storage.objects;
CREATE POLICY "018by_update_images_authenticated" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'account-images')
  WITH CHECK (bucket_id = 'account-images');

DROP POLICY IF EXISTS "018by_delete_images_authenticated" ON storage.objects;
CREATE POLICY "018by_delete_images_authenticated" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'account-images');

-- Опционально: anon (legacy / без сессии) — оставляем read+write на случай старых сборок
DROP POLICY IF EXISTS "018by_upload_images_anon" ON storage.objects;
CREATE POLICY "018by_upload_images_anon" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'account-images');

DROP POLICY IF EXISTS "018by_update_images_anon" ON storage.objects;
CREATE POLICY "018by_update_images_anon" ON storage.objects
  FOR UPDATE TO anon
  USING (bucket_id = 'account-images')
  WITH CHECK (bucket_id = 'account-images');
