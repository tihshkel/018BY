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

/**
 * pregnancy_60 «Постановка на учёт»: слот 9 — мёртвый OCR-хвост телефона.
 * Там часто остаётся демо-фраза seed после старого templateLineCount: 2.
 */
export function stripPregnancyRegistrationPhoneTailAnnotations(
  annotations: Annotation[],
  lineGuideId?: string,
): Annotation[] {
  if (lineGuideId !== 'pregnancy_60') return annotations;
  return annotations.filter((ann) => {
    if (ann.type !== 'text') return true;
    if (Number(ann.page) !== 4) return true;
    if (ann.templateLineStart !== 9) return true;
    return false;
  });
}

export function normalizeProjectAnnotations(
  parsed: Annotation[],
  lineGuideId?: string,
): {
  items: Annotation[];
  changed: boolean;
} {
  const { items: unique, changed: idsChanged } = ensureUniqueIds(parsed, 'ann');
  const migrated = migrateTemplateLineAnnotations(unique);
  const stripped = stripPregnancyRegistrationPhoneTailAnnotations(migrated, lineGuideId);
  const migrationChanged = migrated.some(
    (ann, index) => ann.content !== unique[index]?.content,
  );
  const stripChanged = stripped.length !== migrated.length;
  return { items: stripped, changed: idsChanged || migrationChanged || stripChanged };
}
