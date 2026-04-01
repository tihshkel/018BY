import * as FileSystem from 'expo-file-system/legacy';

import { GITHUB_RAW_MAIN_BASE } from '@/utils/githubRawAssets';

const GITHUB_REPO_BASE = GITHUB_RAW_MAIN_BASE;

function sanitizeFileName(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
}

export async function downloadExportCoverPdfToCache(fileName: string): Promise<string | null> {
  if (!fileName) return null;

  // `fileName` приходит как "DFA61_твердый переплет.pdf"
  const safeName = sanitizeFileName(fileName);
  const cacheDir = `${FileSystem.cacheDirectory}export_cover_pdfs/`;

  try {
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    }

    const localPath = `${cacheDir}${safeName}`;
    const existing = await FileSystem.getInfoAsync(localPath);
    if (existing.exists) {
      return localPath;
    }

    const remoteUrl = `${GITHUB_REPO_BASE}/${encodeURI(`albums/export/${fileName}`)}`;
    const result = await FileSystem.downloadAsync(remoteUrl, localPath);
    if (result.status === 200) {
      return localPath;
    }

    // если 404/403 и т.п. — удаляем пустой файл, чтобы не мешал повторным попыткам
    await FileSystem.deleteAsync(localPath, { idempotent: true });
    return null;
  } catch (error) {
    return null;
  }
}

