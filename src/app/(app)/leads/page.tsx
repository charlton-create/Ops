"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { useLeads, useAddLead, type Lead } from "@/lib/hooks/useLeads";
import { useTeam } from "@/lib/hooks/useTeam";
import { STAGE_COLORS, PIPELINE_STAGES } from "@/lib/constants/pipeline";
import { ALL_MODULES, SOURCES, INDUSTRIES } from "@/lib/constants/modules";

function formatCurrency(n: number) {
  return n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`;
}

type Tab = "all" | "active" | "won" | "lost";

export default function LeadsPage() {
  const { data: leads, isLoading } = useLeads();
  const { data: team } = useTeam();
  const addLead = useAddLead();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newLead, setNewLead] = useState({
    company: "", contact: "", title: "", stage: "New Lead", value: 0,
    modules: [] as string[], owner: "", priority: "medium", source: "", industry: "", email: "", phone: "",
    notes: "", nextAction: "", certifications: [] as string[], facilities: 1,
  });

  const filtered = useMemo(() => {
    let list = leads ?? [];
    if (tab === "active") list = list.filter((l) => l.stage !== "Closed Won" && l.stage !== "Closed Lost");
    else if (tab === "won") list = list.filter((l) => l.stage === "Closed Won");
    else if (tab === "lost") list = list.filter((l) => l.stage === "Closed Lost");
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((l) => l.company.toLowerCase().includes(s) || l.contact.toLowerCase().includes(s));
    }
    return list;
  }, [leads, tab, search]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "All", count: leads?.length ?? 0 },
    { key: "active", label: "Active", count: leads?.filter((l) => l.stage !== "Closed Won" && l.stage !== "Closed Lost").length ?? 0 },
    { key: "won", label: "Won", count: leads?.filter((l) => l.stage === "Closed Won").length ?? 0 },
    { key: "lost", label: "Lost", count: leads?.filter((l) => l.stage === "Closed Lost").length ?? 0 },
  ];

  function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    addLead.mutate(
      { ...newLead, probability: 5, expansions: [] },
      {
        onSuccess: () => {
          setShowAdd(false);
          setNewLead({ company: "", contact: "", title: "", stage: "New Lead", value: 0, modules: [], owner: "", priority: "medium", source: "", industry: "", email: "", phone: "", notes: "", nextAction: "", certifications: [], facilities: 1 });
        },
      }
    );
  }

  return (
    <div>
      <Header title="Leads" icon="🎯" subtitle="Lead Management" gradient="from-blue-600 to-indigo-500">
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add Lead
        </button>
      </Header>

      {/* Tabs + Search */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                tab === t.key ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {t.label} <span className="text-gray-500 ml-1">{t.count}</span>
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-900 rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium text-right">Value</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const colors = STAGE_COLORS[lead.stage] ?? STAGE_COLORS["New Lead"];
                return (
                  <tr key={lead.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{lead.company}</p>
                      <p className="text-gray-500 text-xs">{lead.industry}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-300">{lead.contact}</p>
                      <p className="text-gray-500 text-xs">{lead.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {lead.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-white font-medium">{formatCurrency(lead.value)}</span>
                      <span className="text-gray-500 text-xs ml-1">{lead.probability}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: lead.owner?.color ?? "#6B7280" }}
                        >
                          {lead.owner?.name?.charAt(0)}
                        </div>
                        <span className="text-gray-300 text-xs">{lead.owner?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        lead.priority === "high" ? "bg-red-950 text-red-400" :
                        lead.priority === "medium" ? "bg-yellow-950 text-yellow-400" :
                        "bg-gray-800 text-gray-400"
                      }`}>
                        {lead.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{lead.source}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-gray-500 py-8">No leads found</p>
          )}
        </div>
      )}

      {/* Add Lead Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Add Lead</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAddLead} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Company *</label>
                  <input required value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Contact *</label>
                  <input required value={newLead.contact} onChange={(e) => setNewLead({ ...newLead, contact: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Title</label>
                  <input value={newLead.title} onChange={(e) => setNewLead({ ...newLead, title: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Email</label>
                  <input type="email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Industry</label>
                  <select value={newLead.industry} onChange={(e) => setNewLead({ ...newLead, industry: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                    <option value="">Select...</option>
                    {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Source</label>
                  <select value={newLead.source} onChange={(e) => setNewLead({ ...newLead, source: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                    <option value="">Select...</option>
                    {SOURCES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Owner *</label>
                  <select required value={newLead.owner} onChange={(e) => setNewLead({ ...newLead, owner: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                    <option value="">Select...</option>
                    {team?.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Value ($)</label>
                  <input type="number" value={newLead.value} onChange={(e) => setNewLead({ ...newLead, value: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notes</label>
                <textarea value={newLead.notes} onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })} rows={2} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={addLead.isPending} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                  {addLead.isPending ? "Adding..." : "Add Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
