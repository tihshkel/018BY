import type { Annotation } from '@/components/pdf-annotations';
import { ensureUniqueIds } from '@/utils/id';

/**
 * Нормализует template-аннотации: не режем по `\n` на отдельные слоты.
 * Иначе одно слово «залипает» на строке (узкий хвост → переносы → join `\n`).
 * Перенос по ширине слотов делает distributeTextForTemplateAnnotation.
 */
export function migrateTemplateLineAnnotations(annotations: Annotation[]): Annotation[] {
  return annotations.map((ann) => {
    if (
      ann.type !== 'text' ||
      typeof ann.templateLineStart !== 'number' ||
      (ann.templateLineCount ?? 1) <= 1
    ) {
      return ann;
    }

    const content = (ann.content || '').replace(/\r?\n/g, ' ');
    if (content === (ann.content || '')) return ann;
    return { ...ann, content };
  });
}

export function normalizeProjectAnnotations(parsed: Annotation[]): {
  items: Annotation[];
  changed: boolean;
} {
  const { items: unique, changed: idsChanged } = ensureUniqueIds(parsed, 'ann');
  const migrated = migrateTemplateLineAnnotations(unique);
  const migrationChanged = migrated.some(
    (ann, index) => ann.content !== unique[index]?.content,
  );
  return { items: migrated, changed: idsChanged || migrationChanged };
}
