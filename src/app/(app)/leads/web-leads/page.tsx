"use client";

import { Header } from "@/components/layout/Header";
import { useDemos, useUpdateDemo } from "@/lib/hooks/useDemos";
import { useTeam } from "@/lib/hooks/useTeam";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-950 text-blue-400 border-blue-800",
  contacted: "bg-cyan-950 text-cyan-400 border-cyan-800",
  scheduled: "bg-yellow-950 text-yellow-400 border-yellow-800",
  completed: "bg-green-950 text-green-400 border-green-800",
  converted: "bg-purple-950 text-purple-400 border-purple-800",
  declined: "bg-red-950 text-red-400 border-red-800",
};

export default function WebLeadsPage() {
  const { data: demos, isLoading } = useDemos();
  const { data: team } = useTeam();
  const updateDemo = useUpdateDemo();

  function handleAssign(id: number, assignee: string) {
    updateDemo.mutate({ id, assignedTo: assignee, status: "contacted" });
  }

  return (
    <div>
      <Header title="Web Leads" icon="🌐" subtitle="Demo Requests from Website" gradient="from-cyan-600 to-blue-500" />

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-900 rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Modules</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Assigned</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {demos?.map((demo) => (
                <tr key={demo.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{demo.fullName}</p>
                    <p className="text-gray-500 text-xs">{demo.position}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-300">{demo.companyName}</p>
                    <p className="text-gray-500 text-xs">{demo.industry}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {demo.selectedModules?.map((m: any, i: number) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">
                          {typeof m === "string" ? m : m.module}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[demo.status] ?? STATUS_COLORS.new}`}>
                      {demo.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {demo.assignedTo ? (
                      <span className="text-gray-300 text-xs">{demo.assignedTo}</span>
                    ) : (
                      <select
                        onChange={(e) => {
                          if (e.target.value) handleAssign(demo.id, e.target.value);
                        }}
                        className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300"
                        defaultValue=""
                      >
                        <option value="">Assign...</option>
                        {team?.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(demo.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {demo.status === "new" && (
                        <button
                          onClick={() => updateDemo.mutate({ id: demo.id, status: "contacted" })}
                          className="text-xs px-2 py-1 bg-cyan-950 text-cyan-400 rounded hover:bg-cyan-900"
                        >
                          Contact
                        </button>
                      )}
                      {(demo.status === "contacted" || demo.status === "scheduled") && (
                        <button
                          onClick={() => updateDemo.mutate({ id: demo.id, status: "completed" })}
                          className="text-xs px-2 py-1 bg-green-950 text-green-400 rounded hover:bg-green-900"
                        >
                          Complete
                        </button>
                      )}
                      {demo.status !== "converted" && demo.status !== "declined" && (
                        <button
                          onClick={() => updateDemo.mutate({ id: demo.id, status: "declined" })}
                          className="text-xs px-2 py-1 bg-red-950 text-red-400 rounded hover:bg-red-900"
                        >
                          Decline
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!demos?.length && <p className="text-center text-gray-500 py-8">No demo requests</p>}
        </div>
      )}
    </div>
  );
}
