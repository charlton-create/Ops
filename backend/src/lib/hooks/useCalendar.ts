import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, mutateApi } from "./api";

export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  time: string | null;
  type: string | null;
  description: string | null;
  relatedType: string | null;
  relatedId: number | null;
  relatedName: string | null;
  assignee: string | null;
  completed: boolean;
}

export function useCalendarEvents() {
  return useQuery({
    queryKey: ["calendar"],
    queryFn: () => fetchApi<CalendarEvent[]>("/api/calendar"),
  });
}

export function useAddCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => mutateApi<CalendarEvent>("/api/calendar", "POST", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
  });
}

export function useUpdateCalendarEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) =>
      mutateApi<CalendarEvent>(`/api/calendar/${id}`, "PATCH", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
  });
}
