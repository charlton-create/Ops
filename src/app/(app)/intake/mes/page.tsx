"use client";

import { Header } from "@/components/layout/Header";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/hooks/api";
import { Suspense } from "react";

const modules = [
  { id: "m_coffee", icon: "☕", name: "Coffee Roasting", desc: "Roast profiling, batch tracking, and green bean inventory management." },
  { id: "m_food", icon: "🍽️", name: "Food & Bev", desc: "Recipe management, allergen tracking, and production scheduling." },
  { id: "m_pharma", icon: "💊", name: "Pharma", desc: "GMP compliance, batch records, and deviation management." },
  { id: "m_plastics", icon: "🧴", name: "Plastics", desc: "Mold tracking, resin management, and cycle-time optimization." },
  { id: "m_metal", icon: "🔩", name: "Metal Fab", desc: "Job shop scheduling, material certs, and weld tracking." },
  { id: "m_elec", icon: "🔌", name: "Electronics", desc: "Component traceability, SMT line monitoring, and test data capture." },
  { id: "m_chem", icon: "⚗️", name: "Chemical", desc: "Formulation management, hazmat compliance, and batch blending." },
];

interface MESInterview {
  id: number;
  companyName: string;
  contactName: string | null;
  module: string | null;
  status: string;
  submittedBy: string | null;
  createdAt: string;
  responses: Record<string, string>;
}

function MesContent() {
  const searchParams = useSearchParams();
  const submitted = searchParams.get("submitted");

  const { data: interviews } = useQuery({
    queryKey: ["mes-interviews"],
    queryFn: () => fetchApi<MESInterview[]>("/api/mes/interviews"),
  });

  const moduleNames: Record<string, string> = {};
  modules.forEach((m) => { moduleNames[m.id] = m.name; });

  return (
    <div>
      <Header
        title="MES Intake"
        icon="📋"
        subtitle="Manufacturing Execution System — consultative discovery"
        gradient="from-teal-600 to-emerald-500"
      />

      {/* Success banner */}
      {submitted && (
        <div className="bg-emerald-900/50 border border-emerald-700 rounded-xl px-5 py-3 mb-6 flex items-center gap-3">
          <span className="text-emerald-400 text-lg">✓</span>
          <p className="text-emerald-300 text-sm">Interview submitted successfully!</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center gap-4">
            <span className="text-3xl font-bold text-teal-400">{interviews?.length ?? 0}</span>
            <span className="text-gray-400 text-sm leading-tight">
              Intake forms<br />completed
            </span>
          </div>
          <Link
            href="/intake/mes/admin"
            className="text-sm text-teal-400 hover:text-teal-300 border border-gray-800 rounded-lg px-4 py-2 hover:bg-gray-900 transition-colors"
          >
            Admin Config &rarr;
          </Link>
        </div>

        {/* Module grid */}
        <div>
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Industry Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {modules.map((m) => (
              <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col justify-between hover:border-teal-600/50 transition-colors">
                <div>
                  <div className="text-3xl mb-3">{m.icon}</div>
                  <h3 className="text-white font-semibold text-base mb-1">{m.name}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{m.desc}</p>
                </div>
                <Link
                  href={`/intake/mes/interview?module=${m.id}`}
                  className="mt-4 inline-flex items-center justify-center text-sm font-medium rounded-lg px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white transition-colors"
                >
                  Start Interview
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Past Interviews */}
        {interviews && interviews.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-200 mb-4">Completed Interviews</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-800">
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Module</th>
                    <th className="px-4 py-3 font-medium">Submitted By</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Key Info</th>
                  </tr>
                </thead>
                <tbody>
                  {interviews.map((iv) => (
                    <tr key={iv.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{iv.companyName}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{iv.contactName ?? "—"}</td>
                      <td className="px-4 py-3">
                        {iv.module ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-teal-950 text-teal-400">
                            {moduleNames[iv.module] ?? iv.module}
                          </span>
                        ) : (
                          <span className="text-gray-500">General</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{iv.submittedBy ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(iv.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {iv.responses?.timeline && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">
                              {iv.responses.timeline}
                            </span>
                          )}
                          {iv.responses?.budget && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">
                              {iv.responses.budget}
                            </span>
                          )}
                          {iv.responses?.employeeCount && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">
                              {iv.responses.employeeCount} employees
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MesIntakePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <MesContent />
    </Suspense>
  );
}
