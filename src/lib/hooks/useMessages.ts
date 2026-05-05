import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, mutateApi } from "./api";

export interface Message {
  id: number;
  fromUser: string;
  toUser: string;
  text: string;
  read: boolean;
  contextType: string | null;
  contextId: number | null;
  contextName: string | null;
  createdAt: string;
}

export function useMessagesBetween(user1: string, user2: string) {
  return useQuery({
    queryKey: ["messages", user1, user2],
    queryFn: () => fetchApi<Message[]>(`/api/messages?between=${user1},${user2}`),
    enabled: !!user1 && !!user2,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { fromUser: string; toUser: string; text: string }) =>
      mutateApi<Message>("/api/messages", "POST", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages"] }),
  });
}
