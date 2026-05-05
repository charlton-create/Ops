"use client";

import { Header } from "@/components/layout/Header";
import { useDashboardStats } from "@/lib/hooks/useDashboard";
import { useTeam } from "@/lib/hooks/useTeam";

function formatCurrency(n: number) {
  return n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: team } = useTeam();

  if (isLoading || !stats) {
    return (
      <div>
        <Header title="Dashboard" icon="📊" subtitle="Loading..." gradient="from-purple-600 to-pink-500" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Pipeline Value", value: formatCurrency(stats.pipelineValue), color: "text-blue-400", sub: `${stats.activeLeadCount} active deals` },
    { label: "Won Revenue", value: formatCurrency(stats.wonRevenue), color: "text-emerald-400", sub: `Avg ${formatCurrency(stats.avgDealSize)}` },
    { label: "High Priority", value: String(stats.highPriorityDeals), color: "text-red-400", sub: "deals need attention" },
    { label: "Active Projects", value: String(stats.activeProjects), color: "text-yellow-400", sub: `of ${stats.totalProjects} total` },
  ];

  return (
    <div>
      <Header title="Dashboard" icon="📊" subtitle="CAT-I Operations Overview" gradient="from-purple-600 to-pink-500" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-400 text-sm">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
            <p className="text-gray-500 text-xs mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {stats.recentActivities.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                  {a.who.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-200">
                    <span className="font-medium text-white">{a.who}</span>{" "}
                    {a.action}{" "}
                    <span className="font-medium text-white">{a.target}</span>
                  </p>
                  {a.detail && <p className="text-gray-500 text-xs">{a.detail}</p>}
                </div>
                <span className="text-gray-600 text-xs whitespace-nowrap">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team Status */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Team</h2>
          <div className="space-y-3">
            {team?.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: member.color ?? "#6B7280" }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${
                      member.status === "online"
                        ? "bg-green-500"
                        : member.status === "away"
                        ? "bg-yellow-500"
                        : "bg-gray-600"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.role}</p>
                </div>
                <span className="text-xs text-gray-500">{member.tz}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm">Customer Value</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{formatCurrency(stats.totalCustomerValue)}</p>
          <p className="text-gray-500 text-xs mt-1">active contracts</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm">Active Customers</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{stats.activeCustomers}</p>
          <p className="text-gray-500 text-xs mt-1">accounts</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm">Onboarding</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">{stats.onboardingCustomers}</p>
          <p className="text-gray-500 text-xs mt-1">customers in setup</p>
        </div>
      </div>
    </div>
  );
}
