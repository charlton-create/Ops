"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { useTeam } from "@/lib/hooks/useTeam";
import { useAddLead } from "@/lib/hooks/useLeads";
import { ALL_MODULES, INDUSTRIES, SOURCES, CERT_OPTIONS } from "@/lib/constants/modules";

const STEPS = ["Company Info", "Contact Details", "Requirements", "Review"];

export default function CustomerIntakePage() {
  const router = useRouter();
  const { data: team } = useTeam();
  const addLead = useAddLead();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    company: "", contact: "", title: "", email: "", phone: "",
    industry: "", source: "", facilities: 1, modules: [] as string[],
    certifications: [] as string[], notes: "", owner: "", priority: "medium",
  });

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleModule(mod: string) {
    set("modules", form.modules.includes(mod) ? form.modules.filter((m) => m !== mod) : [...form.modules, mod]);
  }

  function handleSubmit() {
    addLead.mutate(
      { ...form, stage: "New Lead", value: 0, nextAction: "Initial qualification", expansions: [] },
      { onSuccess: () => router.push("/leads") }
    );
  }

  const inputCls = "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500";
  const labelCls = "text-xs text-gray-400 mb-1 block";

  return (
    <div>
      <Header title="Customer Intake" icon="📋" subtitle="New Lead Intake Form" gradient="from-teal-600 to-emerald-500" />

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button onClick={() => setStep(i)} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i === step ? "bg-teal-600 text-white" : i < step ? "bg-teal-900 text-teal-400" : "bg-gray-800 text-gray-500"
            }`}>{i + 1}</button>
            <span className={`text-sm ${i === step ? "text-white font-medium" : "text-gray-500"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-800" />}
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-2xl">
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="text-white font-semibold mb-2">Company Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Company Name *</label><input value={form.company} onChange={(e) => set("company", e.target.value)} className={inputCls} required /></div>
              <div><label className={labelCls}>Industry</label><select value={form.industry} onChange={(e) => set("industry", e.target.value)} className={inputCls}><option value="">Select...</option>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</select></div>
              <div><label className={labelCls}>Source</label><select value={form.source} onChange={(e) => set("source", e.target.value)} className={inputCls}><option value="">Select...</option>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className={labelCls}>Facilities</label><input type="number" min={1} value={form.facilities} onChange={(e) => set("facilities", parseInt(e.target.value) || 1)} className={inputCls} /></div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-white font-semibold mb-2">Contact Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Contact Name *</label><input value={form.contact} onChange={(e) => set("contact", e.target.value)} className={inputCls} required /></div>
              <div><label className={labelCls}>Title</label><input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Email</label><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Phone</label><input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} /></div>
            </div>
            <div>
              <label className={labelCls}>Owner</label>
              <select value={form.owner} onChange={(e) => set("owner", e.target.value)} className={inputCls}>
                <option value="">Select...</option>
                {team?.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-white font-semibold mb-2">Requirements</h3>
            <div>
              <label className={labelCls}>Modules of Interest</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ALL_MODULES.map((mod) => (
                  <button key={mod} type="button" onClick={() => toggleModule(mod)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      form.modules.includes(mod) ? "bg-teal-900 text-teal-300 border-teal-700" : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600"
                    }`}>{mod}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Certifications</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {CERT_OPTIONS.map((cert) => (
                  <button key={cert} type="button" onClick={() => set("certifications", form.certifications.includes(cert) ? form.certifications.filter((c) => c !== cert) : [...form.certifications, cert])}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      form.certifications.includes(cert) ? "bg-teal-900 text-teal-300 border-teal-700" : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600"
                    }`}>{cert}</button>
                ))}
              </div>
            </div>
            <div><label className={labelCls}>Notes</label><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className={inputCls} /></div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h3 className="text-white font-semibold mb-2">Review</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-500 text-xs">Company</p><p className="text-white">{form.company || "—"}</p></div>
              <div><p className="text-gray-500 text-xs">Contact</p><p className="text-white">{form.contact || "—"}</p></div>
              <div><p className="text-gray-500 text-xs">Industry</p><p className="text-white">{form.industry || "—"}</p></div>
              <div><p className="text-gray-500 text-xs">Source</p><p className="text-white">{form.source || "—"}</p></div>
              <div><p className="text-gray-500 text-xs">Email</p><p className="text-white">{form.email || "—"}</p></div>
              <div><p className="text-gray-500 text-xs">Owner</p><p className="text-white">{form.owner || "—"}</p></div>
            </div>
            {form.modules.length > 0 && (
              <div><p className="text-gray-500 text-xs mb-1">Modules</p><div className="flex flex-wrap gap-1">{form.modules.map((m) => <span key={m} className="text-xs px-2 py-0.5 rounded bg-teal-900 text-teal-300">{m}</span>)}</div></div>
            )}
            {form.notes && <div><p className="text-gray-500 text-xs mb-1">Notes</p><p className="text-gray-300 text-sm">{form.notes}</p></div>}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-800">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-30">
            ← Previous
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg">
              Next →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={!form.company || !form.contact || addLead.isPending} className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
              {addLead.isPending ? "Creating..." : "Create Lead"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
