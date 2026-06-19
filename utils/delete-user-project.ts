import { pushCoreOnlyToCloud } from '@/utils/account-sync';
import { getAccountSyncId } from '@/utils/account-identity';
import { markProjectAsDeleted, unmarkProjectAsDeleted } from '@/utils/deleted-project-ids';
import { removeRemindersAndScheduledNotificationsForProject } from '@/utils/project-reminders-cleanup';
import { deleteProjectInSupabase, isSupabaseConfigured } from '@/utils/supabase-account';
import type { UserProject } from '@/utils/userProjects';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROJECT_STORAGE_KEYS = (projectId: string) => [
  `@project_${projectId}`,
  `@project_images_${projectId}`,
  `@project_page_instances_${projectId}`,
  `@project_page_values_${projectId}`,
  `@project_annotations_${projectId}`,
  `@project_cover_annotations_${projectId}`,
  `@project_viewport_${projectId}`,
  `@project_cover_viewport_${projectId}`,
  `@project_viewport_migrated_${projectId}`,
  `@project_pdf_${projectId}`,
  `@project_last_text_style_${projectId}`,
  `@project_user_committed_${projectId}`,
  `@project_sections_${projectId}`,
  `@tutorial_shown_${projectId}`,
];

/** Удаляет проект локально и обновляет облако; pull не восстанавливает удалённые id. */
export async function deleteUserProjectLocally(project: UserProject): Promise<void> {
  const projectId = String(project.id);
  await markProjectAsDeleted(projectId);

  try {
    await removeRemindersAndScheduledNotificationsForProject(projectId, {
      category: project.category,
      reminderDate: project.reminderDate ?? null,
    });
  } catch (error) {
    console.warn('[deleteUserProject] reminders cleanup failed:', error);
  }

  await AsyncStorage.multiRemove(PROJECT_STORAGE_KEYS(projectId));

  const existingProjects = await AsyncStorage.getItem('@user_projects');
  let updatedJson = '[]';
  if (existingProjects) {
    const projectsList = JSON.parse(existingProjects) as Array<{ id?: string }>;
    const updatedProjects = projectsList.filter((p) => String(p?.id) !== projectId);
    updatedJson = JSON.stringify(updatedProjects);
    await AsyncStorage.setItem('@user_projects', updatedJson);
  }

  try {
    const syncId = await getAccountSyncId();
    if (syncId && isSupabaseConfigured()) {
      const delRes = await deleteProjectInSupabase({
        accessCode: syncId,
        projectId,
        updatedUserProjectsJson: updatedJson,
      });
      if (delRes.success) {
        await unmarkProjectAsDeleted(projectId);
      } else {
        console.warn('[deleteUserProject] Supabase delete failed:', delRes.error);
        await pushCoreOnlyToCloud({ userProjectsAuthoritativeLocal: true });
      }
    }
  } catch (error) {
    console.warn('[deleteUserProject] cloud delete exception:', error);
    await pushCoreOnlyToCloud({ userProjectsAuthoritativeLocal: true }).catch(() => {});
  }
}
