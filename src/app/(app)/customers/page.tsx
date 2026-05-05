"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { useCustomers, type Customer } from "@/lib/hooks/useCustomers";

function formatCurrency(n: number) {
  return n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-950 text-green-400 border-green-800",
  onboarding: "bg-blue-950 text-blue-400 border-blue-800",
  churned: "bg-red-950 text-red-400 border-red-800",
  paused: "bg-yellow-950 text-yellow-400 border-yellow-800",
};

const BILLING_COLORS: Record<string, string> = {
  current: "bg-green-950 text-green-400",
  pending: "bg-yellow-950 text-yellow-400",
  overdue: "bg-red-950 text-red-400",
  paid: "bg-green-950 text-green-400",
};

export default function CustomersPage() {
  const { data: customers, isLoading } = useCustomers();
  const [selected, setSelected] = useState<Customer | null>(null);

  const totalValue = customers?.reduce((sum, c) => sum + c.contractValue, 0) ?? 0;
  const activeCount = customers?.filter((c) => c.status === "active").length ?? 0;
  const onboardingCount = customers?.filter((c) => c.status === "onboarding").length ?? 0;

  return (
    <div>
      <Header title="Accounts" icon="🏢" subtitle="Customer Management" gradient="from-emerald-600 to-green-500" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Total Value</p>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(totalValue)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Active</p>
          <p className="text-2xl font-bold text-blue-400">{activeCount}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Onboarding</p>
          <p className="text-2xl font-bold text-purple-400">{onboardingCount}</p>
        </div>
      </div>

      <div className="flex gap-6">
        <div className={`bg-gray-900 border border-gray-800 rounded-xl overflow-hidden ${selected ? "flex-1" : "w-full"}`}>
          {isLoading ? (
            <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-800 rounded animate-pulse" />)}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-800">
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Value</th>
                  <th className="px-4 py-3 font-medium">Billing</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Modules</th>
                </tr>
              </thead>
              <tbody>
                {customers?.map((c) => (
                  <tr key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)}
                    className={`border-b border-gray-800/50 cursor-pointer transition-colors ${selected?.id === c.id ? "bg-gray-800" : "hover:bg-gray-800/30"}`}>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{c.company}</p>
                      <p className="text-gray-500 text-xs">{c.contact}</p>
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.status] ?? ""}`}>{c.status}</span></td>
                    <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(c.contractValue)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${BILLING_COLORS[c.billingStatus] ?? ""}`}>{c.billingStatus}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: c.owner?.color ?? "#6B7280" }}>{c.owner?.name?.charAt(0)}</div>
                        <span className="text-gray-300 text-xs">{c.owner?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">{c.modules.slice(0, 3).map((m) => <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">{m}</span>)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!isLoading && !customers?.length && <p className="text-center text-gray-500 py-8">No customers yet</p>}
        </div>

        {selected && (
          <div className="w-[380px] bg-gray-900 border border-gray-800 rounded-xl p-5 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{selected.company}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-1">Contact</p>
                <p className="text-white">{selected.contact} — {selected.title}</p>
                <p className="text-gray-400">{selected.email}</p>
                {selected.phone && <p className="text-gray-400">{selected.phone}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-gray-500 text-xs mb-1">Contract</p><p className="text-white font-medium">{formatCurrency(selected.contractValue)}</p></div>
                <div><p className="text-gray-500 text-xs mb-1">Facilities</p><p className="text-white">{selected.facilities}</p></div>
                <div><p className="text-gray-500 text-xs mb-1">Start</p><p className="text-gray-300">{selected.contractStart ? new Date(selected.contractStart).toLocaleDateString() : "—"}</p></div>
                <div><p className="text-gray-500 text-xs mb-1">End</p><p className="text-gray-300">{selected.contractEnd ? new Date(selected.contractEnd).toLocaleDateString() : "—"}</p></div>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Modules</p>
                <div className="flex flex-wrap gap-1">{selected.modules.map((m) => <span key={m} className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300">{m}</span>)}</div>
              </div>
              {selected.zohoCustomerId && <div><p className="text-gray-500 text-xs mb-1">Zoho ID</p><p className="text-gray-400 font-mono text-xs">{selected.zohoCustomerId}</p></div>}
              <div>
                <p className="text-gray-500 text-xs mb-2">Invoices ({selected.invoices.length})</p>
                {selected.invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-t border-gray-800">
                    <div><p className="text-white text-xs font-medium">{inv.invoiceNumber}</p><p className="text-gray-500 text-[10px]">{new Date(inv.date).toLocaleDateString()}</p></div>
                    <div className="text-right">
                      <p className="text-white text-xs">{formatCurrency(inv.amount)}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${inv.status === "paid" ? "bg-green-950 text-green-400" : inv.status === "overdue" ? "bg-red-950 text-red-400" : "bg-yellow-950 text-yellow-400"}`}>{inv.status}</span>
                    </div>
                  </div>
                ))}
                {!selected.invoices.length && <p className="text-gray-600 text-xs">No invoices</p>}
              </div>
              {selected.notes && <div><p className="text-gray-500 text-xs mb-1">Notes</p><p className="text-gray-400 text-xs">{selected.notes}</p></div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
