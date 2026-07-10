import type { Annotation } from '@/components/pdf-annotations';
import { createId, ensureUniqueIds } from '@/utils/id';
import {
  getLineSlotsForPage,
  isPregnancyWeeklyStructuredPage,
  resolveWeeklyFieldLineSlots,
} from '@/utils/textLineSlots';

const DEFAULT_VIEWPORT = { width: 390, height: 844 };

function inferLineGuideIdForPage(page: number): string | undefined {
  if (isPregnancyWeeklyStructuredPage('pregnancy_60', page)) return 'pregnancy_60';
  if (isPregnancyWeeklyStructuredPage('pregnancy_a5', page)) return 'pregnancy_a5';
  return undefined;
}

function resolveSplitTemplateSlotIndex(
  ann: Annotation,
  lineOffset: number,
  lineCount: number,
): number {
  const start = ann.templateLineStart ?? 0;
  const page = typeof ann.page === 'number' ? ann.page : Number(ann.page);
  const lineGuideId = Number.isFinite(page) ? inferLineGuideIdForPage(page) : undefined;
  if (!lineGuideId) {
    return start + lineOffset;
  }

  const slots = getLineSlotsForPage({
    lineGuideId,
    page,
    viewportWidth: DEFAULT_VIEWPORT.width,
    viewportHeight: DEFAULT_VIEWPORT.height,
  });
  if (!slots.length) {
    return start + lineOffset;
  }

  const fieldSlots = resolveWeeklyFieldLineSlots(
    slots,
    start,
    lineCount,
    lineGuideId,
  );
  return fieldSlots[lineOffset]?.index ?? start + lineOffset;
}

/**
 * Разбивает старые multi-line template-аннотации на одну аннотацию на слот.
 */
export function migrateTemplateLineAnnotations(annotations: Annotation[]): Annotation[] {
  const result: Annotation[] = [];

  for (const ann of annotations) {
    if (
      ann.type !== 'text' ||
      typeof ann.templateLineStart !== 'number' ||
      (ann.templateLineCount ?? 1) <= 1
    ) {
      result.push(ann);
      continue;
    }

    const lines = (ann.content || '').split('\n');
    const count = ann.templateLineCount ?? lines.length;

    for (let i = 0; i < count; i += 1) {
      const line = lines[i] ?? '';
      const slotIndex = resolveSplitTemplateSlotIndex(ann, i, count);
      result.push({
        ...ann,
        id: i === 0 ? ann.id : createId('ann'),
        content: line,
        templateLineStart: slotIndex,
        templateLineCount: 1,
        height: ann.height,
      });
    }
  }

  return result;
}

export function normalizeProjectAnnotations(parsed: Annotation[]): {
  items: Annotation[];
  changed: boolean;
} {
  const { items: unique, changed: idsChanged } = ensureUniqueIds(parsed, 'ann');
  const migrated = migrateTemplateLineAnnotations(unique);
  const migrationChanged =
    migrated.length !== unique.length ||
    migrated.some(
      (ann, index) =>
        (unique[index]?.templateLineCount ?? 1) !== (ann.templateLineCount ?? 1) ||
        unique[index]?.id !== ann.id ||
        unique[index]?.templateLineStart !== ann.templateLineStart
    );
  return { items: migrated, changed: idsChanged || migrationChanged };
}
