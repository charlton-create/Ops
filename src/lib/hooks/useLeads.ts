import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, mutateApi } from "./api";

export interface Lead {
  id: number;
  company: string;
  contact: string;
  title: string | null;
  stage: string;
  value: number;
  probability: number;
  modules: string[];
  certifications: string[];
  facilities: number;
  ownerId: number;
  owner: { id: number; name: string; color: string | null };
  priority: string;
  lastActivity: string | null;
  nextAction: string | null;
  source: string | null;
  notes: string | null;
  industry: string | null;
  email: string | null;
  phone: string | null;
  convertedToCustomer: boolean;
  createdAt: string;
}

export function useLeads(stage?: string) {
  const url = stage ? `/api/leads?stage=${encodeURIComponent(stage)}` : "/api/leads";
  return useQuery({
    queryKey: ["leads", stage],
    queryFn: () => fetchApi<Lead[]>(url),
  });
}

export function useAddLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => mutateApi<Lead>("/api/leads", "POST", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      mutateApi<Lead>(`/api/leads/${id}`, "PATCH", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useMoveLeadStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: string }) =>
      mutateApi<Lead>(`/api/leads/${id}/move-stage`, "POST", { stage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
