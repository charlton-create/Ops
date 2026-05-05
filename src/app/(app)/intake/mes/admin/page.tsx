"use client";

import { Header } from "@/components/layout/Header";
import { useState } from "react";

const sections = [
  { icon: "🏢", name: "Company Profile" },
  { icon: "🏭", name: "Production" },
  { icon: "📦", name: "Products & SKUs" },
  { icon: "✅", name: "Quality Control" },
  { icon: "👥", name: "Team" },
  { icon: "📋", name: "Inventory" },
  { icon: "⏱️", name: "Downtime" },
  { icon: "🔗", name: "Integrations" },
  { icon: "📝", name: "Audits" },
  { icon: "🎯", name: "Wrap-Up" },
];

const defaultModules = [
  { id: "coffee", icon: "☕", name: "Coffee Roasting", enabled: true },
  { id: "food-bev", icon: "🍽️", name: "Food & Bev", enabled: true },
  { id: "pharma", icon: "💊", name: "Pharma", enabled: true },
  { id: "plastics", icon: "🧴", name: "Plastics", enabled: false },
  { id: "metal", icon: "🔩", name: "Metal Fab", enabled: false },
  { id: "electronics", icon: "🔌", name: "Electronics", enabled: true },
  { id: "chemical", icon: "⚗️", name: "Chemical", enabled: false },
];

export default function MesAdminPage() {
  const [modules, setModules] = useState(defaultModules);

  const toggle = (id: string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header
        title="MES Admin"
        subtitle="Interview configuration and module management"
        icon="⚙️"
        gradient="from-teal-600 to-emerald-500"
      />

      <div className="px-6 pb-10 max-w-5xl mx-auto space-y-8">
        {/* Standard Sections */}
        <div>
          <h2 className="text-lg font-semibold text-gray-200 mb-4">
            Standard Interview Sections
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
            {sections.map((s, i) => (
              <div
                key={s.name}
                className="flex items-center gap-4 px-5 py-3.5"
              >
                <span className="text-gray-500 text-xs font-mono w-5 text-right">
                  {i + 1}
                </span>
                <span className="text-xl w-8 text-center">{s.icon}</span>
                <span className="text-gray-200 text-sm font-medium">
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Industry Modules */}
        <div>
          <h2 className="text-lg font-semibold text-gray-200 mb-4">
            Industry Modules
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
            {modules.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <div className="flex items-center gap-4">
                  <span className="text-xl w-8 text-center">{m.icon}</span>
                  <span className="text-gray-200 text-sm font-medium">
                    {m.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(m.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    m.enabled ? "bg-teal-600" : "bg-gray-700"
                  }`}
                  aria-label={`Toggle ${m.name}`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                      m.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-3">
            Enabled modules appear in the MES intake landing page. Toggle to
            show or hide modules for new interviews.
          </p>
        </div>
      </div>
    </div>
  );
}
