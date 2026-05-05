import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/api";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const [leads, customers, projects, activities] = await Promise.all([
    prisma.lead.findMany(),
    prisma.customer.findMany(),
    prisma.project.findMany(),
    prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const activeLeads = leads.filter((l) => l.stage !== "Closed Won" && l.stage !== "Closed Lost");
  const wonLeads = leads.filter((l) => l.stage === "Closed Won");

  return NextResponse.json({
    pipelineValue: activeLeads.reduce((sum, l) => sum + l.value, 0),
    activeLeadCount: activeLeads.length,
    wonRevenue: wonLeads.reduce((sum, l) => sum + l.value, 0),
    avgDealSize: activeLeads.length > 0 ? Math.round(activeLeads.reduce((sum, l) => sum + l.value, 0) / activeLeads.length) : 0,
    highPriorityDeals: activeLeads.filter((l) => l.priority === "high").length,
    activeProjects: projects.filter((p) => p.status === "In Progress").length,
    totalProjects: projects.length,
    activeCustomers: customers.filter((c) => c.status === "active").length,
    onboardingCustomers: customers.filter((c) => c.status === "onboarding").length,
    totalCustomerValue: customers.filter((c) => c.status === "active" || c.status === "onboarding").reduce((sum, c) => sum + c.contractValue, 0),
    recentActivities: activities,
  });
}
