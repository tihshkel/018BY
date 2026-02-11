import AsyncStorage from '@react-native-async-storage/async-storage';

const PROJECT_PREFIX = '@project_';
const USER_PROJECTS_KEY = '@user_projects';

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

/**
 * Исправляет отсутствующие проекты в списке пользовательских проектов
 */
export async function fixMissingProjectsInList(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const projectKeys = allKeys.filter(key => key.startsWith(PROJECT_PREFIX) && !key.includes('_'));
    const projectIds = projectKeys.map(key => key.replace(PROJECT_PREFIX, ''));
    
    const userProjectsRaw = await AsyncStorage.getItem(USER_PROJECTS_KEY);
    let userProjects: string[] = [];
    
    if (userProjectsRaw) {
      try {
        userProjects = JSON.parse(userProjectsRaw);
        if (!Array.isArray(userProjects)) userProjects = [];
      } catch {
        userProjects = [];
      }
    }
    
    const existingIds = new Set(userProjects);
    const missingProjects = projectIds.filter(id => !existingIds.has(id));
    
    if (missingProjects.length > 0) {
      const updatedList = [...userProjects, ...missingProjects];
      await AsyncStorage.setItem(USER_PROJECTS_KEY, JSON.stringify(updatedList));
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
    orphanedProjects: [] as string[]
  };
  
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const projectKeys = allKeys.filter(key => key.startsWith(PROJECT_PREFIX) && !key.includes('_'));
    const projectIds = projectKeys.map(key => key.replace(PROJECT_PREFIX, ''));
    
    report.totalProjects = projectIds.length;
    
    for (const projectId of projectIds) {
      const isValid = await verifyProjectInStorage(projectId);
      if (isValid) {
        report.validProjects++;
      } else {
        report.invalidProjects.push(projectId);
      }
    }
    
    const userProjectsRaw = await AsyncStorage.getItem(USER_PROJECTS_KEY);
    if (userProjectsRaw) {
      try {
        const userProjects = JSON.parse(userProjectsRaw);
        if (Array.isArray(userProjects)) {
          const projectSet = new Set(projectIds);
          report.orphanedProjects = userProjects.filter(id => !projectSet.has(id));
        }
      } catch {
        // ignore parsing errors
      }
    }
  } catch (error) {
    console.error('Error running verify report:', error);
  }
  
  return report;
}