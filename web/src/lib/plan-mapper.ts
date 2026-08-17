import { API_URL, resolveAvatarUrl } from './api';
import type { ApiPlan } from './plans-api';
import type { Plan } from '@/types/plan';

export function mapPlan(apiPlan: ApiPlan): Plan {
  return {
    id: apiPlan.id,
    projectId: apiPlan.project_id,
    name: apiPlan.name,
    discipline: apiPlan.discipline,
    fileUrl: `${API_URL}${apiPlan.file_url}`,
    fileType: apiPlan.file_type,
    version: apiPlan.version,
    uploadedAt: apiPlan.uploaded_at,
    uploadedBy: {
      id: apiPlan.uploader.id,
      name: `${apiPlan.uploader.first_name} ${apiPlan.uploader.last_name}`,
      avatarUrl: resolveAvatarUrl(apiPlan.uploader.avatar_url),
    },
  };
}
