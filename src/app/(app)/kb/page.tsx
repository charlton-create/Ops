"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { useKBDocs, useAddKBDoc, useDeleteKBDoc } from "@/lib/hooks/useKB";

const TYPE_ICONS: Record<string, string> = { document: "📄", playbook: "📖", template: "📋" };
const CATEGORY_COLORS: Record<string, string> = {
  Sales: "bg-blue-950 text-blue-400", Operations: "bg-green-950 text-green-400",
  Engineering: "bg-purple-950 text-purple-400", Legal: "bg-orange-950 text-orange-400",
  Marketing: "bg-cyan-950 text-cyan-400", Product: "bg-yellow-950 text-yellow-400",
};
const CATEGORIES = ["All", "Sales", "Operations", "Engineering", "Legal", "Marketing", "Product"];
const DOC_TYPES = ["All", "document", "playbook", "template"];

export default function KBPage() {
  const { data: docs, isLoading } = useKBDocs();
  const addDoc = useAddKBDoc();
  const deleteDoc = useDeleteKBDoc();
  const [category, setCategory] = useState("All");
  const [docType, setDocType] = useState("All");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: "", type: "document", category: "Sales", author: "", description: "" });

  const filtered = useMemo(() => {
    let list = docs ?? [];
    if (category !== "All") list = list.filter((d) => d.category === category);
    if (docType !== "All") list = list.filter((d) => d.type === docType);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((d) => d.title.toLowerCase().includes(s) || d.description?.toLowerCase().includes(s));
    }
    return list;
  }, [docs, category, docType, search]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    addDoc.mutate(newDoc, {
      onSuccess: () => { setShowAdd(false); setNewDoc({ title: "", type: "document", category: "Sales", author: "", description: "" }); }
    });
  }

  return (
    <div>
      <Header title="Knowledge Base" icon="📚" subtitle="Documents, Playbooks & Templates" gradient="from-sky-600 to-blue-500">
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg">+ Add Doc</button>
      </Header>

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <div className="w-[200px] flex-shrink-0 space-y-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Type</p>
            {DOC_TYPES.map((t) => (
              <button key={t} onClick={() => setDocType(t)}
                className={`block w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${docType === t ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}>
                {t === "All" ? "All Types" : `${TYPE_ICONS[t] ?? ""} ${t.charAt(0).toUpperCase() + t.slice(1)}s`}
              </button>
            ))}
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Category</p>
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`block w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${category === c ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1">
          <input
            type="text" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm mb-4 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />

          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-900 rounded-lg animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((doc) => (
                <div key={doc.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{TYPE_ICONS[doc.type ?? "document"] ?? "📄"}</span>
                      <div>
                        <p className="text-white font-medium">{doc.title}</p>
                        <p className="text-gray-400 text-sm mt-0.5">{doc.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[doc.category ?? ""] ?? "bg-gray-800 text-gray-400"}`}>{doc.category}</span>
                          <span className="text-gray-600 text-xs">by {doc.author}</span>
                          <span className="text-gray-600 text-xs">· {new Date(doc.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { if (confirm("Delete this document?")) deleteDoc.mutate(doc.id); }}
                      className="text-gray-600 hover:text-red-400 text-xs">✕</button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-gray-600 text-sm py-8 text-center">No documents found</p>}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Add Document</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Title *</label>
                <input required value={newDoc.title} onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Type</label>
                  <select value={newDoc.type} onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                    {["document", "playbook", "template"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Category</label>
                  <select value={newDoc.category} onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                    {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Author</label>
                <input value={newDoc.author} onChange={(e) => setNewDoc({ ...newDoc, author: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Description</label>
                <textarea value={newDoc.description} onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })} rows={2} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={addDoc.isPending} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                  {addDoc.isPending ? "Adding..." : "Add Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
