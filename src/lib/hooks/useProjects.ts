import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, mutateApi } from "./api";

export interface ProjectTask {
  id: number;
  text: string;
  done: boolean;
  dueDate: string | null;
  sortOrder: number;
}

export interface Project {
  id: number;
  name: string;
  status: string;
  ownerId: number;
  owner: { id: number; name: string; color: string | null };
  due: string | null;
  progress: number;
  type: string | null;
  tasks: ProjectTask[];
  createdAt: string;
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchApi<Project[]>("/api/projects"),
  });
}

export function useAddProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => mutateApi<Project>("/api/projects", "POST", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProjectTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, taskIdx, done }: { projectId: number; taskIdx: number; done: boolean }) =>
      mutateApi<{ ok: boolean; progress: number }>(`/api/projects/${projectId}/tasks/${taskIdx}`, "PATCH", { done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}
