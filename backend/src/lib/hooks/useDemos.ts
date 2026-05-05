import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, mutateApi } from "./api";

export interface DemoRequest {
  id: number;
  fullName: string;
  email: string | null;
  position: string | null;
  companyName: string | null;
  businessType: string | null;
  industry: string | null;
  preferredTime: string | null;
  preferredDate: string | null;
  selectedModules: { module: string; subModules: string[] }[];
  demoFocus: string | null;
  status: string;
  assignedTo: string | null;
  convertedToLeadId: number | null;
  notes: string | null;
  submittedAt: string;
}

export function useDemos() {
  return useQuery({
    queryKey: ["demos"],
    queryFn: () => fetchApi<DemoRequest[]>("/api/demos"),
  });
}

export function useUpdateDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      mutateApi<DemoRequest>(`/api/demos/${id}`, "PATCH", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demos"] }),
  });
}
