import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, mutateApi } from "./api";

export interface KBDocument {
  id: number;
  title: string;
  type: string | null;
  category: string | null;
  author: string | null;
  description: string | null;
  content: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileType: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useKBDocs() {
  return useQuery({
    queryKey: ["kb"],
    queryFn: () => fetchApi<KBDocument[]>("/api/kb"),
  });
}

export function useAddKBDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => mutateApi<KBDocument>("/api/kb", "POST", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb"] }),
  });
}

export function useDeleteKBDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => mutateApi<{ ok: boolean }>(`/api/kb/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb"] }),
  });
}
