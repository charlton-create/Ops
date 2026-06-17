"use client";

import dynamic from "next/dynamic";

const EagleKpiDashboard = dynamic(() => import("./EagleKpiDashboard"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#f3f5fa" }}>
      <div className="text-gray-400 text-sm font-medium">Loading Eagle KPI…</div>
    </div>
  ),
});

export default function EagleKpiPage() {
  return <EagleKpiDashboard />;
}
