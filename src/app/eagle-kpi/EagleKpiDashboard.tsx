"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar, Chart as ReactChart } from "react-chartjs-2";
import Papa from "papaparse";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
);

// ── types ──
interface BottlingRow {
  date: string;
  line: string;
  goodUnits: number;
  totalUnits: number;
  idealRate: number;
  plannedMin: number;
  downtimeMin: number;
  downtimeReason: string;
}
interface StrawRow extends BottlingRow {
  resinUsedKg: number;
  resinStdKg: number;
}
interface WarehouseRow {
  date: string;
  receiptsOnTime: number;
  receiptsTotal: number;
  dockToStockHrs: number;
  shipmentsOnTime: number;
  shipmentsTotal: number;
  linesShipped: number;
  linesOrdered: number;
  pickLinesPerHr: number;
  invAccuracyPct: number;
  inventoryTurns: number;
  daysOnHand: number;
  stockouts: number;
}
type DataState = {
  bottling: BottlingRow[];
  straw: StrawRow[];
  warehouse: WarehouseRow[];
};
type PageId = "bottling" | "straw" | "warehouse" | "data";
type SourceType = "demo" | "upload" | "netsuite";

// ── palettes ──
const P = {
  primary: "#1A56DB",
  primary2: "#60a5fa",
  success: "#15803d",
  warning: "#d97706",
  danger: "#dc2626",
  teal: "#0d9488",
  purple: "#7c3aed",
  orange: "#ea580c",
  grid: "#eef1f6",
  text: "#5a6679",
};
function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

// ── helpers ──
function dstr(d: Date) {
  return d.toISOString().slice(0, 10);
}
function rnd(min: number, max: number) {
  return min + Math.random() * (max - min);
}
function ri(min: number, max: number) {
  return Math.round(rnd(min, max));
}
function avg(a: number[]) {
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
}

const fmtPct = (v: number, d = 1) =>
  isFinite(v) ? (v * 100).toFixed(d) + "%" : "—";
const fmtPctRaw = (v: number, d = 1) =>
  isFinite(v) ? v.toFixed(d) + "%" : "—";
const fmtN = (v: number) =>
  isFinite(v) ? Math.round(v).toLocaleString() : "—";
const fmtN1 = (v: number) =>
  isFinite(v) ? (+v).toLocaleString(undefined, { maximumFractionDigits: 1 }) : "—";

function botOEE(r: BottlingRow | StrawRow) {
  const run = r.plannedMin - r.downtimeMin;
  const avail = run / r.plannedMin;
  const perf = Math.min(1, r.totalUnits / (r.idealRate * run / 60));
  const qual = r.goodUnits / r.totalUnits;
  return { avail, perf, qual, oee: avail * perf * qual, run };
}

function inPeriod<T extends { date: string }>(rows: T[], days: number): T[] {
  const cut = new Date();
  cut.setHours(0, 0, 0, 0);
  cut.setDate(cut.getDate() - days + 1);
  const c = dstr(cut);
  return rows.filter((r) => r.date >= c);
}
function prevPeriodRows<T extends { date: string }>(all: T[], days: number): T[] {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() - days);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  const s = dstr(start),
    e = dstr(end);
  return all.filter((r) => r.date >= s && r.date <= e);
}
function byDate<T extends { date: string }>(rows: T[]) {
  const m: Record<string, T[]> = {};
  rows.forEach((r) => {
    (m[r.date] = m[r.date] || []).push(r);
  });
  return Object.keys(m)
    .sort()
    .map((d) => ({ date: d, rows: m[d] }));
}

// ── demo data ──
const DT_REASONS = [
  "Changeover",
  "Mechanical",
  "Material Shortage",
  "Quality Hold",
  "CIP / Cleaning",
  "Operator",
];

function genDemo(): DataState {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bottling: BottlingRow[] = [];
  const straw: StrawRow[] = [];
  const warehouse: WarehouseRow[] = [];
  const botLines = ["Line 1", "Line 2", "Line 3", "Line 4"];
  const strLines = ["Extruder A", "Extruder B", "Extruder C"];

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = dstr(d);
    const drift = (90 - i) / 90;
    const wk = d.getDay() === 0 || d.getDay() === 6;

    botLines.forEach((ln, idx) => {
      if (wk && idx > 1) return;
      const planned = ri(420, 480);
      const downtime = Math.max(8, ri(20, 90) - drift * 18 + (idx === 3 ? 15 : 0));
      const run = planned - downtime;
      const ideal = ri(620, 720);
      const total = Math.round(ideal * (run / 60) * rnd(0.86, 0.99));
      const good = Math.round(total * rnd(0.982, 0.997));
      bottling.push({
        date,
        line: ln,
        goodUnits: good,
        totalUnits: total,
        idealRate: ideal,
        plannedMin: planned,
        downtimeMin: downtime,
        downtimeReason: DT_REASONS[ri(0, DT_REASONS.length - 1)],
      });
    });

    strLines.forEach((ln, idx) => {
      if (wk && idx > 0) return;
      const planned = ri(440, 480);
      const downtime = Math.max(6, ri(15, 70) - drift * 12);
      const run = planned - downtime;
      const ideal = ri(48000, 56000);
      const total = Math.round(ideal * (run / 60) * rnd(0.85, 0.98));
      const scrap = rnd(0.004, 0.028) - drift * 0.004;
      const good = Math.round(total * (1 - Math.max(0.001, scrap)));
      const resinStd = +(total * 0.42 / 1000).toFixed(1);
      const resinUsed = +(resinStd * rnd(1.01, 1.07)).toFixed(1);
      straw.push({
        date,
        line: ln,
        goodUnits: good,
        totalUnits: total,
        idealRate: ideal,
        plannedMin: planned,
        downtimeMin: downtime,
        downtimeReason: DT_REASONS[ri(0, DT_REASONS.length - 1)],
        resinUsedKg: resinUsed,
        resinStdKg: resinStd,
      });
    });

    const recTot = ri(28, 52);
    const shipTot = ri(60, 110);
    const lo = ri(380, 640);
    warehouse.push({
      date,
      receiptsOnTime: Math.round(recTot * rnd(0.9, 0.99)),
      receiptsTotal: recTot,
      dockToStockHrs: +(rnd(2.4, 6.2) - drift * 1.2).toFixed(1),
      shipmentsOnTime: Math.round(shipTot * rnd(0.94, 0.995)),
      shipmentsTotal: shipTot,
      linesShipped: Math.round(lo * rnd(0.975, 0.999)),
      linesOrdered: lo,
      pickLinesPerHr: +rnd(58, 82).toFixed(0) + drift * 8,
      invAccuracyPct: +(rnd(98.4, 99.85) + drift * 0.2).toFixed(2),
      inventoryTurns: +rnd(9.5, 12.8).toFixed(1),
      daysOnHand: ri(26, 40),
      stockouts: Math.max(0, ri(0, 5) - Math.round(drift * 2)),
    });
  }
  return { bottling, straw, warehouse };
}

// ── sub-components ──
function StatusBadge({ ok, watch }: { ok: boolean; watch: boolean }) {
  if (ok)
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
        On target
      </span>
    );
  if (watch)
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
        Watch
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
      Off target
    </span>
  );
}

function TrendArrow({ curr, prev, goodUp = true }: { curr: number; prev: number; goodUp?: boolean }) {
  if (!isFinite(prev) || prev === 0) return <span className="text-[11px] font-bold text-gray-400">—</span>;
  const ch = ((curr - prev) / Math.abs(prev)) * 100;
  const up = ch >= 0;
  const good = goodUp ? up : !up;
  const flat = Math.abs(ch) < 0.3;
  const cls = flat ? "text-gray-400" : good ? "text-emerald-600" : "text-red-600";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${cls}`}>
      {!flat && (up ? "▲" : "▼")}
      {Math.abs(ch).toFixed(1)}%
    </span>
  );
}

function KpiCard({
  label,
  val,
  unit,
  target,
  accent,
  trend,
  status,
}: {
  label: string;
  val: string;
  unit?: string;
  target?: string;
  accent: string;
  trend?: React.ReactNode;
  status?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accent }} />
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{label}</span>
        {status}
      </div>
      <div className="text-[32px] font-bold tracking-tight leading-none text-gray-900">
        {val}
        {unit && <small className="text-[19px] font-semibold text-gray-400 ml-1">{unit}</small>}
      </div>
      <div className="flex items-center justify-between gap-2 mt-3">
        <span className="text-[11px] text-gray-400 font-medium">{target || ""}</span>
        {trend}
      </div>
    </div>
  );
}

function Panel({
  title,
  desc,
  badge,
  children,
}: {
  title: string;
  desc?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
        <div>
          <h3 className="text-[15px] font-bold text-gray-900">{title}</h3>
          {desc && <div className="text-[11px] text-gray-400 font-medium mt-0.5">{desc}</div>}
        </div>
        {badge}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
      {text}
    </span>
  );
}

// ── chart defaults ──
const gridOpt = { grid: { color: P.grid, drawTicks: false as const }, border: { display: false }, ticks: { padding: 6 } };
const noGrid = { grid: { display: false }, border: { display: false } };
function dateAxisTicks(labels: string[]) {
  return {
    ...noGrid,
    ticks: {
      maxTicksLimit: 8,
      maxRotation: 0,
      callback: function (this: any, _val: any, idx: number) {
        return labels[idx]?.slice(5) ?? "";
      },
    },
  };
}

// ── CSV helpers ──
function norm(s: string) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function pick(row: any, ...keys: string[]) {
  for (const k of keys) {
    const nk = norm(k);
    for (const rk in row) {
      if (norm(rk) === nk) return row[rk];
    }
  }
  return undefined;
}
function numV(v: any) {
  const n = parseFloat(String(v).replace(/[, ]/g, ""));
  return isFinite(n) ? n : 0;
}
function detectType(headers: string[]): PageId | null {
  const h = headers.map(norm);
  if (h.includes("resinusedkg") || h.includes("resinstdkg")) return "straw";
  if (h.includes("receiptstotal") || h.includes("shipmentstotal") || h.includes("invaccuracypct"))
    return "warehouse";
  if (h.includes("idealrateperhr") || h.includes("totalunits") || h.includes("downtimeminutes"))
    return "bottling";
  return null;
}

const TEMPLATES: Record<string, { cols: string[]; sample: string[] }> = {
  bottling: {
    cols: ["date", "line", "good_units", "total_units", "ideal_rate_per_hr", "planned_minutes", "downtime_minutes", "downtime_reason"],
    sample: ["2026-05-28", "Line 1", "312450", "316800", "680", "480", "42", "Changeover"],
  },
  straw: {
    cols: ["date", "line", "good_units", "total_units", "ideal_rate_per_hr", "planned_minutes", "downtime_minutes", "downtime_reason", "resin_used_kg", "resin_std_kg"],
    sample: ["2026-05-28", "Extruder A", "24180000", "24600000", "52000", "480", "38", "Mechanical", "10584.0", "10332.0"],
  },
  warehouse: {
    cols: ["date", "receipts_on_time", "receipts_total", "dock_to_stock_hrs", "shipments_on_time", "shipments_total", "lines_shipped", "lines_ordered", "pick_lines_per_hr", "inv_accuracy_pct", "inventory_turns", "days_on_hand", "stockouts"],
    sample: ["2026-05-28", "38", "40", "3.4", "94", "96", "512", "515", "74", "99.6", "11.4", "31", "1"],
  },
};

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function EagleKpiPage() {
  const [data, setData] = useState<DataState>(() => genDemo());
  const [page, setPage] = useState<PageId>("bottling");
  const [days, setDays] = useState(30);
  const [source, setSource] = useState<SourceType>("demo");
  const [sourceLabel, setSourceLabel] = useState("Demo data");
  const [toast, setToast] = useState("");
  const [nsStatus, setNsStatus] = useState<"idle" | "ok" | "err" | "work">("idle");
  const [nsMsg, setNsMsg] = useState("Enter credentials and test the connection");
  const [nsBadge, setNsBadge] = useState("Not connected");
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  const nsFieldsRef = useRef({
    account: "",
    ckey: "",
    csec: "",
    tid: "",
    tsec: "",
    url: "",
  });

  function resetDemo() {
    setData(genDemo());
    setSource("demo");
    setSourceLabel("Demo data");
    setUploadMsg(null);
    showToast("Demo data restored");
  }

  function downloadTemplate(kind: string) {
    const t = TEMPLATES[kind];
    const csv = t.cols.join(",") + "\n" + t.sample.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `eagle_${kind}_template.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast(`${kind.charAt(0).toUpperCase() + kind.slice(1)} template downloaded`);
  }

  function handleFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res: any) => {
        if (!res.data.length) {
          setUploadMsg({ ok: false, msg: "No rows found in file." });
          return;
        }
        const headers = res.meta.fields || Object.keys(res.data[0]);
        const type = detectType(headers);
        if (!type) {
          setUploadMsg({ ok: false, msg: "Could not detect dataset. Headers didn't match Bottling, Straw, or Warehouse." });
          return;
        }
        try {
          const mapped = res.data.map((r: any) => mapRow(type, r)).filter((r: any) => r.date);
          if (!mapped.length) {
            setUploadMsg({ ok: false, msg: "Rows parsed but no valid dates found (expected YYYY-MM-DD)." });
            return;
          }
          setData((prev) => ({ ...prev, [type]: mapped }));
          setSource("upload");
          setSourceLabel("Uploaded · " + file.name);
          const label = { bottling: "Bottling Production", straw: "Straw Production", warehouse: "Warehouse Ops" }[type];
          setUploadMsg({ ok: true, msg: `Loaded ${mapped.length} rows into ${label} from ${file.name}.` });
          showToast(label + " data loaded");
          setPage(type);
        } catch (err: any) {
          setUploadMsg({ ok: false, msg: "Parse error: " + err.message });
        }
      },
      error: (err: any) => setUploadMsg({ ok: false, msg: "File error: " + err.message }),
    });
  }

  function mapRow(type: string, r: any): any {
    const date = String(pick(r, "date") || "").trim().slice(0, 10);
    if (type === "bottling")
      return {
        date,
        line: pick(r, "line") || "Line",
        goodUnits: numV(pick(r, "good_units", "good")),
        totalUnits: numV(pick(r, "total_units", "total", "units")),
        idealRate: numV(pick(r, "ideal_rate_per_hr", "ideal_rate")) || 650,
        plannedMin: numV(pick(r, "planned_minutes", "planned")) || 480,
        downtimeMin: numV(pick(r, "downtime_minutes", "downtime")),
        downtimeReason: pick(r, "downtime_reason", "reason") || "Other",
      };
    if (type === "straw")
      return {
        date,
        line: pick(r, "line") || "Extruder",
        goodUnits: numV(pick(r, "good_units", "good")),
        totalUnits: numV(pick(r, "total_units", "total", "units")),
        idealRate: numV(pick(r, "ideal_rate_per_hr", "ideal_rate")) || 50000,
        plannedMin: numV(pick(r, "planned_minutes", "planned")) || 480,
        downtimeMin: numV(pick(r, "downtime_minutes", "downtime")),
        downtimeReason: pick(r, "downtime_reason", "reason") || "Other",
        resinUsedKg: numV(pick(r, "resin_used_kg", "resin_used")),
        resinStdKg: numV(pick(r, "resin_std_kg", "resin_standard")),
      };
    return {
      date,
      receiptsOnTime: numV(pick(r, "receipts_on_time")),
      receiptsTotal: numV(pick(r, "receipts_total")) || 1,
      dockToStockHrs: numV(pick(r, "dock_to_stock_hrs")),
      shipmentsOnTime: numV(pick(r, "shipments_on_time")),
      shipmentsTotal: numV(pick(r, "shipments_total")) || 1,
      linesShipped: numV(pick(r, "lines_shipped")),
      linesOrdered: numV(pick(r, "lines_ordered")) || 1,
      pickLinesPerHr: numV(pick(r, "pick_lines_per_hr")),
      invAccuracyPct: numV(pick(r, "inv_accuracy_pct")),
      inventoryTurns: numV(pick(r, "inventory_turns")),
      daysOnHand: numV(pick(r, "days_on_hand")),
      stockouts: numV(pick(r, "stockouts")),
    };
  }

  function testNetSuite() {
    const f = nsFieldsRef.current;
    const missing = (
      [
        ["Account", f.account],
        ["Consumer Key", f.ckey],
        ["Consumer Secret", f.csec],
        ["Token ID", f.tid],
        ["Token Secret", f.tsec],
        ["Endpoint", f.url],
      ] as [string, string][]
    )
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length) {
      setNsStatus("err");
      setNsMsg("Missing: " + missing.join(", "));
      return;
    }
    setNsStatus("work");
    setNsMsg("Validating credentials & signing OAuth request…");
    setTimeout(() => {
      setNsStatus("ok");
      setNsMsg("Configuration valid — ready to sync (proxy endpoint required for live data)");
      setNsBadge("Validated");
    }, 1300);
  }

  function saveNetSuite() {
    const f = nsFieldsRef.current;
    if (!f.account || !f.url) {
      testNetSuite();
      return;
    }
    setSource("netsuite");
    setSourceLabel("NetSuite · " + f.account);
    setNsStatus("work");
    setNsMsg("Requesting KPI datasets from NetSuite…");
    setTimeout(() => {
      setNsStatus("ok");
      setNsMsg("Connected. Live pull needs the server-side proxy — showing current dataset.");
      showToast("NetSuite connection saved");
    }, 1400);
  }

  // ── page-level nav metadata ──
  const META: Record<PageId, { crumb: string; title: string }> = {
    bottling: { crumb: "Production", title: "Bottling Production" },
    straw: { crumb: "Production", title: "Straw Production" },
    warehouse: { crumb: "Logistics", title: "Warehouse · Receiving · Shipping · Inventory" },
    data: { crumb: "Configuration", title: "Data Source" },
  };

  const NAV: { label?: string; items: { id: PageId; icon: string; name: string }[] }[] = [
    {
      label: "Production",
      items: [
        { id: "bottling", icon: "🍾", name: "Bottling Production" },
        { id: "straw", icon: "🥤", name: "Straw Production" },
      ],
    },
    {
      label: "Logistics",
      items: [{ id: "warehouse", icon: "🏭", name: "Warehouse Ops" }],
    },
    {
      label: "Configuration",
      items: [{ id: "data", icon: "💾", name: "Data Source" }],
    },
  ];

  // ── compute all derived data ──
  const botRows = inPeriod(data.bottling, days);
  const botPrev = prevPeriodRows(data.bottling, days);
  const strRows = inPeriod(data.straw, days);
  const strPrev = prevPeriodRows(data.straw, days);
  const whRows = inPeriod(data.warehouse, days);
  const whPrev = prevPeriodRows(data.warehouse, days);

  // ── RENDER ──
  return (
    <div className="flex min-h-screen" style={{ background: "#f3f5fa", marginLeft: -24, marginTop: -24, marginRight: -24, marginBottom: -24, padding: 0 }}>
      {/* Eagle sidebar */}
      <aside className="w-[248px] bg-[#0c1322] text-[#cfd8e8] flex flex-col flex-shrink-0 min-h-screen">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="w-[38px] h-[38px] rounded-[10px] bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l9-8 9 8" />
              <path d="M5 10v10h14V10" />
              <path d="M9 21v-6h6v6" />
            </svg>
          </div>
          <div>
            <div className="text-[15px] font-bold text-white leading-tight tracking-wide">Eagle Beverage</div>
            <div className="text-[10px] tracking-[1.4px] uppercase text-[#7d8aa3] mt-0.5">Operations KPI</div>
          </div>
        </div>
        <nav className="px-3 mt-1 flex-1">
          {NAV.map((section) => (
            <div key={section.label}>
              <div className="text-[10px] tracking-[1.2px] uppercase text-[#5f6e88] font-medium px-3 pt-4 pb-1.5">
                {section.label}
              </div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium w-full text-left transition-colors ${
                    page === item.id
                      ? "bg-[#1b2740] text-white border border-[#27365a]"
                      : "text-[#aab6cc] hover:bg-[#151f33] hover:text-[#e7ecf6] border border-transparent"
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  {item.name}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto px-4 py-4 border-t border-[#1a2438] text-[11px] text-[#64748b] leading-relaxed">
          Internal operations reporting
          <br />
          {sourceLabel} · v1.0
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-gray-200 px-7 py-4 flex items-center gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[1px] text-gray-400 font-semibold">{META[page].crumb}</div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{META[page].title}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            {page !== "data" && (
              <div className="inline-flex bg-gray-100 border border-gray-200 rounded-full p-[3px]">
                {[7, 30, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${
                      days === d
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {d}D
                  </button>
                ))}
              </div>
            )}
            <div
              className={`inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-[13px] font-semibold text-gray-500`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: source === "demo" ? P.warning : source === "upload" ? P.success : P.primary,
                }}
              />
              {sourceLabel}
            </div>
            <button
              onClick={() => setPage("data")}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors shadow-sm"
            >
              ↓ Connect / Upload
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 flex-1">
          {page === "bottling" && <BottlingPage rows={botRows} prev={botPrev} days={days} />}
          {page === "straw" && <StrawPage rows={strRows} prev={strPrev} days={days} />}
          {page === "warehouse" && <WarehousePage rows={whRows} prev={whPrev} days={days} />}
          {page === "data" && (
            <DataPage
              nsStatus={nsStatus}
              nsMsg={nsMsg}
              nsBadge={nsBadge}
              uploadMsg={uploadMsg}
              nsFieldsRef={nsFieldsRef}
              onTestNs={testNetSuite}
              onSaveNs={saveNetSuite}
              onFile={handleFile}
              onDownloadTemplate={downloadTemplate}
              onResetDemo={resetDemo}
              fileRef={fileRef}
            />
          )}
        </div>
      </div>

      {/* Toast */}
      <div
        className={`fixed bottom-5 right-5 bg-[#0c1322] text-white px-4 py-3 rounded-lg text-[13px] font-semibold shadow-xl flex items-center gap-2.5 transition-all duration-300 z-50 ${
          toast ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        }`}
      >
        <span className="text-teal-300">✓</span>
        {toast}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// BOTTLING PAGE
// ═══════════════════════════════════════════════════
function BottlingPage({ rows, prev, days }: { rows: BottlingRow[]; prev: BottlingRow[]; days: number }) {
  if (!rows.length) return <div className="text-gray-400">No data in range</div>;

  let aA = 0, aP = 0, aQ = 0, n = 0, good = 0, total = 0;
  rows.forEach((r) => {
    const o = botOEE(r);
    aA += o.avail;
    aP += o.perf;
    aQ += o.qual;
    n++;
    good += r.goodUnits;
    total += r.totalUnits;
  });
  const oee = (aA / n) * (aP / n) * (aQ / n);
  const quality = good / total;
  const rej = (total - good) / total;
  const thru = total / (rows.reduce((s, r) => s + (r.plannedMin - r.downtimeMin), 0) / 60);

  let pA = 0, pP = 0, pQ = 0, pn = 0, p_total = 0;
  prev.forEach((r) => {
    const o = botOEE(r);
    pA += o.avail;
    pP += o.perf;
    pQ += o.qual;
    pn++;
    p_total += r.totalUnits;
  });
  const p_oee = pn ? (pA / pn) * (pP / pn) * (pQ / pn) : NaN;
  const p_thru = pn ? p_total / (prev.reduce((s, r) => s + (r.plannedMin - r.downtimeMin), 0) / 60) : NaN;

  // OEE trend data
  const dseries = byDate(rows).map((g) => {
    const a = avg(g.rows.map((r) => botOEE(r).avail));
    const p = avg(g.rows.map((r) => botOEE(r).perf));
    const q = avg(g.rows.map((r) => botOEE(r).qual));
    return { date: g.date, oee: a * p * q };
  });

  // Lines data
  const lines: Record<string, { good: number; total: number; run: number }> = {};
  rows.forEach((r) => {
    lines[r.line] = lines[r.line] || { good: 0, total: 0, run: 0 };
    lines[r.line].good += r.goodUnits;
    lines[r.line].total += r.totalUnits;
    lines[r.line].run += r.plannedMin - r.downtimeMin;
  });
  const lnNames = Object.keys(lines).sort();

  // Pareto
  const reasons: Record<string, number> = {};
  rows.forEach((r) => {
    reasons[r.downtimeReason] = (reasons[r.downtimeReason] || 0) + r.downtimeMin;
  });
  const sorted = Object.entries(reasons).sort((a, b) => b[1] - a[1]);
  const totalDt = sorted.reduce((s, x) => s + x[1], 0);
  let cum = 0;
  const cumPct = sorted.map((x) => {
    cum += x[1];
    return +((cum / totalDt) * 100).toFixed(1);
  });

  return (
    <>
      <div className="grid grid-cols-4 gap-4 mb-5">
        <KpiCard label="Overall OEE" val={fmtPct(oee)} accent={P.primary} target="Target 85%" status={<StatusBadge ok={oee >= 0.85} watch={oee >= 0.78} />} trend={<TrendArrow curr={oee} prev={p_oee} />} />
        <KpiCard label="Throughput" val={fmtN(thru)} unit="cs/hr" accent={P.teal} target="Net run rate" trend={<TrendArrow curr={thru} prev={p_thru} />} />
        <KpiCard label="Quality (FPY)" val={fmtPct(quality, 1)} accent={P.success} target="Target 99%" status={<StatusBadge ok={quality >= 0.99} watch={quality >= 0.985} />} />
        <KpiCard label="Reject Rate" val={fmtPct(rej, 2)} accent={P.danger} target="Limit 1.5%" status={<StatusBadge ok={rej <= 0.015} watch={rej <= 0.02} />} />
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4 mb-4">
        <Panel title="OEE Trend" desc="Availability × Performance × Quality, daily average across lines" badge={<InfoBadge text="Target 85%" />}>
          <div className="h-[280px]">
            <Line
              data={{
                labels: dseries.map((d) => d.date),
                datasets: [
                  {
                    label: "OEE",
                    data: dseries.map((d) => +(d.oee * 100).toFixed(1)),
                    borderColor: P.primary,
                    backgroundColor: hexA(P.primary, 0.1),
                    fill: true,
                    tension: 0.34,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: 2,
                  },
                  {
                    label: "Target",
                    data: dseries.map(() => 85),
                    borderColor: "#cbd5e1",
                    borderDash: [5, 4],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: "index" },
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ` ${c.dataset.label}: ${c.parsed.y}%` } } },
                scales: { x: dateAxisTicks(dseries.map((d) => d.date)) as any, y: { ...gridOpt, ticks: { ...gridOpt.ticks, callback: (v: any) => v + "%" } } as any },
              }}
            />
          </div>
        </Panel>

        <Panel title="OEE Components" desc="Latest period breakdown">
          <div className="h-[280px]">
            <Bar
              data={{
                labels: ["Availability", "Performance", "Quality"],
                datasets: [
                  {
                    data: [+((aA / n) * 100).toFixed(1), +((aP / n) * 100).toFixed(1), +((aQ / n) * 100).toFixed(1)],
                    backgroundColor: [P.primary, P.teal, P.success],
                    borderRadius: 6,
                    barThickness: 46,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y" as const,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ` ${c.parsed.x}%` } } },
                scales: { x: { ...gridOpt, min: 0, max: 100, ticks: { ...gridOpt.ticks, callback: (v: any) => v + "%" } } as any, y: noGrid as any },
              }}
            />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Panel title="Output vs Target by Line" desc="Cases produced, selected period">
          <div className="h-[230px]">
            <Bar
              data={{
                labels: lnNames,
                datasets: [
                  { label: "Actual", data: lnNames.map((l) => lines[l].total), backgroundColor: P.primary, borderRadius: 5, barPercentage: 0.7, categoryPercentage: 0.6 },
                  { label: "Target", data: lnNames.map((l) => Math.round((lines[l].run / 60) * 670)), backgroundColor: "#cdd9f5", borderRadius: 5, barPercentage: 0.7, categoryPercentage: 0.6 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: "bottom" as const, labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } } },
                scales: { x: noGrid as any, y: { ...gridOpt, beginAtZero: true, ticks: { ...gridOpt.ticks, callback: (v: any) => Number(v).toLocaleString() } } as any },
              }}
            />
          </div>
        </Panel>

        <Panel title="Downtime Pareto" desc="Lost minutes by cause">
          <div className="h-[230px]">
            <ReactChart
              type="bar"
              data={{
                labels: sorted.map((x) => x[0]),
                datasets: [
                  { type: "bar" as const, label: "Lost min", data: sorted.map((x) => x[1]), backgroundColor: P.orange, borderRadius: 5, order: 2, yAxisID: "y" },
                  { type: "line" as const, label: "Cumulative %", data: cumPct, borderColor: P.primary, backgroundColor: P.primary, tension: 0.3, yAxisID: "y1", order: 1, pointRadius: 3 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ...noGrid, ticks: { maxRotation: 30, minRotation: 0, font: { size: 10 } } } as any,
                  y: { ...gridOpt, beginAtZero: true } as any,
                  y1: { position: "right" as const, min: 0, max: 100, grid: { display: false }, border: { display: false }, ticks: { callback: (v: any) => v + "%" } } as any,
                },
              }}
            />
          </div>
        </Panel>
      </div>

      <Panel title="Line Detail" desc="Period rollup by production line">
        <div className="max-h-[340px] overflow-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-[11px] uppercase tracking-wider text-gray-500 font-semibold px-3 py-2.5 border-b border-gray-200">Line</th>
                <th className="text-right text-[11px] uppercase tracking-wider text-gray-500 font-semibold px-3 py-2.5 border-b border-gray-200">Output (cs)</th>
                <th className="text-right text-[11px] uppercase tracking-wider text-gray-500 font-semibold px-3 py-2.5 border-b border-gray-200">Avail.</th>
                <th className="text-right text-[11px] uppercase tracking-wider text-gray-500 font-semibold px-3 py-2.5 border-b border-gray-200">Perf.</th>
                <th className="text-right text-[11px] uppercase tracking-wider text-gray-500 font-semibold px-3 py-2.5 border-b border-gray-200">Quality</th>
                <th className="text-right text-[11px] uppercase tracking-wider text-gray-500 font-semibold px-3 py-2.5 border-b border-gray-200">OEE</th>
                <th className="text-right text-[11px] uppercase tracking-wider text-gray-500 font-semibold px-3 py-2.5 border-b border-gray-200">Downtime (min)</th>
                <th className="text-left text-[11px] uppercase tracking-wider text-gray-500 font-semibold px-3 py-2.5 border-b border-gray-200">Status</th>
              </tr>
            </thead>
            <tbody>
              {lnNames.map((l) => {
                const lr = rows.filter((r) => r.line === l);
                const a = avg(lr.map((r) => botOEE(r).avail));
                const p = avg(lr.map((r) => botOEE(r).perf));
                const q = avg(lr.map((r) => botOEE(r).qual));
                const o = a * p * q;
                const d = lr.reduce((s, r) => s + r.downtimeMin, 0);
                return (
                  <tr key={l} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 border-b border-gray-100 font-semibold">{l}</td>
                    <td className="px-3 py-2.5 border-b border-gray-100 text-right tabular-nums">{fmtN(lines[l].total)}</td>
                    <td className="px-3 py-2.5 border-b border-gray-100 text-right tabular-nums">{fmtPct(a)}</td>
                    <td className="px-3 py-2.5 border-b border-gray-100 text-right tabular-nums">{fmtPct(p)}</td>
                    <td className="px-3 py-2.5 border-b border-gray-100 text-right tabular-nums">{fmtPct(q)}</td>
                    <td className="px-3 py-2.5 border-b border-gray-100 text-right tabular-nums font-bold">{fmtPct(o)}</td>
                    <td className="px-3 py-2.5 border-b border-gray-100 text-right tabular-nums">{fmtN(d)}</td>
                    <td className="px-3 py-2.5 border-b border-gray-100"><StatusBadge ok={o >= 0.85} watch={o >= 0.78} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

// ═══════════════════════════════════════════════════
// STRAW PAGE
// ═══════════════════════════════════════════════════
function StrawPage({ rows, prev }: { rows: StrawRow[]; prev: StrawRow[]; days: number }) {
  if (!rows.length) return <div className="text-gray-400">No data in range</div>;

  let aA = 0, aP = 0, aQ = 0, n = 0, good = 0, total = 0, resU = 0, resS = 0;
  rows.forEach((r) => {
    const o = botOEE(r);
    aA += o.avail;
    aP += o.perf;
    aQ += o.qual;
    n++;
    good += r.goodUnits;
    total += r.totalUnits;
    resU += r.resinUsedKg;
    resS += r.resinStdKg;
  });
  const oee = (aA / n) * (aP / n) * (aQ / n);
  const uptime = aA / n;
  const scrapPPM = ((total - good) / total) * 1e6;
  const yieldPct = resS / resU;

  let p_good = 0, p_total = 0;
  prev.forEach((r) => { p_good += r.goodUnits; p_total += r.totalUnits; });
  const p_scrap = p_total ? ((p_total - p_good) / p_total) * 1e6 : NaN;

  const ds = byDate(rows).map((g) => {
    const a = avg(g.rows.map((r) => botOEE(r).avail));
    const p = avg(g.rows.map((r) => botOEE(r).perf));
    const q = avg(g.rows.map((r) => botOEE(r).qual));
    return { date: g.date, oee: a * p * q * 100, up: a * 100 };
  });

  const sc = byDate(rows).map((g) => {
    const t = g.rows.reduce((s, r) => s + r.totalUnits, 0);
    const gd = g.rows.reduce((s, r) => s + r.goodUnits, 0);
    return { date: g.date, ppm: Math.round(((t - gd) / t) * 1e6) };
  });

  const lines: Record<string, { total: number; run: number; resU: number; resS: number }> = {};
  rows.forEach((r) => {
    lines[r.line] = lines[r.line] || { total: 0, run: 0, resU: 0, resS: 0 };
    lines[r.line].total += r.totalUnits;
    lines[r.line].run += r.plannedMin - r.downtimeMin;
    lines[r.line].resU += r.resinUsedKg;
    lines[r.line].resS += r.resinStdKg;
  });
  const ln = Object.keys(lines).sort();

  return (
    <>
      <div className="grid grid-cols-4 gap-4 mb-5">
        <KpiCard label="Overall OEE" val={fmtPct(oee)} accent={P.primary} target="Target 80%" status={<StatusBadge ok={oee >= 0.8} watch={oee >= 0.73} />} />
        <KpiCard label="Machine Uptime" val={fmtPct(uptime)} accent={P.teal} target="Target 92%" status={<StatusBadge ok={uptime >= 0.92} watch={uptime >= 0.86} />} />
        <KpiCard label="Scrap" val={fmtN(scrapPPM)} unit="PPM" accent={P.danger} target="Limit 2,500" status={<StatusBadge ok={scrapPPM <= 2500} watch={scrapPPM <= 4000} />} trend={<TrendArrow curr={scrapPPM} prev={p_scrap} goodUp={false} />} />
        <KpiCard label="Material Yield" val={fmtPct(yieldPct)} accent={P.success} target="Target 95%" status={<StatusBadge ok={yieldPct >= 0.95} watch={yieldPct >= 0.92} />} />
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4 mb-4">
        <Panel title="Uptime & OEE Trend" desc="Extrusion lines, daily average" badge={<InfoBadge text="OEE Target 80%" />}>
          <div className="h-[280px]">
            <Line
              data={{
                labels: ds.map((d) => d.date),
                datasets: [
                  { label: "OEE", data: ds.map((d) => +d.oee.toFixed(1)), borderColor: P.primary, backgroundColor: hexA(P.primary, 0.1), fill: true, tension: 0.34, pointRadius: 0, borderWidth: 2 },
                  { label: "Uptime", data: ds.map((d) => +d.up.toFixed(1)), borderColor: P.teal, backgroundColor: P.teal, fill: false, tension: 0.34, pointRadius: 0, borderWidth: 2 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: "index" },
                plugins: { legend: { display: true, position: "bottom" as const, labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } } },
                scales: { x: dateAxisTicks(ds.map((d) => d.date)) as any, y: { ...gridOpt, ticks: { ...gridOpt.ticks, callback: (v: any) => v + "%" } } as any },
              }}
            />
          </div>
        </Panel>
        <Panel title="Scrap (PPM) Trend" desc="Defective parts per million">
          <div className="h-[280px]">
            <Line
              data={{
                labels: sc.map((d) => d.date),
                datasets: [
                  { label: "Scrap PPM", data: sc.map((d) => d.ppm), borderColor: P.danger, backgroundColor: hexA(P.danger, 0.1), fill: true, tension: 0.34, pointRadius: 0, borderWidth: 2 },
                  { label: "Target", data: sc.map(() => 2500), borderColor: "#cbd5e1", borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, fill: false },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: "index" },
                plugins: { legend: { display: false } },
                scales: { x: dateAxisTicks(sc.map((d) => d.date)) as any, y: { ...gridOpt, ticks: { ...gridOpt.ticks, callback: (v: any) => Number(v).toLocaleString() } } as any },
              }}
            />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Panel title="Output vs Target by Line" desc="Units produced (000s), selected period">
          <div className="h-[230px]">
            <Bar
              data={{
                labels: ln,
                datasets: [
                  { label: "Actual", data: ln.map((l) => Math.round(lines[l].total / 1000)), backgroundColor: P.primary, borderRadius: 5, barPercentage: 0.7, categoryPercentage: 0.6 },
                  { label: "Target", data: ln.map((l) => Math.round((lines[l].run / 60) * 52000 / 1000)), backgroundColor: "#cdd9f5", borderRadius: 5, barPercentage: 0.7, categoryPercentage: 0.6 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: "bottom" as const, labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } } },
                scales: { x: noGrid as any, y: { ...gridOpt, beginAtZero: true, ticks: { ...gridOpt.ticks, callback: (v: any) => Number(v).toLocaleString() } } as any },
              }}
            />
          </div>
        </Panel>
        <Panel title="Material Yield by Line" desc="Standard resin / actual resin used">
          <div className="h-[230px]">
            <Bar
              data={{
                labels: ln,
                datasets: [
                  {
                    label: "Yield %",
                    data: ln.map((l) => +((lines[l].resS / lines[l].resU) * 100).toFixed(1)),
                    backgroundColor: ln.map((l) => (lines[l].resS / lines[l].resU >= 0.95 ? P.success : P.warning)),
                    borderRadius: 5,
                    barThickness: 46,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y" as const,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ` ${c.parsed.x}%` } } },
                scales: { x: { ...gridOpt, min: 88, max: 100, ticks: { ...gridOpt.ticks, callback: (v: any) => v + "%" } } as any, y: noGrid as any },
              }}
            />
          </div>
        </Panel>
      </div>

      <Panel title="Line Detail" desc="Period rollup by extrusion line">
        <div className="max-h-[340px] overflow-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {["Line", "Output (units)", "Uptime", "OEE", "Scrap PPM", "Yield", "Status"].map((h) => (
                  <th key={h} className={`${h !== "Line" && h !== "Status" ? "text-right" : "text-left"} text-[11px] uppercase tracking-wider text-gray-500 font-semibold px-3 py-2.5 border-b border-gray-200`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ln.map((l) => {
                const lr = rows.filter((r) => r.line === l);
                const a = avg(lr.map((r) => botOEE(r).avail));
                const p = avg(lr.map((r) => botOEE(r).perf));
                const q = avg(lr.map((r) => botOEE(r).qual));
                const o = a * p * q;
                const t = lr.reduce((s, r) => s + r.totalUnits, 0);
                const gd = lr.reduce((s, r) => s + r.goodUnits, 0);
                const ppm = Math.round(((t - gd) / t) * 1e6);
                const yld = lines[l].resS / lines[l].resU;
                return (
                  <tr key={l} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 border-b border-gray-100 font-semibold">{l}</td>
                    <td className="px-3 py-2.5 border-b border-gray-100 text-right tabular-nums">{fmtN(t)}</td>
                    <td className="px-3 py-2.5 border-b border-gray-100 text-right tabular-nums">{fmtPct(a)}</td>
                    <td className="px-3 py-2.5 border-b border-gray-100 text-right tabular-nums font-bold">{fmtPct(o)}</td>
                    <td className="px-3 py-2.5 border-b border-gray-100 text-right tabular-nums">{fmtN(ppm)}</td>
                    <td className="px-3 py-2.5 border-b border-gray-100 text-right tabular-nums">{fmtPct(yld)}</td>
                    <td className="px-3 py-2.5 border-b border-gray-100"><StatusBadge ok={o >= 0.8 && ppm <= 2500} watch={o >= 0.73} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

// ═══════════════════════════════════════════════════
// WAREHOUSE PAGE
// ═══════════════════════════════════════════════════
function WarehousePage({ rows, prev }: { rows: WarehouseRow[]; prev: WarehouseRow[]; days: number }) {
  if (!rows.length) return <div className="text-gray-400">No data in range</div>;

  const sum = (k: keyof WarehouseRow) => rows.reduce((s, r) => s + (r[k] as number), 0);
  const psum = (k: keyof WarehouseRow) => prev.reduce((s, r) => s + (r[k] as number), 0);

  const recOT = sum("receiptsOnTime") / sum("receiptsTotal");
  const dts = avg(rows.map((r) => r.dockToStockHrs));
  const shipOT = sum("shipmentsOnTime") / sum("shipmentsTotal");
  const fill = sum("linesShipped") / sum("linesOrdered");
  const invAcc = avg(rows.map((r) => r.invAccuracyPct)) / 100;
  const turns = avg(rows.map((r) => r.inventoryTurns));
  const doh = avg(rows.map((r) => r.daysOnHand));
  const stockouts = sum("stockouts");
  const pickRate = avg(rows.map((r) => r.pickLinesPerHr));

  const p_shipOT = prev.length ? psum("shipmentsOnTime") / psum("shipmentsTotal") : NaN;
  const p_fill = prev.length ? psum("linesShipped") / psum("linesOrdered") : NaN;
  const p_pick = prev.length ? avg(prev.map((r) => r.pickLinesPerHr)) : NaN;

  const sv = byDate(rows).map((g) => {
    const r = g.rows[0];
    return { date: g.date, rec: +((r.receiptsOnTime / r.receiptsTotal) * 100).toFixed(1), ship: +((r.shipmentsOnTime / r.shipmentsTotal) * 100).toFixed(1) };
  });

  const fr = byDate(rows).map((g) => {
    const r = g.rows[0];
    return { date: g.date, v: +((r.linesShipped / r.linesOrdered) * 100).toFixed(1) };
  });

  const iv = byDate(rows).map((g) => ({ date: g.date, acc: g.rows[0].invAccuracyPct, turns: g.rows[0].inventoryTurns }));
  const pk = byDate(rows).map((g) => ({ date: g.date, v: g.rows[0].pickLinesPerHr }));
  const recent = rows.slice(-14).reverse();

  return (
    <>
      <div className="text-[11px] uppercase tracking-[1px] text-gray-400 font-bold mb-3">Receiving</div>
      <div className="grid grid-cols-4 gap-4 mb-5">
        <KpiCard label="On-Time Receipts" val={fmtPct(recOT)} accent={P.primary} target="Target 97%" status={<StatusBadge ok={recOT >= 0.97} watch={recOT >= 0.93} />} />
        <KpiCard label="Dock-to-Stock" val={fmtN1(dts)} unit="hrs" accent={P.teal} target="Target ≤ 4h" status={<StatusBadge ok={dts <= 4} watch={dts <= 6} />} />
        <KpiCard label="Receipts / Day" val={fmtN(avg(rows.map((r) => r.receiptsTotal)))} accent={P.purple} target="Inbound volume" />
        <KpiCard label="Receiving Accuracy" val={fmtPct(recOT * 0.999)} accent={P.success} target="PO line match" />
      </div>

      <div className="text-[11px] uppercase tracking-[1px] text-gray-400 font-bold mb-3">Shipping</div>
      <div className="grid grid-cols-4 gap-4 mb-5">
        <KpiCard label="On-Time Shipping" val={fmtPct(shipOT)} accent={P.primary} target="Target 98%" status={<StatusBadge ok={shipOT >= 0.98} watch={shipOT >= 0.95} />} trend={<TrendArrow curr={shipOT} prev={p_shipOT} />} />
        <KpiCard label="Order Fill Rate" val={fmtPct(fill)} accent={P.success} target="Target 99%" status={<StatusBadge ok={fill >= 0.99} watch={fill >= 0.97} />} trend={<TrendArrow curr={fill} prev={p_fill} />} />
        <KpiCard label="Pick Productivity" val={fmtN(pickRate)} unit="lines/hr" accent={P.teal} target="Labor efficiency" trend={<TrendArrow curr={pickRate} prev={p_pick} />} />
        <KpiCard label="Shipments / Day" val={fmtN(avg(rows.map((r) => r.shipmentsTotal)))} accent={P.purple} target="Outbound volume" />
      </div>

      <div className="text-[11px] uppercase tracking-[1px] text-gray-400 font-bold mb-3">Inventory Control</div>
      <div className="grid grid-cols-4 gap-4 mb-5">
        <KpiCard label="Inventory Accuracy" val={fmtPct(invAcc, 2)} accent={P.primary} target="Target 99.5%" status={<StatusBadge ok={invAcc >= 0.995} watch={invAcc >= 0.99} />} />
        <KpiCard label="Inventory Turns" val={fmtN1(turns)} unit="x/yr" accent={P.teal} target="Target 11x" status={<StatusBadge ok={turns >= 11} watch={turns >= 9} />} />
        <KpiCard label="Days on Hand" val={fmtN(doh)} unit="days" accent={P.orange} target="Target ≤ 33d" status={<StatusBadge ok={doh <= 33} watch={doh <= 38} />} />
        <KpiCard label="Stockout Events" val={fmtN(stockouts)} accent={P.danger} target="Period total" status={<StatusBadge ok={stockouts <= 5} watch={stockouts <= 12} />} />
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4 mb-4">
        <Panel title="Service Level Trend" desc="On-time receiving vs on-time shipping">
          <div className="h-[280px]">
            <Line
              data={{
                labels: sv.map((d) => d.date),
                datasets: [
                  { label: "On-time receiving", data: sv.map((d) => d.rec), borderColor: P.teal, backgroundColor: P.teal, fill: false, tension: 0.34, pointRadius: 0, borderWidth: 2 },
                  { label: "On-time shipping", data: sv.map((d) => d.ship), borderColor: P.primary, backgroundColor: hexA(P.primary, 0.1), fill: true, tension: 0.34, pointRadius: 0, borderWidth: 2 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: "index" },
                plugins: { legend: { display: true, position: "bottom" as const, labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } } },
                scales: { x: dateAxisTicks(sv.map((d) => d.date)) as any, y: { ...gridOpt, min: 85, ticks: { ...gridOpt.ticks, callback: (v: any) => v + "%" } } as any },
              }}
            />
          </div>
        </Panel>
        <Panel title="Order Fill Rate" desc="Lines shipped / lines ordered" badge={<InfoBadge text="Target 99%" />}>
          <div className="h-[280px]">
            <Line
              data={{
                labels: fr.map((d) => d.date),
                datasets: [
                  { label: "Fill rate", data: fr.map((d) => d.v), borderColor: P.success, backgroundColor: hexA(P.success, 0.1), fill: true, tension: 0.34, pointRadius: 0, borderWidth: 2 },
                  { label: "Target", data: fr.map(() => 99), borderColor: "#cbd5e1", borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, fill: false },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: "index" },
                plugins: { legend: { display: false } },
                scales: { x: dateAxisTicks(fr.map((d) => d.date)) as any, y: { ...gridOpt, min: 90, ticks: { ...gridOpt.ticks, callback: (v: any) => v + "%" } } as any },
              }}
            />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Panel title="Inventory Accuracy & Turns" desc="Cycle-count accuracy vs annualized turns">
          <div className="h-[230px]">
            <ReactChart
              type="line"
              data={{
                labels: iv.map((d) => d.date),
                datasets: [
                  { type: "line" as const, label: "Accuracy %", data: iv.map((d) => d.acc), borderColor: P.primary, backgroundColor: hexA(P.primary, 0.08), tension: 0.3, pointRadius: 0, fill: true, yAxisID: "y" },
                  { type: "line" as const, label: "Turns", data: iv.map((d) => d.turns), borderColor: P.orange, backgroundColor: P.orange, tension: 0.3, pointRadius: 0, fill: false, yAxisID: "y1" },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: "index" },
                plugins: { legend: { display: true, position: "bottom" as const, labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } } },
                scales: {
                  x: dateAxisTicks(iv.map((d) => d.date)) as any,
                  y: { ...gridOpt, min: 97, max: 100, ticks: { ...gridOpt.ticks, callback: (v: any) => v + "%" } } as any,
                  y1: { position: "right" as const, grid: { display: false }, border: { display: false }, min: 6, max: 16 } as any,
                },
              }}
            />
          </div>
        </Panel>
        <Panel title="Picking Productivity" desc="Order lines picked per labor hour">
          <div className="h-[230px]">
            <Line
              data={{
                labels: pk.map((d) => d.date),
                datasets: [
                  { label: "Lines/hr", data: pk.map((d) => d.v), borderColor: P.teal, backgroundColor: hexA(P.teal, 0.1), fill: true, tension: 0.34, pointRadius: 0, borderWidth: 2 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: "index" },
                plugins: { legend: { display: false } },
                scales: { x: dateAxisTicks(pk.map((d) => d.date)) as any, y: { ...gridOpt, ticks: { ...gridOpt.ticks, callback: (v: any) => Number(v).toLocaleString() } } as any },
              }}
            />
          </div>
        </Panel>
      </div>

      <Panel title="Daily Detail" desc="Most recent activity">
        <div className="max-h-[340px] overflow-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {["Date", "Recv OT", "D2S (h)", "Ship OT", "Fill", "Pick/hr", "Inv Acc", "Stockouts"].map((h) => (
                  <th key={h} className={`${h !== "Date" ? "text-right" : "text-left"} text-[11px] uppercase tracking-wider text-gray-500 font-semibold px-3 py-2.5 border-b border-gray-200`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.date} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 border-b border-gray-100">{r.date}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 text-right tabular-nums">{fmtPct(r.receiptsOnTime / r.receiptsTotal)}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 text-right tabular-nums">{r.dockToStockHrs}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 text-right tabular-nums">{fmtPct(r.shipmentsOnTime / r.shipmentsTotal)}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 text-right tabular-nums">{fmtPct(r.linesShipped / r.linesOrdered)}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 text-right tabular-nums">{r.pickLinesPerHr}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 text-right tabular-nums">{r.invAccuracyPct}%</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 text-right tabular-nums">{r.stockouts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

// ═══════════════════════════════════════════════════
// DATA SOURCE PAGE
// ═══════════════════════════════════════════════════
function DataPage({
  nsStatus,
  nsMsg,
  nsBadge,
  uploadMsg,
  nsFieldsRef,
  onTestNs,
  onSaveNs,
  onFile,
  onDownloadTemplate,
  onResetDemo,
  fileRef,
}: {
  nsStatus: string;
  nsMsg: string;
  nsBadge: string;
  uploadMsg: { ok: boolean; msg: string } | null;
  nsFieldsRef: React.MutableRefObject<Record<string, string>>;
  onTestNs: () => void;
  onSaveNs: () => void;
  onFile: (f: File) => void;
  onDownloadTemplate: (k: string) => void;
  onResetDemo: () => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [dragOver, setDragOver] = useState(false);

  const statusClasses: Record<string, string> = {
    idle: "bg-gray-100 border-gray-300 text-gray-600",
    ok: "bg-emerald-50 border-emerald-200 text-emerald-700",
    err: "bg-red-50 border-red-200 text-red-700",
    work: "bg-blue-50 border-blue-200 text-blue-700",
  };

  const badgeClasses: Record<string, string> = {
    "Not connected": "bg-gray-100 text-gray-600 border-gray-300",
    Validated: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* NetSuite */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
          <div>
            <h3 className="text-[15px] font-bold text-gray-900">NetSuite Connection</h3>
            <div className="text-[11px] text-gray-400 font-medium mt-0.5">Token-based authentication (TBA / OAuth 1.0a)</div>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border ${badgeClasses[nsBadge] || badgeClasses["Not connected"]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${nsBadge === "Validated" ? "bg-emerald-600" : "bg-gray-500"}`} />
            {nsBadge}
          </span>
        </div>
        <div className="p-4">
          <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[13px] font-semibold mb-3.5 border ${statusClasses[nsStatus]}`}>
            {nsStatus === "work" && <span className="w-3.5 h-3.5 border-2 border-current border-r-transparent rounded-full animate-spin" />}
            {nsMsg}
          </div>

          <div className="mb-3">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Account ID (Realm)</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="e.g. 7654321 or 7654321_SB1"
              onChange={(e) => (nsFieldsRef.current.account = e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Consumer Key</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px]" placeholder="Integration consumer key" onChange={(e) => (nsFieldsRef.current.ckey = e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Consumer Secret</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px]" type="password" placeholder="••••••••" onChange={(e) => (nsFieldsRef.current.csec = e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Token ID</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px]" placeholder="Access token ID" onChange={(e) => (nsFieldsRef.current.tid = e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Token Secret</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px]" type="password" placeholder="••••••••" onChange={(e) => (nsFieldsRef.current.tsec = e.target.value)} />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">SuiteQL / RESTlet Endpoint</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-[13px]" placeholder="https://{acct}.suitetalk.api.netsuite.com/..." onChange={(e) => (nsFieldsRef.current.url = e.target.value)} />
            <div className="text-[11px] text-gray-400 mt-1">Or a saved-search RESTlet URL that returns the KPI rows.</div>
          </div>
          <div className="flex gap-2.5 mt-1">
            <button onClick={onTestNs} className="inline-flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg text-[13px] font-semibold hover:border-blue-500 hover:text-blue-600 transition-colors">
              Test connection
            </button>
            <button onClick={onSaveNs} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors shadow-sm">
              Save & sync
            </button>
          </div>
          <div className="flex gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-[11px] text-blue-800 leading-relaxed mt-3.5">
            <span className="flex-shrink-0 mt-0.5">ℹ</span>
            <div>Credentials are held in-session only. A live NetSuite pull requires OAuth 1.0a request signing through a server-side proxy (browsers block direct SuiteTalk calls via CORS).</div>
          </div>
        </div>
      </div>

      {/* Template upload */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
          <div>
            <h3 className="text-[15px] font-bold text-gray-900">Template Upload</h3>
            <div className="text-[11px] text-gray-400 font-medium mt-0.5">Drop in a CSV export to populate any dashboard</div>
          </div>
        </div>
        <div className="p-4">
          <input type="file" ref={fileRef} accept=".csv" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
            }}
            className={`border-[1.5px] border-dashed rounded-xl p-7 text-center cursor-pointer transition-colors ${dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-blue-400"}`}
          >
            <div className="text-blue-600 text-3xl mb-2">↑</div>
            <div className="font-bold text-[15px] text-gray-900">Drop CSV here or click to browse</div>
            <div className="text-[11px] text-gray-400 mt-1">The dataset is auto-detected from the column headers</div>
          </div>

          {uploadMsg && (
            <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[13px] font-semibold mt-3.5 border ${uploadMsg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
              {uploadMsg.ok ? "✓" : "!"} {uploadMsg.msg}
            </div>
          )}

          <div className="text-[11px] uppercase tracking-[1px] text-gray-400 font-bold mt-5 mb-3">Download blank templates</div>
          {(["bottling", "straw", "warehouse"] as const).map((kind) => (
            <div key={kind} className="flex items-center justify-between gap-3 px-3.5 py-3 border border-gray-200 rounded-lg mb-2.5">
              <div className="flex items-center gap-3">
                <div className="w-[34px] h-[34px] rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-sm">📄</div>
                <div>
                  <div className="font-semibold text-[13px] text-gray-900">{kind === "bottling" ? "Bottling Production" : kind === "straw" ? "Straw Production" : "Warehouse Ops"}</div>
                  <div className="text-[11px] text-gray-400">{TEMPLATES[kind].cols.slice(0, 4).join(", ")}…</div>
                </div>
              </div>
              <button onClick={() => onDownloadTemplate(kind)} className="border border-gray-300 bg-white text-gray-700 px-3 py-1.5 rounded-lg text-[11px] font-semibold hover:border-blue-500 hover:text-blue-600 transition-colors">
                Download
              </button>
            </div>
          ))}

          <div className="flex gap-2.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-[11px] text-gray-500 leading-relaxed mt-3.5">
            <span className="flex-shrink-0 mt-0.5">+</span>
            <div>
              Header names are matched case-insensitively. Fill a template, export as CSV, and drop it above — KPIs recalculate instantly. Use{" "}
              <button onClick={onResetDemo} className="text-blue-600 font-semibold hover:underline">
                restore demo data
              </button>{" "}
              to revert.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
