import type { UserProject } from '@/utils/userProjects';
import type { AlbumFlowParams } from '@/utils/albumNavigation';

export function buildAlbumFlowParamsFromProject(project: UserProject): AlbumFlowParams {
  return {
    id: project.id,
    celebration: project.category,
    coverType: project.coverType ?? undefined,
    interiorType: project.albumId ?? project.interiorType ?? undefined,
  };
}
