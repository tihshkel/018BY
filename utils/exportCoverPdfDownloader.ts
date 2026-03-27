import * as FileSystem from 'expo-file-system/legacy';

const GITHUB_REPO_BASE =
  'https://raw.githubusercontent.com/tihshkel/018BY/5437a89c83e07ab0f8b3c5dfecd679f2cda85f94';

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

