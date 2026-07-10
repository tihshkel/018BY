import AsyncStorage from '@react-native-async-storage/async-storage';

const PROJECT_PREFIX = '@project_';
const USER_PROJECTS_KEY = '@user_projects';

const PROJECT_KEY_SUBPREFIXES = [
  'images_',
  'annotations_',
  'cover_annotations_',
  'pdf_',
  'viewport_',
  'cover_viewport_',
  'last_text_style_',
  'sections_',
  'page_instances_',
  'page_values_',
  'schema_version_',
  'form_migration_',
  'pv_',
];

function isProjectMetaKey(key: string): boolean {
  if (!key.startsWith(PROJECT_PREFIX)) return false;
  const rest = key.slice(PROJECT_PREFIX.length);
  return !PROJECT_KEY_SUBPREFIXES.some((sub) => rest.startsWith(sub));
}

function projectIdFromMetaKey(key: string): string {
  return key.slice(PROJECT_PREFIX.length);
}

function parseUserProjects(raw: string | null): Array<Record<string, unknown>> {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry && typeof entry === 'object') as Array<
      Record<string, unknown>
    >;
  } catch {
    return [];
  }
}

/**
 * Исправляет отсутствующие проекты в списке пользовательских проектов
 */
export async function fixMissingProjectsInList(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const projectKeys = allKeys.filter(isProjectMetaKey);
    const projectIds = projectKeys.map(projectIdFromMetaKey);

    const userProjects = parseUserProjects(await AsyncStorage.getItem(USER_PROJECTS_KEY));
    const byId = new Map<string, Record<string, unknown>>();
    for (const entry of userProjects) {
      const id = entry.id != null ? String(entry.id) : '';
      if (id) byId.set(id, entry);
    }

    let changed = false;
    for (const projectId of projectIds) {
      if (byId.has(projectId)) continue;
      const projectRaw = await AsyncStorage.getItem(`${PROJECT_PREFIX}${projectId}`);
      if (!projectRaw) continue;
      try {
        const parsed = JSON.parse(projectRaw) as Record<string, unknown>;
        if (parsed && typeof parsed === 'object') {
          byId.set(projectId, parsed);
          changed = true;
        }
      } catch {
        // ignore corrupt project meta
      }
    }

    if (changed) {
      await AsyncStorage.setItem(USER_PROJECTS_KEY, JSON.stringify(Array.from(byId.values())));
    }
  } catch (error) {
    console.error('Error fixing missing projects:', error);
  }
}

/**
 * Запускает полную проверку всех проектов и возвращает отчет
 */
export async function runFullVerifyReport(): Promise<{
  totalProjects: number;
  validProjects: number;
  invalidProjects: string[];
  orphanedProjects: string[];
}> {
  const report = {
    totalProjects: 0,
    validProjects: 0,
    invalidProjects: [] as string[],
    orphanedProjects: [] as string[],
  };

  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const projectKeys = allKeys.filter(isProjectMetaKey);
    const projectIds = projectKeys.map(projectIdFromMetaKey);

    report.totalProjects = projectIds.length;

    for (const projectId of projectIds) {
      const isValid = await verifyProjectInStorage(projectId);
      if (isValid) {
        report.validProjects++;
      } else {
        report.invalidProjects.push(projectId);
      }
    }

    const userProjects = parseUserProjects(await AsyncStorage.getItem(USER_PROJECTS_KEY));
    const projectSet = new Set(projectIds);
    report.orphanedProjects = userProjects
      .map((entry) => (entry.id != null ? String(entry.id) : ''))
      .filter((id) => id && !projectSet.has(id));
  } catch (error) {
    console.error('Error running verify report:', error);
  }

  return report;
}

/**
 * Проверяет целостность проекта в хранилище
 */
export async function verifyProjectInStorage(projectId: string): Promise<boolean> {
  if (!projectId) return false;

  try {
    const projectKey = `${PROJECT_PREFIX}${projectId}`;
    const projectData = await AsyncStorage.getItem(projectKey);

    if (!projectData) return false;

    const parsed = JSON.parse(projectData);
    return !!parsed && typeof parsed === 'object';
  } catch (error) {
    console.error(`Error verifying project ${projectId}:`, error);
    return false;
  }
}
