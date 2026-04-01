/** Публичные файлы из репозитория (main) для загрузки без упаковки в AAB. */
export const GITHUB_RAW_MAIN_BASE = 'https://raw.githubusercontent.com/tihshkel/018BY/main';

export function githubRawFileUrl(relativePathFromRepoRoot: string): string {
  const trimmed = relativePathFromRepoRoot.replace(/^\/+/, '');
  const segments = trimmed.split('/').filter(Boolean);
  return `${GITHUB_RAW_MAIN_BASE}/${segments.map(encodeURIComponent).join('/')}`;
}
