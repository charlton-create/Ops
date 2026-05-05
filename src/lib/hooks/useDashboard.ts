import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "./api";

export interface DashboardStats {
  pipelineValue: number;
  activeLeadCount: number;
  wonRevenue: number;
  avgDealSize: number;
  highPriorityDeals: number;
  activeProjects: number;
  totalProjects: number;
  activeCustomers: number;
  onboardingCustomers: number;
  totalCustomerValue: number;
  recentActivities: {
    id: number;
    who: string;
    action: string | null;
    target: string | null;
    detail: string | null;
    type: string | null;
    createdAt: string;
  }[];
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => fetchApi<DashboardStats>("/api/dashboard/stats"),
  });
}
