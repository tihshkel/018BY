import { router, type Href } from 'expo-router';

import type { PageValues } from '@/types/album-page-schema';
import { yieldToNextPaint } from '@/utils/yieldToUi';

export type FinalPagePreviewParams = {
  id?: string;
  instanceId: string;
  celebration?: string;
  coverType?: string;
  interiorType?: string;
};

/**
 * Плавный путь «Просмотр страницы»:
 * 1) кадр под спиннер
 * 2) commit значений (+ persist в фоне)
 * 3) ещё кадр
 * 4) переход на preview
 */
export async function openFinalPagePreview(options: {
  params: FinalPagePreviewParams;
  /** Синхронный flush черновиков редактора перед чтением values. */
  prepare?: () => void;
  getValues: () => PageValues;
  /**
   * Сохранение. Для отзывчивости передавайте awaitPersist: false
   * (память + snapshot сразу, диск в фоне).
   */
  save: (values: PageValues) => Promise<unknown>;
}): Promise<void> {
  await yieldToNextPaint();
  options.prepare?.();
  const values = options.getValues();
  await options.save(values);
  await yieldToNextPaint();
  router.push({
    pathname: '/album-page-preview',
    params: {
      id: options.params.id,
      instanceId: options.params.instanceId,
      celebration: options.params.celebration,
      coverType: options.params.coverType,
      interiorType: options.params.interiorType,
      mode: 'final',
    },
  } as unknown as Href);
}
