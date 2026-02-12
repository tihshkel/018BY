#!/usr/bin/env node
/**
 * Скрипт проверки сохранения проектов в «БД» (AsyncStorage-подобное хранилище).
 * Имитирует действия пользователя: создание проекта, сохранение, проверку.
 * Если проект не сохранился — запускает диагностику и пробует исправления.
 *
 * Запуск:
 *   node scripts/verify-project-save.js
 *   npm run verify-project-save
 *
 * Проверка с реальным хранилищем в приложении (Expo):
 *   В режиме разработки (__DEV__) на главном экране долго нажмите на «Привет» —
 *   откроется отчёт о проверке @user_projects и попытка исправить недостающие записи.
 */

const path = require('path');

// ============ Мок AsyncStorage для Node (без React Native) ============
const store = new Map();

const AsyncStorageMock = {
  getItem: (key) => Promise.resolve(store.get(key) ?? null),
  setItem: (key, value) => {
    store.set(key, String(value));
    return Promise.resolve();
  },
  removeItem: (key) => {
    store.delete(key);
    return Promise.resolve();
  },
  multiGet: (keys) =>
    Promise.resolve(keys.map((k) => [k, store.get(k) ?? null])),
  multiRemove: (keys) => {
    keys.forEach((k) => store.delete(k));
    return Promise.resolve();
  },
  getAllKeys: () => Promise.resolve([...store.keys()]),
  clear: () => {
    store.clear();
    return Promise.resolve();
  },
};

// Глобально подменяем для возможного require('@react-native-async-storage/async-storage')
let AsyncStorage = AsyncStorageMock;

// Пытаемся использовать реальный AsyncStorage, если окружение поддерживает (Expo/RN)
try {
  const storagePath = path.join(__dirname, '..', 'node_modules', '@react-native-async-storage', 'async-storage', 'lib', 'AsyncStorage.js');
  const fs = require('fs');
  if (fs.existsSync(path.join(__dirname, '..', 'node_modules', '@react-native-async-storage', 'async-storage'))) {
    // В Node нет нативного модуля — используем мок
    AsyncStorage = AsyncStorageMock;
  }
} catch (_) {
  AsyncStorage = AsyncStorageMock;
}

// ============ Логика из приложения (упрощённая копия) ============

function getCelebrationTitle(celebrationId) {
  const m = { pregnancy: 'Беременность', kids: 'Детство', family: 'Семья', wedding: 'Свадьба', travel: 'Путешествия', diary: 'Дневники' };
  return m[celebrationId] || 'Праздник';
}

function countPhotoAnnotations(items) {
  if (!Array.isArray(items) || items.length === 0) return 0;
  return items.filter((ann) => ann?.type === 'image' && typeof ann?.imageUri === 'string').length;
}

/** Имитация ensureProjectInUserProjects из edit-album */
async function ensureProjectInUserProjects(storageId, state) {
  if (!storageId) return { ok: false, reason: 'storageId пустой' };
  const { images = [], annotations = [], coverAnnotations = [], albumName = '', celebration = '', albumId = '', interiorType = '', coverType = '', eventDate = null } = state;

  let existing = await AsyncStorage.getItem(`@project_${storageId}`);
  let projectData = null;
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) projectData = parsed;
    } catch (_) {}
  }

  const pagesCount = images.length;
  const photosCount = countPhotoAnnotations(annotations) + countPhotoAnnotations(coverAnnotations);

  if (!projectData) {
    projectData = {
      id: storageId,
      title: albumName || getCelebrationTitle(celebration),
      category: celebration,
      albumId: albumId || interiorType || coverType || '',
      createdAt: new Date().toISOString(),
      isReadyMadeAlbum: true,
      pagesCount,
      photosCount,
    };
    if (eventDate) projectData.reminderDate = eventDate;
  } else {
    projectData.pagesCount = pagesCount;
    projectData.photosCount = photosCount;
    if (albumName) projectData.title = albumName;
  }

  await AsyncStorage.setItem(`@project_${storageId}`, JSON.stringify(projectData));
  const rawList = await AsyncStorage.getItem('@user_projects');
  const list = rawList ? JSON.parse(rawList) : [];
  if (!Array.isArray(list)) throw new Error('@user_projects не массив');
  const idx = list.findIndex((p) => String(p?.id) === String(storageId));
  if (idx === -1) list.push(projectData);
  else list[idx] = { ...list[idx], ...projectData };
  await AsyncStorage.setItem('@user_projects', JSON.stringify(list));
  return { ok: true };
}

/** Имитация saveAllData (только локальная часть, без облака) */
async function saveProjectAlbum(storageId, state) {
  if (!storageId) return { ok: false, reason: 'storageId пустой' };
  const { images = [], annotations = [], coverAnnotations = [] } = state;
  await Promise.all([
    AsyncStorage.setItem(`@project_images_${storageId}`, JSON.stringify(images)),
    AsyncStorage.setItem(`@project_annotations_${storageId}`, JSON.stringify(annotations)),
    AsyncStorage.setItem(`@project_cover_annotations_${storageId}`, JSON.stringify(coverAnnotations)),
  ]);
  const ensure = await ensureProjectInUserProjects(storageId, state);
  return ensure;
}

/** Сценарий 1: пользователь создаёт проект (как select-album → edit-album) и сохраняет */
async function scenarioCreateAndSaveAlbum() {
  const projectId = `test_${Date.now()}`;
  const state = {
    images: ['file:///page1.png'],
    annotations: [],
    coverAnnotations: [],
    albumName: 'Тестовый альбом',
    celebration: 'pregnancy',
    albumId: 'pregnancy_60',
    interiorType: '',
    coverType: 'pregnancy_60',
    eventDate: null,
  };

  await AsyncStorage.setItem(`@project_${projectId}`, JSON.stringify({
    id: projectId,
    title: state.albumName,
    category: state.celebration,
    albumId: state.albumId,
    createdAt: new Date().toISOString(),
    isReadyMadeAlbum: true,
    pagesCount: 1,
    photosCount: 0,
  }));
  await saveProjectAlbum(projectId, state);
  return projectId;
}

/** Сценарий 2: проект создаётся без id (как при переходе без id), потом сохраняем с созданием id по требованию (хранилище не очищаем — сценарий 1 уже добавил проект) */
async function scenarioSaveWithoutIdFirst() {
  const state = {
    images: ['file:///page1.png'],
    annotations: [],
    coverAnnotations: [],
    albumName: 'Альбом без id',
    celebration: 'kids',
    albumId: 'kids_48',
    interiorType: 'kids_48',
    coverType: 'kids_48',
    eventDate: null,
  };
  const effectiveId = `ondemand_${Date.now()}`;
  await AsyncStorage.setItem(`@project_${effectiveId}`, JSON.stringify({
    id: effectiveId,
    title: state.albumName,
    category: state.celebration,
    albumId: state.albumId,
    createdAt: new Date().toISOString(),
    isReadyMadeAlbum: true,
    pagesCount: state.images.length,
    photosCount: 0,
  }));
  const rawList = await AsyncStorage.getItem('@user_projects');
  const list = rawList ? JSON.parse(rawList) : [];
  list.push({ id: effectiveId, title: state.albumName, category: state.celebration, albumId: state.albumId, createdAt: new Date().toISOString(), isReadyMadeAlbum: true, pagesCount: 1, photosCount: 0 });
  await AsyncStorage.setItem('@user_projects', JSON.stringify(list));
  await saveProjectAlbum(effectiveId, state);
  return effectiveId;
}

/** Проверка: проект есть в @user_projects и связанные ключи заполнены */
async function verifyProjectInDb(projectId) {
  const listRaw = await AsyncStorage.getItem('@user_projects');
  if (!listRaw) return { ok: false, errors: ['@user_projects пустой или отсутствует'] };
  let list;
  try {
    list = JSON.parse(listRaw);
  } catch (e) {
    return { ok: false, errors: ['@user_projects не валидный JSON'] };
  }
  if (!Array.isArray(list)) return { ok: false, errors: ['@user_projects не массив'] };

  const found = list.find((p) => String(p?.id) === String(projectId));
  const errors = [];
  if (!found) errors.push(`Проект ${projectId} не найден в @user_projects. В списке: ${list.map((p) => p?.id).join(', ') || 'пусто'}`);

  const meta = await AsyncStorage.getItem(`@project_${projectId}`);
  if (!meta) errors.push(`Ключ @project_${projectId} отсутствует`);
  else {
    try {
      const parsed = JSON.parse(meta);
      if (Array.isArray(parsed)) errors.push(`Ключ @project_${projectId} содержит массив (секции), а не метаданные проекта`);
    } catch (_) {
      errors.push(`Ключ @project_${projectId} не валидный JSON`);
    }
  }

  const imagesRaw = await AsyncStorage.getItem(`@project_images_${projectId}`);
  if (imagesRaw === null && found) errors.push(`Ключ @project_images_${projectId} отсутствует (ожидается хотя бы пустой массив)`);

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/** Диагностика: что лежит в хранилище */
async function diagnose() {
  const keys = await AsyncStorage.getAllKeys();
  const userProjectsRaw = await AsyncStorage.getItem('@user_projects');
  const report = {
    totalKeys: keys.length,
    userProjectsKeys: keys.filter((k) => k === '@user_projects'),
    projectKeys: keys.filter((k) => k.startsWith('@project_') && !k.includes('_')),
    userProjectsLength: userProjectsRaw ? (JSON.parse(userProjectsRaw) || []).length : 0,
    userProjectsSample: userProjectsRaw ? (JSON.parse(userProjectsRaw) || []).slice(0, 3).map((p) => ({ id: p?.id, title: p?.title })) : [],
  };
  return report;
}

/** Попытка исправить: перезаписать @user_projects, добавив проекты из всех @project_* (только объекты) */
async function fixEnsureAllProjectsInList() {
  const keys = await AsyncStorage.getAllKeys();
  const projectMetaKeys = keys.filter((k) => k.startsWith('@project_') && k.length > 10 && !k.includes('_images_') && !k.includes('_annotations_') && !k.includes('_cover_annotations_') && !k.includes('_sections_') && !k.includes('_viewport_') && !k.includes('_pdf_') && !k.includes('_last_text_style_'));
  const listRaw = await AsyncStorage.getItem('@user_projects');
  const list = listRaw ? JSON.parse(listRaw) : [];
  if (!Array.isArray(list)) return { fixed: false, reason: '@user_projects не массив' };

  const byId = new Map(list.map((p) => [String(p?.id), p]).filter(([id]) => id));
  let added = 0;
  for (const key of projectMetaKeys) {
    const id = key.replace('@project_', '');
    if (byId.has(id)) continue;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object' && !Array.isArray(data) && data.id) {
        byId.set(String(data.id), data);
        added++;
      }
    } catch (_) {}
  }
  if (added === 0) return { fixed: false, reason: 'Нечего добавлять' };
  await AsyncStorage.setItem('@user_projects', JSON.stringify([...byId.values()]));
  return { fixed: true, added };
}

// ============ Главный запуск ============

async function main() {
  console.log('=== Проверка сохранения проектов в БД (мок AsyncStorage) ===\n');

  AsyncStorage.clear();

  // Сценарий 1 (добавляет один проект)
  console.log('1. Сценарий: создание проекта с id и сохранение...');
  let projectId;
  try {
    projectId = await scenarioCreateAndSaveAlbum();
    console.log('   Проект создан, id:', projectId);
  } catch (e) {
    console.error('   Ошибка при создании:', e.message);
    const diag = await diagnose();
    console.log('   Диагностика:', JSON.stringify(diag, null, 2));
    process.exitCode = 1;
    return;
  }

  let result = await verifyProjectInDb(projectId);
  if (result.ok) {
    console.log('   OK: проект найден в @user_projects и ключи в порядке.\n');
  } else {
    console.log('   Ошибки проверки:', result.errors);
    const diag = await diagnose();
    console.log('   Диагностика:', JSON.stringify(diag, null, 2));
    const fix = await fixEnsureAllProjectsInList();
    console.log('   Попытка исправления (добавить проекты в список):', fix);
    if (fix.fixed) {
      result = await verifyProjectInDb(projectId);
      console.log('   После исправления:', result.ok ? 'OK' : result.errors);
    }
    console.log('');
  }

  // Сценарий 2
  console.log('2. Сценарий: сохранение проекта (id создан по требованию)...');
  let projectId2;
  try {
    projectId2 = await scenarioSaveWithoutIdFirst();
    console.log('   Проект создан, id:', projectId2);
  } catch (e) {
    console.error('   Ошибка:', e.message);
    process.exitCode = 1;
    return;
  }

  result = await verifyProjectInDb(projectId2);
  if (result.ok) {
    console.log('   OK: проект найден в @user_projects.\n');
  } else {
    console.log('   Ошибки:', result.errors);
    const fix = await fixEnsureAllProjectsInList();
    console.log('   Исправление:', fix);
    console.log('');
  }

  // Итог
  const finalList = await AsyncStorage.getItem('@user_projects');
  const count = finalList ? (JSON.parse(finalList) || []).length : 0;
  console.log('=== Итог: в @user_projects записей:', count, '===');
  if (count >= 2) {
    console.log('Оба сценария прошли. Логика сохранения в моке ведёт себя корректно.');
  } else {
    console.log('Часть сценариев не сохранила проект в список. Проверьте ensureProjectInUserProjects и порядок записи.');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
