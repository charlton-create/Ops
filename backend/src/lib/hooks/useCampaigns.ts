import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, mutateApi } from "./api";

export interface EmailCampaign {
  id: number;
  name: string;
  fromName: string | null;
  fromEmail: string | null;
  subject: string | null;
  contentPieceId: number | null;
  status: string;
  audience: { type: string; stages?: string[]; modules?: string[]; leadIds?: number[] } | null;
  scheduledDate: string | null;
  sentDate: string | null;
  recipients: number;
  opens: number;
  clicks: number;
  bodyHtml: string | null;
  createdBy: string | null;
  createdAt: string;
}

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: () => fetchApi<EmailCampaign[]>("/api/campaigns"),
  });
}

export function useAddCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => mutateApi<EmailCampaign>("/api/campaigns", "POST", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      mutateApi<EmailCampaign>(`/api/campaigns/${id}`, "PATCH", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}
