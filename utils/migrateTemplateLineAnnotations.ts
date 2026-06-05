import type { Annotation } from '@/components/pdf-annotations';
import { createId, ensureUniqueIds } from '@/utils/id';

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
      result.push({
        ...ann,
        id: i === 0 ? ann.id : createId('ann'),
        content: line,
        templateLineStart: ann.templateLineStart + i,
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
        unique[index]?.id !== ann.id
    );
  return { items: migrated, changed: idsChanged || migrationChanged };
}
