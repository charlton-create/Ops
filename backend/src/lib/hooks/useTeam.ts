import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "./api";

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  color: string | null;
  status: string;
  tz: string | null;
  city: string | null;
  utcOffset: number | null;
  email: string;
}

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: () => fetchApi<TeamMember[]>("/api/team"),
  });
}
