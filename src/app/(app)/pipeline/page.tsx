"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { useLeads, useMoveLeadStage, useUpdateLead, type Lead } from "@/lib/hooks/useLeads";
import { PIPELINE_STAGES, STAGE_COLORS } from "@/lib/constants/pipeline";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function formatCurrency(n: number) {
  return n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`;
}

function LeadCard({ lead, isDragging, onClick }: { lead: Lead; isDragging?: boolean; onClick?: () => void }) {
  const colors = STAGE_COLORS[lead.stage] ?? STAGE_COLORS["New Lead"];
  return (
    <div
      onClick={onClick}
      className={`bg-gray-900 border border-gray-800 rounded-lg p-3 cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging ? "shadow-xl opacity-80 ring-2 ring-purple-500" : "hover:border-gray-700"
      }`}
    >
      <div className="flex items-start justify-between mb-1">
        <p className="text-sm font-medium text-white truncate">{lead.company}</p>
        <span className={`text-xs font-semibold ${colors.text}`}>{formatCurrency(lead.value)}</span>
      </div>
      <p className="text-xs text-gray-400 truncate">{lead.contact} · {lead.title}</p>
      <div className="flex items-center gap-2 mt-2">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ backgroundColor: lead.owner?.color ?? "#6B7280" }}
        >
          {lead.owner?.name?.charAt(0) ?? "?"}
        </div>
        <span className="text-[10px] text-gray-500">{lead.probability}%</span>
        {lead.priority === "high" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-400">High</span>
        )}
      </div>
    </div>
  );
}

function SortableLeadCard({ lead, onSelect }: { lead: Lead; onSelect: (lead: Lead) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `lead-${lead.id}`,
    data: { lead },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LeadCard lead={lead} isDragging={isDragging} onClick={() => onSelect(lead)} />
    </div>
  );
}

function StageColumn({ stage, leads, onSelect }: { stage: string; leads: Lead[]; onSelect: (lead: Lead) => void }) {
  const colors = STAGE_COLORS[stage] ?? STAGE_COLORS["New Lead"];
  const totalValue = leads.reduce((sum, l) => sum + l.value, 0);

  return (
    <div className={`flex-shrink-0 w-[280px] rounded-xl border ${colors.border} ${colors.bg} flex flex-col max-h-[calc(100vh-260px)]`}>
      <div className="px-3 py-2.5 border-b border-gray-800/50">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${colors.text}`}>{stage}</span>
          <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{leads.length}</span>
        </div>
        {leads.length > 0 && (
          <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(totalValue)}</p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <SortableContext
          items={leads.map((l) => `lead-${l.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} onSelect={onSelect} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <p className="text-center text-xs text-gray-600 py-8">No deals</p>
        )}
      </div>
    </div>
  );
}

function LeadDetailPanel({ lead, onClose, onMoveStage }: { lead: Lead; onClose: () => void; onMoveStage: (id: number, stage: string) => void }) {
  const colors = STAGE_COLORS[lead.stage] ?? STAGE_COLORS["New Lead"];
  const stageIdx = PIPELINE_STAGES.indexOf(lead.stage as any);

  return (
    <div className="w-[380px] bg-gray-900 border border-gray-800 rounded-xl p-5 flex-shrink-0 overflow-y-auto max-h-[calc(100vh-180px)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">{lead.company}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">✕</button>
      </div>

      {/* Stage Badge */}
      <div className="mb-4">
        <span className={`text-xs px-3 py-1 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
          {lead.stage}
        </span>
        <span className="text-gray-500 text-xs ml-2">{lead.probability}% probability</span>
      </div>

      <div className="space-y-4 text-sm">
        {/* Contact */}
        <div>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Contact</p>
          <p className="text-white font-medium">{lead.contact}</p>
          <p className="text-gray-400">{lead.title}</p>
          {lead.email && <p className="text-gray-400">{lead.email}</p>}
          {lead.phone && <p className="text-gray-400">{lead.phone}</p>}
        </div>

        {/* Deal Info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Value</p>
            <p className="text-white font-bold text-lg">{formatCurrency(lead.value)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Priority</p>
            <span className={`text-xs px-2 py-0.5 rounded ${
              lead.priority === "high" ? "bg-red-950 text-red-400" :
              lead.priority === "medium" ? "bg-yellow-950 text-yellow-400" :
              "bg-gray-800 text-gray-400"
            }`}>{lead.priority}</span>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Owner</p>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: lead.owner?.color ?? "#6B7280" }}>
                {lead.owner?.name?.charAt(0)}
              </div>
              <span className="text-gray-300">{lead.owner?.name}</span>
            </div>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Source</p>
            <p className="text-gray-300">{lead.source ?? "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Industry</p>
            <p className="text-gray-300">{lead.industry ?? "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Facilities</p>
            <p className="text-gray-300">{lead.facilities}</p>
          </div>
        </div>

        {/* Modules */}
        {lead.modules.length > 0 && (
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Modules</p>
            <div className="flex flex-wrap gap-1">
              {lead.modules.map((m) => (
                <span key={m} className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300">{m}</span>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {lead.certifications.length > 0 && (
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Certifications</p>
            <div className="flex flex-wrap gap-1">
              {lead.certifications.map((c) => (
                <span key={c} className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300">{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Next Action */}
        {lead.nextAction && (
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Next Action</p>
            <p className="text-gray-300">{lead.nextAction}</p>
          </div>
        )}

        {/* Notes */}
        {lead.notes && (
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Notes</p>
            <p className="text-gray-400 text-xs leading-relaxed">{lead.notes}</p>
          </div>
        )}

        {/* Move Stage Buttons */}
        <div>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">Move to Stage</p>
          <div className="flex flex-wrap gap-1">
            {PIPELINE_STAGES.filter((s) => s !== lead.stage).map((s) => {
              const sc = STAGE_COLORS[s];
              return (
                <button
                  key={s}
                  onClick={() => onMoveStage(lead.id, s)}
                  className={`text-[11px] px-2 py-1 rounded border ${sc.border} ${sc.bg} ${sc.text} hover:opacity-80 transition-opacity`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const { data: leads, isLoading } = useLeads();
  const moveStage = useMoveLeadStage();
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const stage of PIPELINE_STAGES) map[stage] = [];
    for (const lead of leads ?? []) {
      if (map[lead.stage]) map[lead.stage].push(lead);
    }
    return map;
  }, [leads]);

  // Keep selected lead data fresh
  const currentSelected = useMemo(() => {
    if (!selectedLead) return null;
    return leads?.find((l) => l.id === selectedLead.id) ?? selectedLead;
  }, [leads, selectedLead]);

  const activeStages = PIPELINE_STAGES.filter((s) => s !== "Closed Won" && s !== "Closed Lost");
  const activeLeads = leads?.filter((l) => l.stage !== "Closed Won" && l.stage !== "Closed Lost") ?? [];
  const pipelineValue = activeLeads.reduce((sum, l) => sum + l.value, 0);
  const weightedValue = activeLeads.reduce((sum, l) => sum + l.value * (l.probability / 100), 0);

  function handleDragStart(event: DragStartEvent) {
    const lead = (event.active.data.current as any)?.lead;
    if (lead) setActiveLead(lead);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const draggedLead = (active.data.current as any)?.lead as Lead;
    if (!draggedLead) return;

    const overLeadId = String(over.id);
    let targetStage: string | null = null;

    if (overLeadId.startsWith("lead-")) {
      const overLead = leads?.find((l) => `lead-${l.id}` === overLeadId);
      if (overLead) targetStage = overLead.stage;
    }

    for (const stage of PIPELINE_STAGES) {
      const stageLeads = leadsByStage[stage] ?? [];
      if (stageLeads.some((l) => `lead-${l.id}` === overLeadId)) {
        targetStage = stage;
        break;
      }
    }

    if (targetStage && targetStage !== draggedLead.stage) {
      moveStage.mutate({ id: draggedLead.id, stage: targetStage });
    }
  }

  function handleMoveStage(id: number, stage: string) {
    moveStage.mutate({ id, stage });
  }

  if (isLoading) {
    return (
      <div>
        <Header title="Pipeline" icon="🔄" subtitle="Loading..." gradient="from-blue-600 to-indigo-500" />
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-shrink-0 w-[280px] h-96 bg-gray-900 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Pipeline" icon="🔄" subtitle="Sales Pipeline" gradient="from-blue-600 to-indigo-500">
        <div className="flex gap-4 text-sm">
          <div>
            <p className="text-white/60 text-xs">Pipeline</p>
            <p className="text-white font-bold">{formatCurrency(pipelineValue)}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Weighted</p>
            <p className="text-white font-bold">{formatCurrency(Math.round(weightedValue))}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Deals</p>
            <p className="text-white font-bold">{activeLeads.length}</p>
          </div>
        </div>
      </Header>

      <div className="flex gap-4">
        {/* Kanban Board */}
        <div className="flex-1 min-w-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-3 overflow-x-auto pb-4">
              {activeStages.map((stage) => (
                <StageColumn key={stage} stage={stage} leads={leadsByStage[stage] ?? []} onSelect={setSelectedLead} />
              ))}
            </div>

            <DragOverlay>
              {activeLead && <LeadCard lead={activeLead} isDragging />}
            </DragOverlay>
          </DndContext>

          {/* Closed stages summary */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-green-950/30 border border-green-900 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-400 font-semibold text-sm">Closed Won</span>
                <span className="text-green-400 font-bold">{formatCurrency(leadsByStage["Closed Won"]?.reduce((s, l) => s + l.value, 0) ?? 0)}</span>
              </div>
              {leadsByStage["Closed Won"]?.map((l) => (
                <p key={l.id} className="text-xs text-gray-400 cursor-pointer hover:text-white" onClick={() => setSelectedLead(l)}>{l.company} — {formatCurrency(l.value)}</p>
              ))}
              {!leadsByStage["Closed Won"]?.length && <p className="text-xs text-gray-600">No won deals</p>}
            </div>
            <div className="bg-red-950/30 border border-red-900 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-red-400 font-semibold text-sm">Closed Lost</span>
                <span className="text-red-400 font-bold">{formatCurrency(leadsByStage["Closed Lost"]?.reduce((s, l) => s + l.value, 0) ?? 0)}</span>
              </div>
              {leadsByStage["Closed Lost"]?.map((l) => (
                <p key={l.id} className="text-xs text-gray-400 cursor-pointer hover:text-white" onClick={() => setSelectedLead(l)}>{l.company} — {formatCurrency(l.value)}</p>
              ))}
              {!leadsByStage["Closed Lost"]?.length && <p className="text-xs text-gray-600">No lost deals</p>}
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        {currentSelected && (
          <LeadDetailPanel
            lead={currentSelected}
            onClose={() => setSelectedLead(null)}
            onMoveStage={handleMoveStage}
          />
        )}
      </div>
    </div>
  );
}
