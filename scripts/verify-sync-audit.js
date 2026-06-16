#!/usr/bin/env node
/**
 * Аудит полноты синхронизации проектов в Supabase (user_project_data).
 * Проверяет, что код покрывает page_values, page_instances и загрузку фото альбома.
 *
 *   node scripts/verify-sync-audit.js
 *   npm run verify:sync-audit
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const REQUIRED_PROJECT_KEYS = [
  'page_instances_',
  'page_values_',
  'schema_version_',
  'annotations_',
  'images_',
  'sections_',
  'cover_annotations_',
];

const accountSync = read('utils/account-sync.ts');
const supabaseStorage = read('utils/supabase-storage.ts');
const albumHook = read('hooks/use-album-project.ts');

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    failed++;
  } else {
    console.log('OK:', message);
  }
}

for (const suffix of REQUIRED_PROJECT_KEYS) {
  assert(
    accountSync.includes(`@project_${suffix}\${projectId}`) ||
      accountSync.includes(`'@project_${suffix}`),
    `account-sync: ключ @project_${suffix}* в getProjectStorageKeys`
  );
}

assert(
  accountSync.includes('getProjectsSyncedToCloud'),
  'account-sync: чтение списка @projects_synced_to_cloud'
);
assert(
  accountSync.includes('flushAlbumProjectPersist'),
  'account-sync: flush debounced persist перед пушем'
);
assert(
  accountSync.includes('@project_page_values_'),
  'account-sync: persistUploadedProjectUrls включает page_values'
);

assert(
  supabaseStorage.includes('@project_page_values_'),
  'supabase-storage: загрузка URI из page_values'
);
assert(
  supabaseStorage.includes('@project_annotations_'),
  'supabase-storage: загрузка URI из annotations'
);
assert(
  supabaseStorage.includes('ALBUM_USER_PHOTO_INDEX_BASE'),
  'supabase-storage: отдельный диапазон индексов для фото пользователя'
);

assert(
  albumHook.includes('addProjectToSyncedList'),
  'use-album-project: проект добавляется в список синхронизации после persist'
);
assert(
  albumHook.includes('savePageValuesMap'),
  'use-album-project: page_values сохраняются локально'
);

console.log(failed === 0 ? '\nАудит синхронизации пройден.' : `\nОшибок: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
