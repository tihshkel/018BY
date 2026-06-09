import { Image } from 'react-native';

export type PageSourceSize = {
  width: number;
  height: number;
};

/** Печатный блок дневника 180×240 мм (все PNG `Блок *_180х240_print`). */
export const DIARY_BLOCK_PAGE_SIZE: PageSourceSize = {
  width: 2219,
  height: 2927,
};

const cache = new Map<string, PageSourceSize>();

export function getCachedPageSourceSize(uri: string): PageSourceSize | null {
  return cache.get(uri) ?? null;
}

export function setPageSourceSize(uri: string, size: PageSourceSize): void {
  if (size.width > 0 && size.height > 0) {
    cache.set(uri, size);
  }
}

export function resolvePageSourceSize(uri: string): Promise<PageSourceSize | null> {
  const cached = cache.get(uri);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => {
        const size = { width, height };
        setPageSourceSize(uri, size);
        resolve(size);
      },
      () => resolve(null)
    );
  });
}
