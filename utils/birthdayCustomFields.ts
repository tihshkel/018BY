import type {
  AlbumPageSchema,
  BirthdayCustomFieldDef,
  BirthdayCustomFieldValue,
  PageValues,
} from '@/types/album-page-schema';
import { createId } from '@/utils/id';

export function buildDefaultCustomFields(
  defs: BirthdayCustomFieldDef[] | undefined,
): BirthdayCustomFieldValue[] {
  if (!defs?.length) return [];
  return defs.map((def) => ({
    id: def.id,
    label: def.defaultLabel,
    value: '',
    fieldType: def.fieldType,
  }));
}

export function resolveCustomFields(
  schema: AlbumPageSchema,
  pageValues: PageValues,
): BirthdayCustomFieldValue[] {
  const existing = pageValues.customFields;
  if (existing?.length) {
    return syncCustomFieldsWithDefs(existing, schema.customFieldDefs);
  }
  return buildDefaultCustomFields(schema.customFieldDefs);
}

function syncCustomFieldsWithDefs(
  existing: BirthdayCustomFieldValue[],
  defs: BirthdayCustomFieldDef[] | undefined,
): BirthdayCustomFieldValue[] {
  if (!defs?.length) return existing;

  const defById = new Map(defs.map((def) => [def.id, def]));
  const synced = existing
    .filter((field) => defById.has(field.id))
    .map((field) => {
      const def = defById.get(field.id)!;
      return {
        ...field,
        fieldType: field.fieldType ?? def.fieldType,
      };
    });

  for (const def of defs) {
    if (!synced.some((field) => field.id === def.id)) {
      synced.push({
        id: def.id,
        label: def.defaultLabel,
        value: '',
        fieldType: def.fieldType,
      });
    }
  }

  return synced;
}

export function createCustomField(
  fieldType: BirthdayCustomFieldValue['fieldType'] = 'short_text',
): BirthdayCustomFieldValue {
  return {
    id: createId('cf'),
    label: '',
    value: '',
    fieldType,
  };
}

export function clampCustomFieldLabel(label: string, maxLength = 40): string {
  return label.slice(0, maxLength);
}

export function clampCustomFieldValue(
  value: string,
  fieldType: BirthdayCustomFieldValue['fieldType'],
): string {
  const maxLength = fieldType === 'long_text' ? 300 : 120;
  return value.slice(0, maxLength);
}
