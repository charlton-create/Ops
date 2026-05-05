"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { useCampaigns, useAddCampaign, useUpdateCampaign } from "@/lib/hooks/useCampaigns";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-gray-800 text-gray-400",
  Scheduled: "bg-purple-950 text-purple-400",
  Sent: "bg-green-950 text-green-400",
};

export default function CampaignsPage() {
  const { data: campaigns, isLoading } = useCampaigns();
  const addCampaign = useAddCampaign();
  const updateCampaign = useUpdateCampaign();
  const [showAdd, setShowAdd] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: "", fromName: "", fromEmail: "", subject: "", status: "Draft", audience: { type: "all_leads" }, recipients: 0, bodyHtml: "", createdBy: "" });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    addCampaign.mutate(newCampaign, { onSuccess: () => { setShowAdd(false); setNewCampaign({ name: "", fromName: "", fromEmail: "", subject: "", status: "Draft", audience: { type: "all_leads" }, recipients: 0, bodyHtml: "", createdBy: "" }); } });
  }

  function handleSend(id: number) {
    if (confirm("Send this campaign now?")) {
      updateCampaign.mutate({ id, status: "Sent", sentDate: new Date().toISOString().split("T")[0] });
    }
  }

  return (
    <div>
      <Header title="Email Campaigns" icon="📧" subtitle="Campaign Management" gradient="from-violet-600 to-purple-500">
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg">+ New Campaign</button>
      </Header>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-16 bg-gray-900 rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Audience</th>
                <th className="px-4 py-3 font-medium text-right">Recipients</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns?.map((c) => (
                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{c.name}</p>
                    <p className="text-gray-500 text-xs">by {c.createdBy ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs max-w-[200px] truncate">{c.subject}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[c.status] ?? ""}`}>{c.status}</span></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{(c.audience as any)?.type ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-white">{c.recipients}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.scheduledDate ? new Date(c.scheduledDate).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    {c.status !== "Sent" && (
                      <button onClick={() => handleSend(c.id)} className="text-xs px-2 py-1 bg-green-950 text-green-400 rounded hover:bg-green-900">Send</button>
                    )}
                    {c.status === "Sent" && (
                      <span className="text-xs text-gray-500">{c.opens ?? 0} opens · {c.clicks ?? 0} clicks</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!campaigns?.length && <p className="text-center text-gray-500 py-8">No campaigns yet</p>}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">New Campaign</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Campaign Name *</label>
                <input required value={newCampaign.name} onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Subject Line *</label>
                <input required value={newCampaign.subject} onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">From Name</label>
                  <input value={newCampaign.fromName} onChange={(e) => setNewCampaign({ ...newCampaign, fromName: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">From Email</label>
                  <input type="email" value={newCampaign.fromEmail} onChange={(e) => setNewCampaign({ ...newCampaign, fromEmail: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={addCampaign.isPending} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
