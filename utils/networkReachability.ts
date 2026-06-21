/**
 * Лёгкая «пауза сети» без NetInfo: после сбоя не дёргаем облако/GitHub N секунд.
 * Убирает спам Network request failed / AuthRetryableFetchError в Metro.
 */

const CLOUD_PAUSE_MS = 90_000;
const ALBUM_PAUSE_MS = 90_000;

let cloudSyncPausedUntil = 0;
let albumDownloadPausedUntil = 0;

export function isBenignNetworkError(error: unknown): boolean {
  if (!error) return false;
  const name = error instanceof Error ? error.name : '';
  const msg = error instanceof Error ? error.message : String(error);
  const combined = `${name} ${msg}`.toLowerCase();
  return (
    combined.includes('network request failed') ||
    combined.includes('authretryablefetcherror') ||
    combined.includes('fetch failed') ||
    combined.includes('auth_check_timeout') ||
    combined.includes('network error')
  );
}

export function reportNetworkFailure(scope: 'cloud' | 'album' | 'all' = 'all'): void {
  const until = Date.now() + (scope === 'album' ? ALBUM_PAUSE_MS : CLOUD_PAUSE_MS);
  if (scope === 'cloud' || scope === 'all') cloudSyncPausedUntil = until;
  if (scope === 'album' || scope === 'all') albumDownloadPausedUntil = until;
}

export function reportNetworkSuccess(scope: 'cloud' | 'album' | 'all' = 'all'): void {
  if (scope === 'cloud' || scope === 'all') cloudSyncPausedUntil = 0;
  if (scope === 'album' || scope === 'all') albumDownloadPausedUntil = 0;
}

export function canAttemptCloudSync(): boolean {
  return Date.now() >= cloudSyncPausedUntil;
}

export function canAttemptAlbumDownload(): boolean {
  return Date.now() >= albumDownloadPausedUntil;
}

let benignSilencerInstalled = false;

/** Не показывать красный ERROR в Metro при ожидаемом офлайне. */
export function installBenignNetworkErrorSilencer(): void {
  if (benignSilencerInstalled) return;
  benignSilencerInstalled = true;

  const g = global as {
    ErrorUtils?: {
      getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
      setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
    };
  };

  const errorUtils = g.ErrorUtils;
  if (errorUtils?.getGlobalHandler && errorUtils?.setGlobalHandler) {
    const previous = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, isFatal) => {
      if (isBenignNetworkError(error)) {
        reportNetworkFailure('all');
        return;
      }
      previous?.(error, isFatal);
    });
  }
}
