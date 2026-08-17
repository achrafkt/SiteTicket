import { apiFetch } from './api';

export type ApiPlan = {
  id: string;
  project_id: string;
  name: string;
  discipline: string | null;
  file_url: string;
  file_type: string | null;
  version: string | null;
  uploaded_at: string;
  uploader: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string | null;
  };
};

export function getProjectPlans(projectId: string) {
  return apiFetch<ApiPlan[]>(`/projects/${projectId}/plans`);
}

export type UploadPlanPayload = {
  file: File;
  name: string;
  discipline?: string;
  version?: string;
};

export function uploadProjectPlan(projectId: string, payload: UploadPlanPayload) {
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('name', payload.name);
  if (payload.discipline) formData.append('discipline', payload.discipline);
  if (payload.version) formData.append('version', payload.version);

  return apiFetch<ApiPlan>(`/projects/${projectId}/plans`, {
    method: 'POST',
    body: formData,
  });
}

export function deleteProjectPlan(projectId: string, planId: string) {
  return apiFetch<{ success: boolean; unpinnedTicketCount: number }>(
    `/projects/${projectId}/plans/${planId}`,
    { method: 'DELETE' },
  );
}
