import type { PageInstance, PageValues } from '@/types/album-page-schema';
import { PAGE_SCHEMA_VERSION } from '@/types/album-page-schema';

export function getPageInstancesKey(projectId: string): string {
  return `@project_page_instances_${projectId}`;
}

export function getPageValuesKey(projectId: string): string {
  return `@project_page_values_${projectId}`;
}

export function getSchemaVersionKey(projectId: string): string {
  return `@project_schema_version_${projectId}`;
}

export function getFormMigrationKey(projectId: string): string {
  return `@project_form_migration_${projectId}`;
}

export async function loadPageInstances(
  getItem: (key: string) => Promise<string | null>,
  projectId: string
): Promise<PageInstance[]> {
  const raw = await getItem(getPageInstancesKey(projectId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function savePageInstances(
  setItem: (key: string, value: string) => Promise<void>,
  projectId: string,
  instances: PageInstance[]
): Promise<void> {
  await setItem(getPageInstancesKey(projectId), JSON.stringify(instances));
  await setItem(getSchemaVersionKey(projectId), PAGE_SCHEMA_VERSION);
}

export async function loadPageValuesMap(
  getItem: (key: string) => Promise<string | null>,
  projectId: string
): Promise<Record<string, PageValues>> {
  const raw = await getItem(getPageValuesKey(projectId));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function savePageValuesMap(
  setItem: (key: string, value: string) => Promise<void>,
  projectId: string,
  values: Record<string, PageValues>
): Promise<void> {
  await setItem(getPageValuesKey(projectId), JSON.stringify(values));
}

export function getPageValueEntryKey(projectId: string, instanceId: string): string {
  return `@project_pv_${projectId}_${instanceId}`;
}

export async function savePageValueEntry(
  setItem: (key: string, value: string) => Promise<void>,
  projectId: string,
  instanceId: string,
  values: PageValues,
): Promise<void> {
  await setItem(getPageValueEntryKey(projectId, instanceId), JSON.stringify(values));
}

/** Merges per-page entries over the monolithic map (newer updatedAt wins). */
export async function loadPageValuesMapMerged(
  getItem: (key: string) => Promise<string | null>,
  projectId: string,
  instanceIds: string[],
): Promise<Record<string, PageValues>> {
  const base = await loadPageValuesMap(getItem, projectId);
  if (instanceIds.length === 0) return base;

  const merged = { ...base };
  await Promise.all(
    instanceIds.map(async (instanceId) => {
      const raw = await getItem(getPageValueEntryKey(projectId, instanceId));
      if (!raw) return;
      try {
        const entry = JSON.parse(raw) as PageValues;
        const existing = merged[instanceId];
        if (
          !existing ||
          !existing.updatedAt ||
          (entry.updatedAt && entry.updatedAt >= existing.updatedAt)
        ) {
          merged[instanceId] = entry;
        }
      } catch {
        // ignore corrupt entry
      }
    }),
  );
  return merged;
}

export function createEmptyPageValues(): PageValues {
  return {
    fields: {},
    photoBlocks: {},
    status: 'empty',
    updatedAt: new Date().toISOString(),
  };
}
