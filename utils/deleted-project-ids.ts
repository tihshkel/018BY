import AsyncStorage from '@react-native-async-storage/async-storage';

const DELETED_PROJECT_IDS_KEY = '@deleted_project_ids';

function parseIdList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((id) => String(id)).filter(Boolean);
  } catch {
    return [];
  }
}

export async function loadDeletedProjectIds(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(DELETED_PROJECT_IDS_KEY);
  return new Set(parseIdList(raw));
}

/** Помечает проект удалённым — pull из облака не восстановит его в списке. */
export async function markProjectAsDeleted(projectId: string): Promise<void> {
  const id = String(projectId);
  if (!id) return;
  const ids = await loadDeletedProjectIds();
  ids.add(id);
  await AsyncStorage.setItem(DELETED_PROJECT_IDS_KEY, JSON.stringify([...ids]));
}

export async function unmarkProjectAsDeleted(projectId: string): Promise<void> {
  const id = String(projectId);
  const ids = await loadDeletedProjectIds();
  if (!ids.delete(id)) return;
  await AsyncStorage.setItem(DELETED_PROJECT_IDS_KEY, JSON.stringify([...ids]));
}

export function filterProjectsByDeleted<T extends { id?: string }>(
  projects: T[],
  deletedIds: Set<string>
): T[] {
  if (deletedIds.size === 0) return projects;
  return projects.filter((p) => {
    const id = p?.id != null ? String(p.id) : '';
    return id && !deletedIds.has(id);
  });
}

export function isProjectDeleted(projectId: string, deletedIds: Set<string>): boolean {
  return deletedIds.has(String(projectId));
}
