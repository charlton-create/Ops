"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { useContent, useAddContent, useUpdateContent, useDeleteContent, type ContentPiece } from "@/lib/hooks/useContent";

const STAGES = ["Ideas", "In Development", "Under Review", "Approved", "Scheduled", "Published"] as const;
const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Ideas":          { bg: "bg-gray-900",         text: "text-gray-400",   border: "border-gray-700" },
  "In Development": { bg: "bg-blue-950/50",      text: "text-blue-400",   border: "border-blue-800" },
  "Under Review":   { bg: "bg-yellow-950/50",    text: "text-yellow-400", border: "border-yellow-800" },
  "Approved":       { bg: "bg-green-950/50",     text: "text-green-400",  border: "border-green-800" },
  "Scheduled":      { bg: "bg-purple-950/50",    text: "text-purple-400", border: "border-purple-800" },
  "Published":      { bg: "bg-cyan-950/50",      text: "text-cyan-400",   border: "border-cyan-800" },
};
const CONTENT_TYPES = ["Blog Post", "Social Image", "Social Video", "Newsletter", "Case Study", "Product Update", "Whitepaper"];
const PLATFORMS = ["Instagram", "LinkedIn", "X (Twitter)", "Website Blog", "Email", "YouTube", "Facebook"];

export default function ContentPage() {
  const { data: content, isLoading } = useContent();
  const addContent = useAddContent();
  const updateContent = useUpdateContent();
  const deleteContent = useDeleteContent();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", description: "", type: "Blog Post", platforms: [] as string[], owner: "", createdBy: "", stage: "Ideas", tags: [] as string[], blockers: [] as string[], attachments: [] as string[], linkedLeads: [] as number[], body: "" });

  const byStage = useMemo(() => {
    const map: Record<string, ContentPiece[]> = {};
    for (const s of STAGES) map[s] = [];
    content?.forEach((c) => { if (c.stage && map[c.stage]) map[c.stage].push(c); });
    return map;
  }, [content]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    addContent.mutate(newItem, {
      onSuccess: () => { setShowAdd(false); setNewItem({ title: "", description: "", type: "Blog Post", platforms: [], owner: "", createdBy: "", stage: "Ideas", tags: [], blockers: [], attachments: [], linkedLeads: [], body: "" }); }
    });
  }

  function moveStage(id: number, stage: string) {
    updateContent.mutate({ id, stage });
  }

  return (
    <div>
      <Header title="Content Library" icon="📝" subtitle="Content Pipeline" gradient="from-violet-600 to-purple-500">
        <div className="flex gap-2">
          <div className="flex gap-1 bg-white/10 rounded-lg p-0.5">
            <button onClick={() => setView("kanban")} className={`px-3 py-1 text-xs rounded-md ${view === "kanban" ? "bg-white/20 text-white" : "text-white/60"}`}>Board</button>
            <button onClick={() => setView("list")} className={`px-3 py-1 text-xs rounded-md ${view === "list" ? "bg-white/20 text-white" : "text-white/60"}`}>List</button>
          </div>
          <button onClick={() => setShowAdd(true)} className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg">+ Add</button>
        </div>
      </Header>

      {isLoading ? (
        <div className="flex gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="flex-shrink-0 w-[260px] h-64 bg-gray-900 rounded-xl animate-pulse" />)}</div>
      ) : view === "kanban" ? (
        /* Kanban View */
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const colors = STAGE_COLORS[stage];
            const items = byStage[stage] ?? [];
            return (
              <div key={stage} className={`flex-shrink-0 w-[260px] rounded-xl border ${colors.border} ${colors.bg} flex flex-col max-h-[calc(100vh-260px)]`}>
                <div className="px-3 py-2.5 border-b border-gray-800/50">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${colors.text}`}>{stage}</span>
                    <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{items.length}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{item.type}</span>
                        {item.owner && <span className="text-[10px] text-gray-500">{item.owner}</span>}
                      </div>
                      {item.blockers.length > 0 && (
                        <p className="text-[10px] text-red-400 mt-1">🚫 {item.blockers[0]}</p>
                      )}
                      {/* Stage move buttons */}
                      <div className="flex gap-1 mt-2">
                        {stage !== "Ideas" && (
                          <button onClick={() => moveStage(item.id, STAGES[STAGES.indexOf(stage) - 1])} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 hover:text-white">← Back</button>
                        )}
                        {stage !== "Published" && (
                          <button onClick={() => moveStage(item.id, STAGES[STAGES.indexOf(stage) + 1])} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 hover:text-white">Next →</button>
                        )}
                        <button onClick={() => { if (confirm("Delete?")) deleteContent.mutate(item.id); }} className="text-[10px] px-1.5 py-0.5 rounded text-gray-600 hover:text-red-400 ml-auto">✕</button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-center text-xs text-gray-600 py-6">No items</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Platforms</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {content?.map((item) => {
                const colors = STAGE_COLORS[item.stage ?? "Ideas"];
                return (
                  <tr key={item.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{item.title}</p>
                      <p className="text-gray-500 text-xs line-clamp-1">{item.description}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{item.type}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border ${colors.border} ${colors.bg} ${colors.text}`}>{item.stage}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">{item.platforms.map((p) => <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{p}</span>)}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{item.owner}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString() : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Add Content</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Title *</label>
                <input required value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Description</label>
                <textarea value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} rows={2} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Type</label>
                  <select value={newItem.type} onChange={(e) => setNewItem({ ...newItem, type: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                    {CONTENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Owner</label>
                  <input value={newItem.owner} onChange={(e) => setNewItem({ ...newItem, owner: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={addContent.isPending} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                  {addContent.isPending ? "Adding..." : "Add Content"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
