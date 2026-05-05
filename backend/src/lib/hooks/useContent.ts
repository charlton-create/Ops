import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, mutateApi } from "./api";

export interface ContentPiece {
  id: number;
  title: string;
  description: string | null;
  stage: string | null;
  type: string | null;
  platforms: string[];
  owner: string | null;
  createdBy: string | null;
  scheduledDate: string | null;
  publishedDate: string | null;
  blockers: string[];
  tags: string[];
  notes: string | null;
  body: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useContent() {
  return useQuery({
    queryKey: ["content"],
    queryFn: () => fetchApi<ContentPiece[]>("/api/content"),
  });
}

export function useAddContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => mutateApi<ContentPiece>("/api/content", "POST", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content"] }),
  });
}

export function useUpdateContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      mutateApi<ContentPiece>(`/api/content/${id}`, "PATCH", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content"] }),
  });
}

export function useDeleteContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => mutateApi<{ ok: boolean }>(`/api/content/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content"] }),
  });
}
