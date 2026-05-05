"use client";

import { Header } from "@/components/layout/Header";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";

const steps = ["Company Profile", "Production", "Quality Control", "Wrap-Up"] as const;

interface FormData {
  companyName: string;
  contactName: string;
  contactEmail: string;
  location: string;
  employeeCount: string;
  yearFounded: string;
  primaryProduct: string;
  productionVolume: string;
  shiftPattern: string;
  equipmentCount: string;
  qcStandard: string;
  inspectionFrequency: string;
  defectRate: string;
  timeline: string;
  budget: string;
  painPoints: string;
  additionalNotes: string;
}

const initial: FormData = {
  companyName: "", contactName: "", contactEmail: "",
  location: "", employeeCount: "", yearFounded: "",
  primaryProduct: "", productionVolume: "", shiftPattern: "", equipmentCount: "",
  qcStandard: "", inspectionFrequency: "", defectRate: "",
  timeline: "", budget: "", painPoints: "", additionalNotes: "",
};

function InterviewForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const module = searchParams.get("module") ?? "general";
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initial);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    setSubmitting(true);
    try {
      const { companyName, contactName, contactEmail, ...answers } = form;
      const res = await fetch("/api/mes/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactName,
          contactEmail,
          module,
          responses: answers,
        }),
      });
      if (res.ok) {
        router.push("/intake/mes?submitted=true");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors";
  const labelClass = "block text-sm font-medium text-gray-300 mb-1.5";

  return (
    <div>
      <Header
        title="MES Interview"
        subtitle={`Module: ${module.replace(/m_/g, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`}
        icon="📋"
        gradient="from-teal-600 to-emerald-500"
      />

      <div className="max-w-3xl space-y-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <button
                type="button"
                onClick={() => setStep(i)}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                  i === step
                    ? "bg-teal-600 text-white"
                    : i < step
                    ? "bg-teal-800 text-teal-200"
                    : "bg-gray-800 text-gray-500"
                }`}
              >
                {i + 1}
              </button>
              <span className={`text-xs hidden sm:inline ${i === step ? "text-teal-400 font-medium" : "text-gray-500"}`}>
                {s}
              </span>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px ${i < step ? "bg-teal-700" : "bg-gray-800"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form sections */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-100 mb-2">{steps[step]}</h2>

          {step === 0 && (
            <>
              <div>
                <label className={labelClass}>Company Name *</label>
                <input className={inputClass} value={form.companyName} onChange={set("companyName")} placeholder="Acme Manufacturing" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Contact Name</label>
                  <input className={inputClass} value={form.contactName} onChange={set("contactName")} placeholder="John Smith" />
                </div>
                <div>
                  <label className={labelClass}>Contact Email</label>
                  <input className={inputClass} value={form.contactEmail} onChange={set("contactEmail")} placeholder="john@acme.com" type="email" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Location</label>
                <input className={inputClass} value={form.location} onChange={set("location")} placeholder="City, State" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Employee Count</label>
                  <select className={inputClass} value={form.employeeCount} onChange={set("employeeCount")}>
                    <option value="">Select range</option>
                    <option value="1-10">1 – 10</option>
                    <option value="11-50">11 – 50</option>
                    <option value="51-200">51 – 200</option>
                    <option value="201-1k">201 – 1,000</option>
                    <option value="1k+">1,000+</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Year Founded</label>
                  <input className={inputClass} value={form.yearFounded} onChange={set("yearFounded")} placeholder="2005" />
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label className={labelClass}>Primary Product</label>
                <input className={inputClass} value={form.primaryProduct} onChange={set("primaryProduct")} placeholder="e.g. Specialty coffee blends" />
              </div>
              <div>
                <label className={labelClass}>Monthly Production Volume</label>
                <input className={inputClass} value={form.productionVolume} onChange={set("productionVolume")} placeholder="e.g. 50,000 units" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Shift Pattern</label>
                  <select className={inputClass} value={form.shiftPattern} onChange={set("shiftPattern")}>
                    <option value="">Select pattern</option>
                    <option value="Single">Single shift</option>
                    <option value="Two">Double shift</option>
                    <option value="Three">Triple / 24-7</option>
                    <option value="Varies">Flexible / Varies</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Equipment / Lines</label>
                  <input className={inputClass} value={form.equipmentCount} onChange={set("equipmentCount")} placeholder="e.g. 12" />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className={labelClass}>QC Standard</label>
                <select className={inputClass} value={form.qcStandard} onChange={set("qcStandard")}>
                  <option value="">Select standard</option>
                  <option value="ISO 9001">ISO 9001</option>
                  <option value="ISO 22000">ISO 22000</option>
                  <option value="GMP">GMP</option>
                  <option value="HACCP">HACCP</option>
                  <option value="SQF">SQF</option>
                  <option value="BRC">BRC</option>
                  <option value="FSSC 22000">FSSC 22000</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Inspection Frequency</label>
                <select className={inputClass} value={form.inspectionFrequency} onChange={set("inspectionFrequency")}>
                  <option value="">Select frequency</option>
                  <option value="Every batch">Every batch</option>
                  <option value="Sampling">Sampling</option>
                  <option value="First article">First article</option>
                  <option value="Per shift">Per shift</option>
                  <option value="Ad hoc">Ad hoc</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Current Defect Rate (%)</label>
                <input className={inputClass} value={form.defectRate} onChange={set("defectRate")} placeholder="e.g. 2.5" />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Target Timeline</label>
                  <select className={inputClass} value={form.timeline} onChange={set("timeline")}>
                    <option value="">Select timeline</option>
                    <option value="Immediate">Immediate</option>
                    <option value="1–3 mo">1 – 3 months</option>
                    <option value="3–6 mo">3 – 6 months</option>
                    <option value="6–12 mo">6 – 12 months</option>
                    <option value="Exploring">Just exploring</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Budget Range</label>
                  <select className={inputClass} value={form.budget} onChange={set("budget")}>
                    <option value="">Select range</option>
                    <option value="<$500/mo">Under $500/mo</option>
                    <option value="$500–2k">$500 – $2k/mo</option>
                    <option value="$2k–5k">$2k – $5k/mo</option>
                    <option value="$5k–15k">$5k – $15k/mo</option>
                    <option value="$15k+">$15k+/mo</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Biggest Pain Points</label>
                <textarea className={inputClass + " min-h-[80px]"} value={form.painPoints} onChange={set("painPoints")} placeholder="Describe current challenges..." />
              </div>
              <div>
                <label className={labelClass}>Additional Notes</label>
                <textarea className={inputClass + " min-h-[80px]"} value={form.additionalNotes} onChange={set("additionalNotes")} placeholder="Anything else we should know..." />
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            &larr; Previous
          </button>
          {step < steps.length - 1 ? (
            <button type="button" onClick={next} className="px-5 py-2.5 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white transition-colors">
              Next &rarr;
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!form.companyName || submitting}
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Interview"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MesInterviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <InterviewForm />
    </Suspense>
  );
}
