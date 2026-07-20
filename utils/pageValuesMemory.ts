import type { PageValues } from '@/types/album-page-schema';

/**
 * Лёгкая копия PageValues для списка страниц: без URI фото / freeElements.
 * status и короткий subtitle сохраняются для прогресса и подписей.
 */
export function toListPageValuesStub(values: PageValues): PageValues {
  const firstField = Object.entries(values.fields ?? {}).find(([, val]) =>
    typeof val === 'string' && val.trim().length > 0,
  );
  const fields = firstField
    ? { [firstField[0]]: firstField[1].trim().slice(0, 80) }
    : {};

  const caption = values.caption?.trim();
  const firstPhotoCaption = values.photoCaptions
    ?.map((item) => item?.trim())
    .find((item): item is string => Boolean(item));
  const hadPhotos = Object.values(values.photoBlocks ?? {}).some((block) =>
    (block.slots ?? []).some((slot) => typeof slot === 'string' && slot.trim().length > 0),
  );
  const hadFree = (values.freeElements ?? []).some(
    (el) => typeof el.content === 'string' && el.content.trim().length > 0,
  );
  const hasContent =
    Boolean(firstField) || Boolean(caption) || Boolean(firstPhotoCaption) || hadPhotos || hadFree;

  let status = values.status;
  // Старый status:empty при живом контенте — иначе прогресс списка врёт после slim.
  if (hasContent && (status === 'empty' || !status)) {
    status = values.draftSavedAt ? 'draft' : 'continue';
  }

  return {
    fields,
    photoBlocks: {},
    caption: caption ? caption.slice(0, 80) : undefined,
    photoCaptions: firstPhotoCaption ? [firstPhotoCaption.slice(0, 80)] : undefined,
    status,
    updatedAt: values.updatedAt,
    draftSavedAt: values.draftSavedAt,
    excludedFromExport: values.excludedFromExport,
  };
}

export function isPageValuesListStub(values: PageValues | null | undefined): boolean {
  if (!values) return false;
  const hasPhotos = Object.values(values.photoBlocks ?? {}).some((block) =>
    (block.slots ?? []).some((slot) => typeof slot === 'string' && slot.trim().length > 0),
  );
  const hasFree = (values.freeElements ?? []).some(
    (el) => typeof el.content === 'string' && el.content.trim().length > 0,
  );
  return !hasPhotos && !hasFree;
}

export function toListPageValuesMap(
  full: Record<string, PageValues>,
): Record<string, PageValues> {
  const out: Record<string, PageValues> = {};
  for (const [id, values] of Object.entries(full)) {
    out[id] = toListPageValuesStub(values);
  }
  return out;
}

/**
 * Что отдаём в React state:
 * - list (без activeInstanceId) → stubs всех страниц
 * - form/preview (с activeInstanceId) → полная активная + stubs остальных
 * previous — переиспользуем stubs, если страница не менялась (меньше GC/jank).
 */
export function projectUiPageValuesMap(
  full: Record<string, PageValues>,
  activeInstanceId?: string | null,
  previous?: Record<string, PageValues> | null,
): Record<string, PageValues> {
  if (!activeInstanceId) {
    if (!previous) return toListPageValuesMap(full);
    const out: Record<string, PageValues> = {};
    for (const [id, values] of Object.entries(full)) {
      const prev = previous[id];
      if (
        prev &&
        isPageValuesListStub(prev) &&
        prev.updatedAt === values.updatedAt &&
        prev.status === values.status
      ) {
        out[id] = prev;
      } else {
        out[id] = toListPageValuesStub(values);
      }
    }
    return out;
  }

  const out: Record<string, PageValues> = {};
  for (const [id, values] of Object.entries(full)) {
    if (id === activeInstanceId) {
      out[id] = values;
      continue;
    }
    const prev = previous?.[id];
    if (
      prev &&
      isPageValuesListStub(prev) &&
      prev.updatedAt === values.updatedAt &&
      prev.status === values.status
    ) {
      out[id] = prev;
    } else {
      out[id] = toListPageValuesStub(values);
    }
  }
  if (!out[activeInstanceId] && full[activeInstanceId]) {
    out[activeInstanceId] = full[activeInstanceId];
  }
  return out;
}
